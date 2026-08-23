-- =============================================================================
-- 0006 — Słownik typów pomieszczeń (T-33 / FEATURES §F1.2)
--
-- Cennik parametryczny liczy usługę jako „baza + składnik za każde
-- pomieszczenie”, a składnik zależy od TYPU pomieszczenia (kuchnia droższa niż
-- korytarz). Typy są własnością workspace’u, nie pojedynczej wyceny — inaczej
-- macierz cennika nie miałaby po czym trafiać w te same kolumny.
-- =============================================================================

create table if not exists public.room_types (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  -- Stabilny klucz techniczny: po nim idzie import macierzy z CSV (F1.3),
  -- kiedy nazwa zdąży się już zmienić.
  slug         text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists room_types_ws_sort_idx
  on public.room_types (workspace_id, sort_order) where deleted_at is null;

-- Slug unikalny w obrębie workspace’u, ale tylko wśród żywych wpisów —
-- usunięcie „kuchni” nie może blokować dodania jej z powrotem.
create unique index if not exists room_types_ws_slug_uidx
  on public.room_types (workspace_id, slug) where deleted_at is null;

drop trigger if exists set_updated_at on public.room_types;
create trigger set_updated_at before update on public.room_types
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Zestaw startowy — 14 typów z arkusza klienta.
--
-- Wydzielone do funkcji, bo korzystają z niego DWA miejsca: trigger zakładania
-- konta i backfill poniżej. Dwie kopie listy rozjechałyby się przy pierwszej
-- zmianie.
-- -----------------------------------------------------------------------------
create or replace function public.seed_room_types(ws uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.room_types (workspace_id, name, slug, sort_order)
  select ws, v.name, v.slug, v.ord
    from (values
      ('Sień / hol',      'sien-hol',       10),
      ('Korytarz',        'korytarz',       20),
      ('Kuchnia',         'kuchnia',        30),
      ('Jadalnia',        'jadalnia',       40),
      ('Salon',           'salon',          50),
      ('Toaleta',         'toaleta',        60),
      ('Łazienka',        'lazienka',       70),
      ('Pralnia',         'pralnia',        80),
      ('Sypialnia',       'sypialnia',      90),
      ('Garderoba',       'garderoba',     100),
      ('Pokój dziecięcy', 'pokoj-dzieciecy', 110),
      ('Gabinet',         'gabinet',       120),
      ('Spiżarnia',       'spizarnia',     130),
      ('Schody',          'schody',        140)
    ) as v(name, slug, ord)
   where not exists (
     select 1 from public.room_types rt
      where rt.workspace_id = ws and rt.slug = v.slug and rt.deleted_at is null
   );
$$;

comment on function public.seed_room_types(uuid) is
  'Wstawia 14 startowych typów pomieszczeń. Idempotentna — pomija slugi, które workspace już ma.';

-- -----------------------------------------------------------------------------
-- Zakładanie konta: dokładamy typy pomieszczeń do reszty startowego zestawu.
-- Reszta ciała bez zmian względem 0004 — `create or replace` wymaga podania
-- całej funkcji.
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

  perform public.seed_room_types(ws);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT na auth.users: zakłada workspace, członkostwo, profil, brand kit, trial i typy pomieszczeń.';

-- Konta założone przed tą migracją też muszą mieć z czego wybierać.
do $$
declare
  ws uuid;
begin
  for ws in select id from public.workspaces loop
    perform public.seed_room_types(ws);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Uprawnienia tabelowe.
--
-- 0004 nadaje je hurtem (`on all tables in schema public`), co obejmuje wyłącznie
-- tabele istniejące w chwili tamtej migracji. Nowa tabela musi dostać swoje
-- jawnie — bez tego PostgREST odpowiada `42501 permission denied`, i to jeszcze
-- zanim RLS w ogóle dojdzie do głosu.
-- -----------------------------------------------------------------------------
revoke all on public.room_types from anon, authenticated;
grant select, insert, update, delete on public.room_types to authenticated;
grant all on public.room_types to service_role;

-- -----------------------------------------------------------------------------
-- RLS — identycznie jak dla pozostałych tabel workspace’owych (02-DATABASE §3):
-- czytają członkowie, piszą członkowie z prawem zapisu (aktywna subskrypcja).
-- -----------------------------------------------------------------------------
alter table public.room_types enable row level security;

drop policy if exists "room_types: select member" on public.room_types;
create policy "room_types: select member" on public.room_types
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "room_types: insert member" on public.room_types;
create policy "room_types: insert member" on public.room_types
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "room_types: update member" on public.room_types;
create policy "room_types: update member" on public.room_types
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "room_types: delete member" on public.room_types;
create policy "room_types: delete member" on public.room_types
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));
