-- =============================================================================
-- 0023_template_package.sql — szablon niesie termin i dokumenty (S1, T-63)
--
-- Do tej pory `quote_templates.body` niósł **tylko wycenę** (T-11), a termin
-- (T-43) i dokumenty towarzyszące (T-46) żyły wyłącznie w kolumnach `quotes`.
-- Efekt: „Projekt kompleksowy" zapisany jako szablon gubił połowę tego, co
-- składało się na pakiet.
-- =============================================================================

alter table public.quote_templates
  add column if not exists schedule jsonb,
  add column if not exists documents jsonb;

comment on column public.quote_templates.schedule is
  'ScheduleBody | NULL. NULL = szablon nie niesie terminu — normalny stan, nie brak danych.';

comment on column public.quote_templates.documents is
  'QuoteDocuments | NULL. NULL = szablon nie niesie dokumentow towarzyszacych.';

-- Daty startu w szablonie NIE ma i mieć nie będzie: należy do konkretnego
-- projektu, nie do pakietu. Zeruje ją aplikacja przy tworzeniu wyceny
-- (`fromTemplate`), bo szablon zapisany z datą marcową w czerwcu byłby
-- pułapką — nikt by tego nie zauważył przed wysłaniem oferty.
