-- =============================================================================
-- 0045_quote_templates_sample.sql — szablony startowe na nowe konto (T-114)
--
-- Pięć gotowych wycen odpowiadających najczęstszym zleceniom studia wnętrz:
--   1. Mieszkanie od dewelopera  — stan deweloperski, projekt kompleksowy
--   2. Dom jednorodzinny         — większy zakres, koordynacja branż
--   3. Remont mieszkania         — rynek wtórny, inwentaryzacja i przebudowa
--   4. Kuchnia lub łazienka      — jedno pomieszczenie, zabudowa na wymiar
--   5. Lokal komercyjny          — biuro, gastronomia, usługi
--
-- Po co: nowe konto zaczynało od pustej listy szablonów i pustego dokumentu.
-- Człowiek, który dopiero poznaje aplikację, ma zobaczyć gotową, sensowną
-- ofertę i ją POPRAWIĆ, zamiast wymyślać układ od zera. Sekcje = etapy
-- procesu, pozycje = usługi z biblioteki przykładowej (0022) — te same
-- nazwy, więc wycena z szablonu i biblioteka mówią jednym językiem.
--
-- **Ceny są puste (`null` = wycena indywidualna)** — jak w bibliotece:
-- aplikacja nie ma zdania, ile ktoś ma brać za swoją pracę (decyzja D4).
-- Pozycje opcjonalne (dodatkowe ujęcia, nadzór, konsultacje zakupowe)
-- startują WYŁĄCZONE — to pokazuje mechanikę TAK/NIE od pierwszego otwarcia.
--
-- Pozycja o nazwie identycznej z usługą biblioteki dostaje jej
-- `libraryItemId`, więc cena wpisana później w bibliotece kaskaduje do
-- szablonu tak samo jak do wyceny.
--
-- Kształt `body` = `QuoteBodySchema` w wersji 5 (`src/domain/quote/schema.ts`).
-- Zmiana schematu wyceny = aktualizacja tej funkcji, ale stare szablony i tak
-- przechodzą przez `migrateBody` przy odczycie.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Treść szablonów jako tabela. Osobna funkcja, bo lista jest czytana z kilku
-- podzapytań przy składaniu JSON-a; jedna tabela w jednym miejscu jest
-- łatwiejsza do poprawienia niż JSON wpisany ręcznie.
--
-- `mode`: flat | per_room | per_frame — jak `pricing.mode` w bibliotece.
-- `tags`: etykiety z F2.3 (`visualization`, `materials`, `meeting`) — po nich
-- etapy terminu i dokumentu „Etapy" proponują się same.
-- -----------------------------------------------------------------------------
create or replace function public.quote_template_sample_rows()
returns table (
  code        text,
  sec_ord     int,
  sec_title   text,
  ord         int,
  name        text,
  description text,
  unit        text,
  unit_label  text,
  mode        text,
  enabled     boolean,
  tags        text[]
)
language sql
immutable
as $$
  select * from (values
    -- =========================================================================
    -- 1 · Mieszkanie od dewelopera
    -- =========================================================================
    ('apartment', 1, 'Etap 1 · Przygotowanie', 1, 'Konsultacja startowa', 'Omówienie potrzeb, założeń i oczekiwań inwestora.', 'hour', null, 'flat', true, array['meeting']),
    ('apartment', 1, 'Etap 1 · Przygotowanie', 2, 'Pomiar wnętrza', 'Pomiary przestrzeni i dokumentacja stanu istniejącego.', 'm2', null, 'flat', true, array[]::text[]),
    ('apartment', 1, 'Etap 1 · Przygotowanie', 3, 'Analiza potrzeb', 'Zebranie wymagań funkcjonalnych i estetycznych do projektu.', 'lump', null, 'flat', true, array[]::text[]),

    ('apartment', 2, 'Etap 2 · Układ funkcjonalny', 1, 'Koncepcja funkcjonalna', 'Opracowanie propozycji rozmieszczenia funkcji i wyposażenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 2, 'Etap 2 · Układ funkcjonalny', 2, 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'lump', null, 'per_room', false, array[]::text[]),
    ('apartment', 2, 'Etap 2 · Układ funkcjonalny', 3, 'Ostateczny układ', 'Przygotowanie zatwierdzonej wersji układu funkcjonalnego.', 'lump', null, 'per_room', true, array[]::text[]),

    ('apartment', 3, 'Etap 3 · Koncepcja i wizualizacje', 1, 'Kierunek stylistyczny', 'Określenie charakteru, kolorystyki i stylu wnętrza.', 'lump', null, 'per_room', true, array['materials']),
    ('apartment', 3, 'Etap 3 · Koncepcja i wizualizacje', 2, 'Dobór materiałów', 'Selekcja materiałów wykończeniowych do projektu.', 'lump', null, 'per_room', true, array['materials']),
    ('apartment', 3, 'Etap 3 · Koncepcja i wizualizacje', 3, 'Dobór wyposażenia', 'Selekcja mebli, lamp, armatury i wyposażenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 3, 'Etap 3 · Koncepcja i wizualizacje', 4, 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'lump', null, 'per_room', true, array['visualization']),
    ('apartment', 3, 'Etap 3 · Koncepcja i wizualizacje', 5, 'Dodatkowe ujęcie', 'Dodatkowy widok zaakceptowanej koncepcji.', 'frame', null, 'per_frame', false, array['visualization']),

    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 1, 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 2, 'Plan oświetlenia', 'Rozmieszczenie punktów i opraw oświetleniowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 3, 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 4, 'Układ posadzek', 'Dokumentacja układu i kierunku materiałów podłogowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 5, 'Plan sufitów', 'Dokumentacja sufitów i elementów zabudowy.', 'lump', null, 'per_room', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 6, 'Widoki ścian', 'Rozwinięcia projektowe wybranych ścian z rozrysem płytek.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 7, 'Zabudowa kuchenna', 'Opracowanie zabudowy kuchennej do wykonania przez stolarza.', 'element', null, 'flat', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 8, 'Zabudowa łazienkowa', 'Projekt mebli wykonywanych na wymiar.', 'element', null, 'flat', true, array[]::text[]),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 9, 'Zestawienie materiałów', 'Lista materiałów wraz z ilościami i informacjami zakupowymi.', 'lump', null, 'per_room', true, array['materials']),
    ('apartment', 4, 'Etap 4 · Dokumentacja wykonawcza', 10, 'Specyfikacja wyposażenia', 'Zestawienie produktów wykorzystanych w projekcie.', 'lump', null, 'per_room', true, array[]::text[]),

    ('apartment', 5, 'Etap 5 · Realizacja (opcjonalnie)', 1, 'Wizyta na inwestycji', 'Konsultacja projektu na miejscu realizacji.', 'visit', null, 'flat', false, array[]::text[]),
    ('apartment', 5, 'Etap 5 · Realizacja (opcjonalnie)', 2, 'Koordynacja projektowa', 'Bieżące konsultacje z wykonawcami i dostawcami.', 'hour', null, 'flat', false, array[]::text[]),
    ('apartment', 5, 'Etap 5 · Realizacja (opcjonalnie)', 3, 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub sklepie.', 'hour', null, 'flat', false, array['meeting']),

    -- =========================================================================
    -- 2 · Dom jednorodzinny
    -- =========================================================================
    ('house', 1, 'Etap 1 · Przygotowanie', 1, 'Konsultacja startowa', 'Omówienie potrzeb, założeń i oczekiwań inwestora.', 'hour', null, 'flat', true, array['meeting']),
    ('house', 1, 'Etap 1 · Przygotowanie', 2, 'Dokumentacja stanu istniejącego', 'Opracowanie rzutów na podstawie projektu budowlanego lub pomiarów.', 'm2', null, 'flat', true, array[]::text[]),
    ('house', 1, 'Etap 1 · Przygotowanie', 3, 'Analiza potrzeb', 'Zebranie wymagań funkcjonalnych i estetycznych do projektu.', 'lump', null, 'flat', true, array[]::text[]),

    ('house', 2, 'Etap 2 · Układ funkcjonalny', 1, 'Koncepcja funkcjonalna', 'Rozmieszczenie funkcji i wyposażenia, w tym korekty ścian działowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 2, 'Etap 2 · Układ funkcjonalny', 2, 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'lump', null, 'per_room', false, array[]::text[]),
    ('house', 2, 'Etap 2 · Układ funkcjonalny', 3, 'Konsultacja koncepcji', 'Omówienie i porównanie przygotowanych wariantów.', 'hour', null, 'flat', true, array['meeting']),
    ('house', 2, 'Etap 2 · Układ funkcjonalny', 4, 'Ostateczny układ', 'Przygotowanie zatwierdzonej wersji układu funkcjonalnego.', 'lump', null, 'per_room', true, array[]::text[]),

    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 1, 'Kierunek stylistyczny', 'Określenie charakteru, kolorystyki i stylu wnętrza.', 'lump', null, 'per_room', true, array['materials']),
    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 2, 'Dobór materiałów', 'Selekcja materiałów wykończeniowych do projektu.', 'lump', null, 'per_room', true, array['materials']),
    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 3, 'Dobór wyposażenia', 'Selekcja mebli, lamp, armatury i wyposażenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 4, 'Koncepcja oświetlenia', 'Dobór rodzaju, charakteru i parametrów oświetlenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 5, 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'lump', null, 'per_room', true, array['visualization']),
    ('house', 3, 'Etap 3 · Koncepcja i wizualizacje', 6, 'Dodatkowe ujęcie', 'Dodatkowy widok zaakceptowanej koncepcji.', 'frame', null, 'per_frame', false, array['visualization']),

    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 1, 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 2, 'Plan oświetlenia', 'Rozmieszczenie punktów i opraw oświetleniowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 3, 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 4, 'Układ posadzek', 'Układ i kierunek posadzek, w tym strefy ogrzewania podłogowego.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 5, 'Plan sufitów', 'Dokumentacja sufitów, obniżeń i elementów zabudowy.', 'lump', null, 'per_room', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 6, 'Widoki ścian', 'Rozwinięcia projektowe wybranych ścian z rozrysem płytek.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 7, 'Zabudowa kuchenna', 'Opracowanie zabudowy kuchennej do wykonania przez stolarza.', 'element', null, 'flat', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 8, 'Zabudowa garderoby', 'Opracowanie indywidualnej zabudowy przechowywania.', 'element', null, 'flat', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 9, 'Zabudowa łazienkowa', 'Projekt mebli wykonywanych na wymiar.', 'element', null, 'flat', true, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 10, 'Mebel indywidualny', 'Dokumentacja pojedynczego elementu: schody, kominek, zabudowa RTV.', 'element', null, 'flat', false, array[]::text[]),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 11, 'Zestawienie materiałów', 'Lista materiałów wraz z ilościami i informacjami zakupowymi.', 'lump', null, 'per_room', true, array['materials']),
    ('house', 4, 'Etap 4 · Dokumentacja wykonawcza', 12, 'Specyfikacja wyposażenia', 'Zestawienie produktów wykorzystanych w projekcie.', 'lump', null, 'per_room', true, array[]::text[]),

    ('house', 5, 'Etap 5 · Realizacja', 1, 'Koordynacja projektowa', 'Uzgodnienia z instalatorami, stolarzem i wykonawcami.', 'hour', null, 'flat', true, array[]::text[]),
    ('house', 5, 'Etap 5 · Realizacja', 2, 'Pakiet wizyt', 'Pakiet określonej liczby wizyt na inwestycji.', 'lump', null, 'flat', false, array[]::text[]),
    ('house', 5, 'Etap 5 · Realizacja', 3, 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub sklepie.', 'hour', null, 'flat', false, array['meeting']),

    -- =========================================================================
    -- 3 · Remont mieszkania
    -- =========================================================================
    ('renovation', 1, 'Etap 1 · Inwentaryzacja', 1, 'Konsultacja startowa', 'Omówienie potrzeb, założeń i oczekiwań inwestora.', 'hour', null, 'flat', true, array['meeting']),
    ('renovation', 1, 'Etap 1 · Inwentaryzacja', 2, 'Pomiar wnętrza', 'Pomiary z natury, dokumentacja zdjęciowa i ocena stanu instalacji.', 'm2', null, 'flat', true, array[]::text[]),
    ('renovation', 1, 'Etap 1 · Inwentaryzacja', 3, 'Dokumentacja stanu istniejącego', 'Rzut inwentaryzacyjny na podstawie pomiarów.', 'm2', null, 'flat', true, array[]::text[]),
    ('renovation', 1, 'Etap 1 · Inwentaryzacja', 4, 'Analiza potrzeb', 'Zebranie wymagań i ocena możliwości przebudowy.', 'lump', null, 'flat', true, array[]::text[]),

    ('renovation', 2, 'Etap 2 · Nowy układ', 1, 'Koncepcja funkcjonalna', 'Propozycja nowego układu z zaznaczeniem wyburzeń i nowych ścian.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 2, 'Etap 2 · Nowy układ', 2, 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 2, 'Etap 2 · Nowy układ', 3, 'Ostateczny układ', 'Przygotowanie zatwierdzonej wersji układu funkcjonalnego.', 'lump', null, 'per_room', true, array[]::text[]),

    ('renovation', 3, 'Etap 3 · Koncepcja wnętrza', 1, 'Kierunek stylistyczny', 'Określenie charakteru, kolorystyki i stylu wnętrza.', 'lump', null, 'per_room', true, array['materials']),
    ('renovation', 3, 'Etap 3 · Koncepcja wnętrza', 2, 'Dobór materiałów', 'Selekcja materiałów wykończeniowych do projektu.', 'lump', null, 'per_room', true, array['materials']),
    ('renovation', 3, 'Etap 3 · Koncepcja wnętrza', 3, 'Dobór wyposażenia', 'Selekcja mebli, lamp, armatury i wyposażenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 3, 'Etap 3 · Koncepcja wnętrza', 4, 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'lump', null, 'per_room', false, array['visualization']),

    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 1, 'Aktualizacja dokumentacji', 'Rysunek wyburzeń i nowych ścian działowych.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 2, 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 3, 'Plan oświetlenia', 'Rozmieszczenie punktów i opraw oświetleniowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 4, 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 5, 'Układ posadzek', 'Dokumentacja układu i kierunku materiałów podłogowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 6, 'Widoki ścian', 'Rozwinięcia projektowe wybranych ścian z rozrysem płytek.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 7, 'Zabudowa kuchenna', 'Opracowanie zabudowy kuchennej do wykonania przez stolarza.', 'element', null, 'flat', true, array[]::text[]),
    ('renovation', 4, 'Etap 4 · Dokumentacja wykonawcza', 8, 'Zestawienie materiałów', 'Lista materiałów wraz z ilościami i informacjami zakupowymi.', 'lump', null, 'per_room', true, array['materials']),

    ('renovation', 5, 'Etap 5 · Realizacja', 1, 'Wizyta na inwestycji', 'Konsultacja projektu na miejscu realizacji.', 'visit', null, 'flat', true, array[]::text[]),
    ('renovation', 5, 'Etap 5 · Realizacja', 2, 'Koordynacja projektowa', 'Bieżące konsultacje z ekipą remontową i dostawcami.', 'hour', null, 'flat', false, array[]::text[]),
    ('renovation', 5, 'Etap 5 · Realizacja', 3, 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub sklepie.', 'hour', null, 'flat', false, array['meeting']),

    -- =========================================================================
    -- 4 · Kuchnia lub łazienka
    -- =========================================================================
    ('room', 1, 'Etap 1 · Przygotowanie', 1, 'Konsultacja startowa', 'Omówienie potrzeb, założeń i oczekiwań inwestora.', 'hour', null, 'flat', true, array['meeting']),
    ('room', 1, 'Etap 1 · Przygotowanie', 2, 'Pomiar wnętrza', 'Pomiar pomieszczenia z lokalizacją przyłączy.', 'm2', null, 'flat', true, array[]::text[]),

    ('room', 2, 'Etap 2 · Koncepcja', 1, 'Koncepcja funkcjonalna', 'Rozmieszczenie zabudowy, sprzętów i ciągów roboczych.', 'lump', null, 'flat', true, array[]::text[]),
    ('room', 2, 'Etap 2 · Koncepcja', 2, 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'lump', null, 'flat', false, array[]::text[]),
    ('room', 2, 'Etap 2 · Koncepcja', 3, 'Dobór materiałów', 'Fronty, blaty, płytki, armatura i oświetlenie.', 'lump', null, 'flat', true, array['materials']),
    ('room', 2, 'Etap 2 · Koncepcja', 4, 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'lump', null, 'flat', true, array['visualization']),
    ('room', 2, 'Etap 2 · Koncepcja', 5, 'Dodatkowe ujęcie', 'Dodatkowy widok zaakceptowanej koncepcji.', 'frame', null, 'per_frame', false, array['visualization']),

    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 1, 'Zabudowa kuchenna', 'Rysunki zabudowy dla stolarza: rzut, widoki, wymiary.', 'element', null, 'flat', true, array[]::text[]),
    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 2, 'Zabudowa łazienkowa', 'Projekt mebli wykonywanych na wymiar.', 'element', null, 'flat', false, array[]::text[]),
    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 3, 'Widoki ścian', 'Rozwinięcia ścian z rozrysem płytek.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 4, 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'lump', null, 'flat', true, array[]::text[]),
    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 5, 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'lump', null, 'flat', true, array[]::text[]),
    ('room', 3, 'Etap 3 · Dokumentacja wykonawcza', 6, 'Zestawienie materiałów', 'Lista materiałów wraz z ilościami i informacjami zakupowymi.', 'lump', null, 'flat', true, array['materials']),

    ('room', 4, 'Etap 4 · Realizacja (opcjonalnie)', 1, 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub sklepie.', 'hour', null, 'flat', false, array['meeting']),
    ('room', 4, 'Etap 4 · Realizacja (opcjonalnie)', 2, 'Wizyta na inwestycji', 'Konsultacja projektu na miejscu realizacji.', 'visit', null, 'flat', false, array[]::text[]),

    -- =========================================================================
    -- 5 · Lokal komercyjny
    -- =========================================================================
    ('commercial', 1, 'Etap 1 · Przygotowanie', 1, 'Konsultacja startowa', 'Omówienie profilu działalności, założeń i oczekiwań inwestora.', 'hour', null, 'flat', true, array['meeting']),
    ('commercial', 1, 'Etap 1 · Przygotowanie', 2, 'Pomiar wnętrza', 'Pomiary przestrzeni i dokumentacja stanu istniejącego.', 'm2', null, 'flat', true, array[]::text[]),
    ('commercial', 1, 'Etap 1 · Przygotowanie', 3, 'Analiza potrzeb', 'Brief funkcjonalny: strefy, stanowiska, przepływ klientów i personelu.', 'lump', null, 'flat', true, array[]::text[]),

    ('commercial', 2, 'Etap 2 · Układ funkcjonalny', 1, 'Koncepcja funkcjonalna', 'Rozmieszczenie stref i wyposażenia z uwzględnieniem wymogów lokalu.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 2, 'Etap 2 · Układ funkcjonalny', 2, 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 2, 'Etap 2 · Układ funkcjonalny', 3, 'Ostateczny układ', 'Przygotowanie zatwierdzonej wersji układu funkcjonalnego.', 'lump', null, 'per_room', true, array[]::text[]),

    ('commercial', 3, 'Etap 3 · Koncepcja i wizualizacje', 1, 'Kierunek stylistyczny', 'Charakter wnętrza spójny z identyfikacją marki.', 'lump', null, 'per_room', true, array['materials']),
    ('commercial', 3, 'Etap 3 · Koncepcja i wizualizacje', 2, 'Dobór materiałów', 'Materiały wykończeniowe o trwałości odpowiedniej do użytkowania komercyjnego.', 'lump', null, 'per_room', true, array['materials']),
    ('commercial', 3, 'Etap 3 · Koncepcja i wizualizacje', 3, 'Koncepcja oświetlenia', 'Dobór rodzaju, charakteru i parametrów oświetlenia.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 3, 'Etap 3 · Koncepcja i wizualizacje', 4, 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'lump', null, 'per_room', true, array['visualization']),
    ('commercial', 3, 'Etap 3 · Koncepcja i wizualizacje', 5, 'Panorama wnętrza', 'Prezentacja przestrzeni w widoku 360°.', 'custom', 'panorama', 'flat', false, array['visualization']),

    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 1, 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 2, 'Plan oświetlenia', 'Rozmieszczenie punktów i opraw oświetleniowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 3, 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 4, 'Układ posadzek', 'Dokumentacja układu i kierunku materiałów podłogowych.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 5, 'Plan sufitów', 'Dokumentacja sufitów i elementów zabudowy.', 'lump', null, 'per_room', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 6, 'Widoki ścian', 'Rozwinięcia projektowe wybranych ścian.', 'custom', 'rysunek', 'flat', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 7, 'Mebel indywidualny', 'Lada, recepcja, regały ekspozycyjne — dokumentacja dla wykonawcy.', 'element', null, 'flat', true, array[]::text[]),
    ('commercial', 4, 'Etap 4 · Dokumentacja wykonawcza', 8, 'Specyfikacja wyposażenia', 'Zestawienie produktów wykorzystanych w projekcie.', 'lump', null, 'per_room', true, array[]::text[]),

    ('commercial', 5, 'Etap 5 · Realizacja', 1, 'Koordynacja projektowa', 'Bieżące konsultacje z wykonawcami, branżystami i dostawcami.', 'hour', null, 'flat', true, array[]::text[]),
    ('commercial', 5, 'Etap 5 · Realizacja', 2, 'Wizyta na inwestycji', 'Konsultacja projektu na miejscu realizacji.', 'visit', null, 'flat', true, array[]::text[]),
    ('commercial', 5, 'Etap 5 · Realizacja', 3, 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub u dostawcy.', 'hour', null, 'flat', false, array['meeting'])
  ) as r(code, sec_ord, sec_title, ord, name, description, unit, unit_label, mode, enabled, tags);
$$;

comment on function public.quote_template_sample_rows() is
  'Tresc szablonow startowych (T-114) jako tabela: szablon → sekcja → pozycja.';

revoke all on function public.quote_template_sample_rows() from public;

-- -----------------------------------------------------------------------------
-- Składanie `body` i wstawianie szablonów.
-- -----------------------------------------------------------------------------
create or replace function public.seed_quote_templates(ws uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  tpl record;
  sekcje jsonb;
begin
  /*
   * Idempotentne i NIEINWAZYJNE, jak `seed_library_sample`: workspace, który
   * ma już jakikolwiek szablon, zostaje w spokoju. Dokładanie pięciu obcych
   * szablonów do czyjegoś zestawu byłoby zaśmiecaniem cudzej pracy.
   */
  if exists (select 1 from public.quote_templates where workspace_id = ws) then
    return;
  end if;

  for tpl in
    select * from (values
      ('apartment', 1, 'Mieszkanie od dewelopera', 'Projekt wnętrza mieszkania',
       'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac projektowych dla mieszkania w stanie deweloperskim — od układu funkcjonalnego po dokumentację wykonawczą. Pozycje oznaczone jako opcjonalne można dołączyć do zakresu w dowolnym momencie.'),
      ('house', 2, 'Dom jednorodzinny', 'Projekt wnętrza domu',
       'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac projektowych dla domu jednorodzinnego: układ funkcjonalny, koncepcję wnętrz, dokumentację wykonawczą oraz koordynację z wykonawcami i instalatorami.'),
      ('renovation', 3, 'Remont mieszkania', 'Projekt remontu mieszkania',
       'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac projektowych dla remontu mieszkania: inwentaryzację stanu istniejącego, nowy układ funkcjonalny, koncepcję wnętrza i dokumentację potrzebną ekipie remontowej.'),
      ('room', 4, 'Kuchnia lub łazienka', 'Projekt kuchni / łazienki',
       'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac projektowych dla jednego pomieszczenia — koncepcję, wizualizację oraz rysunki wykonawcze dla stolarza i ekipy wykończeniowej.'),
      ('commercial', 5, 'Lokal komercyjny', 'Projekt wnętrza lokalu',
       'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac projektowych dla lokalu komercyjnego: układ funkcjonalny dopasowany do profilu działalności, koncepcję spójną z marką, dokumentację wykonawczą i koordynację realizacji.')
    ) as t(code, ord, name, title, intro)
    order by ord
  loop
    /*
     * Sekcje z pozycjami luźno w sekcji (bez grup): etap procesu = sekcja,
     * usługa = pozycja. Grupy zostawiamy użytkownikowi — „Rozpisz na
     * pomieszczenia" tworzy je samo, gdy zajdzie potrzeba.
     */
    select coalesce(jsonb_agg(sekcja order by sec_ord), '[]'::jsonb)
      into sekcje
      from (
        select
          s.sec_ord,
          jsonb_build_object(
            'id', gen_random_uuid(),
            'title', s.sec_title,
            'groups', '[]'::jsonb,
            'items', (
              select jsonb_agg(
                jsonb_build_object(
                  'id', gen_random_uuid(),
                  'kind', 'item',
                  'name', r.name,
                  'description', r.description,
                  'qty', 1,
                  -- Cena PUSTA: wycena indywidualna (D4), jak w bibliotece.
                  'unitPriceCents', null,
                  'unit', r.unit,
                  'enabled', r.enabled,
                  -- Ta sama nazwa co w bibliotece przykładowej → kaskada cen.
                  'libraryItemId', (
                    select li.id
                      from public.library_items li
                     where li.workspace_id = ws
                       and li.name = r.name
                       and li.deleted_at is null
                     order by li.is_sample desc, li.created_at
                     limit 1
                  ),
                  'pricing', case r.mode
                    when 'per_room' then
                      '{"mode":"per_room","baseCents":0,"perRoomCents":{},"defaultPerRoomCents":0,"roomScope":"all"}'::jsonb
                    when 'per_frame' then
                      '{"mode":"per_frame","baseCents":0,"perRoomCents":{},"defaultPerRoomCents":0}'::jsonb
                    else '{"mode":"flat"}'::jsonb
                  end,
                  'roomId', null,
                  'tags', to_jsonb(r.tags)
                )
                -- `unitLabel` tylko przy `custom`; poza tym klucza ma nie być.
                || case when r.unit_label is null then '{}'::jsonb
                        else jsonb_build_object('unitLabel', r.unit_label) end
                order by r.ord
              )
              from public.quote_template_sample_rows() r
              where r.code = tpl.code and r.sec_ord = s.sec_ord
            )
          ) as sekcja
        from (
          select distinct sec_ord, sec_title
            from public.quote_template_sample_rows()
           where code = tpl.code
        ) s
      ) x;

    insert into public.quote_templates (workspace_id, name, body)
    values (
      ws,
      tpl.name,
      jsonb_build_object(
        'bodyVersion', 5,
        'title', tpl.title,
        'subtitle', '',
        'intro', tpl.intro,
        'projectDescription', '',
        'client', jsonb_build_object('name', '', 'phone', '', 'email', '', 'city', ''),
        'issueDate', null,
        'validDays', 14,
        'vatRate', 23,
        'pricesInclude', 'net',
        'pricingBasis', 'amount',
        'hourlyRateCents', null,
        'rooms', '[]'::jsonb,
        'discounts', '[]'::jsonb,
        'sections', sekcje,
        'preparedBy', '',
        'showDisabledItems', true
      )
    );
  end loop;
end;
$$;

comment on function public.seed_quote_templates(uuid) is
  'Wstawia 5 szablonow startowych (T-114) bez cen, podpietych do biblioteki przykladowej po nazwie. Idempotentna — pomija workspace z jakimkolwiek szablonem.';

revoke all on function public.seed_quote_templates(uuid) from public;
grant execute on function public.seed_quote_templates(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Wpięcie w zakładanie konta — PO bibliotece, bo szablony szukają w niej
-- usług po nazwie. Ciało bez zmian względem 0022 poza tą jedną linią.
--
-- **Bez backfillu istniejących workspace'ów** (koncepcja §5 reguła 8): mają
-- swoje szablony albo świadomie ich nie mają.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ws uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (coalesce(nullif(new.raw_user_meta_data->>'company', ''), 'Moja firma'), new.id)
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner');

  insert into public.profiles (id, full_name, default_workspace_id)
  values (new.id, new.raw_user_meta_data->>'full_name', ws);

  insert into public.brand_kits (workspace_id, company_name)
  values (ws, coalesce(nullif(new.raw_user_meta_data->>'company', ''), ''));

  -- Trial jest nasz, nie Stripe'owy — karta nie jest wymagana przy rejestracji.
  insert into public.subscriptions (workspace_id, status, trial_ends_at)
  values (ws, 'trialing', now() + interval '14 days');

  perform public.seed_room_types(ws);
  perform public.seed_library_sample(ws);
  perform public.seed_quote_templates(ws);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT na auth.users: workspace, czlonkostwo, profil, brand kit, trial, typy pomieszczen, biblioteka przykladowa i szablony startowe.';
