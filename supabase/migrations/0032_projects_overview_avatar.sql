-- =============================================================================
-- 0032 — Zdjęcie klienta w `projects_overview` (T-88 / poprawka 6)
--
-- Pulpit pokazuje teczki w toku w tej samej formie co lista klientów: karta
-- ze zdjęciem osoby. Bez tej kolumny trzeba by dociągać kartotekę klienta
-- osobnym zapytaniem dla każdej teczki — czyli N+1 po to, żeby narysować
-- kółko.
--
-- ⚠️ `drop` + `create`, nie `create or replace`: zmieniamy zestaw kolumn.
-- =============================================================================

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
  c.avatar_path as client_avatar_path,
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
  'Projekt + nazwa i zdjecie klienta oraz sumy z jego wycen. security_invoker: RLS wolajacego.';

grant select on public.projects_overview to authenticated;
grant select on public.projects_overview to service_role;
