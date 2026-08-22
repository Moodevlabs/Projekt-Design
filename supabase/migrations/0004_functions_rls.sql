-- =============================================================================
-- 0004_functions_rls.sql — funkcje, triggery i RLS (docs/02-DATABASE.md §2–3)
--
-- Zasady:
--  * KAŻDA tabela ma RLS ON. Brak polityki = brak dostępu (poza service_role).
--  * SELECT wymaga is_member(); INSERT/UPDATE/DELETE dodatkowo workspace_can_write().
--    Read-only po wygaśnięciu triala to twarda granica w bazie, nie tylko w UI.
--  * Helpery są SECURITY DEFINER + `set search_path` (ochrona przed
--    przejęciem search_path) i mają odebrane EXECUTE od public.
--  * Rekurencja RLS: patrz komentarz przy politykach workspace_members.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpery RLS
-- -----------------------------------------------------------------------------

-- Czy bieżący użytkownik należy do workspace?
-- SECURITY DEFINER, żeby polityki innych tabel nie potrzebowały prawa odczytu
-- workspace_members i żeby uniknąć kaskady polityk.
create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.workspace_members m
     where m.workspace_id = ws
       and m.user_id = auth.uid()
  );
$$;

comment on function public.is_member(uuid) is
  'Czy auth.uid() jest członkiem workspace. Podstawa wszystkich polityk SELECT.';

-- Czy bieżący użytkownik jest właścicielem workspace?
-- Czyta workspaces (a nie workspace_members) — dzięki temu można jej użyć
-- w politykach zapisu na workspace_members bez rekurencji.
create or replace function public.is_workspace_owner(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.workspaces w
     where w.id = ws
       and w.owner_id = auth.uid()
  );
$$;

comment on function public.is_workspace_owner(uuid) is
  'Czy auth.uid() jest właścicielem workspace (workspaces.owner_id).';

-- Gating zapisu: aktywna subskrypcja, trwający trial albo 7 dni grace po past_due.
-- MUSI być logicznie identyczna z domain/billing/entitlement.ts (test parytetu, T-15).
create or replace function public.workspace_can_write(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.subscriptions s
     where s.workspace_id = ws
       and (
             s.status in ('active','trialing')
             or (s.status = 'past_due'
                 and s.current_period_end is not null
                 and s.current_period_end > now() - interval '7 days')
           )
       and (s.status <> 'trialing'
            or (s.trial_ends_at is not null and s.trial_ends_at > now()))
  );
$$;

comment on function public.workspace_can_write(uuid) is
  'Czy workspace ma prawo zapisu (active / trial w toku / past_due w 7-dniowym grace).';

-- Czy bieżący użytkownik może czytać daną wycenę (przez jej workspace)?
-- Używane przez quote_shares / quote_acceptances, które nie mają workspace_id.
create or replace function public.is_quote_member(q uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.quotes qt
     where qt.id = q
       and public.is_member(qt.workspace_id)
  );
$$;

create or replace function public.quote_can_write(q uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.quotes qt
     where qt.id = q
       and public.is_member(qt.workspace_id)
       and public.workspace_can_write(qt.workspace_id)
  );
$$;

-- Helpery wołane są przez polityki roli `authenticated`; nikt inny ich nie potrzebuje.
revoke all on function public.is_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
revoke all on function public.workspace_can_write(uuid) from public;
revoke all on function public.is_quote_member(uuid) from public;
revoke all on function public.quote_can_write(uuid) from public;

grant execute on function public.is_member(uuid)            to authenticated, service_role;
grant execute on function public.is_workspace_owner(uuid)   to authenticated, service_role;
grant execute on function public.workspace_can_write(uuid)  to authenticated, service_role;
grant execute on function public.is_quote_member(uuid)      to authenticated, service_role;
grant execute on function public.quote_can_write(uuid)      to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Bootstrap konta: profil + workspace + member + brand_kit + trial 14 dni
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ws uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (coalesce(nullif(new.raw_user_meta_data->>'company', ''), 'Moja firma'), new.id)
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner');

  insert into public.profiles (id, full_name, default_workspace_id)
  values (new.id, new.raw_user_meta_data->>'full_name', ws);

  insert into public.brand_kits (workspace_id, company_name)
  values (ws, coalesce(nullif(new.raw_user_meta_data->>'company', ''), ''));

  -- Trial jest nasz, nie Stripe'owy — karta nie jest wymagana przy rejestracji.
  insert into public.subscriptions (workspace_id, status, trial_ends_at)
  values (ws, 'trialing', now() + interval '14 days');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT na auth.users: zakłada workspace, członkostwo, profil, brand kit i trial.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. Numeracja wycen — atomowa inkrementacja licznika workspace.
