-- =============================================================================
-- 0034 — Brief klienta przez magic link (T-93 / poprawka 9 z 2026-08-27)
--
-- ## Co to jest
--
-- Kwestionariusz, który klient wypełnia **przed** rozpoczęciem projektu:
-- kto mieszka, jak żyje, co lubi, ile ma budżetu, kiedy chce się wprowadzić.
-- Pierwszy etap współpracy — wcześniejszy niż wycena, bo dopiero z briefu
-- wiadomo, co właściwie wycenić.
--
-- ## Dlaczego osobna tabela, a nie notatka klienta
--
-- Brief ma **autora po drugiej stronie**. Notatka w kartotece jest tym, co
-- projektant zapisał o kliencie; brief jest tym, co klient odpowiedział —
-- i musi być odróżnialny, bo tylko na drugim da się oprzeć ustalenia. Stąd
-- też własny token: klient wypełnia go bez konta, tak samo jak akceptuje
-- ofertę.
--
-- ## Kształt odpowiedzi
--
-- `answers` to jsonb `{ [questionId]: string | string[] }`, a nie kolumny.
-- Zestaw pytań będzie się zmieniał (każda pracownia pyta trochę inaczej),
-- a migracja bazy przy każdej zmianie formularza to koszt, którego ten
-- dokument nie jest wart. Kształt pilnuje zod w `domain/brief`.
--
-- ⚠️ Wersję zestawu pytań zapisujemy razem z odpowiedziami (`template`).
--    Bez tego brief sprzed pół roku pokazywałby dzisiejsze pytania obok
--    wczorajszych odpowiedzi — czyli kłamał.
-- =============================================================================

create table if not exists public.client_briefs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  -- Brief może dotyczyć konkretnej inwestycji albo klienta w ogóle
  -- (pierwszy kontakt, zanim teczka w ogóle powstanie).
  project_id   uuid references public.projects(id) on delete set null,

  token text not null unique default translate(
    encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_'
  ),

  -- Snapshot pytań, na które klient odpowiadał.
  template jsonb not null default '[]'::jsonb,
  answers  jsonb not null default '{}'::jsonb,

  expires_at   timestamptz,
  revoked_at   timestamptz,
  submitted_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at  timestamptz,
  view_count   int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_briefs_client_idx
  on public.client_briefs (client_id, created_at desc);
create index if not exists client_briefs_workspace_idx
  on public.client_briefs (workspace_id, created_at desc);

comment on table public.client_briefs is
  'Brief wypelniany przez klienta pod magic linkiem. Pierwszy etap wspolpracy, przed wycena.';
comment on column public.client_briefs.template is
  'Snapshot zestawu pytan z chwili wystawienia linku — bez niego stary brief pokazywalby dzisiejsze pytania obok wczorajszych odpowiedzi.';
comment on column public.client_briefs.answers is
  'Odpowiedzi jako { questionId: string | string[] }. Ksztalt pilnuje zod w domain/brief.';

-- -----------------------------------------------------------------------------
-- RLS — jak wszedzie: tylko czlonek workspace'u.
-- -----------------------------------------------------------------------------
alter table public.client_briefs enable row level security;

drop policy if exists "client_briefs: select member" on public.client_briefs;
create policy "client_briefs: select member" on public.client_briefs
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "client_briefs: insert member" on public.client_briefs;
create policy "client_briefs: insert member" on public.client_briefs
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "client_briefs: update member" on public.client_briefs;
create policy "client_briefs: update member" on public.client_briefs
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "client_briefs: delete member" on public.client_briefs;
create policy "client_briefs: delete member" on public.client_briefs
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.client_briefs to authenticated;

-- `updated_at` — ten sam trigger, co w reszcie schematu.
drop trigger if exists client_briefs_set_updated_at on public.client_briefs;
create trigger client_briefs_set_updated_at
  before update on public.client_briefs
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Sciezka anonima — dwa RPC, kazde zaczyna od sprawdzenia tokenu.
-- =============================================================================

