-- =============================================================================
-- 0031 — Zdjęcie klienta (T-87 / poprawka 5 z 2026-08-27)
--
-- Lista klientów przestaje być tabelą, a staje się siatką kart. Karta bez
-- twarzy to prostokąt z tekstem — a projektantka wnętrz rozpoznaje teczkę po
-- osobie, nie po wierszu.
--
-- Plik ląduje w buckecie `brand` (ten sam co logo i avatar użytkownika),
-- pod ścieżką `{workspace_id}/client-*`. Polityki z `0005` pilnują tylko
-- pierwszego segmentu ścieżki, więc nowy rodzaj obrazka nie potrzebuje ani
-- nowego bucketa, ani nowych reguł.
--
-- ⚠️ `clients_overview` trzeba ODTWORZYĆ, a nie „zaktualizować":
-- `create or replace view` nie przyjmuje zmiany zestawu kolumn (ta sama
-- pułapka co w `0016`).
-- =============================================================================

alter table public.clients
  add column if not exists avatar_path text;

comment on column public.clients.avatar_path is
  'Ścieżka zdjęcia klienta w buckecie `brand`, np. {workspace_id}/client-1724764800000.png. NULL = karta pokazuje inicjały.';

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
  c.avatar_path,
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
  'Klient + zdjecie, liczba wycen i projektow, wartosc zaakceptowanych, ostatnia aktywnosc. security_invoker: RLS wolajacego.';

-- Granty jawne — `0004` odbiera domyślne uprawnienia Supabase, a odtworzony
-- widok jest nowym obiektem i nie dziedziczy tamtych nadań (pułapka z T-33).
grant select on public.clients_overview to authenticated;
grant select on public.clients_overview to service_role;
