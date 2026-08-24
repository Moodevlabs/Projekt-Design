# 02 — Baza danych (Supabase)

Region: `eu-central-1`. Każda tabela: RLS ON, `created_at`, `updated_at` (trigger `set_updated_at()`), soft delete tam, gdzie użytkownik może żałować.

## 1. Schemat

```sql
-- 0001_init.sql
create extension if not exists "pgcrypto";

-- Workspace = firma. Na start 1 user = 1 workspace (tworzony triggerem po signup).
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,   -- waluta, vat, wzorzec numeracji, showDisabledItems...
  quote_seq int not null default 0,              -- licznik do numeracji
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  primary key (workspace_id, user_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  default_workspace_id uuid references workspaces(id),
  created_at timestamptz default now()
);

create table brand_kits (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  company_name text not null default '',
  logo_dark_path text,       -- storage: brand/{workspace_id}/logo-dark.png
  logo_light_path text,
  accent_color text not null default '#21201C',
  bg_color text not null default '#FAF7F1',
  font_family text not null default 'Lato',
  contacts jsonb not null default '[]'::jsonb,  -- [{name, phone, email}]
  address text, tax_id text, footer_text text,
  default_intro text, default_valid_days int default 7,
  updated_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null, phone text, email text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  number text,                                   -- WYC/2026/08/0012
  title text not null default 'Wycena',
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired')),
  body jsonb not null,                           -- QuoteBody (zod) — sekcje/grupy/pozycje
  total_net_cents bigint not null default 0,     -- zdenormalizowane do list/statystyk
  total_gross_cents bigint not null default 0,
  currency text not null default 'PLN',
  client_name text,                              -- kopia do wyszukiwania
  sent_at timestamptz, accepted_at timestamptz, valid_until date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index on quotes (workspace_id, status, updated_at desc);
create index on quotes using gin (body jsonb_path_ops);

create table quote_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  body jsonb not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table library_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category text not null default 'Inne',
  kind text not null default 'item' check (kind in ('item','discount')),
  name text not null, description text default '',
  unit_price_cents bigint not null default 0,
  sort_order int not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table library_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,   -- snapshot pozycji (nie FK) — grupa ma być „zestawem startowym"
  sort_order int not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
-- 0002_billing.sql
create table subscriptions (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','incomplete','unpaid','paused')),
  plan text,                                  -- okres rozliczeniowy: 'monthly' | 'yearly'
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);

-- idempotencja webhooków
create table stripe_events (
  id text primary key,            -- evt_...
  type text not null,
  processed_at timestamptz default now()
);
```

```sql
-- 0003_acceptances.sql (faza 3, ale stwórz od razu — tanie)
create table quote_shares (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  token text not null unique,                  -- 32 bajty base64url
  expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz default now()
);
create table quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  share_id uuid references quote_shares(id),
  accepted_body jsonb not null,                -- snapshot z wyborami klienta
  signer_name text, signer_ip inet, signature_path text,
  accepted_at timestamptz default now()
);
```

## 2. Funkcje i triggery

```sql
-- po signup: profil + workspace + member + brand_kit + subscription(trial 14 dni)
create function handle_new_user() returns trigger language plpgsql security definer as $$
declare ws uuid;
begin
  insert into workspaces (name, owner_id) values (coalesce(new.raw_user_meta_data->>'company', 'Moja firma'), new.id) returning id into ws;
  insert into workspace_members values (ws, new.id, 'owner');
  insert into profiles (id, full_name, default_workspace_id) values (new.id, new.raw_user_meta_data->>'full_name', ws);
  insert into brand_kits (workspace_id) values (ws);
  insert into subscriptions (workspace_id, status, trial_ends_at) values (ws, 'trialing', now() + interval '14 days');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- numeracja: atomowa
create function next_quote_number(ws uuid) returns text language plpgsql as $$
declare seq int; pattern text;
begin
  update workspaces set quote_seq = quote_seq + 1 where id = ws returning quote_seq into seq;
  select coalesce(settings->>'numberPattern', 'WYC/{YYYY}/{MM}/{seq}') into pattern from workspaces where id = ws;
  return replace(replace(replace(pattern, '{YYYY}', to_char(now(),'YYYY')), '{MM}', to_char(now(),'MM')), '{seq}', lpad(seq::text, 4, '0'));
end $$;

-- helper do RLS
create function is_member(ws uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

-- helper do gatingu zapisu (RLS twarda granica, nie tylko UI)
create function workspace_can_write(ws uuid) returns boolean language sql stable security definer as $$
  select exists (
    select 1 from subscriptions s where s.workspace_id = ws
      and (s.status in ('active','trialing')
           or (s.status = 'past_due' and s.current_period_end > now() - interval '7 days'))  -- 7 dni grace
      and (s.status <> 'trialing' or s.trial_ends_at > now())
  );
$$;
```

## 3. RLS (wzór — powtórz dla każdej tabeli z `workspace_id`)

