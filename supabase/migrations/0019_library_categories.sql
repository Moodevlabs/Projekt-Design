-- =============================================================================
-- 0019_library_categories.sql — grupy jako słownik (B1, T-59)
--
-- Dwa pojęcia, które dotąd zlewały się w jedno słowo, rozchodzą się:
--   • **Grupa**  = dział/etap porządkujący usługi („01 · Przygotowanie") —
--     nowa tabela `library_categories`;
--   • **Zestaw** = dotychczasowa tabela `library_groups` (snapshot pozycji
--     do wstawienia na raz, np. „Kuchnia").
--
-- Tabela `library_groups` **NIE zmienia nazwy** (§9.3) — snapshoty mają własną
-- ścieżkę zgodności i testy integracyjne. Zmienia się tylko etykieta w UI.
-- =============================================================================

create table if not exists public.library_categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  code         text,
  color        text,
  sort_order   int not null default 0,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table public.library_categories is
  'Slownik grup (dzialow/etapow) porzadkujacy uslugi. Zestawy to osobna tabela library_groups.';

comment on column public.library_categories.code is
  'Prefiks widoczny na liscie, np. „01". Opcjonalny — nie kazde studio numeruje etapy.';

comment on column public.library_categories.color is
  'Token z palety (nie dowolny hex) — patrz 05-UI. NULL = bez koloru.';

create index if not exists library_categories_ws_idx
  on public.library_categories (workspace_id, sort_order)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.library_categories;
create trigger set_updated_at before update on public.library_categories
  for each row execute function public.set_updated_at();

alter table public.library_items
  add column if not exists category_id uuid references public.library_categories(id) on delete set null;

create index if not exists library_items_category_idx
  on public.library_items (category_id)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- Migracja danych: `distinct category` (tekst) → wiersze słownika.
--
-- Kolejność **alfabetyczna**, bo tekstowa kolumna nie niosła żadnej innej.
-- `code` zostaje puste — numeracji etapów nikt dotąd nie wpisywał i zgadywanie
-- jej z nazwy („Projekt" → „01"?) byłoby wymyślaniem danych.
--
-- Idempotentne: powtórzony przebieg nie zdubluje grup (`not exists`).
-- -----------------------------------------------------------------------------
insert into public.library_categories (workspace_id, name, sort_order)
select
  src.workspace_id,
  src.name,
  (row_number() over (partition by src.workspace_id order by src.name) - 1)::int
from (
  select distinct
    i.workspace_id,
    coalesce(nullif(trim(i.category), ''), 'Inne') as name
  from public.library_items i
  where i.deleted_at is null
) src
where not exists (
  select 1
    from public.library_categories c
   where c.workspace_id = src.workspace_id
     and c.name = src.name
     and c.deleted_at is null
);

update public.library_items i
   set category_id = c.id
  from public.library_categories c
 where c.workspace_id = i.workspace_id
   and c.name = coalesce(nullif(trim(i.category), ''), 'Inne')
   and c.deleted_at is null
   and i.category_id is null;

-- Kolumna tekstowa `category` **zostaje na jedną wersję** jako kopia do
-- wyszukiwania i zgodności z importem CSV. Usunięcie zaplanowane jako T-69 —
-- kasowanie jej razem z migracją znaczyłoby, że nie da się wrócić, gdyby
-- coś w mapowaniu poszło źle.
comment on column public.library_items.category is
  'DEPRECATED (T-69): kopia nazwy grupy. Zrodlem jest category_id → library_categories.';

-- -----------------------------------------------------------------------------
-- RLS — wzorzec z `0004`.
-- -----------------------------------------------------------------------------
alter table public.library_categories enable row level security;

drop policy if exists "library_categories: select member" on public.library_categories;
create policy "library_categories: select member" on public.library_categories
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "library_categories: insert member" on public.library_categories;
create policy "library_categories: insert member" on public.library_categories
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "library_categories: update member" on public.library_categories;
create policy "library_categories: update member" on public.library_categories
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "library_categories: delete member" on public.library_categories;
create policy "library_categories: delete member" on public.library_categories
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

-- Granty jawne (pułapka z T-33).
grant select, insert, update, delete on public.library_categories to authenticated;
grant all on public.library_categories to service_role;
