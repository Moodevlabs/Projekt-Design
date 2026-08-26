-- T-81 — domyślne barwy brand kitu na paletę Toolier (redesign 2026).
--
-- `accent_color` to tło paska nagłówka w PDF, `bg_color` to tło bloku
-- podsumowania (NIE tło całej strony) — stąd brąz marki i beż marki
-- pasują tu wprost.
--
-- ⚠️ ZMIENIAMY WYŁĄCZNIE `default`, czyli to, co dostanie NOWE konto.
-- Istniejące wiersze zostają nietknięte i jest to decyzja, nie
-- niedopatrzenie (08-REDESIGN-2026.md D-4): kolor na ofercie jest
-- własnością klienta studia. Ktoś, kto ustawił swoją terakotę, nie ma
-- prawa dostać brązu Toolier tylko dlatego, że my zmieniliśmy skórę
-- aplikacji. Żadnego `update brand_kits set ...` tu nie ma i nie ma go
-- przez pomyłkę.
--
-- Parytet z `defaultBrandKit()` w `src/domain/brand/schema.ts` pilnuje
-- test „domyślne wartości odpowiadają migracji brand_kits".

alter table public.brand_kits
  alter column accent_color set default '#33251E',
  alter column bg_color     set default '#EFECE8';