-- SECURITY DEFINER (musi podbić quote_seq, czego polityka UPDATE na workspaces
-- nie pozwala zwykłemu członkowi), ale sprawdza uprawnienia jawnie.
-- -----------------------------------------------------------------------------
create or replace function public.next_quote_number(ws uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  seq int;
  pattern text;
begin
  if not public.is_member(ws) then
    raise exception 'Brak dostępu do workspace %', ws using errcode = '42501';
  end if;

  if not public.workspace_can_write(ws) then
    raise exception 'Workspace % jest w trybie tylko do odczytu', ws using errcode = '42501';
  end if;

  -- UPDATE ... RETURNING bierze blokadę wiersza: dwa równoległe wywołania
  -- nie dostaną tego samego numeru.
  update public.workspaces w
     set quote_seq = w.quote_seq + 1
   where w.id = ws
   returning w.quote_seq, coalesce(w.settings->>'numberPattern', 'WYC/{YYYY}/{MM}/{seq}')
    into seq, pattern;

  if seq is null then
    raise exception 'Workspace % nie istnieje', ws using errcode = 'P0002';
  end if;

  return replace(
           replace(
             replace(pattern, '{YYYY}', to_char(now(), 'YYYY')),
             '{MM}', to_char(now(), 'MM')),
           '{seq}', lpad(seq::text, 4, '0'));
end;
$$;

comment on function public.next_quote_number(uuid) is
  'Atomowo podbija workspaces.quote_seq i zwraca numer wg settings.numberPattern.';

revoke all on function public.next_quote_number(uuid) from public;
grant execute on function public.next_quote_number(uuid) to authenticated, service_role;

-- =============================================================================
-- 4. RLS
-- =============================================================================

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles          enable row level security;
alter table public.brand_kits        enable row level security;
alter table public.clients           enable row level security;
alter table public.quotes            enable row level security;
alter table public.quote_templates   enable row level security;
alter table public.library_items     enable row level security;
alter table public.library_groups    enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.stripe_events     enable row level security;
alter table public.quote_shares      enable row level security;
alter table public.quote_acceptances enable row level security;

-- -----------------------------------------------------------------------------
-- 4.1 workspaces — czytają członkowie, zmienia tylko właściciel.
-- INSERT/DELETE świadomie bez polityki: workspace powstaje w handle_new_user(),
-- a kasowanie konta idzie przez Edge Function delete-account (service_role).
-- -----------------------------------------------------------------------------
drop policy if exists "workspaces: select member" on public.workspaces;
create policy "workspaces: select member" on public.workspaces
  for select to authenticated
  using (public.is_member(id));

drop policy if exists "workspaces: update owner" on public.workspaces;
create policy "workspaces: update owner" on public.workspaces
  for update to authenticated
  using (public.is_workspace_owner(id) and public.workspace_can_write(id))
  with check (public.is_workspace_owner(id));

-- -----------------------------------------------------------------------------
-- 4.2 workspace_members
--
-- ODSTĘPSTWO od wzorca z docs/02-DATABASE.md §3 — świadome, przeciw rekurencji:
-- polityka SELECT na tej tabeli NIE MOŻE wołać is_member(), bo is_member()
-- czyta workspace_members → polityka → is_member() → ... (błąd 42P17).
-- Dlatego SELECT jest oparty wprost o user_id = auth.uid() (własne członkostwa).
-- Zapisy mogą już używać is_workspace_owner(), bo ta funkcja czyta workspaces,
-- a polityki SELECT na workspace_members nie wołają niczego, co wraca tutaj.
-- Listę współpracowników workspace (T-27) wystawimy osobnym RPC SECURITY DEFINER.
-- -----------------------------------------------------------------------------
drop policy if exists "workspace_members: select own" on public.workspace_members;
create policy "workspace_members: select own" on public.workspace_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "workspace_members: insert owner" on public.workspace_members;
create policy "workspace_members: insert owner" on public.workspace_members
  for insert to authenticated
  with check (public.is_workspace_owner(workspace_id)
              and public.workspace_can_write(workspace_id));

drop policy if exists "workspace_members: update owner" on public.workspace_members;
create policy "workspace_members: update owner" on public.workspace_members
  for update to authenticated
  using (public.is_workspace_owner(workspace_id)
         and public.workspace_can_write(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "workspace_members: delete owner" on public.workspace_members;
create policy "workspace_members: delete owner" on public.workspace_members
  for delete to authenticated
  using (public.is_workspace_owner(workspace_id)
         and public.workspace_can_write(workspace_id));

-- -----------------------------------------------------------------------------
-- 4.3 profiles — wyłącznie własny wiersz.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 4.4 Tabele z workspace_id — dokładnie wzorzec z docs/02-DATABASE.md §3:
--     SELECT: is_member; INSERT/UPDATE/DELETE: is_member AND workspace_can_write.
-- Generowane pętlą, żeby 6 tabel nie rozjechało się przez literówkę w copy-paste.
-- Efekt jest identyczny z ręcznie wypisanymi politykami (widoczny w pg_policies).
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_kits', 'clients', 'quotes', 'quote_templates', 'library_items', 'library_groups'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || ': select member', t);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (public.is_member(workspace_id))',
      t || ': select member', t);

    execute format('drop policy if exists %I on public.%I', t || ': insert member', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))',
      t || ': insert member', t);

    execute format('drop policy if exists %I on public.%I', t || ': update member', t);
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id)) '
      'with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))',
      t || ': update member', t);

    execute format('drop policy if exists %I on public.%I', t || ': delete member', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))',
      t || ': delete member', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4.5 subscriptions — członkowie czytają, NIKT z klienta nie pisze.
