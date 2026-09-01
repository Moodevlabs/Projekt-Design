-- 0048_library_doc_groups.sql — grupy i zestawy bibliotek dokumentów (T-121)
--
-- Usługi mają dwa byty porządkujące (T-59): **grupę** — słownik działów, po
-- którym rozkłada się listę — i **zestaw** — snapshot pozycji wstawiany jednym
-- gestem. Termin, etapy współpracy i cennik dodatkowy miały od T-102 tylko
-- płaską listę wpisów. Ta migracja daje im oba, w tym samym kształcie.
--
-- Wzorzec jest ten sam co przy `library_doc_entries`: JEDNA tabela na wszystkie
-- trzy rodzaje, z dyskryminatorem `kind`. Trzy pary tabel różniłyby się tylko
-- wartością tej kolumny, a listowanie, kolejność, soft delete i RLS są
-- identyczne.
--
-- ⚠️ Nazewnictwo idzie za bazą usług, nie za UI: `*_categories` to GRUPY
-- (słownik), `*_sets` to ZESTAWY. W usługach zestawy siedzą w tabeli
-- historycznie nazwanej `library_groups` (§9.3) — tutaj tego długu nie
-- powtarzamy, bo tabele powstają od zera.

-- =============================================================================
-- Grupy (słownik) — „01 · Koncepcja", „02 · Projekt".
-- =============================================================================
create table if not exists public.library_doc_categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null check (kind in ('schedule', 'stages', 'price_list')),
  name         text not null,
  code         text,
  color        text,
  sort_order   int not null default 0,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  -- Klucz kandydujący pod ZŁOŻONY klucz obcy z `library_doc_entries`.
  -- Bez niego dałoby się przypiąć etap terminu do grupy cennika — patrz
  -- komentarz przy `library_doc_entries_category_fkey` niżej.
  constraint library_doc_categories_id_kind_key unique (id, kind)
);

comment on table public.library_doc_categories is
  'Slownik grup bibliotek dokumentow (T-121). kind rozroznia rodzaj dokumentu, tak jak w library_doc_entries.';
comment on column public.library_doc_categories.code is
  'Prefiks widoczny na liscie, np. „01". Opcjonalny — nie kazde studio numeruje etapy.';
comment on column public.library_doc_categories.color is
  'Token z palety LIBRARY_COLORS (nie dowolny hex) — ta sama paleta co grupy uslug.';

create index if not exists library_doc_categories_ws_kind_idx
  on public.library_doc_categories (workspace_id, kind, sort_order)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.library_doc_categories;
create trigger set_updated_at before update on public.library_doc_categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Wpis dokumentu wskazuje grupę.
--
-- ⚠️ Klucz obcy jest ZŁOŻONY: `(category_id, kind)` → `(id, kind)`. Samo
-- `category_id` pozwoliłoby wpisać etap terminu do grupy cennika — baza by to
-- przyjęła, lista rodzaju by tego wpisu nie pokazała (filtruje po `kind`),
-- a człowiek szukałby zaginionego etapu.
--
-- ⚠️⚠️ `on delete set null` MUSI wskazać kolumnę: **`set null (category_id)`**.
-- Bez listy kolumn Postgres zeruje WSZYSTKIE kolumny klucza — czyli także
-- `kind`, który jest `not null`. Skutek byłby taki, że skasowanie grupy
-- wywala się błędem, a razem z nim kasowanie workspace'u (obie tabele wiszą
-- na nim przez `on delete cascade`). Sprawdzone na żywej bazie przy T-121:
-- bez listy kolumn `delete from library_doc_categories` kończy się
-- „null value in column kind violates not-null constraint".
-- -----------------------------------------------------------------------------
alter table public.library_doc_entries
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'library_doc_entries_category_fkey'
  ) then
    alter table public.library_doc_entries
      add constraint library_doc_entries_category_fkey
      foreign key (category_id, kind)
      references public.library_doc_categories (id, kind)
      on delete set null (category_id);
  end if;
end $$;

create index if not exists library_doc_entries_category_idx
  on public.library_doc_entries (category_id)
  where deleted_at is null;

-- =============================================================================
-- Zestawy — snapshot kompletu wpisów, wstawiany jednym gestem.
-- =============================================================================
create table if not exists public.library_doc_sets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null check (kind in ('schedule', 'stages', 'price_list')),
  name         text not null,
  items        jsonb not null default '[]'::jsonb,
  sort_order   int not null default 0,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table public.library_doc_sets is
  'Zestawy bibliotek dokumentow (T-121): gotowy komplet wpisow do wstawienia naraz.';
comment on column public.library_doc_sets.items is
  'SNAPSHOT tablicy payloadow (nie klucze obce) — zestaw ma zostac taki, jaki byl w chwili zlozenia. Tak samo jak library_groups.items przy uslugach.';

create index if not exists library_doc_sets_ws_kind_idx
  on public.library_doc_sets (workspace_id, kind, sort_order)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.library_doc_sets;
create trigger set_updated_at before update on public.library_doc_sets
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — jawne polityki i jawne granty, wzorzec z `0043` (pułapka z T-33:
-- samo `enable row level security` bez grantów daje ciszę zamiast błędu).
-- =============================================================================
alter table public.library_doc_categories enable row level security;

drop policy if exists "library_doc_categories: select member" on public.library_doc_categories;
create policy "library_doc_categories: select member" on public.library_doc_categories
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "library_doc_categories: insert member" on public.library_doc_categories;
create policy "library_doc_categories: insert member" on public.library_doc_categories
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "library_doc_categories: update member" on public.library_doc_categories;
create policy "library_doc_categories: update member" on public.library_doc_categories
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "library_doc_categories: delete member" on public.library_doc_categories;
create policy "library_doc_categories: delete member" on public.library_doc_categories
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.library_doc_categories to authenticated;
grant all on public.library_doc_categories to service_role;

alter table public.library_doc_sets enable row level security;

drop policy if exists "library_doc_sets: select member" on public.library_doc_sets;
create policy "library_doc_sets: select member" on public.library_doc_sets
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "library_doc_sets: insert member" on public.library_doc_sets;
create policy "library_doc_sets: insert member" on public.library_doc_sets
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "library_doc_sets: update member" on public.library_doc_sets;
create policy "library_doc_sets: update member" on public.library_doc_sets
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "library_doc_sets: delete member" on public.library_doc_sets;
create policy "library_doc_sets: delete member" on public.library_doc_sets
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.library_doc_sets to authenticated;
grant all on public.library_doc_sets to service_role;
