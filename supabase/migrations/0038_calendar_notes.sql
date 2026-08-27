-- =============================================================================
-- 0038 — Notatki dzienne kalendarza (T-98)
--
-- ## Po co osobna tabela
--
-- Kalendarz zbiera terminy, które już istnieją w innych bytach: datę
-- rozpoczęcia projektu, wizję lokalną, ważność oferty, termin z harmonogramu.
-- Wszystkie one mają swojego właściciela i swoje miejsce w aplikacji — nie ma
-- powodu ich duplikować.
--
-- Brakuje natomiast miejsca na wpis, który do żadnego z tych bytów nie należy:
-- „montaż kuchni, 10:00", „odbiór płytek", „telefon do wykonawcy". W praktyce
-- takie ustalenia lądują na kartce albo w cudzym kalendarzu i giną.
--
-- ## Czego ta tabela świadomie NIE jest
--
-- Nie jest kalendarzem spotkań ani systemem zarządzania pracą (CLAUDE.md,
-- „Czego NIE robić"). Nie ma zaproszeń, uczestników, powtarzalności ani
-- powiadomień. Jest notatnikiem przypiętym do dnia — i tyle.
--
-- ## Model czasu
--
-- `day` to `date`, nie `timestamptz`. Notatka „12 września" ma zostać
-- 12 września niezależnie od strefy czasowej urządzenia; znacznik czasu
-- z chwilą północy potrafi przeskoczyć o dzień i nikt tego nie powiąże
-- ze strefą. Godzina jest osobna, opcjonalna (`at_time`), bo znakomita
-- większość wpisów jej nie ma.
-- =============================================================================

create table if not exists public.calendar_notes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Powiązania opcjonalne: notatka bywa ogólna („urlop"), a bywa przypięta
  -- do inwestycji. `on delete set null` — usunięcie teczki nie kasuje wpisu
  -- w kalendarzu, bo wpis opisuje CZAS, a nie teczkę.
  client_id  uuid references public.clients(id)  on delete set null,
  project_id uuid references public.projects(id) on delete set null,

  day     date not null,
  at_time time,
  text    text not null default '',
  done    boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_notes_workspace_day_idx
  on public.calendar_notes (workspace_id, day);

comment on table public.calendar_notes is
  'Notatki przypiete do dnia w kalendarzu. Nie jest to kalendarz spotkan ani system zarzadzania praca.';
comment on column public.calendar_notes.day is
  'Data jako date, nie timestamptz — wpis ma zostac w swoim dniu niezaleznie od strefy czasowej.';
comment on column public.calendar_notes.at_time is
  'Godzina opcjonalna. Wiekszosc wpisow jej nie ma i nie powinna byc do niej zmuszana.';

drop trigger if exists calendar_notes_set_updated_at on public.calendar_notes;
create trigger calendar_notes_set_updated_at
  before update on public.calendar_notes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — jak wszedzie: tylko czlonek workspace'u, zapis tylko z aktywnym dostepem.
-- -----------------------------------------------------------------------------
alter table public.calendar_notes enable row level security;

drop policy if exists "calendar_notes: select member" on public.calendar_notes;
create policy "calendar_notes: select member" on public.calendar_notes
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "calendar_notes: insert member" on public.calendar_notes;
create policy "calendar_notes: insert member" on public.calendar_notes
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "calendar_notes: update member" on public.calendar_notes;
create policy "calendar_notes: update member" on public.calendar_notes
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "calendar_notes: delete member" on public.calendar_notes;
create policy "calendar_notes: delete member" on public.calendar_notes
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.calendar_notes to authenticated;
