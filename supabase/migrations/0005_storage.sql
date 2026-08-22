-- =============================================================================
-- 0005_storage.sql — prywatny bucket `brand` (docs/02-DATABASE.md §3, 04-PDF §3)
--
-- Konwencja ścieżek: {workspace_id}/logo-dark.png, {workspace_id}/logo-light.png
-- Logo do PDF pobierane signed URL → base64 → @react-pdf.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand',
  'brand',
  false,
  5242880,  -- 5 MiB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Pierwszy segment ścieżki = workspace_id. Zwraca NULL, gdy segment nie jest
-- poprawnym UUID — dzięki temu polityka nie wywala się błędem rzutowania
-- na losowo nazwanym pliku, tylko po prostu odmawia dostępu.
-- -----------------------------------------------------------------------------
create or replace function public.storage_workspace_id(object_name text)
returns uuid
language sql
immutable
set search_path = pg_catalog
as $$
  select case
           when split_part(object_name, '/', 1) ~*
                '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             then split_part(object_name, '/', 1)::uuid
           else null
         end;
$$;

comment on function public.storage_workspace_id(text) is
  'Wyciąga workspace_id z pierwszego segmentu ścieżki obiektu w storage.';

revoke all on function public.storage_workspace_id(text) from public;
grant execute on function public.storage_workspace_id(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Polityki: odczyt dla członków, zapis dla członków z prawem zapisu.
-- (RLS na storage.objects jest już włączone przez Supabase.)
-- -----------------------------------------------------------------------------
drop policy if exists "brand: select member" on storage.objects;
create policy "brand: select member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand'
    and public.is_member(public.storage_workspace_id(name))
  );

drop policy if exists "brand: insert member" on storage.objects;
create policy "brand: insert member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );

drop policy if exists "brand: update member" on storage.objects;
create policy "brand: update member" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  )
  with check (
    bucket_id = 'brand'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );

drop policy if exists "brand: delete member" on storage.objects;
create policy "brand: delete member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );
