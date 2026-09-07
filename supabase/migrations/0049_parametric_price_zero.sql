-- =============================================================================
-- 0049_parametric_price_zero.sql — pozycja parametryczna nie jest „indywidualna" (T-129)
--
-- Od T-126 pusta cena (`unitPriceCents = null`) znaczy „wycena indywidualna"
-- W KAŻDYM trybie: pozycja jest w ofercie, ale NIE wchodzi do sumy. Wcześniej
-- pozycja „według pomieszczenia" z pustą ceną liczyła się ze stawek, a wiersz,
-- PDF i podsumowanie mówiły „indywidualna" — dwie prawdy naraz.
--
-- Seedy (biblioteka przykładowa z 0022/0029, szablony startowe z 0045)
-- wpisywały `null` także usługom parametrycznym. W aplikacji „indywidualnie"
-- da się wybrać tylko dla `flat` (`pricingChoiceFor`), więc `null` przy
-- `per_room`/`per_frame` to relikt seedów, nie decyzja użytkownika.
--
-- Co robi ta migracja:
--   1. `seed_library_sample` i `seed_quote_templates`: usługa parametryczna
--      dostaje cenę 0 (liczy reguła), `flat` dalej `null` (D4).
--   2. Istniejące `library_items` parametryczne z `null` → 0.
--   3. Istniejące `quote_templates`: pozycje parametryczne z `null` → 0
--      (w sekcjach i w grupach). Wycen (`quotes.body`) NIE ruszamy — kwoty
--      wysłanych ofert zostają takie, jakie poszły do klienta (decyzja
--      właściciela przy T-126); edytor normalizuje przy wstawianiu z biblioteki.
--
-- Ciała funkcji = kopie z 0029 / 0045 z jedną zmienioną linią każda.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. Biblioteka przykładowa (kopia z 0029, zmieniona linia `unit_price_cents`).
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
        -- Cena PUSTA (= wycena indywidualna) tylko przy regule `flat` — nie
        -- sugerujemy stawek rynkowych (decyzja D4). Usługa parametryczna
        -- dostaje 0: liczy ją reguła, a pusta cena wyłączałaby ją z sumy
        -- mimo stawek (T-129; `pricingChoiceFor` zna „indywidualnie" tylko
        -- dla `flat`).
        case when usluga.mode = 'flat' then null else 0 end,
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


-- -----------------------------------------------------------------------------
-- 1b. Szablony startowe (kopia z 0045, zmieniona linia `unitPriceCents`).
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
                  -- Cena PUSTA (wycena indywidualna, D4) tylko przy `flat`;
                  -- pozycja parametryczna dostaje 0 i liczy się z reguły —
                  -- do czasu uzupełnienia stawek pokazuje „brak stawek",
                  -- a nie „wycena indywidualna" (T-129).
                  'unitPriceCents', case when r.mode = 'flat' then null else 0 end,
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


-- -----------------------------------------------------------------------------
-- 2. Biblioteka: usługa parametryczna z pustą ceną → 0.
-- -----------------------------------------------------------------------------
update public.library_items
   set unit_price_cents = 0
 where unit_price_cents is null
   and coalesce(pricing->>'mode', 'flat') <> 'flat';

-- -----------------------------------------------------------------------------
-- 3. Szablony: pozycje parametryczne z pustą ceną → 0, w sekcjach i grupach.
-- -----------------------------------------------------------------------------
create or replace function public.__t129_fix_items(items jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(
      case
        when coalesce(it->'pricing'->>'mode', 'flat') <> 'flat'
         and (it->'unitPriceCents' is null or it->'unitPriceCents' = 'null'::jsonb)
        then jsonb_set(it, '{unitPriceCents}', '0'::jsonb)
        else it
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) with ordinality as x(it, ord);
$$;

update public.quote_templates t
   set body = jsonb_set(
     t.body,
     '{sections}',
     (
       select coalesce(
         jsonb_agg(
           jsonb_set(
             jsonb_set(sec, '{items}', public.__t129_fix_items(sec->'items')),
             '{groups}',
             (
               select coalesce(
                 jsonb_agg(
                   jsonb_set(grp, '{items}', public.__t129_fix_items(grp->'items'))
                   order by gord
                 ),
                 '[]'::jsonb
               )
               from jsonb_array_elements(coalesce(sec->'groups', '[]'::jsonb))
                 with ordinality as g(grp, gord)
             )
           )
           order by sord
         ),
         '[]'::jsonb
       )
       from jsonb_array_elements(t.body->'sections') with ordinality as s(sec, sord)
     )
   )
 where jsonb_typeof(t.body->'sections') = 'array';

drop function public.__t129_fix_items(jsonb);
