-- =============================================================================
-- 0035 — Wizja lokalna w projekcie (T-94 / poprawka 10 z 2026-08-27)
--
-- ## Co to jest w zawodzie
--
-- Wizja lokalna to **pierwsza wizyta na budowie albo w mieszkaniu**: obmiar,
-- spis instalacji, zdjęcia stanu zastanego, lista rzeczy, które trzeba
-- sprawdzić albo uzgodnić z wykonawcą. Robi się ją raz na początku i wraca do
-- niej przez cały projekt — bo to jedyny zapis tego, jak było, ZANIM ktokolwiek
-- czegokolwiek dotknął.
--
-- ## Dlaczego osobna tabela, a nie notatka projektu
--
-- Notatka projektu jest jednym polem tekstowym i nie ma daty wizyty, obmiaru
-- ani zdjęć. Wizja lokalna ma je wszystkie i — co ważniejsze — **bywa więcej
-- niż jedna**: druga po wyburzeniach, trzecia przed montażem. Każda opisuje
-- inny stan tego samego wnętrza i nadpisywanie jednej drugą kasowałoby
-- dokładnie to, po co się je robi.
--
-- ## Kształt danych
--
-- `rooms` (obmiar) i `checks` (spis instalacji) to jsonb, nie kolumny: zestaw
-- rzeczy, które się sprawdza, różni się między pracowniami i między
-- inwestycjami. Kształtu pilnuje zod w `domain/site-visit`.
--
-- Zdjęcia idą do istniejącej tabeli `files` — jeden magazyn plików, jedno
-- miejsce liczenia limitu 2 GB. Wizja dostaje tylko wskaźnik.
-- =============================================================================

create table if not exists public.site_visits (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,

  -- Data wizyty, nie utworzenia wpisu: notatkę spisuje się zwykle wieczorem.
  visited_at date not null default current_date,
  /** Kto był obecny — projektant, inwestor, wykonawca, kierownik budowy. */
  attendees  text not null default '',

  /** Obmiar: [{ id, name, lengthCm, widthCm, heightCm, note }]. */
  rooms  jsonb not null default '[]'::jsonb,
  /** Spis instalacji i stanu: [{ id, label, state, note }]. */
  checks jsonb not null default '[]'::jsonb,

  /** Notatka z wizji — obserwacje, ustalenia, ryzyka. */
  notes text not null default '',

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_visits_project_idx
  on public.site_visits (project_id, visited_at desc);

comment on table public.site_visits is
  'Wizja lokalna: obmiar, spis instalacji, zdjecia i notatka ze stanu zastanego. Bywa wiecej niz jedna na projekt.';
comment on column public.site_visits.visited_at is
  'Data WIZYTY, nie utworzenia wpisu — notatke spisuje sie zwykle wieczorem.';
comment on column public.site_visits.rooms is
  'Obmiar pomieszczen. Wymiary w CENTYMETRACH (int) — te same zasady co przy pieniadzach: liczby calkowite, przeliczenie tylko w prezentacji.';

alter table public.site_visits enable row level security;

drop policy if exists "site_visits: select member" on public.site_visits;
create policy "site_visits: select member" on public.site_visits
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "site_visits: insert member" on public.site_visits;
create policy "site_visits: insert member" on public.site_visits
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "site_visits: update member" on public.site_visits;
create policy "site_visits: update member" on public.site_visits
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "site_visits: delete member" on public.site_visits;
create policy "site_visits: delete member" on public.site_visits
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.site_visits to authenticated;

drop trigger if exists site_visits_set_updated_at on public.site_visits;
create trigger site_visits_set_updated_at
  before update on public.site_visits
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Zdjecia z wizji — WSKAZNIK w istniejacej tabeli plikow, nie drugi magazyn.
--
-- `on delete set null`: skasowanie wizji nie moze zabrac zdjec z archiwum
-- klienta. Zostaja tam, gdzie byly — traca tylko przypisanie do wizyty.
-- -----------------------------------------------------------------------------
alter table public.files
  add column if not exists site_visit_id uuid references public.site_visits(id) on delete set null;

create index if not exists files_site_visit_idx
  on public.files (site_visit_id, created_at)
  where deleted_at is null and site_visit_id is not null;

comment on column public.files.site_visit_id is
  'Zdjecie zrobione podczas tej wizji lokalnej (T-94). NULL = zwykly plik projektu.';