-- Zapis wyłącznie z Edge Functions przez service_role (który omija RLS).
-- -----------------------------------------------------------------------------
drop policy if exists "subscriptions: select member" on public.subscriptions;
create policy "subscriptions: select member" on public.subscriptions
  for select to authenticated
  using (public.is_member(workspace_id));

-- -----------------------------------------------------------------------------
-- 4.6 stripe_events — RLS ON i ZERO polityk: tabela techniczna (idempotencja
-- webhooków), nie ma workspace_id, więc nie da się jej zawęzić do członków.
-- ODSTĘPSTWO od §3 („select dla członków") — świadome: tabela nie zawiera
-- danych użytkownika, a wyciek listy id eventów Stripe nikomu nie służy.
-- Dostęp: wyłącznie service_role.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4.7 quote_shares / quote_acceptances — brak workspace_id, więc przez wycenę.
-- -----------------------------------------------------------------------------
drop policy if exists "quote_shares: select member" on public.quote_shares;
create policy "quote_shares: select member" on public.quote_shares
  for select to authenticated
  using (public.is_quote_member(quote_id));

drop policy if exists "quote_shares: insert member" on public.quote_shares;
create policy "quote_shares: insert member" on public.quote_shares
  for insert to authenticated
  with check (public.quote_can_write(quote_id));

drop policy if exists "quote_shares: update member" on public.quote_shares;
create policy "quote_shares: update member" on public.quote_shares
  for update to authenticated
  using (public.quote_can_write(quote_id))
  with check (public.quote_can_write(quote_id));

drop policy if exists "quote_shares: delete member" on public.quote_shares;
create policy "quote_shares: delete member" on public.quote_shares
  for delete to authenticated
  using (public.quote_can_write(quote_id));

-- Akceptacje są dowodem — członek je czyta, ale nie edytuje ani nie kasuje.
-- Wstawia je publiczna aplikacja share przez RPC/service_role (T-26).
drop policy if exists "quote_acceptances: select member" on public.quote_acceptances;
create policy "quote_acceptances: select member" on public.quote_acceptances
  for select to authenticated
  using (public.is_quote_member(quote_id));

-- =============================================================================
-- 5. Uprawnienia tabelowe (obrona w głąb — RLS to pierwsza linia, GRANT druga)
-- =============================================================================

-- anon nie ma w aplikacji desktopowej nic do roboty na tych tabelach.
revoke all on all tables in schema public from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- Tabele billingowe są tylko do odczytu z poziomu klienta (subscriptions),
-- albo całkiem niedostępne (stripe_events).
revoke insert, update, delete on public.subscriptions from authenticated;
revoke all on public.stripe_events from authenticated;

-- Akceptacje: tylko odczyt dla członków (zapis przez service_role).
revoke insert, update, delete on public.quote_acceptances from authenticated;

-- workspaces: bez insert/delete z klienta (patrz komentarz przy 4.1).
revoke insert, delete on public.workspaces from authenticated;

-- profiles: bez delete (kasowanie konta kasuje wiersz kaskadą z auth.users).
revoke delete on public.profiles from authenticated;

grant all on all tables in schema public to service_role;
