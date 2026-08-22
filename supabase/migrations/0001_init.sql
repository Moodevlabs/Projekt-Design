-- =============================================================================
-- 0001_init.sql — schemat podstawowy (docs/02-DATABASE.md §1)
-- Workspace = firma. Na start 1 user = 1 workspace (tworzony triggerem po signup).
-- RLS i funkcje pomocnicze: 0004_functions_rls.sql
-- =============================================================================

-- pgcrypto: gen_salt()/crypt() dla seeda + gen_random_uuid().
create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- Wspólny trigger odświeżający updated_at. Podpięty pod KAŻDĄ tabelę,
-- która ma kolumnę updated_at (także w 0002/0003).
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: ustawia updated_at = now().';

-- -----------------------------------------------------------------------------
-- workspaces — firma / przestrzeń robocza
-- -----------------------------------------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  -- waluta, vat, wzorzec numeracji, showDisabledItems...
  settings    jsonb not null default '{}'::jsonb,
  -- licznik numeracji wycen; inkrementowany wyłącznie przez next_quote_number()
  quote_seq   int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

drop trigger if exists set_updated_at on public.workspaces;
create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- workspace_members — członkostwo (faza 3: zaproszenia, role)
-- -----------------------------------------------------------------------------
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner','member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);

-- -----------------------------------------------------------------------------
-- profiles — dane usera 1:1 z auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists profiles_default_workspace_id_idx
  on public.profiles (default_workspace_id);

-- -----------------------------------------------------------------------------
-- brand_kits — branding do PDF (1:1 z workspace)
-- -----------------------------------------------------------------------------
create table if not exists public.brand_kits (
  workspace_id       uuid primary key references public.workspaces(id) on delete cascade,
  company_name       text not null default '',
  logo_dark_path     text,
  logo_light_path    text,
  accent_color       text not null default '#21201C',
  bg_color           text not null default '#FAF7F1',
  font_family        text not null default 'Lato',
  contacts           jsonb not null default '[]'::jsonb,
  address            text,
  tax_id             text,
  footer_text        text,
  default_intro      text,
  default_valid_days int not null default 7,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.brand_kits.logo_dark_path is
  'Ścieżka w prywatnym buckecie storage, np. brand/{workspace_id}/logo-dark.png';
comment on column public.brand_kits.contacts is
  'Tablica [{name, phone, email}] — kontakty drukowane w stopce PDF.';

drop trigger if exists set_updated_at on public.brand_kits;
create trigger set_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- clients — CRM-lite (T-18); soft delete
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists clients_workspace_id_idx
  on public.clients (workspace_id) where deleted_at is null;

drop trigger if exists set_updated_at on public.clients;
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- quotes — dokument wyceny. body = QuoteBody (zod) w JSONB.
-- Totale zdenormalizowane (grosze, bigint) na potrzeby list i statystyk.
-- -----------------------------------------------------------------------------
create table if not exists public.quotes (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid references public.clients(id) on delete set null,
  number            text,
  title             text not null default 'Wycena',
  status            text not null default 'draft'
                      check (status in ('draft','sent','accepted','rejected','expired')),
  body              jsonb not null,
  total_net_cents   bigint not null default 0,
  total_gross_cents bigint not null default 0,
  currency          text not null default 'PLN',
  client_name       text,
  sent_at           timestamptz,
  accepted_at       timestamptz,
  valid_until       date,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

comment on column public.quotes.number is 'Numer wg wzorca, np. WYC/2026/08/0012 — nadawany przez next_quote_number().';
comment on column public.quotes.body is 'QuoteBody (zod): sekcje → grupy → pozycje. Edytowane w całości przez edytor.';
comment on column public.quotes.client_name is 'Kopia nazwy klienta z body — do wyszukiwania na liście bez rozpakowywania JSONB.';

-- Główny indeks list: filtr po workspace + status, sort po updated_at desc.
create index if not exists quotes_ws_status_updated_idx
  on public.quotes (workspace_id, status, updated_at desc);
-- Wyszukiwanie wewnątrz dokumentu (statystyki pozycji, faza 3).
create index if not exists quotes_body_gin_idx
  on public.quotes using gin (body jsonb_path_ops);
create index if not exists quotes_client_id_idx on public.quotes (client_id);
create index if not exists quotes_created_by_idx on public.quotes (created_by);
-- Numer unikalny w obrębie workspace; szkice mogą mieć NULL.
create unique index if not exists quotes_ws_number_uidx
  on public.quotes (workspace_id, number) where number is not null;

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- quote_templates — szablony wycen (T-11)
-- -----------------------------------------------------------------------------
create table if not exists public.quote_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  body         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists quote_templates_workspace_id_idx
  on public.quote_templates (workspace_id);

drop trigger if exists set_updated_at on public.quote_templates;
create trigger set_updated_at before update on public.quote_templates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- library_items — biblioteka pozycji (T-10); soft delete
-- -----------------------------------------------------------------------------
create table if not exists public.library_items (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  category         text not null default 'Inne',
  kind             text not null default 'item' check (kind in ('item','discount')),
  name             text not null,
  description      text not null default '',
  unit_price_cents bigint not null default 0,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists library_items_ws_category_sort_idx
  on public.library_items (workspace_id, category, sort_order) where deleted_at is null;

drop trigger if exists set_updated_at on public.library_items;
create trigger set_updated_at before update on public.library_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- library_groups — zestaw startowy pozycji.
-- items = SNAPSHOT (nie FK), bo grupa ma być niezależna od zmian w bibliotece.
-- -----------------------------------------------------------------------------
create table if not exists public.library_groups (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  items        jsonb not null default '[]'::jsonb,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on column public.library_groups.items is
  'Snapshot pozycji (Item[] z QuoteBody), nie klucze obce — grupa to zestaw startowy.';

create index if not exists library_groups_ws_sort_idx
  on public.library_groups (workspace_id, sort_order) where deleted_at is null;

drop trigger if exists set_updated_at on public.library_groups;
create trigger set_updated_at before update on public.library_groups
  for each row execute function public.set_updated_at();
