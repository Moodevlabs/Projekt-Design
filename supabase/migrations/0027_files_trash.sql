-- =============================================================================
-- 0027_files_trash.sql — kosz na pliki (T-67)
--
-- Do dziś „usuń plik" znaczyło: oznacz wiersz `deleted_at` I skasuj obiekt
-- w Storage w tej samej operacji. Bajty przepadały bezpowrotnie, a pomyłka
-- przy pliku klienta była nie do odkręcenia.
--
-- Teraz kasowanie jest dwuetapowe: kosz (30 dni) → trwałe usunięcie.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ZMIANA SEMANTYKI LIMITU — najważniejsza rzecz w tej migracji.
--
-- 0017 zwalniał miejsce już przy `deleted_at`, i było to POPRAWNE, bo obiekt
-- w Storage znikał w tej samej chwili. Z koszem bajty ZOSTAJĄ (inaczej nie
-- byłoby czego przywracać), więc zwalnianie limitu przy wyrzuceniu do kosza
-- oznaczałoby, że workspace może zająć w Storage dowolnie dużo ponad 2 GiB.
--
-- Miejsce zwalnia się dopiero przy trwałym usunięciu wiersza. Tak samo działa
-- każdy kosz, którego użytkownik już używał (Dysk Google, Dropbox), więc
-- komunikat „opróżnij kosz, żeby odzyskać miejsce" nikogo nie zaskoczy.
-- -----------------------------------------------------------------------------
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
    -- Bezwarunkowo: plik w koszu wciąż zajmuje miejsce, więc jego skasowanie
    -- je zwalnia niezależnie od tego, czy był w koszu, czy nie.
    perform public.files_bump_usage(old.workspace_id, -old.size_bytes);

  end if;

  -- UPDATE nie rusza licznika. Przeniesienie do kosza i przywrócenie nie
  -- zmieniają liczby bajtów w Storage, więc nie mają czego zmieniać.
  return null;
end;
$$;

comment on function public.files_track_usage() is
  'Licznik zuzycia: INSERT dodaje, DELETE odejmuje. Kosz NIE zwalnia miejsca (T-67).';

-- Backfill: pliki, które trafiły do kosza pod starą regułą, zostały odjęte
-- od licznika, choć ich bajty nadal leżą w Storage. Przeliczamy od zera —
-- to jedyny moment, w którym pełny `sum()` jest tańszy niż korekta.
update public.workspaces w
   set storage_used_bytes = coalesce(f.suma, 0)
  from (
    select workspace_id, sum(size_bytes) as suma
      from public.files
     group by workspace_id
  ) f
 where f.workspace_id = w.id;

-- Workspace bez plików nie ma wiersza w podzapytaniu — a mógł mieć niezerowy
-- licznik po starych operacjach.
update public.workspaces w
   set storage_used_bytes = 0
 where not exists (select 1 from public.files f where f.workspace_id = w.id)
   and storage_used_bytes <> 0;

-- -----------------------------------------------------------------------------
-- Kosz
-- -----------------------------------------------------------------------------
comment on column public.files.deleted_at is
  'Chwila wyrzucenia do kosza. Plik znika z list, ale bajty zostaja przez 30 dni (T-67).';

-- Lista kosza i wyszukiwanie plików przeterminowanych.
create index if not exists files_trash_idx
  on public.files (workspace_id, deleted_at desc)
  where deleted_at is not null;

/*
 * Ile dni plik leży w koszu, zanim zniknie na dobre.
 *
 * Funkcja, a nie stała w kodzie aplikacji, bo tę samą liczbę musi znać
 * i interfejs („zostanie usunięty za 12 dni"), i sprzątanie. Dwie kopie
 * rozjechałyby się przy pierwszej zmianie.
 */
create or replace function public.files_trash_days()
returns int
language sql
immutable
set search_path = pg_catalog
as $$ select 30; $$;

/*
 * Pliki do trwałego usunięcia.
 *
 * Zwraca ŚCIEŻKI, a nie kasuje — obiektów w Storage nie da się usunąć z SQL-a
 * (`storage.objects` to tylko metadane; skasowanie wiersza zostawia bajty
 * w S3). Aplikacja bierze tę listę, kasuje obiekty przez Storage API i dopiero
 * potem woła `files_purge_rows`.
 *
 * Kolejność jest celowa: osierocony obiekt w Storage kosztuje miejsce, ale
 * osierocony WIERSZ pokazywałby użytkownikowi plik, którego nie da się pobrać.
 */
create or replace function public.files_expired_in_trash(ws uuid)
returns table (id uuid, storage_path text)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select f.id, f.storage_path
    from public.files f
   where f.workspace_id = ws
     and f.deleted_at is not null
     and f.deleted_at < now() - (public.files_trash_days() || ' days')::interval;
$$;

comment on function public.files_expired_in_trash(uuid) is
  'Pliki w koszu starsze niz files_trash_days(). Zwraca sciezki — kasowanie obiektow robi aplikacja.';

revoke all on function public.files_trash_days() from public;
revoke all on function public.files_expired_in_trash(uuid) from public;
grant execute on function public.files_trash_days() to authenticated, service_role;
grant execute on function public.files_expired_in_trash(uuid) to authenticated, service_role;

-- `security invoker` powyżej nie jest przeoczeniem: funkcja ma widzieć
-- dokładnie to, co widzi wołający, czyli przejść przez RLS `files`.
