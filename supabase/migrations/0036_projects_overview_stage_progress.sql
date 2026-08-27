-- =============================================================================
-- 0036 — `stage_progress` w `projects_overview` (naprawa T-68)
--
-- ## Objaw
--
-- Zakładki „Etapy" w projekcie **nie dało się przeklikać**: kliknięcie
-- „W toku" albo „Zakończony" zapisywało się poprawnie, a etap natychmiast
-- wracał na „Nierozpoczęty". Pasek postępu stał na zerze niezależnie od tego,
-- ile razy się kliknęło.
--
-- ## Przyczyna
--
-- Migracja `0028` dodała kolumnę `stage_progress` do TABELI `projects`, ale
-- nie dopisała jej do WIDOKU `projects_overview` — a karta projektu czyta
-- właśnie widok (`useProjectOverview`). Zapis szedł więc do tabeli, odczyt
-- wracał bez tej kolumny, `parseStageProgress(undefined)` dawało `{}`
-- i wszystko było znowu nierozpoczęte.
--
-- ⚠️ `0032` powieliła ten brak: odtwarzając widok dla `client_avatar_path`,
-- przepisałam listę kolumn z `0016`, w której `stage_progress` nigdy nie było.
-- Kopiowanie listy kolumn przy `drop` + `create` to dobre miejsce na taki błąd
-- — przy następnym odtworzeniu widoku sprawdź, czy tabela nie urosła.
--
-- Nic poza tą kolumną nie brakuje: `stage_progress` to jedyna kolumna dodana
-- do `projects` po `0016` (sprawdzone przez wszystkie migracje).
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
  -- ⬇ TA kolumna. Bez niej zakładka „Etapy" jest tylko do oglądania.
  p.stage_progress,
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
  'Projekt + nazwa i zdjecie klienta, postep etapow oraz sumy z wycen. security_invoker: RLS wolajacego.';

-- Granty jawne — `0004` odbiera domyślne uprawnienia, a odtworzony widok jest
-- nowym obiektem i nie dziedziczy tamtych nadań (pułapka z T-33).
grant select on public.projects_overview to authenticated;
grant select on public.projects_overview to service_role;
