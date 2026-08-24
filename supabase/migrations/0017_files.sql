-- =============================================================================
-- 0017_files.sql — pliki klienta i projektu (P1, T-55)
--
-- Dwa światy w jednym module: **metadane w Postgresie, bajty w Storage**.
-- Tabela `files` jest jedynym źródłem listy — listowanie po Storage API jest
-- wolne i nie ma po czym szukać (koncepcja §3 reguła 1).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 26214400)  -- 25 MiB
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;

-- `allowed_mime_types` celowo NULL: blokujemy po **rozszerzeniu**, nie po MIME
-- (koncepcja §3 reguła 3). MIME z przeglądarki podaje sam plik i da się go
-- podać dowolnie, a `.exe` przebrany za `image/png` przeszedłby taki filtr.

-- -----------------------------------------------------------------------------
-- Tabela
-- -----------------------------------------------------------------------------
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  quote_id      uuid references public.quotes(id) on delete set null,
  kind          text not null default 'upload',
  doc_type      text,
  quote_version int,
  name          text not null,
  mime          text,
  size_bytes    bigint not null,
  storage_path  text not null unique,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

alter table public.files drop constraint if exists files_kind_check;
alter table public.files
  add constraint files_kind_check check (kind in ('upload', 'generated'));

alter table public.files drop constraint if exists files_size_check;
alter table public.files
  add constraint files_size_check check (size_bytes >= 0);

-- `client_id` jest **wymagany**, `project_id` opcjonalny (decyzja D2): karta
-- klienta pokazuje wszystkie jego pliki, projekt — tylko swoje. Plik bez
-- klienta nie miałby gdzie się pokazać.
comment on column public.files.client_id is
  'Zawsze wymagany — plik zyje w archiwum klienta. project_id zaweza go do teczki.';

comment on column public.files.kind is
  'upload = wrzucone przez czlowieka, generated = PDF wygenerowany przez aplikacje (T-56).';

comment on column public.files.storage_path is
  'Klucz obiektu w buckecie `files`: {workspace_id}/{client_id}/{project_id|_}/{uuid}.{ext}';

create index if not exists files_client_idx
  on public.files (client_id, created_at desc)
  where deleted_at is null;

create index if not exists files_project_idx
  on public.files (project_id, created_at desc)
  where deleted_at is null;

create index if not exists files_ws_kind_idx
  on public.files (workspace_id, kind)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.files;
create trigger set_updated_at before update on public.files
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Limit miejsca — 2 GiB na workspace, egzekwowane w BAZIE.
--
-- UI też sprawdza (pasek zużycia, komunikat przed wysyłką), ale sprawdzenie
-- w przeglądarce jest uprzejmością, nie zabezpieczeniem: dwa równoległe
-- uploady policzyłyby ten sam stan i oba by przeszły.
-- -----------------------------------------------------------------------------
alter table public.workspaces
  add column if not exists storage_quota_bytes bigint not null default 2147483648,
  add column if not exists storage_used_bytes  bigint not null default 0;

comment on column public.workspaces.storage_used_bytes is
  'Suma size_bytes zywych plikow. Utrzymywana triggerem — nie licz jej w aplikacji.';

/*
 * Licznik zużycia.
 *
 * `security definer`, bo trigger na `files` musi podbić kolumnę w `workspaces`,
 * a polityka UPDATE na workspace'ach dopuszcza tylko właściciela — członek
 * bez tej roli nie mógłby wrzucić pliku.
 *
 * Liczymy **przyrostowo**, a nie `sum()` po całej tabeli: przy kilku tysiącach
 * plików pełne przeliczanie przy każdym uploadzie byłoby skanem tabeli.
 */
create or replace function public.files_bump_usage(ws uuid, delta bigint)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  update public.workspaces
     set storage_used_bytes = greatest(0, storage_used_bytes + delta)
   where id = ws;
$$;

