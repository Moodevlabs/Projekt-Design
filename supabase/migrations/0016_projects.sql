-- 0016_projects.sql — projekt jako teczka jednej inwestycji (K2, T-54)
--
-- Hierarchia z koncepcji: STUDIO → KLIENT → PROJEKT → wyceny. Projekt jest
-- bytem **lekkim** (decyzja D1): nazwa, adres, metraż, typ, status i notatki.
-- Nie jest harmonogramem ani systemem zarządzania pracą — statusy ustawia
-- człowiek, nie wyliczamy ich z wycen.

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text not null,
  address      text,
  city         text,
  area_m2      numeric(8,1),
  kind         text,
  status       text not null default 'lead',
  start_date   date,
  notes        text,
  sort_order   int not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

alter table public.projects
  drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('lead', 'offer', 'in_progress', 'done', 'canceled'));

-- `workspace_id` jest tu ZDENORMALIZOWANY względem `clients.workspace_id`
-- i to jest celowe: polityki RLS mają nie robić joina do klientów przy każdym
-- wierszu. Ta sama decyzja co w `quotes`.
comment on column public.projects.workspace_id is
  'Zdenormalizowane z clients.workspace_id — polityki RLS nie robia joina.';

comment on column public.projects.status is
  'lead | offer | in_progress | done | canceled. Ustawia czlowiek; NIE wyliczamy z wycen.';

comment on column public.projects.kind is
  'apartment | house | commercial | other albo wlasny tekst — slownika celowo nie ma.';

-- Pomieszczeń tu nie ma i nie będzie: liczy je cennik w `body.rooms` wyceny
-- (§9.2). Druga lista znaczyłaby pytanie „która z nich liczy kwoty", na które
-- nie ma dobrej odpowiedzi. Projekt **podpowiada** pomieszczenia z ostatniej
-- wyceny — kopiuje je, nie współdzieli.

create index if not exists projects_ws_client_status_idx
  on public.projects (workspace_id, client_id, status)
  where deleted_at is null;

create index if not exists projects_client_updated_idx
  on public.projects (client_id, updated_at desc)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Wycena należy do projektu — ale nie musi.
--
-- `null` to normalny stan („szybka wycena" z paska, reguła 2 z koncepcji §2),
-- a nie brak danych. Istniejące wyceny nie mają czego stracić.
-- `on delete set null`, bo skasowanie teczki nie ma prawa skasować oferty,
-- która z niej wyszła.
-- -----------------------------------------------------------------------------
alter table public.quotes
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists quotes_project_updated_idx
  on public.quotes (project_id, updated_at desc)
  where deleted_at is null;

comment on column public.quotes.project_id is
  'Projekt (teczka inwestycji). NULL = wycena bez projektu — dopuszczalny stan.';

-- -----------------------------------------------------------------------------
-- RLS — wzorzec z `02-DATABASE.md §3` i `0004`:
-- SELECT: is_member; INSERT/UPDATE/DELETE: is_member AND workspace_can_write.
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "projects: select member" on public.projects;
create policy "projects: select member" on public.projects
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "projects: insert member" on public.projects;
create policy "projects: insert member" on public.projects
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "projects: update member" on public.projects;
create policy "projects: update member" on public.projects
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "projects: delete member" on public.projects;
create policy "projects: delete member" on public.projects
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

-- Granty jawne — `0004` odebrało domyślne uprawnienia Supabase i nadało je
-- wyliczonym tabelom. Nowa tabela nie łapie się na tamto `all tables`
-- (pułapka z T-33).
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

-- -----------------------------------------------------------------------------
-- Widoki z sumami.
--
-- `clients_overview` powstało w `0015` bez liczby projektów, bo tabeli jeszcze
-- nie było. Teraz ją dokładamy — przez `drop` + `create`, a nie
-- `create or replace`: to drugie nie przyjmuje zmiany zestawu kolumn.
-- -----------------------------------------------------------------------------
drop view if exists public.clients_overview;
create view public.clients_overview
with (security_invoker = true) as
select
  c.id,
  c.workspace_id,
  c.name,
  c.phone,
  c.email,
  c.address,
  c.city,
  c.notes,
  c.status,
  c.archived_at,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  coalesce(q.quotes_count, 0)::int as quotes_count,
  coalesce(q.accepted_net_cents, 0)::bigint as accepted_net_cents,
  coalesce(p.projects_count, 0)::int as projects_count,
  greatest(
    c.updated_at,
    coalesce(q.last_quote_at, c.updated_at),
    coalesce(p.last_project_at, c.updated_at)
  ) as last_activity_at
from public.clients c
left join lateral (
  select
    count(*)::int as quotes_count,
    sum(qq.total_net_cents) filter (where qq.status = 'accepted') as accepted_net_cents,
    max(qq.updated_at) as last_quote_at
  from public.quotes qq
  where qq.client_id = c.id
    and qq.deleted_at is null
) q on true
left join lateral (
  select
    count(*)::int as projects_count,
    max(pp.updated_at) as last_project_at
  from public.projects pp
  where pp.client_id = c.id
    and pp.deleted_at is null
) p on true;

comment on view public.clients_overview is
  'Klient + liczba wycen i projektow, wartosc zaakceptowanych, ostatnia aktywnosc. security_invoker: RLS wolajacego.';

grant select on public.clients_overview to authenticated;
grant select on public.clients_overview to service_role;

-- Projekt z sumami — ta sama zasada: liczy Postgres, nie przeglądarka.
drop view if exists public.projects_overview;
create view public.projects_overview
with (security_invoker = true) as
select
  p.id,
  p.workspace_id,
  p.client_id,
  p.name,
  p.address,
  p.city,
  p.area_m2,
  p.kind,
  p.status,
  p.start_date,
  p.notes,
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  c.name as client_name,
  coalesce(q.quotes_count, 0)::int as quotes_count,
  coalesce(q.accepted_net_cents, 0)::bigint as accepted_net_cents,
  greatest(p.updated_at, coalesce(q.last_quote_at, p.updated_at)) as last_activity_at
from public.projects p
join public.clients c on c.id = p.client_id
left join lateral (
  select
    count(*)::int as quotes_count,
    sum(qq.total_net_cents) filter (where qq.status = 'accepted') as accepted_net_cents,
    max(qq.updated_at) as last_quote_at
  from public.quotes qq
  where qq.project_id = p.id
    and qq.deleted_at is null
) q on true;

comment on view public.projects_overview is
  'Projekt + nazwa klienta i sumy z jego wycen. security_invoker: RLS wolajacego.';

grant select on public.projects_overview to authenticated;
grant select on public.projects_overview to service_role;
