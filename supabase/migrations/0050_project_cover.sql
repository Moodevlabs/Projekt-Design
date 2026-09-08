-- =============================================================================
-- 0050_project_cover.sql — okładka projektu (T-130)
--
-- Karta projektu dostaje zakładkę „Przegląd" z kadrem i miniaturami. Kadr
-- to plik projektu: **wybrany ręcznie** (`projects.cover_file_id`), a gdy go
-- nie ma — **najnowszy obraz** wśród plików projektu (zdjęcia z wizji,
-- wizualizacje). Gdy nie ma żadnego obrazu, aplikacja rysuje placeholder
-- według typu inwestycji (mieszkanie / dom / lokal / inny) — to już jej
-- sprawa, baza zwraca `null`.
--
-- „Najnowszy", a nie „pierwszy": pierwsze zdjęcia w projekcie to zwykle stan
-- zastany z wizji, a ostatnie — wizualizacja. Na okładce ma być to drugie.
--
-- `cover_path` liczy widok `projects_overview`, żeby lista projektów i pulpit
-- nie robiły N+1 zapytań o pliki tylko po to, żeby pokazać miniaturę
-- (ta sama zasada co `client_avatar_path` w 0032).
--
-- Obraz rozpoznajemy po `mime` ALBO po rozszerzeniu: plik wgrany przez dialog
-- Tauri przychodzi bez MIME (`useFileUpload.sendPaths`), a `isPreviewableImage`
-- w aplikacji też patrzy na rozszerzenie.
-- =============================================================================

alter table public.projects
  add column if not exists cover_file_id uuid references public.files(id) on delete set null;

comment on column public.projects.cover_file_id is
  'Recznie wybrana okladka (plik projektu). null = automatycznie najnowszy obraz, a bez obrazu placeholder wg typu.';

-- Widok: kopia z 0036 + `cover_file_id` + `cover_path`.
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
  p.stage_progress,
  p.cover_file_id,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  c.name as client_name,
  c.avatar_path as client_avatar_path,
  coalesce(
    (
      select f.storage_path
        from public.files f
       where f.id = p.cover_file_id
         and f.deleted_at is null
    ),
    (
      select f.storage_path
        from public.files f
       where f.project_id = p.id
         and f.deleted_at is null
         and (
           coalesce(f.mime, '') like 'image/%'
           or lower(f.name) ~ '\.(png|jpe?g|gif|webp|avif|bmp)$'
         )
       order by f.created_at desc
       limit 1
    )
  ) as cover_path,
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
  'Projekt + nazwa i zdjecie klienta, postep etapow, okladka (wybrana albo najnowszy obraz) oraz sumy z wycen. security_invoker: RLS wolajacego.';

grant select on public.projects_overview to authenticated;
grant select on public.projects_overview to service_role;
