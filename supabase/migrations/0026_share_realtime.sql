-- =============================================================================
-- 0026_share_realtime.sql — powiadomienia o ruchu klienta (T-26)
--
-- Projektant ma się dowiedzieć, że klient zaakceptował ofertę albo zostawił
-- uwagę, BEZ przeładowywania listy. Realtime nadaje tylko z tabel wpisanych
-- do publikacji `supabase_realtime` — domyślnie nie ma tam żadnej.
--
-- RLS obowiązuje tak samo jak przy zwykłym SELECT: subskrybent zobaczy
-- wyłącznie zdarzenia z wycen swojego workspace'u (polityki z 0004 i 0025).
-- =============================================================================

do $$
begin
  -- Publikacja istnieje w Supabase od instalacji, ale nie w gołym Postgresie,
  -- na którym testujemy migracje. Bez tego bloku migracja tam nie przechodzi.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'quote_comments'
  ) then
    alter publication supabase_realtime add table public.quote_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'quote_acceptances'
  ) then
    alter publication supabase_realtime add table public.quote_acceptances;
  end if;
end
$$;

-- Realtime wysyła stary wiersz przy UPDATE/DELETE tylko przy REPLICA IDENTITY
-- FULL. Nam wystarczy INSERT (nowa uwaga, nowa akceptacja), więc zostawiamy
-- domyślne — pełna tożsamość podwaja ruch w WAL bez pożytku.
