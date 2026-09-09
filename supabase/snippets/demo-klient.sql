-- =============================================================================
-- demo-klient.sql — pełna teczka demonstracyjna dla WYBRANEGO klienta
--
-- Do materiałów reklamowych, zrzutów ekranu i prezentacji: zamiast klikać
-- ręcznie, wklej to w SQL Editorze panelu Supabase i uruchom. Klient dostaje
-- komplet tego, co pokazuje aplikacja:
--
--   • 2 projekty (mieszkanie w realizacji + dom na etapie oferty)
--   • 4 dokumenty: wycena v1 (archiwalna) → v2 (ZAAKCEPTOWANA przez klienta),
--     wycena domu (WYSŁANA, otwarta przez klienta) i szkic nadzoru
--     — każda z pomieszczeniami, rabatem, harmonogramem, etapami współpracy,
--     cennikiem usług dodatkowych i odnośnikami dla klienta
--   • linki dla klienta z licznikami otwarć, akceptacja online, uwaga klienta
--   • postęp realizacji etapów w projekcie
--   • brief wypełniony przez klienta
--   • wizja lokalna z obmiarem i spisem instalacji
--   • notatki w kalendarzu (przeszłe i nadchodzące)
--
-- ⚠️ To NIE jest migracja i nie leży w `supabase/migrations/`. Uruchamia się
--    ręcznie, w SQL Editorze — działa jako `postgres`, więc omija RLS
--    i gating subskrypcji. Numery dokumentów podbijają licznik workspace'u
--    dokładnie tak, jak robi to aplikacja (`next_quote_number`).
--
-- ⚠️ Wolno uruchomić WIELE RAZY (także dla innych klientów) — identyfikatory
--    są losowane przy każdym przebiegu. Drugi przebieg dla tego samego klienta
--    dołoży mu drugi komplet; sprzątanie jest na końcu pliku (zakomentowane).
--
-- Nie tworzy plików w Storage (bucket `files`) — wiersz bez obiektu psułby
-- pobieranie. Pliki do archiwum wrzuć ręcznie w aplikacji, jeśli potrzebne.
--
-- Powiadomienia e-mail NIE wychodzą: kolejkują je wyłącznie funkcje RPC
-- (`get_shared_quote`, `accept_shared_quote`…), a nie triggery na tabelach.
--
-- ## Jak użyć
--
--  1. W bloku „USTAW” niżej podaj `v_client_id` (UUID) ALBO `v_client_name`
--     (fragment nazwy; musi pasować do dokładnie jednego klienta).
--     Listę klientów zobaczysz zapytaniem:
--        select id, name, city, workspace_id from public.clients
--         where deleted_at is null order by name;
--  2. Uruchom całość (Run). Na końcu dostaniesz tabelkę z tym, co powstało.
--  3. Odśwież aplikację (⌘R / F5) — wszystko pojawi się w karcie klienta.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Pomocnicze funkcje TYMCZASOWE (schemat pg_temp — znikają po zamknięciu sesji)
-- -----------------------------------------------------------------------------

-- Pozycja wyceny w kształcie `Item` z domain/quote/schema.ts (bodyVersion 5).
-- `p_price = null` znaczy „wycena indywidualna" — pozycja jest w ofercie,
-- ale nie wchodzi do sumy.
create or replace function pg_temp.demo_item(
  p_name text, p_desc text, p_qty numeric, p_unit text, p_price bigint,
  p_tags text[] default '{}', p_enabled boolean default true, p_kind text default 'item'
) returns jsonb language sql as $f$
  select jsonb_build_object(
    'id', gen_random_uuid(),
    'kind', p_kind,
    'name', p_name,
    'description', p_desc,
    'qty', p_qty,
    'unitPriceCents', p_price,
    'unit', p_unit,
    'enabled', p_enabled,
    'libraryItemId', null,
    'pricing', jsonb_build_object('mode', 'flat'),
    'roomId', null,
    'tags', to_jsonb(p_tags)
  );
$f$;

create or replace function pg_temp.demo_group(p_name text, p_items jsonb)
returns jsonb language sql as $f$
  select jsonb_build_object(
    'id', gen_random_uuid(), 'name', p_name, 'items', p_items,
    'roomId', null, 'categoryId', null
  );
$f$;

create or replace function pg_temp.demo_section(p_title text, p_items jsonb, p_groups jsonb default '[]'::jsonb)
returns jsonb language sql as $f$
  select jsonb_build_object(
    'id', gen_random_uuid(), 'title', p_title, 'groups', p_groups, 'items', p_items
  );
$f$;

create or replace function pg_temp.demo_room(
  p_label text, p_type uuid, p_qty int default 1,
  p_visual boolean default true, p_technical boolean default true
) returns jsonb language sql as $f$
  select jsonb_build_object(
    'id', gen_random_uuid(), 'roomTypeId', p_type, 'label', p_label, 'qty', p_qty,
    'includedInVisual', p_visual, 'includedInTechnical', p_technical
  );
$f$;

create or replace function pg_temp.demo_body(
  p_title text, p_subtitle text, p_intro text, p_desc text, p_client jsonb,
  p_issue date, p_valid_days int, p_rooms jsonb, p_discounts jsonb,
  p_sections jsonb, p_links jsonb, p_prepared text
) returns jsonb language sql as $f$
  select jsonb_build_object(
    'bodyVersion', 5,
    'title', p_title,
    'subtitle', p_subtitle,
    'intro', p_intro,
    'projectDescription', p_desc,
    'client', p_client,
    'issueDate', to_char(p_issue, 'YYYY-MM-DD'),
    'validDays', p_valid_days,
    'vatRate', 23,
    'pricesInclude', 'net',
    'pricingBasis', 'amount',
    'hourlyRateCents', null,
    'rooms', p_rooms,
    'discounts', p_discounts,
    'sections', p_sections,
    'links', p_links,
    'preparedBy', p_prepared,
    'showDisabledItems', true
  );
$f$;

-- Zdenormalizowane totale — ta sama arytmetyka co `calcQuoteTotals()`:
-- pozycje flat (qty × cena, zaokrąglone per wiersz), rabaty kwotowe z pozycji,
-- potem rabaty z `body.discounts` (scope: quote), VAT od netto.
create or replace function pg_temp.demo_totals(p_body jsonb, out net_cents bigint, out gross_cents bigint)
language plpgsql as $f$
declare
  v_items bigint; v_item_disc bigint; v_running bigint := 0;
  d jsonb; v_amt bigint; v_base bigint;
begin
  select
    coalesce(sum(case when x.v->>'kind' = 'discount' then 0
                      else round((x.v->>'qty')::numeric * (x.v->>'unitPriceCents')::numeric) end), 0),
    coalesce(sum(case when x.v->>'kind' = 'discount'
                      then round((x.v->>'qty')::numeric * (x.v->>'unitPriceCents')::numeric) else 0 end), 0)
    into v_items, v_item_disc
  from jsonb_array_elements(p_body->'sections') as s(v)
  cross join lateral (
    select t1.v from jsonb_array_elements(s.v->'items') as t1(v)
    union all
    select t2.v from jsonb_array_elements(s.v->'groups') as g(v)
                cross join lateral jsonb_array_elements(g.v->'items') as t2(v)
  ) as x
  where (x.v->>'enabled')::boolean
    and x.v->>'unitPriceCents' is not null;

  for d in select * from jsonb_array_elements(coalesce(p_body->'discounts', '[]'::jsonb)) loop
    if not coalesce((d->>'enabled')::boolean, true) then continue; end if;
    v_base := greatest(0, v_items - v_running);
    if d->>'type' = 'percent' then
      v_amt := round(v_base * coalesce((d->>'percent')::numeric, 0) / 100);
    else
      v_amt := coalesce((d->>'valueCents')::bigint, 0);
    end if;
    v_amt := least(v_amt, greatest(0, v_items - v_running));
    v_running := v_running + v_amt;
  end loop;

  net_cents   := greatest(0, v_items - v_item_disc - v_running);
  gross_cents := net_cents + round(net_cents * coalesce((p_body->>'vatRate')::numeric, 23) / 100);
end
$f$;

-- Numer dokumentu jak `next_quote_number()`, ale z datą dokumentu zamiast
-- `now()` i bez sprawdzania `auth.uid()` (w SQL Editorze go nie ma).
create or replace function pg_temp.demo_number(p_ws uuid, p_date date)
returns text language plpgsql as $f$
declare v_seq int; v_pattern text;
begin
  update public.workspaces w
     set quote_seq = w.quote_seq + 1
   where w.id = p_ws
   returning w.quote_seq, coalesce(w.settings->>'numberPattern', 'DOK/{YYYY}/{MM}/{seq}')
    into v_seq, v_pattern;
  return replace(replace(replace(v_pattern,
           '{YYYY}', to_char(p_date, 'YYYY')),
           '{MM}',   to_char(p_date, 'MM')),
           '{seq}',  lpad(v_seq::text, 4, '0'));
end
$f$;

