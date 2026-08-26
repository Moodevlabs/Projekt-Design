-- =============================================================================
-- 0029_drop_library_category_text.sql — koniec kolumny `library_items.category`
-- (T-69, „po jednej wersji od T-59")
--
-- T-59 wprowadził grupy jako SŁOWNIK (`library_categories` + `category_id`),
-- ale kolumna tekstowa została na czas przejściowy. Utrzymywanie obu znaczyło,
-- że ta sama informacja żyje w dwóch miejscach i potrafi się rozjechać:
--
--   • zmiana nazwy grupy w słowniku NIE docierała do pozycji zapisanych
--     wcześniej — miały w kolumnie starą nazwę;
--   • literówka w polu tekstowym zakładała „grupę", której nie było
--     w słowniku, i pozycja znikała z filtrów po grupie.
--
-- Nazwa grupy jest teraz WYŁĄCZNIE odczytem: `select('*, library_categories(name)')`.
-- =============================================================================

-- Ostatnia szansa na uratowanie danych: pozycje, które mają tekst, ale nie mają
-- `category_id`, dostają go po nazwie. Bez tego ich grupa przepadłaby razem
-- z kolumną.
--
-- Bezpieczne przy ponownym uruchomieniu: `where category_id is null` sprawia,
-- że drugi przebieg nie ma czego zmieniać.
update public.library_items li
   set category_id = lc.id
  from public.library_categories lc
 where li.category_id is null
   and lc.workspace_id = li.workspace_id
   and lower(btrim(lc.name)) = lower(btrim(li.category));

-- Grupy, których w słowniku nie było wcale — zakładamy je, zamiast gubić.
-- `'Inne'` pomijamy: to była wartość domyślna kolumny, a nie decyzja
-- użytkownika, i zakładanie z niej grupy zaśmieciłoby słownik każdemu.
insert into public.library_categories (workspace_id, name, sort_order)
select distinct li.workspace_id, btrim(li.category), 999
  from public.library_items li
 where li.category_id is null
   and coalesce(btrim(li.category), '') not in ('', 'Inne')
   and not exists (
     select 1 from public.library_categories lc
      where lc.workspace_id = li.workspace_id
        and lower(btrim(lc.name)) = lower(btrim(li.category))
   );

-- Drugi przebieg dopięcia — tym razem słownik ma już wszystko.
update public.library_items li
   set category_id = lc.id
  from public.library_categories lc
 where li.category_id is null
   and lc.workspace_id = li.workspace_id
   and lower(btrim(lc.name)) = lower(btrim(li.category));

-- Indeks po kolumnie tekstowej musi zniknąć przed nią samą.
drop index if exists public.library_items_ws_category_sort_idx;

alter table public.library_items drop column if exists category;

-- Zamiennik indeksu: listy i filtry chodzą teraz po `category_id`.
create index if not exists library_items_ws_category_id_sort_idx
  on public.library_items (workspace_id, category_id, sort_order)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- `seed_library_sample` odtworzona BEZ kolumny `category`.
--
-- Ciało funkcji plpgsql jest sprawdzane przy WYWOŁANIU, nie przy tworzeniu —
-- więc bez tego kroku pierwsze nowe konto po tej migracji dostałoby błąd
-- „column category of relation library_items does not exist" zamiast
-- biblioteki przykładowej. Reszta treści bez zmian względem 0022.
-- -----------------------------------------------------------------------------
create or replace function public.seed_library_sample(ws uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  grupa record;
  usluga record;
  cat_id uuid;
begin
  /*
   * Idempotentne i NIEINWAZYJNE: pomijamy workspace, który ma już jakąkolwiek
   * usługę. Dokładanie demo do cudzej, zbudowanej biblioteki byłoby
   * zaśmiecaniem czyjejś pracy — a tego nie da się cofnąć jednym kliknięciem.
   */
  if exists (select 1 from public.library_items where workspace_id = ws) then
    return;
  end if;

  for grupa in
    select * from (values
      ('01', 'Przygotowanie projektu', 0),
      ('02', 'Układ przestrzeni',      1),
      ('03', 'Koncepcja wnętrza',      2),
      ('04', 'Model 3D i prezentacja', 3),
      ('05', 'Dokumentacja wykonawcza',4),
      ('06', 'Meble na wymiar',        5),
      ('07', 'Zakupy i realizacja',    6),
      ('08', 'Usługi dodatkowe',       7)
    ) as g(code, name, ord)
  loop
    insert into public.library_categories (workspace_id, name, code, sort_order, is_sample)
    values (ws, grupa.name, grupa.code, grupa.ord, true)
    returning id into cat_id;

    for usluga in
      select * from (values
        -- 01 · Przygotowanie projektu
        ('01', 'Pomiar wnętrza', 'Pomiary przestrzeni i dokumentacja stanu istniejącego.', 'flat', 'm2', null::text, 0),
        ('01', 'Dokumentacja stanu istniejącego', 'Opracowanie rzutu na podstawie pomiarów lub dokumentacji inwestora.', 'flat', 'm2', null, 1),
        ('01', 'Konsultacja startowa', 'Omówienie potrzeb, założeń i oczekiwań inwestora.', 'flat', 'hour', null, 2),
        ('01', 'Analiza potrzeb', 'Zebranie wymagań funkcjonalnych i estetycznych do projektu.', 'flat', 'lump', null, 3),

        -- 02 · Układ przestrzeni
        ('02', 'Koncepcja funkcjonalna', 'Opracowanie propozycji rozmieszczenia funkcji i wyposażenia.', 'per_room', 'lump', null, 0),
        ('02', 'Alternatywny układ', 'Dodatkowy wariant rozplanowania przestrzeni.', 'per_room', 'lump', null, 1),
        ('02', 'Konsultacja koncepcji', 'Omówienie i porównanie przygotowanych wariantów.', 'flat', 'hour', null, 2),
        ('02', 'Ostateczny układ', 'Przygotowanie zatwierdzonej wersji układu funkcjonalnego.', 'per_room', 'lump', null, 3),

        -- 03 · Koncepcja wnętrza
        ('03', 'Kierunek stylistyczny', 'Określenie charakteru, kolorystyki i stylu wnętrza.', 'per_room', 'lump', null, 0),
        ('03', 'Plansza materiałowa', 'Zestawienie kolorów, faktur i materiałów.', 'per_room', 'lump', null, 1),
        ('03', 'Dobór materiałów', 'Selekcja materiałów wykończeniowych do projektu.', 'per_room', 'lump', null, 2),
        ('03', 'Dobór wyposażenia', 'Selekcja mebli, lamp, armatury i wyposażenia.', 'per_room', 'lump', null, 3),
        ('03', 'Koncepcja oświetlenia', 'Dobór rodzaju, charakteru i parametrów oświetlenia.', 'per_room', 'lump', null, 4),

        -- 04 · Model 3D i prezentacja
        ('04', 'Model wnętrza 3D', 'Przygotowanie przestrzennego modelu projektowanego wnętrza.', 'per_room', 'lump', null, 0),
        ('04', 'Wizualizacja wnętrza', 'Fotorealistyczne przedstawienie projektowanej przestrzeni.', 'per_room', 'lump', null, 1),
        ('04', 'Dodatkowe ujęcie', 'Dodatkowy widok zaakceptowanej koncepcji.', 'per_frame', 'frame', null, 2),
        ('04', 'Wariant wizualizacji', 'Alternatywna wersja wybranego wnętrza.', 'per_room', 'lump', null, 3),
        ('04', 'Panorama wnętrza', 'Prezentacja przestrzeni w widoku 360°.', 'flat', 'custom', 'panorama', 4),

        -- 05 · Dokumentacja wykonawcza
        ('05', 'Układ instalacji elektrycznej', 'Rozmieszczenie gniazd, włączników i punktów elektrycznych.', 'per_room', 'lump', null, 0),
        ('05', 'Plan oświetlenia', 'Rozmieszczenie punktów i opraw oświetleniowych.', 'per_room', 'lump', null, 1),
        ('05', 'Plan wod.-kan.', 'Rozmieszczenie punktów instalacji sanitarnej.', 'per_room', 'lump', null, 2),
        ('05', 'Układ posadzek', 'Dokumentacja układu i kierunku materiałów podłogowych.', 'per_room', 'lump', null, 3),
        ('05', 'Plan sufitów', 'Dokumentacja sufitów i elementów zabudowy.', 'per_room', 'lump', null, 4),
        ('05', 'Widoki ścian', 'Rozwinięcia projektowe wybranych ścian.', 'flat', 'custom', 'rysunek', 5),

        -- 06 · Meble na wymiar
        ('06', 'Zabudowa kuchenna', 'Opracowanie zabudowy kuchennej do wykonania przez stolarza.', 'flat', 'element', null, 0),
        ('06', 'Zabudowa garderoby', 'Opracowanie indywidualnej zabudowy przechowywania.', 'flat', 'element', null, 1),
        ('06', 'Zabudowa łazienkowa', 'Projekt mebli wykonywanych na wymiar.', 'flat', 'element', null, 2),
        ('06', 'Mebel indywidualny', 'Dokumentacja pojedynczego elementu wykonywanego na zamówienie.', 'flat', 'element', null, 3),

        -- 07 · Zakupy i realizacja
        ('07', 'Specyfikacja wyposażenia', 'Zestawienie produktów wykorzystanych w projekcie.', 'per_room', 'lump', null, 0),
        ('07', 'Zestawienie materiałów', 'Lista materiałów wraz z ilościami i informacjami zakupowymi.', 'per_room', 'lump', null, 1),
        ('07', 'Konsultacja zakupowa', 'Wspólny dobór produktów w showroomie lub sklepie.', 'flat', 'hour', null, 2),
        ('07', 'Wizyta na inwestycji', 'Konsultacja projektu na miejscu realizacji.', 'flat', 'visit', null, 3),
        ('07', 'Koordynacja projektowa', 'Bieżące konsultacje z wykonawcami i dostawcami.', 'flat', 'hour', null, 4),

        -- 08 · Usługi dodatkowe
        ('08', 'Dodatkowa korekta', 'Zmiana projektu ponad zakres uwzględniony w ofercie.', 'flat', 'hour', null, 0),
        ('08', 'Aktualizacja dokumentacji', 'Aktualizacja wcześniej przygotowanego rysunku lub zestawienia.', 'flat', 'custom', 'rysunek', 1),
        ('08', 'Dodatkowa konsultacja', 'Spotkanie poza zakresem podstawowej współpracy.', 'flat', 'hour', null, 2),
        ('08', 'Konsultacja online', 'Zdalne spotkanie dotyczące projektu.', 'flat', 'hour', null, 3),
        ('08', 'Pakiet wizyt', 'Pakiet określonej liczby wizyt na inwestycji.', 'flat', 'lump', null, 4)
      ) as u(code, name, description, mode, unit, unit_label, ord)
      where u.code = grupa.code
    loop
      insert into public.library_items (
        workspace_id, category_id, kind, name, description,
        unit_price_cents, unit, unit_label, sort_order, is_sample, pricing
      )
      values (
        ws,
        cat_id,
        'item',
        usluga.name,
        usluga.description,
        -- Ceny PUSTE: nie sugerujemy stawek rynkowych (decyzja D4).
        null,
        usluga.unit,
        usluga.unit_label,
        usluga.ord,
        true,
        case usluga.mode
          when 'per_room' then
            '{"mode":"per_room","baseCents":0,"perRoomCents":{},"defaultPerRoomCents":0,"roomScope":"all"}'::jsonb
          when 'per_frame' then
            '{"mode":"per_frame","baseCents":0,"perRoomCents":{},"defaultPerRoomCents":0}'::jsonb
          else '{"mode":"flat"}'::jsonb
        end
      );
    end loop;
  end loop;
end;
$$;