/**
 * Status linku do briefu. Ta sama logika co `share_status`, ale nad wlasna
 * tabela: wspolna funkcja musialaby przyjmowac nazwe tabeli i przestalaby byc
 * `stable`, a przy okazji dalaby jedno miejsce, w ktorym da sie pomylic
 * ofertę z briefem.
 */
create or replace function public.brief_status(p_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select case
           when p_token is null or btrim(p_token) = '' then 'not_found'
           when not exists (select 1 from public.client_briefs where token = p_token) then 'not_found'
           when exists (
             select 1 from public.client_briefs where token = p_token and revoked_at is not null
           ) then 'revoked'
           when exists (
             select 1 from public.client_briefs
              where token = p_token and expires_at is not null and expires_at <= now()
           ) then 'expired'
           else 'ok'
         end;
$$;

create or replace function public.get_shared_brief(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_brief  public.client_briefs;
  v_brand  public.brand_kits;
  v_status text;
begin
  v_status := public.brief_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  select * into v_brief from public.client_briefs where token = p_token;
  select * into v_brand from public.brand_kits where workspace_id = v_brief.workspace_id;

  update public.client_briefs
     set view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now()
   where id = v_brief.id;

  return jsonb_build_object(
    'ok', true,
    'brief', jsonb_build_object(
      'template',    v_brief.template,
      'answers',     v_brief.answers,
      'submittedAt', v_brief.submitted_at
    ),
    -- Ten sam okrojony brand kit co przy ofercie: klient ma zobaczyć, że
    -- formularz jest od TEJ pracowni, a nie od anonimowego narzędzia.
    'brand', jsonb_build_object(
      'companyName', coalesce(v_brand.company_name, ''),
      'accentColor', coalesce(v_brand.accent_color, '#33251E'),
      'bgColor',     coalesce(v_brand.bg_color, '#EFECE8'),
      'contacts',    coalesce(v_brand.contacts, '[]'::jsonb),
      'address',     v_brand.address,
      'footerText',  v_brand.footer_text,
      'logoPath',    v_brand.logo_dark_path
    ),
    'share', jsonb_build_object('expiresAt', v_brief.expires_at)
  );
end;
$$;

comment on function public.get_shared_brief(text) is
  'Brief do wypelnienia po tokenie. Nie zwraca workspace_id ani client_id — token jest jedynym uchwytem.';

/**
 * Zapis odpowiedzi.
 *
 * Klient moze zapisac brief WIELE RAZY, dopoki link zyje: wypelnianie
 * dwudziestu pytan na raz jest nierealne, a formularz, ktory po pierwszym
 * „Zapisz" przestaje przyjmowac zmiany, zmusza do poprawiania przez telefon.
 * `submitted_at` znaczy wiec „ostatnio odeslany", a nie „zamkniety".
 *
 * Szablonu NIE przyjmujemy od klienta — tylko odpowiedzi. Snapshot pytan
 * powstal przy wystawieniu linku i jest dowodem, na co klient odpowiadal.
 */
create or replace function public.submit_shared_brief(
  p_token   text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_brief  public.client_briefs;
  v_status text;
begin
  v_status := public.brief_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'message_required');
  end if;

  select * into v_brief from public.client_briefs where token = p_token for update;

  update public.client_briefs
     set answers      = p_answers,
         submitted_at = now()
   where id = v_brief.id;

  return jsonb_build_object('ok', true, 'submittedAt', now());
end;
$$;

comment on function public.submit_shared_brief(text, jsonb) is
  'Zapis odpowiedzi klienta. Mozna powtarzac, dopoki link zyje — brief wypelnia sie na raty.';

revoke all on function public.brief_status(text) from public;
revoke all on function public.get_shared_brief(text) from public;
revoke all on function public.submit_shared_brief(text, jsonb) from public;

grant execute on function public.get_shared_brief(text) to anon, authenticated;
grant execute on function public.submit_shared_brief(text, jsonb) to anon, authenticated;
