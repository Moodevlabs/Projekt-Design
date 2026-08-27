-- =============================================================================
-- 0030 — Wybór wariantu logo na nagłówku PDF (T-85 / poprawka 3 z 2026-08-27)
--
-- Do tej pory o tym, który plik logo trafi na pas nagłówka, decydował sam
-- program: jasny kolor nagłówka → logo ciemne, ciemny → jasne. Reguła jest
-- dobra jako domyślna i zostaje pod wartością `auto`, ale nie zna dwóch
-- przypadków, które w praktyce występują:
--
--   * logo z własnym tłem (biały kafel), które na ciemnym pasie ma zostać
--     takie, jakie jest — kontrast liczy się tu z tła pliku, nie z pasa;
--   * marki, które mają JEDEN znak i chcą go widzieć zawsze, niezależnie
--     od tego, jak dobiorą kolor nagłówka.
--
-- Kolumna, a nie `workspaces.settings`, bo to część brand kitu — generator
-- PDF czyta ją jednym zapytaniem razem z kolorami i ścieżkami plików.
-- =============================================================================

alter table public.brand_kits
  add column if not exists header_logo text not null default 'auto';

alter table public.brand_kits
  drop constraint if exists brand_kits_header_logo_check;

alter table public.brand_kits
  add constraint brand_kits_header_logo_check
  check (header_logo in ('auto', 'light', 'dark'));

comment on column public.brand_kits.header_logo is
  'Który wariant logo kłaść na pasie nagłówka PDF: auto (kontrast do koloru nagłówka), light (logo na ciemny nagłówek), dark (logo na jasny nagłówek).';
