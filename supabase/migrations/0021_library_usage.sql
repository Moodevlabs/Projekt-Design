-- =============================================================================
-- 0021_library_usage.sql — statystyki użycia usługi (B3, T-61)
--
-- „Użyta w 24 wycenach" na karcie usługi. Liczymy NA ŻĄDANIE z `quotes.body`,
-- a nie denormalizujemy licznikiem: to liczba orientacyjna, a nie dana,
-- na której cokolwiek się opiera. Utrzymywanie jej triggerem przy każdym
-- zapisie wyceny kosztowałoby więcej, niż jest warta.
-- =============================================================================

create or replace function public.library_item_usage(ws uuid)
returns table (item_id uuid, quotes_count int, last_used_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  /*
   * `jsonb_path_query` po `libraryItemId` w całym dokumencie — pozycje leżą
   * i luzem w sekcjach, i w grupach, więc ścieżka `$.**` jest tu jedyną,
   * która nie zgubi połowy przypadków.
   *
   * `distinct` po `(wycena, usługa)`: usługa wstawiona do wyceny trzy razy
   * to wciąż JEDNA wycena, w której jej użyto.
   */
  select
    uzycia.item_id,
    count(distinct uzycia.quote_id)::int as quotes_count,
    max(uzycia.updated_at) as last_used_at
  from (
    select
      q.id as quote_id,
      q.updated_at,
      (jsonb_path_query(q.body, '$.**.libraryItemId') #>> '{}')::uuid as item_id
    from public.quotes q
    where q.workspace_id = ws
      and q.deleted_at is null
  ) uzycia
  where uzycia.item_id is not null
  group by uzycia.item_id;
$$;

comment on function public.library_item_usage(uuid) is
  'Ile wycen uzywa danej uslugi i kiedy ostatnio. Liczone na zadanie z quotes.body — nie denormalizujemy.';

revoke all on function public.library_item_usage(uuid) from public;
grant execute on function public.library_item_usage(uuid) to authenticated, service_role;
