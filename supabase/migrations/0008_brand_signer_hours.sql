-- =============================================================================
-- 0008 — Godziny otwarcia i wystawiający w brand kicie (T-12 / FEATURES §F7.2)
--
-- Stopka we wszystkich arkuszach klienta ma kolumnę „CZYNNE" z godzinami oraz
-- podpis wystawiającego z tytułem zawodowym („projektant wnętrz"). Bez tych
-- pól PDF nie odwzoruje stopki, a to ostatni element, który klient widzi.
--
-- Kolumny w tabeli, a nie w `workspaces.settings`, bo to dane marki — czyta je
-- generator PDF razem z resztą brand kitu, jednym zapytaniem.
-- =============================================================================

alter table public.brand_kits
  add column if not exists opening_hours jsonb not null default '[]'::jsonb,
  add column if not exists signer_name text,
  add column if not exists signer_title text;

comment on column public.brand_kits.opening_hours is
  'Wiersze stopki „CZYNNE": [{label, hours}] — np. {"label":"poniedziałek – piątek","hours":"8.00 – 16.00"}.';
comment on column public.brand_kits.signer_name is
  'Imię i nazwisko osoby wystawiającej ofertę (blok „wystawił").';
comment on column public.brand_kits.signer_title is
  'Tytuł zawodowy wystawiającego, np. „projektant wnętrz".';