```sql
alter table quotes enable row level security;
create policy "select own ws" on quotes for select using (is_member(workspace_id));
create policy "insert own ws" on quotes for insert with check (is_member(workspace_id) and workspace_can_write(workspace_id));
create policy "update own ws" on quotes for update using (is_member(workspace_id) and workspace_can_write(workspace_id));
create policy "delete own ws" on quotes for delete using (is_member(workspace_id) and workspace_can_write(workspace_id));
```

- `subscriptions`, `stripe_events`: **select** dla członków, **brak insert/update z klienta** — tylko service role (Edge Functions).
- `workspaces`: update tylko owner.
- `brand_kits`: select member, update member (zapis ustawień brandingu nie powinien być blokowany przez wygasłą subskrypcję? — **tak, blokujemy**, spójnie; read-only to read-only).
- Storage bucket `brand` (prywatny): policy na ścieżkę `{workspace_id}/*` przez `is_member`. Logo do PDF pobierane signed URL → base64 → @react-pdf.

## 3a. Rozszerzenia z koncepcji workspace'u (2026-08-24, T-53…T-66)

Pełne DDL i reguły: `docs/FEATURES-Z-KONCEPCJI.md` (§2 klienci/projekty, §3 pliki, §4 wersje, §5 biblioteka, §6 szablony). Tu tylko skrót, żeby schemat był w jednym miejscu:

| Migracja (kolejny numer) | Zmiana |
|---|---|
| `clients` | `+ address, city, status ('active'\|'archived'), archived_at` |
| `projects` (nowa) | `workspace_id, client_id, name, address, city, area_m2, kind, status ('lead'\|'offer'\|'in_progress'\|'done'\|'canceled'), start_date, notes, sort_order, created_by, deleted_at`; RLS + **jawne granty** |
| `quotes` | `+ project_id (fk, set null)`, `+ lineage_id`, `+ version int default 1`; status `+ 'archived'`; unikalny indeks częściowy: jeden `accepted` na `project_id` |
| `files` (nowa) | `workspace_id, client_id, project_id?, quote_id?, kind ('upload'\|'generated'), doc_type, quote_version, name, mime, size_bytes, storage_path unique, created_by, deleted_at`; RLS + granty |
| bucket `files` | prywatny, `file_size_limit 25 MiB`, polityki jak `brand` (`storage_workspace_id` + `is_member` + `workspace_can_write`) |
| `workspaces` | `+ storage_quota_bytes default 2 GiB`, `+ storage_used_bytes` (trigger na `files`: before insert odbija `STORAGE_QUOTA_EXCEEDED`, after insert/delete aktualizuje licznik) |
| `library_categories` (nowa) | `workspace_id, name, code, color, sort_order, is_sample, deleted_at`; migracja danych z `library_items.category` |
| `library_items` | `+ category_id`, `+ unit` (enum 9 wartości), `+ unit_label`, `+ min_price_cents`, `+ active default true`, `+ is_sample`; **`unit_price_cents` staje się nullable** (= wycena indywidualna) |
| `quote_templates` | `+ schedule jsonb`, `+ documents jsonb` |
| `handle_new_user()` | `+ seed_library_sample(ws)` (idempotentna, tylko puste biblioteki) |
| RPC `library_item_usage(ws)` | statystyki użycia po `quotes.body` (GIN) |
| `subscriptions.plan` | bez zmian; ceny Stripe `toolier_monthly` / `toolier_yearly` (T-66) |

Zasady, które obowiązują każdą z tych migracji: jawne `grant` (pułapka z T-33), RLS na każdej tabeli, `set_updated_at()`, soft delete tam, gdzie użytkownik może żałować (`clients`, `projects`, `files`, `library_categories`). **`library_groups` (zestawy) nie zmienia nazwy** mimo zmiany etykiety w UI.

Storage: bucket `files` — `{workspace_id}/{client_id}/{project_id|_}/{uuid}.{ext}`. `delete-account` musi sprzątać **oba** buckety (`brand`, `files`).

## 4. Typy

Po każdej migracji: `supabase gen types typescript --local > src/data/types.generated.ts`. Repozytoria mapują wiersze na typy domenowe (`QuoteBody` parsowany zodem przy odczycie — jeśli parse padnie, logujemy i pokazujemy „wycena uszkodzona", nie wywalamy apki).

## 5. Seed (`seed.sql`)
Użytkownik testowy `demo@toolier.local` / `demo1234` (do T-65: `demo@anzorge.local`), brand kit „Studio Demo", 15 pozycji bibliotecznych w 3 kategoriach (projekt, nadzór, dodatki), 2 zestawy (Kuchnia, Łazienka), 3 wyceny w różnych statusach, 1 szablon. Od T-53/54: 2 klientów, 3 projekty, wyceny przypięte do projektów (jedna linia z dwiema wersjami). Seed demo **nie** dostaje biblioteki przykładowej (ma własne ceny, których używają testy parytetu).