-- Etap harmonogramu (`ScheduleStage`, domain/schedule/schema.ts).
create or replace function pg_temp.demo_stage(
  p_id uuid, p_name text, p_owner text, p_base numeric, p_per_room numeric,
  p_scope text, p_enabled boolean, p_tags text[] default '{}'
) returns jsonb language sql as $f$
  select jsonb_build_object(
    'id', p_id, 'name', p_name, 'kind', 'normal', 'extras', '[]'::jsonb,
    'owner', p_owner, 'baseDays', p_base, 'perRoomDays', '{}'::jsonb,
    'defaultPerRoomDays', p_per_room, 'roomScope', p_scope,
    'enabled', p_enabled, 'linkedItemTags', to_jsonb(p_tags)
  );
$f$;

-- Dokument „Etapy współpracy": wbudowany szablon (stages-defaults.ts);
-- etapy z listy `p_excluded` dostają krzyżyk („czego NIE robimy").
create or replace function pg_temp.demo_stages_doc(p_excluded text[], p_footnote text)
returns jsonb language sql as $f$
  select jsonb_build_object(
    'validDays', 14,
    'footnote', p_footnote,
    'entries', (
      select jsonb_agg(jsonb_build_object(
        'id', gen_random_uuid(), 'name', e.name, 'description', e.descr,
        'included', not (e.name = any (p_excluded)),
        'sectionLabel', e.section, 'linkedItemTags', to_jsonb(e.tags)
      ) order by e.ord)
      from (values
        (1,  'Zakres ogólny',       'Spotkanie wstępne',        'Rozmowa o potrzebach, stylu życia i budżecie.', '{}'::text[]),
        (2,  'Zakres ogólny',       'Inwentaryzacja',           'Pomiary z natury, dokumentacja zdjęciowa, weryfikacja rzutu.', '{}'),
        (3,  'Zakres ogólny',       'Analiza potrzeb',          'Spis funkcji, sprzętu i miejsc do przechowywania.', '{}'),
        (4,  'Zakres ogólny',       'Harmonogram prac',         'Ustalenie etapów, terminów i punktów decyzyjnych.', '{}'),
        (5,  'Etap funkcjonalny',   'Warianty układu',          'Co najmniej dwa układy funkcjonalne do wyboru.', '{}'),
        (6,  'Etap funkcjonalny',   'Korekty układu',           'Poprawki wybranego wariantu po uwagach inwestora.', '{}'),
        (7,  'Etap funkcjonalny',   'Finalny rzut',             'Zatwierdzony układ z wymiarami i opisem pomieszczeń.', '{}'),
        (8,  'Etap funkcjonalny',   'Konsultacje branżowe',     'Uzgodnienia z instalatorami tam, gdzie są potrzebne.', '{}'),
        (9,  'Etap wizualny',       'Moodboard',                'Kierunek stylistyczny: kolory, materiały, nastrój.', '{}'),
        (10, 'Etap wizualny',       'Dobór materiałów',         'Wykończenia, okładziny i kolorystyka z konkretnych źródeł.', '{materials}'),
        (11, 'Etap wizualny',       'Wizualizacje 3D',          'Fotorealistyczne ujęcia pomieszczeń objętych zakresem.', '{visualization}'),
        (12, 'Etap wizualny',       'Korekty wizualizacji',     'Jedna tura poprawek po uwagach inwestora.', '{}'),
        (13, 'Etap techniczny',     'Rzuty techniczne',         'Rysunki wykonawcze: ściany, posadzki, sufity.', '{}'),
        (14, 'Etap techniczny',     'Projekt elektryki',        'Gniazda, oświetlenie, łączniki i sterowanie.', '{}'),
        (15, 'Etap techniczny',     'Projekt hydrauliki',       'Punkty wodne i odpływy w kuchni i łazienkach.', '{}'),
        (16, 'Etap techniczny',     'Kłady ścian i detale',     'Widoki ścian, rozrys płytek, detale zabudowy.', '{}'),
        (17, 'Etap techniczny',     'Zestawienie materiałów',   'Lista wykończenia i wyposażenia z linkami zakupowymi.', '{}'),
        (18, 'Nadzór i realizacja', 'Nadzór autorski',          'Wizyty na budowie i weryfikacja zgodności z projektem.', '{}'),
        (19, 'Nadzór i realizacja', 'Kompletacja i zamówienia', 'Zamówienia, pilnowanie terminów, kontakt z dostawcami.', '{}')
      ) as e(ord, section, name, descr, tags)
    )
  );
$f$;

-- Dokument „Cennik usług dodatkowych" (price-list-defaults.ts, widełki cen).
create or replace function pg_temp.demo_price_list(p_footnote text)
returns jsonb language sql as $f$
  select jsonb_build_object(
    'validDays', 14,
    'footnote', p_footnote,
    'items', (
      select jsonb_agg(jsonb_build_object(
        'id', gen_random_uuid(), 'name', p.name, 'description', p.descr,
        'priceMinCents', p.pmin, 'priceMaxCents', p.pmax, 'unit', p.unit,
        'leadTime', p.lead, 'addedDays', p.days, 'sectionLabel', p.section
      ) order by p.ord)
      from (values
        (1,  'Opracowania techniczne',   'Dodatkowy rzut techniczny',     'Rysunek wykonawczy pomieszczenia spoza zakresu oferty.',            30000, 120000, '',  '4–7 dni roboczych',        4),
        (2,  'Opracowania techniczne',   'Kład ściany',                   'Widok ściany z wymiarami i rozrysem okładzin.',                     15000, 40000,  '',  '3–5 dni roboczych',        3),
        (3,  'Opracowania techniczne',   'Projekt zabudowy meblowej',     'Detal stolarski do wyceny u wykonawcy.',                            40000, 150000, '',  '5–10 dni roboczych',       5),
        (4,  'Opracowania techniczne',   'Aktualizacja dokumentacji',     'Naniesienie zmian po decyzjach inwestora lub zmianie wykonawcy.',   25000, null,   'h', 'do 5 dni roboczych',       5),
        (5,  'Wizualizacje',             'Dodatkowy kadr',                'Kolejne ujęcie pomieszczenia objętego projektem.',                  20000, 45000,  '',  '3–5 dni roboczych',        3),
        (6,  'Wizualizacje',             'Wizualizacja 360°',             'Panorama pomieszczenia do obejrzenia w przeglądarce.',              45000, 90000,  '',  '5–7 dni roboczych',        5),
        (7,  'Wizualizacje',             'Korekta wizualizacji poza turą','Zmiany zgłoszone po zatwierdzeniu wizualizacji.',                   15000, 60000,  '',  '2–4 dni robocze',          2),
        (8,  'Spotkania i komunikacja',  'Spotkanie dodatkowe',           'Spotkanie poza liczbą zawartą w ofercie.',                          20000, null,   'h', 'termin do uzgodnienia',    null),
        (9,  'Spotkania i komunikacja',  'Wyjazd do salonu',              'Wspólny dobór materiałów lub wyposażenia.',                         25000, null,   'h', 'termin do uzgodnienia',    null),
        (10, 'Spotkania i komunikacja',  'Nadzór na budowie',             'Wizyta kontrolna z notatką dla wykonawcy.',                         30000, 60000,  '',  'termin do uzgodnienia',    null),
        (11, 'Spotkania i komunikacja',  'Konsultacja online',            'Rozmowa z omówieniem dokumentacji, bez wizyty na miejscu.',         15000, null,   'h', 'w ciągu 3 dni roboczych',  3)
      ) as p(ord, section, name, descr, pmin, pmax, unit, lead, days)
    )
  );
$f$;

-- Snapshot pytań briefu (domain/brief/template.ts, DEFAULT_BRIEF_TEMPLATE).
-- Zapisany razem z odpowiedziami, jak robi to aplikacja przy wystawianiu linku.
create or replace function pg_temp.demo_brief_template()
returns jsonb language sql as $f$
  select $j$[
    {"id":"obiekt","title":"Obiekt","hint":"Przedmiot opracowania projektowego i jego stan techniczny.","questions":[
      {"id":"obiekt.rodzaj","label":"Przedmiot opracowania","kind":"choice","hint":"","placeholder":"","options":["Mieszkanie","Dom","Apartament","Lokal usługowy","Biuro","Pojedyncze pomieszczenie"],"required":true},
      {"id":"obiekt.adres","label":"Adres inwestycji","kind":"text","hint":"Niezbędny do przeprowadzenia wizji lokalnej oraz przygotowania dokumentacji.","placeholder":"ul. Wiosenna 12/3, Poznań","options":[],"required":false},
      {"id":"obiekt.metraz","label":"Metraż (m²)","kind":"number","hint":"Powierzchnia objęta projektem, nie całego budynku.","placeholder":"64","options":[],"required":true},
      {"id":"obiekt.pomieszczenia","label":"Pomieszczenia objęte zakresem opracowania","kind":"longtext","hint":"Prosimy wymienić po przecinku — lista stanowi podstawę wyceny.","placeholder":"salon z aneksem, sypialnia, pokój dziecka, łazienka, przedpokój","options":[],"required":false},
      {"id":"obiekt.stan","label":"Stan obecny","kind":"choice","hint":"","placeholder":"","options":["Stan deweloperski","Do generalnego remontu","Do odświeżenia","Zamieszkane, zmiana częściowa","Budynek w trakcie budowy"],"required":false},
      {"id":"obiekt.ograniczenia","label":"Znane ograniczenia techniczne","kind":"longtext","hint":"Ściany nośne, piony instalacyjne, wysokość pomieszczeń, zawilgocenia, ochrona konserwatorska, wymogi wspólnoty.","placeholder":"","options":[],"required":false}
    ]},
    {"id":"ludzie","title":"Użytkownicy wnętrza","hint":"Ta część decyduje o układzie funkcjonalnym w stopniu większym niż sam metraż.","questions":[
      {"id":"ludzie.domownicy","label":"Kto będzie korzystał z wnętrza?","kind":"longtext","hint":"Liczba osób i ich wiek. Prosimy uwzględnić również zwierzęta domowe.","placeholder":"para 30+, dziecko 4 lata, pies (labrador)","options":[],"required":false},
      {"id":"ludzie.rytm","label":"Jak przebiega typowy dzień domowników?","kind":"longtext","hint":"Osoby przygotowujące posiłki, praca zdalna, pory dnia, miejsce spożywania posiłków.","placeholder":"","options":[],"required":false},
      {"id":"ludzie.goscie","label":"Jak często i w jakiej liczbie przyjmowani są goście?","kind":"text","hint":"Informacja decydująca o doborze stołu, siedzisk i dodatkowego miejsca do spania.","placeholder":"raz w miesiącu, 4–6 osób","options":[],"required":false},
      {"id":"ludzie.przechowywanie","label":"Co wymaga zaplanowania miejsca do przechowywania?","kind":"longtext","hint":"Przedmioty występujące w większej ilości: książki, sprzęt sportowy, narzędzia, odzież.","placeholder":"","options":[],"required":false},
      {"id":"ludzie.bolaczki","label":"Jakie niedogodności obecnego wnętrza są najbardziej uciążliwe?","kind":"longtext","hint":"Odpowiedź o kluczowym znaczeniu — wskazuje, co w projekcie wymaga zmiany.","placeholder":"","options":[],"required":false}
    ]},
    {"id":"zakres","title":"Zakres prac","hint":"Elementy objęte opracowaniem oraz pozostające bez zmian.","questions":[
      {"id":"zakres.oczekiwania","label":"Jaki jest oczekiwany zakres opracowania?","kind":"multi","hint":"Prosimy zaznaczyć wszystkie interesujące pozycje.","placeholder":"","options":["Układ funkcjonalny","Wizualizacje 3D","Rysunki wykonawcze","Dobór materiałów i wykończeń","Dobór mebli i oświetlenia","Projekt mebli na wymiar","Nadzór autorski","Wsparcie w zakupach"],"required":false},
      {"id":"zakres.zostaje","label":"Elementy pozostające bez zmian","kind":"longtext","hint":"Meble, urządzenia, stolarka okienna, posadzki — elementy wyłączone z zakresu prac.","placeholder":"","options":[],"required":false},
      {"id":"zakres.wykonawca","label":"Czy wykonawca robót został już wybrany?","kind":"choice","hint":"","placeholder":"","options":["Tak, wykonawca wybrany","Nie, trwa poszukiwanie","Prosimy o rekomendację"],"required":false}
    ]},
    {"id":"estetyka","title":"Estetyka","hint":"Kierunek stylistyczny. Decyzje szczegółowe zapadają na etapie koncepcji.","questions":[
      {"id":"estetyka.styl","label":"Preferowana stylistyka wnętrza","kind":"multi","hint":"Możliwy jest wybór kilku pozycji — połączenie stylów również stanowi odpowiedź.","placeholder":"","options":["Nowoczesny minimalizm","Klasyczny","Skandynawski","Industrialny","Japandi","Boho","Rustykalny","Nie wiem, liczę na propozycje"],"required":false},
      {"id":"estetyka.kolory","label":"Preferowana kolorystyka","kind":"text","hint":"","placeholder":"ciepłe beże, drewno, zieleń","options":[],"required":false},
      {"id":"estetyka.nie","label":"Rozwiązania wykluczone","kind":"longtext","hint":"Informacja równie istotna jak preferencje — pozwala uniknąć zbędnej rundy poprawek.","placeholder":"białe fronty na wysoki połysk, zimne światło","options":[],"required":false},
      {"id":"estetyka.inspiracje","label":"Materiały inspiracyjne","kind":"longtext","hint":"Prosimy o wklejenie adresów: Pinterest, Instagram, publikacje branżowe.","placeholder":"","options":[],"required":false}
    ]},
    {"id":"warunki","title":"Budżet i termin","hint":"Dwa parametry warunkujące realność pozostałych założeń.","questions":[
      {"id":"warunki.budzet","label":"Budżet realizacji (bez kosztów projektu)","kind":"text","hint":"Wystarczy podanie widełek. Wartość ta określa standard materiałów, nie jakość opracowania projektowego.","placeholder":"120 000 – 150 000 zł","options":[],"required":false},
      {"id":"warunki.start","label":"Planowany termin rozpoczęcia prac","kind":"text","hint":"","placeholder":"wrzesień 2026","options":[],"required":false},
      {"id":"warunki.termin","label":"Terminy nieprzekraczalne","kind":"longtext","hint":"Przykładowo: planowana przeprowadzka, zakończenie umowy najmu, inne zdarzenia losowe.","placeholder":"","options":[],"required":false},
      {"id":"warunki.uwagi","label":"Dodatkowe informacje istotne dla opracowania","kind":"longtext","hint":"","placeholder":"","options":[],"required":false}
    ]}
  ]$j$::jsonb;
$f$;


-- =============================================================================
-- GŁÓWNY BLOK
-- =============================================================================
do $do$
declare
  -- ===========================================================================
  -- USTAW
  --
  -- Konto (workspace) NIE jest parametrem — wynika z klienta. Klient należy do
  -- jednego workspace'u i tam trafia wszystko poniżej.
  --
  -- Klient: podaj `v_client_id` (UUID) ALBO `v_client_name` (fragment nazwy,
  -- musi pasować do DOKŁADNIE jednego klienta w całej bazie).
  --
  -- Projekt: domyślnie snippet zakłada klientowi DWA NOWE projekty
  -- („Mieszkanie 84 m²" w realizacji i „Dom 168 m²" na etapie oferty).
  -- Jeśli chcesz, żeby komplet mieszkania (wyceny v1/v2, akceptacja, wizja
  -- lokalna, postęp etapów) wylądował w projekcie, który JUŻ MASZ — wpisz
  -- jego UUID w `v_project_id`. Projekt musi należeć do tego klienta.
  -- Drugi projekt (dom) powstaje wtedy nadal, chyba że wyłączysz go niżej.
  -- ===========================================================================
  -- ⚠️ UUID i nazwę wpisuj W POJEDYNCZYCH CUDZYSŁOWACH: '0278…'. Bez nich Postgres
  --    czyta UUID jak liczbę i kończy na „trailing junk after numeric literal".
  v_client_id   uuid := '02788461-f8fd-4d5a-a11a-f43516d38f51';
  v_client_name text := 'Państwo Nowak';    -- fragment nazwy, bez rozróżniania wielkości liter
  v_project_id  uuid := 'ba7e4604-ec03-45da-b42d-2bf9249f5f51';   -- istniejący projekt klienta (opcjonalnie, null = nowy)
  v_create_second_project boolean := false;   -- czy dokładać „Dom 168 m²"
  -- ===========================================================================

  v_client   public.clients%rowtype;
  v_ws       uuid;
  v_owner    uuid;
  v_prepared text;
  v_city     text;
  v_today    date := current_date;
  v_client_snapshot jsonb;

  -- Słownik typów pomieszczeń workspace'u (może być pusty — wtedy null).
  rt_hol uuid; rt_kuchnia uuid; rt_jadalnia uuid; rt_salon uuid; rt_toaleta uuid;
  rt_lazienka uuid; rt_sypialnia uuid; rt_garderoba uuid; rt_dziecko uuid; rt_gabinet uuid;

  -- Projekt A: mieszkanie w realizacji.
  p_a          uuid := gen_random_uuid();
  a_start      date := current_date - 30;
  a_title      text := 'Projekt wnętrza mieszkania 84 m²';
  a_lineage    uuid := gen_random_uuid();
  a_q1         uuid := gen_random_uuid();     -- v1, archiwalna
  a_q2         uuid := gen_random_uuid();     -- v2, zaakceptowana
  a_share1     uuid := gen_random_uuid();
  a_share2     uuid := gen_random_uuid();
  a_rooms      jsonb;
  a_sections   jsonb;
  a_body1      jsonb;
  a_body2      jsonb;
  a_schedule   jsonb;
  a_documents  jsonb;
  a_links      jsonb;
  a_stage      uuid[] := array(select gen_random_uuid() from generate_series(1, 12));
  a_progress   jsonb;
  a_visit      uuid := gen_random_uuid();

  -- Projekt B: dom na etapie oferty.
  p_b          uuid := gen_random_uuid();
  b_q1         uuid := gen_random_uuid();     -- wysłana koncepcja
  b_q2         uuid := gen_random_uuid();     -- szkic nadzoru
  b_share1     uuid := gen_random_uuid();
  b_rooms      jsonb;
  b_body1      jsonb;
  b_body2      jsonb;
  b_schedule   jsonb;
  b_documents  jsonb;
  b_stage      uuid[] := array(select gen_random_uuid() from generate_series(1, 12));
  b_brief      uuid := gen_random_uuid();

  t record;
begin
  -- ---------------------------------------------------------------------------
  -- 0. Klient, workspace, właściciel
  -- ---------------------------------------------------------------------------
  if v_client_id is not null then
    select * into v_client from public.clients where id = v_client_id and deleted_at is null;
    if not found then
      raise exception 'Nie ma klienta o id % (albo jest usunięty).', v_client_id;
    end if;
  else
    if (select count(*) from public.clients
         where deleted_at is null and name ilike '%' || v_client_name || '%') <> 1 then
      raise exception 'Nazwa "%" pasuje do % klientów — podaj v_client_id albo dokładniejszą nazwę. Kandydaci: %',
        v_client_name,
        (select count(*) from public.clients where deleted_at is null and name ilike '%' || v_client_name || '%'),
        coalesce((select string_agg(name || ' [' || id || ']', '; ') from public.clients
                   where deleted_at is null and name ilike '%' || v_client_name || '%'), '(brak)');
    end if;
    select * into v_client from public.clients
     where deleted_at is null and name ilike '%' || v_client_name || '%';
  end if;

  v_ws := v_client.workspace_id;
  select owner_id into v_owner from public.workspaces where id = v_ws;

  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(b.company_name), ''), 'Pracownia')
    into v_prepared
    from public.workspaces w
    left join public.profiles p on p.id = w.owner_id
    left join public.brand_kits b on b.workspace_id = w.id
   where w.id = v_ws;

  -- Istniejący projekt (opcjonalnie) — musi należeć do tego klienta.
  if v_project_id is not null then
    if not exists (select 1 from public.projects
                    where id = v_project_id and client_id = v_client.id and deleted_at is null) then
      raise exception 'Projekt % nie istnieje albo nie należy do klienta "%".', v_project_id, v_client.name;
    end if;
    -- Baza pilnuje: jedna zaakceptowana wycena na projekt (0018).
    if exists (select 1 from public.quotes
                where project_id = v_project_id and status = 'accepted' and deleted_at is null) then
      raise exception 'Projekt % ma już zaakceptowaną wycenę — snippet dokłada drugą. Wskaż inny projekt albo zostaw v_project_id puste.', v_project_id;
    end if;
    p_a := v_project_id;
  end if;

  -- Kontekst dla zapytania podsumowującego pod blokiem DO.
  drop table if exists pg_temp.demo_ctx;
  create temp table demo_ctx as select v_client.id as client_id;

  -- Uzupełniamy TYLKO puste pola karty klienta — nie nadpisujemy tego, co wpisałeś.
  update public.clients
     set phone   = coalesce(nullif(btrim(phone), ''),   '+48 601 234 567'),
         email   = coalesce(nullif(btrim(email), ''),
                            coalesce(nullif(regexp_replace(lower(name), '[^a-z0-9]+', '', 'g'), ''), 'kontakt') || '@example.com'),
         address = coalesce(nullif(btrim(address), ''), 'ul. Wiktorska 41/7'),
         city    = coalesce(nullif(btrim(city), ''),    'Warszawa'),
         notes   = coalesce(nullif(btrim(notes), ''),   'Polecenie od poprzedniego klienta. Kontakt najlepiej po 17:00, decyzje podejmują wspólnie.')
   where id = v_client.id;
  select * into v_client from public.clients where id = v_client.id;

  v_city := v_client.city;
  v_client_snapshot := jsonb_build_object(
    'name', v_client.name,
    'phone', coalesce(v_client.phone, ''),
    'email', coalesce(v_client.email, ''),
    'city',  coalesce(v_client.city, '')
  );

  select id into rt_hol       from public.room_types where workspace_id = v_ws and slug = 'sien-hol'        and deleted_at is null;
  select id into rt_kuchnia   from public.room_types where workspace_id = v_ws and slug = 'kuchnia'         and deleted_at is null;
  select id into rt_jadalnia  from public.room_types where workspace_id = v_ws and slug = 'jadalnia'        and deleted_at is null;
  select id into rt_salon     from public.room_types where workspace_id = v_ws and slug = 'salon'           and deleted_at is null;
  select id into rt_toaleta   from public.room_types where workspace_id = v_ws and slug = 'toaleta'         and deleted_at is null;
  select id into rt_lazienka  from public.room_types where workspace_id = v_ws and slug = 'lazienka'        and deleted_at is null;
  select id into rt_sypialnia from public.room_types where workspace_id = v_ws and slug = 'sypialnia'       and deleted_at is null;
  select id into rt_garderoba from public.room_types where workspace_id = v_ws and slug = 'garderoba'       and deleted_at is null;
  select id into rt_dziecko   from public.room_types where workspace_id = v_ws and slug = 'pokoj-dzieciecy' and deleted_at is null;
  select id into rt_gabinet   from public.room_types where workspace_id = v_ws and slug = 'gabinet'         and deleted_at is null;

  -- ---------------------------------------------------------------------------
  -- 1. Projekty
  -- ---------------------------------------------------------------------------
  if v_project_id is null then
    insert into public.projects
      (id, workspace_id, client_id, name, address, city, area_m2, kind, status, start_date, notes, sort_order, created_by, created_at, updated_at)
    values
      (p_a, v_ws, v_client.id,
       'Mieszkanie 84 m² — ' || v_city, v_client.address, v_city, 84.0, 'apartment', 'in_progress', a_start,
       'Realizacja ruszyła ' || to_char(a_start, 'DD.MM') || '. Wykonawca: ekipa p. Marka (tel. w umowie). ' ||
       'Nadzór co dwa tygodnie, kuchnia na wymiar zamówiona — montaż za tydzień. Klienci chcą się wprowadzić przed świętami.',
       0, v_owner, now() - interval '50 days', now() - interval '2 days');
  else
    -- Istniejący projekt: nie ruszamy nazwy ani notatek. Status podnosimy do
    -- „w realizacji" tylko z lead/offer (zaakceptowana wycena + postęp etapów
    -- w projekcie na etapie leada wyglądałyby niespójnie), data startu tylko
    -- gdy jej nie ma.
    update public.projects
       set status     = case when status in ('lead', 'offer') then 'in_progress' else status end,
           start_date = coalesce(start_date, a_start)
     where id = p_a;
    select coalesce(start_date, a_start), 'Projekt wnętrza — ' || name
      into a_start, a_title
      from public.projects where id = p_a;
  end if;

  if v_create_second_project then
    insert into public.projects
      (id, workspace_id, client_id, name, address, city, area_m2, kind, status, start_date, notes, sort_order, created_by, created_at, updated_at)
    values
      (p_b, v_ws, v_client.id,
       'Dom 168 m² — ' || v_city, 'ul. Leśna 14', v_city, 168.0, 'house', 'offer', null,
       'Drugi projekt tych samych klientów: dom w stanie deweloperskim, odbiór od dewelopera w przyszłym kwartale. ' ||
       'Brief wypełniony, koncepcja wysłana — czekamy na decyzję.',
       1, v_owner, now() - interval '21 days', now() - interval '3 days');
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Projekt A — pomieszczenia, pozycje, harmonogram, dokumenty
  -- ---------------------------------------------------------------------------
  a_rooms := jsonb_build_array(
    pg_temp.demo_room('Przedpokój',                rt_hol,       1, false, true),
    pg_temp.demo_room('Salon z aneksem kuchennym', rt_salon,     1, true,  true),
    pg_temp.demo_room('Kuchnia (aneks)',           rt_kuchnia,   1, true,  true),
    pg_temp.demo_room('Sypialnia',                 rt_sypialnia, 1, true,  true),
    pg_temp.demo_room('Pokój dziecięcy',           rt_dziecko,   1, true,  true),
    pg_temp.demo_room('Łazienka',                  rt_lazienka,  1, true,  true),
    pg_temp.demo_room('Garderoba',                 rt_garderoba, 1, false, true)
  );

  a_sections := jsonb_build_array(
    pg_temp.demo_section('Projekt koncepcyjny', '[]'::jsonb, jsonb_build_array(
      pg_temp.demo_group('Układ funkcjonalny', jsonb_build_array(
        pg_temp.demo_item('Inwentaryzacja z dokumentacją fotograficzną', 'Pomiary z natury, weryfikacja rzutu dewelopera, zdjęcia stanu zastanego.', 1, 'lump', 80000),
        pg_temp.demo_item('Układ funkcjonalny w dwóch wariantach', 'Dwa warianty rozmieszczenia ścian, mebli i stref dla: {rooms}. Cena za m².', 84, 'm2', 9000, '{meeting}'),
        pg_temp.demo_item('Moodboard i koncepcja kolorystyczna', 'Kierunek stylistyczny, paleta materiałów i kolorów, tablica inspiracji.', 1, 'lump', 120000, '{materials}')
      ))
    )),
    pg_temp.demo_section('Wizualizacje 3D', jsonb_build_array(
      pg_temp.demo_item('Wizualizacje — salon z aneksem', 'Trzy fotorealistyczne ujęcia strefy dziennej.', 3, 'frame', 60000, '{visualization}'),
      pg_temp.demo_item('Wizualizacje — kuchnia', 'Dwa ujęcia zabudowy kuchennej.', 2, 'frame', 60000, '{visualization}'),
      pg_temp.demo_item('Wizualizacje — sypialnia', 'Dwa ujęcia.', 2, 'frame', 60000, '{visualization}'),
      pg_temp.demo_item('Wizualizacje — pokój dziecięcy', 'Dwa ujęcia.', 2, 'frame', 60000, '{visualization}'),
      pg_temp.demo_item('Wizualizacje — łazienka', 'Dwa ujęcia z rozrysem płytek.', 2, 'frame', 60000, '{visualization}')
    )),
    pg_temp.demo_section('Dokumentacja wykonawcza', '[]'::jsonb, jsonb_build_array(
      pg_temp.demo_group('Rysunki techniczne', jsonb_build_array(
        pg_temp.demo_item('Rzuty wykonawcze', 'Ściany, posadzki, sufity podwieszane, wymiarowanie dla: {rooms:technical}. Cena za m².', 84, 'm2', 11000),
        pg_temp.demo_item('Projekt elektryki i oświetlenia', 'Punkty świetlne, gniazda, łączniki, sterowanie. Cena za m².', 84, 'm2', 3500),
        pg_temp.demo_item('Kłady ścian i rozrys płytek — łazienka', 'Widoki wszystkich ścian z wymiarami i układem okładzin.', 1, 'lump', 150000)
      )),
      pg_temp.demo_group('Zabudowy i materiały', jsonb_build_array(
        pg_temp.demo_item('Projekt zabudów meblowych', 'Kuchnia, garderoba, zabudowa w przedpokoju — rysunki dla stolarza.', 3, 'element', 90000),
        pg_temp.demo_item('Zestawienie materiałów i wyposażenia', 'Lista wykończenia z linkami zakupowymi i szacunkiem kosztów.', 1, 'lump', 140000, '{materials}')
      ))
    )),
    pg_temp.demo_section('Nadzór i realizacja', jsonb_build_array(
      pg_temp.demo_item('Nadzór autorski — wizyta na budowie', 'Weryfikacja zgodności z projektem, notatka dla wykonawcy po każdej wizycie.', 8, 'visit', 45000),
      pg_temp.demo_item('Kompletacja materiałów', 'Zamówienia, pilnowanie terminów dostaw, kontakt z dostawcami.', 1, 'lump', 250000, '{}', false),
      pg_temp.demo_item('Stylizacja końcowa i sesja zdjęciowa', 'Dobór dekoracji, ustawienie, zdjęcia po zakończeniu prac — wycena po ustaleniu zakresu.', 1, 'lump', null)
    ))
  );

  a_links := jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'label', 'Wizualizacje — folder na Dysku Google', 'url', 'https://drive.google.com/drive/folders/1kQ7demo-toolier', 'note', 'Dostęp po zalogowaniu na adres z oferty.'),
    jsonb_build_object('id', gen_random_uuid(), 'label', 'Moodboard na Pintereście', 'url', 'https://pl.pinterest.com/toolier/mieszkanie-84/', 'note', '')
  );

  -- v2 — pełny zakres z rabatem 5% za komplet.
  a_body2 := pg_temp.demo_body(
    a_title,
    v_city || ' — mieszkanie trzypokojowe, stan deweloperski',
    'Dziękujemy za zaufanie i spotkanie w mieszkaniu. Poniżej zakres prac projektowych i wycena — wersja rozszerzona o nadzór autorski, zgodnie z Państwa prośbą.',
    'Kompleksowy projekt mieszkania o powierzchni 84 m²: koncepcja z dwoma wariantami układu, wizualizacje pięciu pomieszczeń, pełna dokumentacja wykonawcza z projektami zabudów oraz nadzór autorski nad realizacją.',
    v_client_snapshot, v_today - 43, 14, a_rooms,
    jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'name', 'Rabat za pełen zakres', 'description', '5% przy zamówieniu koncepcji, dokumentacji i nadzoru razem.',
      'enabled', true, 'type', 'percent', 'percent', 5, 'scope', 'quote', 'sectionId', null, 'itemIds', '[]'::jsonb,
      'condition', 'always', 'roundToCents', 0
    )),
    a_sections, a_links, v_prepared
  );

  -- v1 — bez nadzoru i bez rabatu (klient poprosił o wariant z nadzorem → v2).
  a_body1 := jsonb_set(
    jsonb_set(a_body2, '{discounts}', '[]'::jsonb),
    '{sections}',
    (select jsonb_agg(s.v order by s.n) from jsonb_array_elements(a_body2->'sections') with ordinality as s(v, n) where s.n <= 3)
  );
  a_body1 := a_body1
    || jsonb_build_object(
         'issueDate', to_char(v_today - 48, 'YYYY-MM-DD'),
         'intro', 'Dziękujemy za zaufanie i spotkanie w mieszkaniu. Poniżej zakres prac projektowych i wycena.',
         'links', '[]'::jsonb
       );

  a_schedule := jsonb_build_object(
    'startDate', to_char(a_start, 'YYYY-MM-DD'),
    'providerWorkdaysPerWeek', 5, 'clientWorkdaysPerWeek', 5, 'holidays', 'PL',
    'stages', jsonb_build_array(
      pg_temp.demo_stage(a_stage[1],  'Inwentaryzacja',              'provider', 1, 0,   'none',      true),
      pg_temp.demo_stage(a_stage[2],  'Rzuty funkcjonalne',          'provider', 2, 0.5, 'all',       true),
      pg_temp.demo_stage(a_stage[3],  'Wybór rzutu przez inwestora', 'client',   3, 0,   'none',      true),
      pg_temp.demo_stage(a_stage[4],  'Finalny rzut',                'provider', 1, 0,   'none',      true),
      pg_temp.demo_stage(a_stage[5],  'Spotkania',                   'client',   2, 0,   'none',      true,  '{meeting}'),
      pg_temp.demo_stage(a_stage[6],  'Zbieranie inspiracji',        'client',   5, 0,   'none',      false),
      pg_temp.demo_stage(a_stage[7],  'Moodboard',                   'provider', 2, 0,   'visual',    true),
      pg_temp.demo_stage(a_stage[8],  'Wizualizacje 3D',             'provider', 0, 2,   'visual',    true,  '{visualization}'),
      pg_temp.demo_stage(a_stage[9],  'Akceptacja wizualizacji',     'client',   0, 1,   'visual',    true),
      pg_temp.demo_stage(a_stage[10], 'Rysunki techniczne',          'provider', 1, 1.5, 'technical', true),
      pg_temp.demo_stage(a_stage[11], 'Teczka projektowa',           'provider', 2, 0,   'none',      true),
      pg_temp.demo_stage(a_stage[12], 'Komunikacja projektowa',      'provider', 2, 0,   'none',      true,  '{communication}')
    )
  );

  a_documents := jsonb_build_object(
    'stages', pg_temp.demo_stages_doc(
      array['Konsultacje branżowe', 'Projekt hydrauliki', 'Kompletacja i zamówienia'],
      'Etapy oznaczone krzyżykiem nie wchodzą w zakres niniejszej oferty. Możemy je dołożyć na warunkach z cennika usług dodatkowych.'
    ),
    'priceList', pg_temp.demo_price_list('Ceny netto. Termin liczony od potwierdzenia zlecenia w dni robocze.')
  );

  -- Postęp realizacji: sześć etapów zamkniętych, wizualizacje w toku.
  a_progress := jsonb_build_object(
    a_stage[1]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb(a_start::timestamptz),                   'completedAt', to_jsonb((a_start + 1)::timestamptz),  'name', 'Inwentaryzacja'),
    a_stage[2]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb((a_start + 2)::timestamptz),             'completedAt', to_jsonb((a_start + 7)::timestamptz),  'name', 'Rzuty funkcjonalne'),
    a_stage[3]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb((a_start + 8)::timestamptz),             'completedAt', to_jsonb((a_start + 11)::timestamptz), 'name', 'Wybór rzutu przez inwestora'),
    a_stage[4]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb((a_start + 12)::timestamptz),            'completedAt', to_jsonb((a_start + 13)::timestamptz), 'name', 'Finalny rzut'),
    a_stage[5]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb((a_start + 14)::timestamptz),            'completedAt', to_jsonb((a_start + 16)::timestamptz), 'name', 'Spotkania'),
    a_stage[7]::text, jsonb_build_object('status', 'done',        'startedAt', to_jsonb((a_start + 17)::timestamptz),            'completedAt', to_jsonb((a_start + 19)::timestamptz), 'name', 'Moodboard'),
    a_stage[8]::text, jsonb_build_object('status', 'in_progress', 'startedAt', to_jsonb((a_start + 20)::timestamptz),            'completedAt', null,                                  'name', 'Wizualizacje 3D')
  );

  update public.projects set stage_progress = a_progress where id = p_a;

  -- ---------------------------------------------------------------------------
  -- 3. Projekt A — wycena v1 (archiwalna) z uwagą klienta
  -- ---------------------------------------------------------------------------
  select * into t from pg_temp.demo_totals(a_body1);
  insert into public.quotes
    (id, workspace_id, client_id, project_id, lineage_id, version, number, title, status, doc_kind, body,
     schedule, documents, total_net_cents, total_gross_cents, currency, client_name, city, internal_notes,
     sent_at, valid_until, created_by, created_at, updated_at)
  values
    (a_q1, v_ws, v_client.id, p_a, a_lineage, 1, pg_temp.demo_number(v_ws, v_today - 48),
     a_title, 'archived', 'offer', a_body1,
     jsonb_set(a_schedule, '{startDate}', 'null'::jsonb), a_documents, t.net_cents, t.gross_cents, 'PLN',
     v_client.name, v_city, 'Pierwsza wersja bez nadzoru. Klient poprosił o wariant z nadzorem → v2.',
     now() - interval '46 days', v_today - 32, v_owner, now() - interval '48 days', now() - interval '43 days');

  insert into public.quote_shares (id, quote_id, expires_at, first_viewed_at, last_viewed_at, view_count, created_at)
  values (a_share1, a_q1, now() - interval '16 days', now() - interval '45 days 20 hours', now() - interval '44 days 2 hours', 3, now() - interval '46 days');

  insert into public.quote_comments (quote_id, share_id, author_name, message, created_at, read_at)
  values (a_q1, a_share1, v_client.name,
          'Dziękujemy za ofertę, bardzo nam się podoba zakres. Chcielibyśmy jednak dołożyć nadzór autorski nad realizacją — czy mogą Państwo przygotować wariant z nadzorem? Ekipa startuje za miesiąc.',
          now() - interval '44 days 2 hours', now() - interval '44 days');

  -- ---------------------------------------------------------------------------
  -- 4. Projekt A — wycena v2 (zaakceptowana online)
  -- ---------------------------------------------------------------------------
  select * into t from pg_temp.demo_totals(a_body2);
  insert into public.quotes
    (id, workspace_id, client_id, project_id, lineage_id, version, number, title, status, doc_kind, body,
     schedule, documents, total_net_cents, total_gross_cents, currency, client_name, city, internal_notes,
     sent_at, accepted_at, valid_until, created_by, created_at, updated_at)
  values
    (a_q2, v_ws, v_client.id, p_a, a_lineage, 2, pg_temp.demo_number(v_ws, v_today - 43),
     a_title, 'accepted', 'offer', a_body2,
     a_schedule, a_documents, t.net_cents, t.gross_cents, 'PLN',
     v_client.name, v_city, 'Wariant z nadzorem (8 wizyt) i rabatem 5% za komplet. Zaakceptowany online.',
     now() - interval '42 days', now() - interval '38 days', v_today - 28, v_owner, now() - interval '43 days', now() - interval '38 days');

  insert into public.quote_shares (id, quote_id, expires_at, first_viewed_at, last_viewed_at, view_count, created_at)
  values (a_share2, a_q2, now() - interval '12 days', now() - interval '41 days 18 hours', now() - interval '20 days', 5, now() - interval '42 days');

  insert into public.quote_acceptances (quote_id, share_id, accepted_body, enabled_item_ids, signer_name, signer_ip, decision, accepted_at)
  values (a_q2, a_share2, a_body2,
          (select array_agg(x.v->>'id')
             from jsonb_array_elements(a_body2->'sections') as s(v)
             cross join lateral (
               select t1.v from jsonb_array_elements(s.v->'items') as t1(v)
               union all
               select t2.v from jsonb_array_elements(s.v->'groups') as g(v)
                           cross join lateral jsonb_array_elements(g.v->'items') as t2(v)
             ) as x
            where (x.v->>'enabled')::boolean),
          v_client.name, '89.64.12.7'::inet, 'accepted', now() - interval '38 days');

  -- ---------------------------------------------------------------------------
  -- 5. Projekt B — koncepcja domu (wysłana, otwarta przez klienta)
  -- ---------------------------------------------------------------------------
  if v_create_second_project then
  b_rooms := jsonb_build_array(
    pg_temp.demo_room('Hol z wiatrołapem',      rt_hol,       1, false, true),
    pg_temp.demo_room('Salon',                  rt_salon,     1, true,  true),
    pg_temp.demo_room('Kuchnia',                rt_kuchnia,   1, true,  true),
    pg_temp.demo_room('Jadalnia',               rt_jadalnia,  1, true,  true),
    pg_temp.demo_room('Gabinet',                rt_gabinet,   1, true,  true),
    pg_temp.demo_room('Sypialnia rodziców',     rt_sypialnia, 1, true,  true),
    pg_temp.demo_room('Pokoje dzieci',          rt_dziecko,   2, true,  true),
    pg_temp.demo_room('Łazienki',               rt_lazienka,  2, true,  true),
    pg_temp.demo_room('Toaleta na parterze',    rt_toaleta,   1, false, true),
    pg_temp.demo_room('Garderoba',              rt_garderoba, 1, false, true)
  );

  b_body1 := pg_temp.demo_body(
    'Projekt koncepcyjny domu 168 m²',
    v_city || ', ul. Leśna 14 — dom jednorodzinny, stan deweloperski',
    'Dziękujemy za wypełnienie briefu — odpowiedzi na temat rytmu dnia i przechowywania bardzo pomogły. Poniżej propozycja zakresu i wycena etapu koncepcyjnego i wykonawczego.',
    'Projekt wnętrz domu jednorodzinnego o powierzchni 168 m² na dwóch kondygnacjach. Koncepcja z dwoma wariantami układu parteru, wizualizacje strefy dziennej i sypialni, dokumentacja wykonawcza. Nadzór autorski w osobnej ofercie po akceptacji koncepcji.',
    v_client_snapshot, v_today - 3, 14, b_rooms,
    jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'name', 'Rabat dla stałego klienta', 'description', 'Drugi projekt w naszej pracowni.',
      'enabled', true, 'type', 'fixed', 'valueCents', 150000, 'scope', 'quote', 'sectionId', null, 'itemIds', '[]'::jsonb,
      'condition', 'always', 'roundToCents', 0
    )),
    jsonb_build_array(
      pg_temp.demo_section('Koncepcja', '[]'::jsonb, jsonb_build_array(
        pg_temp.demo_group('Układ funkcjonalny', jsonb_build_array(
          pg_temp.demo_item('Inwentaryzacja i weryfikacja projektu budowlanego', 'Pomiary, sprawdzenie zgodności z rzutami architekta, spis instalacji.', 1, 'lump', 150000),
          pg_temp.demo_item('Układ funkcjonalny parteru i piętra', 'Dwa warianty układu dla: {rooms}. Cena za m².', 168, 'm2', 8500, '{meeting}'),
          pg_temp.demo_item('Moodboard i koncepcja materiałowa', 'Paleta materiałów i kolorów spójna dla całego domu.', 1, 'lump', 150000, '{materials}')
        ))
      )),
      pg_temp.demo_section('Wizualizacje 3D', jsonb_build_array(
        pg_temp.demo_item('Wizualizacje — salon z jadalnią', 'Trzy ujęcia otwartej strefy dziennej.', 3, 'frame', 55000, '{visualization}'),
        pg_temp.demo_item('Wizualizacje — kuchnia', 'Dwa ujęcia.', 2, 'frame', 55000, '{visualization}'),
        pg_temp.demo_item('Wizualizacje — sypialnia rodziców', 'Dwa ujęcia.', 2, 'frame', 55000, '{visualization}'),
        pg_temp.demo_item('Wizualizacje — pokoje dzieci', 'Po dwa ujęcia na pokój.', 4, 'frame', 55000, '{visualization}'),
        pg_temp.demo_item('Wizualizacje — łazienki', 'Po jednym ujęciu na łazienkę.', 2, 'frame', 55000, '{visualization}'),
        pg_temp.demo_item('Wizualizacje — gabinet', 'Jedno ujęcie — pozycja opcjonalna.', 1, 'frame', 55000, '{visualization}', false)
      )),
      pg_temp.demo_section('Dokumentacja wykonawcza', jsonb_build_array(
        pg_temp.demo_item('Rzuty wykonawcze', 'Ściany, posadzki, sufity dla: {rooms:technical}. Cena za m².', 168, 'm2', 10000),
        pg_temp.demo_item('Projekt elektryki i oświetlenia', 'Cała kondygnacja parteru i piętra. Cena za m².', 168, 'm2', 3500),
        pg_temp.demo_item('Kłady ścian — łazienki i kuchnia', 'Rozrys płytek i zabudowy.', 3, 'element', 120000),
        pg_temp.demo_item('Projekt zabudów meblowych', 'Kuchnia, garderoba, szafy w pokojach, zabudowa w holu.', 5, 'element', 90000, '{}', false),
        pg_temp.demo_item('Zestawienie materiałów i wyposażenia', 'Lista z linkami i szacunkiem kosztów.', 1, 'lump', 200000, '{materials}')
      ))
    ),
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Inspiracje od Państwa — tablica Pinterest', 'url', 'https://pl.pinterest.com/toolier/dom-168/', 'note', '')
    ),
    v_prepared
  );

  b_schedule := jsonb_build_object(
    'startDate', to_char(v_today + 21, 'YYYY-MM-DD'),
    'providerWorkdaysPerWeek', 5, 'clientWorkdaysPerWeek', 5, 'holidays', 'PL',
    'stages', jsonb_build_array(
      pg_temp.demo_stage(b_stage[1],  'Inwentaryzacja',              'provider', 2, 0,   'none',      true),
      pg_temp.demo_stage(b_stage[2],  'Rzuty funkcjonalne',          'provider', 3, 0.5, 'all',       true),
      pg_temp.demo_stage(b_stage[3],  'Wybór rzutu przez inwestora', 'client',   5, 0,   'none',      true),
      pg_temp.demo_stage(b_stage[4],  'Finalny rzut',                'provider', 2, 0,   'none',      true),
      pg_temp.demo_stage(b_stage[5],  'Spotkania',                   'client',   3, 0,   'none',      true,  '{meeting}'),
      pg_temp.demo_stage(b_stage[6],  'Zbieranie inspiracji',        'client',   5, 0,   'none',      false),
      pg_temp.demo_stage(b_stage[7],  'Moodboard',                   'provider', 3, 0,   'visual',    true),
      pg_temp.demo_stage(b_stage[8],  'Wizualizacje 3D',             'provider', 0, 2,   'visual',    true,  '{visualization}'),
      pg_temp.demo_stage(b_stage[9],  'Akceptacja wizualizacji',     'client',   0, 1,   'visual',    true),
      pg_temp.demo_stage(b_stage[10], 'Rysunki techniczne',          'provider', 2, 1.5, 'technical', true),
      pg_temp.demo_stage(b_stage[11], 'Teczka projektowa',           'provider', 3, 0,   'none',      true),
      pg_temp.demo_stage(b_stage[12], 'Komunikacja projektowa',      'provider', 3, 0,   'none',      true,  '{communication}')
    )
  );

  b_documents := jsonb_build_object(
    'stages', pg_temp.demo_stages_doc(
      array['Konsultacje branżowe', 'Projekt hydrauliki', 'Nadzór autorski', 'Kompletacja i zamówienia'],
      'Nadzór autorski i kompletacja — w osobnej ofercie po akceptacji koncepcji.'
    ),
    'priceList', pg_temp.demo_price_list('Ceny netto. Termin liczony od potwierdzenia zlecenia w dni robocze.')
  );

  select * into t from pg_temp.demo_totals(b_body1);
  insert into public.quotes
    (id, workspace_id, client_id, project_id, lineage_id, version, number, title, status, doc_kind, body,
     schedule, documents, total_net_cents, total_gross_cents, currency, client_name, city, internal_notes,
     sent_at, valid_until, created_by, created_at, updated_at)
  values
    (b_q1, v_ws, v_client.id, p_b, b_q1, 1, pg_temp.demo_number(v_ws, v_today - 3),
     'Projekt koncepcyjny domu 168 m²', 'sent', 'offer', b_body1,
     b_schedule, b_documents, t.net_cents, t.gross_cents, 'PLN',
     v_client.name, v_city, 'Wysłane po briefie. Gabinet i zabudowy jako opcje do odklikania przez klienta.',
     now() - interval '3 days', v_today + 11, v_owner, now() - interval '5 days', now() - interval '3 days');

  insert into public.quote_shares (id, quote_id, expires_at, first_viewed_at, last_viewed_at, view_count, created_at)
  values (b_share1, b_q1, now() + interval '27 days', now() - interval '2 days 5 hours', now() - interval '1 day 3 hours', 2, now() - interval '3 days');

  -- ---------------------------------------------------------------------------
  -- 6. Projekt B — szkic oferty nadzoru (bez numeru, bez linku)
  -- ---------------------------------------------------------------------------
  b_body2 := pg_temp.demo_body(
    'Nadzór autorski nad realizacją domu',
    v_city || ', ul. Leśna 14',
    'Oferta nadzoru autorskiego — do wysłania po akceptacji koncepcji.',
    'Nadzór autorski nad realizacją projektu wnętrz domu 168 m²: wizyty na budowie, koordynacja wykonawców, kompletacja materiałów i odbiór końcowy.',
    v_client_snapshot, v_today - 1, 14, b_rooms, '[]'::jsonb,
    jsonb_build_array(
      pg_temp.demo_section('Nadzór autorski', jsonb_build_array(
        pg_temp.demo_item('Wizyta nadzorcza na budowie', 'Weryfikacja zgodności z projektem, notatka dla wykonawcy.', 12, 'visit', 45000),
        pg_temp.demo_item('Koordynacja wykonawców', 'Bieżący kontakt z ekipami, harmonogram, rozwiązywanie kolizji. Cena za miesiąc.', 5, 'custom', 90000),
        pg_temp.demo_item('Kompletacja materiałów i wyposażenia', 'Zamówienia, pilnowanie terminów dostaw, kontakt z dostawcami.', 1, 'lump', 350000),
        pg_temp.demo_item('Odbiór końcowy inwestycji', 'Protokół usterek, lista poprawek, odbiór z wykonawcą.', 1, 'lump', 60000)
      ))
    ),
    '[]'::jsonb, v_prepared
  );
  -- Jednostka własna dla koordynacji („mies.").
  b_body2 := jsonb_set(b_body2, '{sections,0,items,1,unitLabel}', '"mies."'::jsonb);

  select * into t from pg_temp.demo_totals(b_body2);
  insert into public.quotes
    (id, workspace_id, client_id, project_id, lineage_id, version, number, title, status, doc_kind, body,
     schedule, documents, total_net_cents, total_gross_cents, currency, client_name, city, internal_notes,
     created_by, created_at, updated_at)
  values
    (b_q2, v_ws, v_client.id, p_b, b_q2, 1, null,
     'Nadzór autorski nad realizacją domu', 'draft', 'offer', b_body2,
     null, null, t.net_cents, t.gross_cents, 'PLN',
     v_client.name, v_city, 'Wysłać dopiero po akceptacji koncepcji. Liczba wizyt do potwierdzenia z wykonawcą.',
     v_owner, now() - interval '1 day', now() - interval '2 hours');

  -- ---------------------------------------------------------------------------
  -- 7. Brief wypełniony przez klienta (projekt B)
  -- ---------------------------------------------------------------------------
  insert into public.client_briefs
    (id, workspace_id, client_id, project_id, template, answers, expires_at, submitted_at,
     first_viewed_at, last_viewed_at, view_count, created_at, updated_at)
  values
    (b_brief, v_ws, v_client.id, p_b, pg_temp.demo_brief_template(),
     jsonb_build_object(
       'obiekt.rodzaj',        'Dom',
       'obiekt.adres',         'ul. Leśna 14, ' || v_city,
       'obiekt.metraz',        '168',
       'obiekt.pomieszczenia', 'hol z wiatrołapem, salon z jadalnią, kuchnia, gabinet, toaleta na parterze; na piętrze sypialnia z garderobą, dwa pokoje dzieci, dwie łazienki',
       'obiekt.stan',          'Stan deweloperski',
       'obiekt.ograniczenia',  'Skosy na piętrze (wysokość ścianki kolankowej 110 cm). Kominek w salonie już wymurowany. Rekuperacja — kanały w stropie.',
       'ludzie.domownicy',     'My (38 i 36 lat), dwie córki (7 i 4 lata) i kot. Rodzice często zostają na noc.',
       'ludzie.rytm',          'Oboje pracujemy hybrydowo — potrzebny gabinet do wideorozmów. Gotujemy codziennie, jemy razem przy stole, nie na wyspie. Wieczory w salonie, dzieci wcześnie śpią.',
       'ludzie.goscie',        'co dwa tygodnie, 6–8 osób, rodzinne obiady',
       'ludzie.przechowywanie','Dużo książek (ok. 6 mb półek), rowery ×4, sprzęt narciarski, zabawki, zapas jedzenia dla kota — spiżarnia albo duża szafa w kuchni.',
       'ludzie.bolaczki',      'W obecnym mieszkaniu brakuje miejsca na buty i kurtki przy wejściu, a stół jest za mały na gości. Kuchnia bez okna — chcemy jasną.',
       'zakres.oczekiwania',   jsonb_build_array('Układ funkcjonalny', 'Wizualizacje 3D', 'Rysunki wykonawcze', 'Dobór materiałów i wykończeń', 'Projekt mebli na wymiar', 'Nadzór autorski'),
       'zakres.zostaje',       'Okna i drzwi zewnętrzne, kominek, schody betonowe (do obłożenia).',
       'zakres.wykonawca',     'Prosimy o rekomendację',
       'estetyka.styl',        jsonb_build_array('Japandi', 'Skandynawski'),
       'estetyka.kolory',      'ciepłe beże, jasny dąb, przygaszona zieleń, czarne akcenty',
       'estetyka.nie',         'Połysk, szarość „na zimno", marmurowe imitacje, sufity z ledami po obwodzie.',
       'estetyka.inspiracje',  'https://pl.pinterest.com/toolier/dom-168/ — tablica z naszymi zapisami. Podobał nam się też dom z okładki „Dobrze Mieszkaj" z maja.',
       'warunki.budzet',       '350 000 – 420 000 zł',
       'warunki.start',        'za ok. 3 miesiące, po odbiorze od dewelopera',
       'warunki.termin',       'Chcemy się wprowadzić przed początkiem roku szkolnego.',
       'warunki.uwagi',        'Prosimy o kontakt po 17:00. Decyzje podejmujemy wspólnie, więc spotkania najlepiej wieczorem lub w sobotę.'
     ),
     now() + interval '40 days', now() - interval '12 days',
     now() - interval '19 days', now() - interval '12 days', 4,
     now() - interval '20 days', now() - interval '12 days');

  insert into public.calendar_notes (workspace_id, client_id, project_id, day, at_time, text, done)
  values
    (v_ws, v_client.id, p_b,  v_today + 3, '17:30', 'Prezentacja koncepcji domu — spotkanie online', false),
    (v_ws, null,        null, v_today + 5, null,    'Zamówić próbki dębu do moodboardu (dom)',       false);
  end if;  -- v_create_second_project

  -- ---------------------------------------------------------------------------
  -- 8. Wizja lokalna (projekt A) — obmiar i spis instalacji
  -- ---------------------------------------------------------------------------
  insert into public.site_visits
    (id, workspace_id, project_id, visited_at, attendees, rooms, checks, notes, created_by, created_at, updated_at)
  values
    (a_visit, v_ws, p_a, v_today - 47,
     v_prepared || ' (pracownia), ' || v_client.name || ' (inwestorzy), p. Marek (wykonawca)',
     jsonb_build_array(
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Przedpokój',                'lengthCm', 412, 'widthCm', 168, 'heightCm', 268, 'note', 'Miejsce na zabudowę 60 cm głębokości na ścianie prawej.'),
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Salon z aneksem kuchennym', 'lengthCm', 742, 'widthCm', 486, 'heightCm', 268, 'note', 'Słup 25×25 przy oknie — nie do usunięcia. Wyjście na balkon od południa.'),
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Sypialnia',                 'lengthCm', 398, 'widthCm', 352, 'heightCm', 268, 'note', ''),
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Pokój dziecięcy',           'lengthCm', 362, 'widthCm', 310, 'heightCm', 268, 'note', 'Grzejnik pod oknem do przeniesienia.'),
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Łazienka',                  'lengthCm', 268, 'widthCm', 212, 'heightCm', 268, 'note', 'Pion kanalizacyjny w narożniku — wanna tylko przy ścianie lewej.'),
       jsonb_build_object('id', gen_random_uuid(), 'name', 'Garderoba',                 'lengthCm', 214, 'widthCm', 158, 'heightCm', 268, 'note', 'Bez okna, wentylacja grawitacyjna.')
     ),
     jsonb_build_array(
       jsonb_build_object('id', 'sciany',       'label', 'Ściany — pion, tynki, wilgoć',                       'state', 'ok',      'note', 'Tynki gipsowe, do gruntowania.'),
       jsonb_build_object('id', 'podlogi',      'label', 'Podłogi — poziom, wylewka, stan',                    'state', 'ok',      'note', 'Wylewka anhydrytowa, różnice poziomów do 4 mm.'),
       jsonb_build_object('id', 'sufity',       'label', 'Sufity — wysokość, obniżenia, belki',                'state', 'ok',      'note', '268 cm — obniżenie tylko w przedpokoju pod rekuperację.'),
       jsonb_build_object('id', 'okna',         'label', 'Okna — stan, wymiary, kierunki świata',              'state', 'ok',      'note', 'Salon S, sypialnia W, pokój dziecięcy W.'),
       jsonb_build_object('id', 'drzwi',        'label', 'Drzwi wejściowe i wewnętrzne',                       'state', 'missing', 'note', 'Wewnętrzne do zakupu — otwory 80 i 90.'),
       jsonb_build_object('id', 'elektryka',    'label', 'Instalacja elektryczna — rozdzielnica, punkty',      'state', 'replace', 'note', 'Deweloperska, punkty do przeniesienia wg projektu.'),
       jsonb_build_object('id', 'hydraulika',   'label', 'Instalacja wodno-kanalizacyjna — piony, podejścia',  'state', 'ok',      'note', ''),
       jsonb_build_object('id', 'ogrzewanie',   'label', 'Ogrzewanie — źródło, grzejniki, podłogówka',         'state', 'ok',      'note', 'Miejskie, grzejniki płytowe. Podłogówka tylko w łazience.'),
       jsonb_build_object('id', 'wentylacja',   'label', 'Wentylacja i kominy',                                'state', 'ok',      'note', ''),
       jsonb_build_object('id', 'klimatyzacja', 'label', 'Klimatyzacja / rekuperacja',                         'state', 'missing', 'note', 'Klient rozważa split w salonie — miejsce na jednostkę zewnętrzną na balkonie.'),
       jsonb_build_object('id', 'nosne',        'label', 'Ściany nośne i możliwość wyburzeń',                  'state', 'ok',      'note', 'Ścianka między kuchnią a salonem działowa — do wyburzenia.'),
       jsonb_build_object('id', 'przylacza',    'label', 'Przyłącza: gaz, internet, domofon',                  'state', 'ok',      'note', 'Bez gazu, płyta indukcyjna.'),
       jsonb_build_object('id', 'dostep',       'label', 'Dostęp: winda, klatka, miejsce na materiały',        'state', 'ok',      'note', 'Winda towarowa, 3. piętro.'),
       jsonb_build_object('id', 'wspolnota',    'label', 'Zgody wspólnoty / warunki techniczne',               'state', 'unknown', 'note', 'Do sprawdzenia: zgoda na jednostkę klimatyzacji na balkonie.')
     ),
     'Stan deweloperski, czysto. Największa decyzja: otwarcie kuchni na salon (ścianka działowa). ' ||
     'Klienci chcą wannę i prysznic — łazienka na styk, do przerysowania w dwóch wariantach. ' ||
     'Wykonawca może wejść od ' || to_char(a_start, 'DD.MM') || '.',
     v_owner, now() - interval '47 days', now() - interval '47 days');

  -- ---------------------------------------------------------------------------
  -- 9. Kalendarz — notatki dzienne
  -- ---------------------------------------------------------------------------
  insert into public.calendar_notes (workspace_id, client_id, project_id, day, at_time, text, done)
  values
    (v_ws, v_client.id, p_a, v_today - 7, null,     'Odbiór płytek do łazienki — sprawdzić partię i odcień',           true),
    (v_ws, v_client.id, p_a, v_today - 2, '16:30',  'Wizyta nadzorcza nr 2 — elektryka przed tynkami',                  true),
    (v_ws, v_client.id, p_a, v_today + 1, '10:00',  'Montaż kuchni — być na miejscu, sprawdzić fronty',                 false),
    (v_ws, v_client.id, p_a, v_today + 9, null,     'Wizyta nadzorcza nr 3 — odbiór płytek w łazience',                 false);

  raise notice 'OK: klient "%" (workspace %) — projekt A: %, projekt B: %.',
    v_client.name, v_ws, p_a, case when v_create_second_project then p_b::text else '(pominięty)' end;
end
$do$;

-- -----------------------------------------------------------------------------
-- Podsumowanie — pokaże się w siatce wyników SQL Editora
-- -----------------------------------------------------------------------------
select
  c.name                                   as klient,
  p.name                                   as projekt,
  p.status                                 as status_projektu,
  q.number                                 as numer,
  q.title                                  as dokument,
  q.status                                 as status_dokumentu,
  'v' || q.version                         as wersja,
  round(q.total_net_cents / 100.0, 2)      as netto_zl,
  round(q.total_gross_cents / 100.0, 2)    as brutto_zl,
  (select count(*) from public.quote_shares s where s.quote_id = q.id)      as linki,
  (select count(*) from public.quote_acceptances a where a.quote_id = q.id) as akceptacje,
  (select count(*) from public.quote_comments m where m.quote_id = q.id)    as uwagi
from public.quotes q
join public.clients c on c.id = q.client_id
left join public.projects p on p.id = q.project_id
where q.deleted_at is null
  and q.client_id = (select client_id from pg_temp.demo_ctx)
order by p.sort_order nulls last, q.lineage_id, q.version, q.created_at;


-- =============================================================================
-- SPRZĄTANIE (opcjonalnie) — usuwa WSZYSTKO, co ten snippet założył klientowi.
-- Odkomentuj, podstaw id klienta i uruchom osobno. Kasuje twardo (to dane
-- demonstracyjne, nie praca użytkownika). Licznika `quote_seq` nie cofa.
-- =============================================================================
-- do $c$
-- declare v_client uuid := '<UUID-KLIENTA>';
-- begin
--   delete from public.calendar_notes where client_id = v_client
--       or (client_id is null and text like 'Zamówić próbki dębu%');
--   delete from public.client_briefs  where client_id = v_client;
--   delete from public.site_visits    where project_id in (select id from public.projects where client_id = v_client);
--   -- quote_shares / quote_acceptances / quote_comments lecą kaskadą po quotes
--   delete from public.quotes         where client_id = v_client;
--   delete from public.projects       where client_id = v_client;
-- end
-- $c$;
