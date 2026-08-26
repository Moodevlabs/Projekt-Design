-- =============================================================================
-- 0028_project_stage_progress.sql — statusy realizacji etapów (T-68)
--
-- Etapy NIE mieszkają tutaj. Harmonogram jest w `quotes.schedule` i to on jest
-- źródłem listy etapów — projekt trzyma wyłącznie **postęp**: co zaczęte, co
-- skończone i kiedy.
--
-- Osobna tabela byłaby kopiowaniem etapów z wyceny do projektu, a wtedy
-- pierwsza zmiana harmonogramu rozjeżdża oba miejsca i nikt nie wie, które
-- jest prawdziwe.
-- =============================================================================

alter table public.projects
  add column if not exists stage_progress jsonb not null default '{}'::jsonb;

comment on column public.projects.stage_progress is
  'Postep realizacji: { "<stage_id>": { "status": "pending|in_progress|done", "startedAt": iso|null, "completedAt": iso|null, "name": "kopia nazwy" } }. Etapy pochodza z quotes.schedule (T-68).';

/*
 * Dlaczego mapa po `stage_id`, a nie tablica.
 *
 * Postęp jest **przypisany do etapu**, a nie ułożony w kolejność. Mapa daje
 * to wprost: zmiana kolejności etapów w harmonogramie nie rusza postępu,
 * a etap usunięty z harmonogramu po prostu przestaje mieć swój wpis
 * w widoku (klucz zostaje, ale nikt go nie czyta).
 *
 * `name` w środku jest **kopią**, nie źródłem. Trzymamy je po to, żeby dało
 * się pokazać „Etap wizualny — zakończony 12.08", nawet gdy ten etap zniknął
 * z harmonogramu po zmianie wyceny. Bez tego historia realizacji znikałaby
 * razem z etapem.
 */

-- Indeks GIN pod ewentualne pytania „które projekty mają etap w toku".
-- Tani, bo kolumna jest mała, a bez niego takie zapytanie skanuje tabelę.
create index if not exists projects_stage_progress_gin
  on public.projects using gin (stage_progress);
