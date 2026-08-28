-- 0043_library_doc_entries.sql — biblioteka dokumentów (T-102)
--
-- Wycena ma bibliotekę usług. Od Fazy 5 pozostałe rodzaje dokumentu dostają
-- własne sekcje w Bibliotece: etapy terminu, etapy współpracy, pozycje
-- cennika dodatkowego. Jedna tabela z dyskryminatorem `kind`, nie trzy:
-- wiersze różnią się tylko kształtem `payload`, a listowanie, kolejność,
-- soft delete i RLS są identyczne.
--
-- `payload` trzyma wpis W KSZTAŁCIE ISTNIEJĄCYCH SCHEMATÓW bez `id`
-- (`StageTemplate`, `StageTemplateEntry`, `PriceListTemplateItem`) — dokładnie
-- to, co `workspaces.settings.*Template` niosło od T-43/T-46/T-47. Dzięki
-- temu „wstaw z biblioteki" to `newStage(payload)` bez żadnego mapowania.
-- `name` jest kopią `payload.name` na potrzeby listy i wyszukiwania.

create table if not exists public.library_doc_entries (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null check (kind in ('schedule', 'stages', 'price_list')),
  name         text not null,
  payload      jsonb not null default '{}'::jsonb,
  sort_order   int not null default 0,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table public.library_doc_entries is
  'Biblioteka dokumentow (T-102): etapy terminu, etapy wspolpracy, pozycje cennika. kind rozroznia ksztalt payload.';
comment on column public.library_doc_entries.payload is
  'Wpis bez id, w ksztalcie StageTemplate | StageTemplateEntry | PriceListTemplateItem (zod w domain/library/doc-entries.ts).';

create index if not exists library_doc_entries_ws_kind_idx
  on public.library_doc_entries (workspace_id, kind, sort_order)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.library_doc_entries;
create trigger set_updated_at before update on public.library_doc_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — wzorzec z `0019` (jawne polityki + jawne granty, pułapka z T-33).
-- -----------------------------------------------------------------------------
alter table public.library_doc_entries enable row level security;

drop policy if exists "library_doc_entries: select member" on public.library_doc_entries;
create policy "library_doc_entries: select member" on public.library_doc_entries
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "library_doc_entries: insert member" on public.library_doc_entries;
create policy "library_doc_entries: insert member" on public.library_doc_entries
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "library_doc_entries: update member" on public.library_doc_entries;
create policy "library_doc_entries: update member" on public.library_doc_entries
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "library_doc_entries: delete member" on public.library_doc_entries;
create policy "library_doc_entries: delete member" on public.library_doc_entries
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.library_doc_entries to authenticated;
grant all on public.library_doc_entries to service_role;

-- -----------------------------------------------------------------------------
-- Seed z wbudowanych szablonów — treść przychodzi Z APLIKACJI.
--
-- Etapy terminu, etapy współpracy i cennik mają wbudowane szablony w TS
-- (`domain/schedule/defaults.ts`, `domain/documents/*-defaults.ts`). Nie
-- przepisujemy ich do SQL: dwa źródła tej samej treści rozjechałyby się przy
-- pierwszej poprawce opisu. Aplikacja woła tę funkcję z gotową listą przy
-- pierwszym otwarciu sekcji; funkcja wstawia ją TYLKO wtedy, gdy workspace nie
-- ma jeszcze żadnego wpisu tego rodzaju — także skasowanego (soft delete
-- zostawia wiersz), więc „usunąłem wszystko" nie kończy się ponownym seedem.
--
-- Blokada wiersza workspace'u: dwa urządzenia otwierające sekcję w tej samej
-- sekundzie nie wstawią listy dwa razy.
-- -----------------------------------------------------------------------------
create or replace function public.seed_doc_library(ws uuid, kind text, entries jsonb)
returns int
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  inserted int := 0;
begin
  if not public.is_member(ws) then
    raise exception 'Brak dostępu do workspace %', ws using errcode = '42501';
  end if;

  if not public.workspace_can_write(ws) then
    raise exception 'Workspace % jest w trybie tylko do odczytu', ws using errcode = '42501';
  end if;

  if kind not in ('schedule', 'stages', 'price_list') then
    raise exception 'Nieznany rodzaj biblioteki dokumentów: %', kind using errcode = '22023';
  end if;

  if jsonb_typeof(entries) <> 'array' then
    raise exception 'entries musi być tablicą JSON' using errcode = '22023';
  end if;

  perform 1 from public.workspaces w where w.id = ws for update;

  if exists (
    select 1 from public.library_doc_entries e
     where e.workspace_id = ws and e.kind = seed_doc_library.kind
  ) then
    return 0;
  end if;

  insert into public.library_doc_entries (workspace_id, kind, name, payload, sort_order, is_sample)
  select
    ws,
    seed_doc_library.kind,
    coalesce(e.value->>'name', ''),
    e.value,
    (e.ordinality - 1)::int,
    true
  from jsonb_array_elements(entries) with ordinality as e(value, ordinality);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

comment on function public.seed_doc_library(uuid, text, jsonb) is
  'Idempotentny seed biblioteki dokumentow (T-102): wstawia liste tylko, gdy workspace nie ma zadnego wpisu tego rodzaju.';

revoke all on function public.seed_doc_library(uuid, text, jsonb) from public;
grant execute on function public.seed_doc_library(uuid, text, jsonb) to authenticated, service_role;