revoke all on function public.files_bump_usage(uuid, bigint) from public;

create or replace function public.files_enforce_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  used  bigint;
  quota bigint;
begin
  select storage_used_bytes, storage_quota_bytes
    into used, quota
    from public.workspaces
   where id = new.workspace_id
   for update;

  if used + new.size_bytes > quota then
    -- Kod `P0001` z takim komunikatem łapie `files.repo` i zamienia na zdanie
    -- po polsku z liczbami. Sam tekst wyjątku nigdy nie trafia do użytkownika.
    raise exception 'STORAGE_QUOTA_EXCEEDED'
      using errcode = 'P0001',
            detail = format('%s/%s', used + new.size_bytes, quota);
  end if;

  return new;
end;
$$;

drop trigger if exists files_quota_check on public.files;
create trigger files_quota_check
  before insert on public.files
  for each row execute function public.files_enforce_quota();

/*
 * Aktualizacja licznika.
 *
 * Soft delete (`deleted_at` z NULL na datę) **zwalnia miejsce od razu**, bo
 * obiekt w Storage kasujemy w tej samej operacji (koncepcja §3 reguła 5).
 * Kosza w 1.0 nie ma — trzymanie bajtów „na wszelki wypadek" zjadałoby limit,
 * którego użytkownik nie widzi.
 */
create or replace function public.files_track_usage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    perform public.files_bump_usage(new.workspace_id, new.size_bytes);
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      perform public.files_bump_usage(old.workspace_id, -old.size_bytes);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      perform public.files_bump_usage(new.workspace_id, -new.size_bytes);
    elsif old.deleted_at is not null and new.deleted_at is null then
      perform public.files_bump_usage(new.workspace_id, new.size_bytes);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists files_usage_track on public.files;
create trigger files_usage_track
  after insert or update or delete on public.files
  for each row execute function public.files_track_usage();

-- Backfill dla baz, które miały już pliki przed tą migracją (dziś: brak).
update public.workspaces w
   set storage_used_bytes = coalesce(f.suma, 0)
  from (
    select workspace_id, sum(size_bytes) as suma
      from public.files
     where deleted_at is null
     group by workspace_id
  ) f
 where f.workspace_id = w.id;

-- -----------------------------------------------------------------------------
-- RLS — wzorzec z `0004`.
-- -----------------------------------------------------------------------------
alter table public.files enable row level security;

drop policy if exists "files: select member" on public.files;
create policy "files: select member" on public.files
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "files: insert member" on public.files;
create policy "files: insert member" on public.files
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "files: update member" on public.files;
create policy "files: update member" on public.files
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists "files: delete member" on public.files;
create policy "files: delete member" on public.files
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

-- Granty jawne (pułapka z T-33) — `0004` nadało uprawnienia wyliczonym tabelom.
grant select, insert, update, delete on public.files to authenticated;
grant all on public.files to service_role;

-- -----------------------------------------------------------------------------
-- Polityki bucketa `files` — kopia wzorca `brand` z `0005`.
-- Pierwszy segment ścieżki to `workspace_id`, więc `storage_workspace_id()`
-- wystarcza; nie robimy joina do `files`, bo obiekt powstaje ZANIM istnieje
-- wiersz (koncepcja §3 reguła 2).
-- -----------------------------------------------------------------------------
drop policy if exists "files: select member" on storage.objects;
create policy "files: select member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'files'
    and public.is_member(public.storage_workspace_id(name))
  );

drop policy if exists "files: insert member" on storage.objects;
create policy "files: insert member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'files'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );

drop policy if exists "files: update member" on storage.objects;
create policy "files: update member" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'files'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  )
  with check (
    bucket_id = 'files'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );

drop policy if exists "files: delete member" on storage.objects;
create policy "files: delete member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'files'
    and public.is_member(public.storage_workspace_id(name))
    and public.workspace_can_write(public.storage_workspace_id(name))
  );
