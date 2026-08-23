-- =============================================================================
-- seed.sql — dane demonstracyjne dla lokalnego stacku (docs/02-DATABASE.md §5)
--
-- Login: demo@anzorge.local / demo1234
--
-- Uwaga: wstawienie wiersza do auth.users odpala trigger on_auth_user_created,
-- który sam zakłada workspace, członkostwo, profil, brand kit i trial.
-- Dlatego niżej te obiekty AKTUALIZUJEMY, a nie tworzymy.
--
-- Wszystkie identyfikatory są stałe (nie gen_random_uuid()), żeby seed był
-- powtarzalny i żeby dało się do niego pisać testy.
-- Kwoty: grosze (bigint).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Użytkownik testowy
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'demo@anzorge.local',
  extensions.crypt('demo1234', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Anna Demo","company":"Studio Demo"}'::jsonb,
  now(),
  now(),
  '', '', '', ''      -- GoTrue nie znosi NULL-i w kolumnach tokenów
)
on conflict (id) do nothing;

-- Tożsamość e-mail (bez niej GoTrue nie zaloguje hasłem).
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '11111111-1111-4111-8111-1111111111ff',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"demo@anzorge.local","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Workspace + brand kit (utworzone triggerem, tu tylko dopieszczone)
-- -----------------------------------------------------------------------------
update public.workspaces
   set name = 'Studio Demo',
       -- quote_seq = 2, bo seed zawiera dwie ponumerowane wyceny
       quote_seq = 2,
       settings = jsonb_build_object(
         'currency', 'PLN',
         'vatRate', 23,
         'pricesInclude', 'net',
         'numberPattern', 'WYC/{YYYY}/{MM}/{seq}',
         'showDisabledItems', true
       )
 where owner_id = '11111111-1111-4111-8111-111111111111';

update public.brand_kits b
   set company_name       = 'Studio Demo',
       accent_color       = '#21201C',
       bg_color           = '#FAF7F1',
       font_family        = 'Lato',
       contacts           = '[{"name":"Anna Demo","phone":"+48 600 100 200","email":"anna@studiodemo.pl"}]'::jsonb,
       address            = 'ul. Projektowa 12/3, 00-001 Warszawa',
       tax_id             = '5252525252',
       footer_text        = 'Studio Demo — projektowanie wnętrz. Dziękujemy za zaufanie.',
       default_intro      = 'Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac i wycenę.',
       default_valid_days = 14
  from public.workspaces w
 where w.id = b.workspace_id
   and w.owner_id = '11111111-1111-4111-8111-111111111111';

-- -----------------------------------------------------------------------------
-- 3. Klienci
-- -----------------------------------------------------------------------------
insert into public.clients (id, workspace_id, name, phone, email, notes)
select v.id, w.id, v.name, v.phone, v.email, v.notes
  from public.workspaces w
 cross join (values
   ('1f000000-0000-4000-8000-000000000001'::uuid, 'Marta i Piotr Kowalscy', '+48 601 111 222', 'kowalscy@example.com', 'Mieszkanie 62 m2, Mokotów.'),
   ('1f000000-0000-4000-8000-000000000002'::uuid, 'Anna Nowak',             '+48 602 333 444', 'anna.nowak@example.com', 'Remont kuchni i łazienki.'),
   ('1f000000-0000-4000-8000-000000000003'::uuid, 'Tomasz Wiśniewski',      '+48 603 555 666', 't.wisniewski@example.com', 'Biuro 45 m2, do omówienia zakres.')
 ) as v(id, name, phone, email, notes)
 where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Biblioteka — 15 pozycji w 3 kategoriach (Projekt / Nadzór / Dodatki)
--    Ceny w groszach: 9000 = 90,00 zł.
--
--    Część opisów używa PLACEHOLDERÓW (F4.2): `{rooms}`, `{rooms:technical}`,
--    `{frames|kadr|kadry|kadrów}`. W trybie edycji widać je dosłownie, a w
--    podglądzie i w PDF podstawia się aktualna lista pomieszczeń. Dzięki temu
--    świeże konto od razu widzi, że opisy potrafią nadążać za zakresem —
--    inaczej nikt by tej funkcji nie odkrył.
-- -----------------------------------------------------------------------------
insert into public.library_items
  (id, workspace_id, category, kind, name, description, unit_price_cents, sort_order)
select v.id, w.id, v.category, v.kind, v.name, v.description, v.price, v.ord
  from public.workspaces w
 cross join (values
   -- Projekt (rozliczane za m² powierzchni lub za sztukę)
   ('1b000000-0000-4000-8000-000000000001'::uuid, 'Projekt', 'item',
    'Projekt koncepcyjny wnętrza',
    'Układ funkcjonalny dla: {rooms}. Dwa warianty rozwiązań, moodboard. Cena za m².', 9000, 10),
   ('1b000000-0000-4000-8000-000000000002'::uuid, 'Projekt', 'item',
    'Projekt wykonawczy',
    'Rysunki techniczne, kłady ścian, detale, rozrys płytek dla: {rooms:technical}. Cena za m².', 12000, 20),
   ('1b000000-0000-4000-8000-000000000003'::uuid, 'Projekt', 'item',
    'Wizualizacje 3D pomieszczenia',
    'Fotorealistyczne wizualizacje dla: {rooms:visual}. {frames|kadr|kadry|kadrów} na pomieszczenie.', 45000, 30),
   ('1b000000-0000-4000-8000-000000000004'::uuid, 'Projekt', 'item',
    'Projekt oświetlenia i elektryki',
    'Rozmieszczenie punktów świetlnych, gniazd i łączników. Cena za m².', 5000, 40),
   ('1b000000-0000-4000-8000-000000000005'::uuid, 'Projekt', 'item',
    'Zestawienie materiałów i kosztorys',
    'Lista wykończenia z linkami zakupowymi i szacunkiem kosztów. Cena za m².', 3500, 50),
   -- Nadzór
   ('1b000000-0000-4000-8000-000000000006'::uuid, 'Nadzór', 'item',
    'Nadzór autorski - wizyta',
    'Wizyta na budowie, weryfikacja zgodności z projektem, notatka.', 40000, 10),
   ('1b000000-0000-4000-8000-000000000007'::uuid, 'Nadzór', 'item',
    'Kompletacja materiałów',
    'Zamówienia, pilnowanie terminów dostaw, kontakt z dostawcami.', 60000, 20),
   ('1b000000-0000-4000-8000-000000000008'::uuid, 'Nadzór', 'item',
    'Wizyta pomiarowa',
    'Inwentaryzacja pomieszczeń, pomiary, dokumentacja fotograficzna.', 30000, 30),
   ('1b000000-0000-4000-8000-000000000009'::uuid, 'Nadzór', 'item',
    'Koordynacja wykonawców - miesiąc',
    'Bieżący kontakt z ekipami, harmonogram, rozwiązywanie kolizji.', 90000, 40),
   ('1b000000-0000-4000-8000-000000000010'::uuid, 'Nadzór', 'item',
    'Odbiór końcowy inwestycji',
    'Protokół usterek, lista poprawek, odbiór z wykonawcą.', 50000, 50),
   -- Dodatki
   ('1b000000-0000-4000-8000-000000000011'::uuid, 'Dodatki', 'item',
    'Projekt mebli na wymiar',
    'Rysunek techniczny zabudowy, dobór frontów i okuć. Cena za zabudowę.', 55000, 10),
   ('1b000000-0000-4000-8000-000000000012'::uuid, 'Dodatki', 'item',
    'Dobór i zakup wyposażenia',
    'Wyszukanie dodatków, tekstyliów i dekoracji, zakup w imieniu klienta.', 35000, 20),
   ('1b000000-0000-4000-8000-000000000013'::uuid, 'Dodatki', 'item',
    'Aranżacja finalna',
    'Ustawienie mebli i dekoracji, sesja zdjęciowa po zakończeniu prac.', 80000, 30),
   ('1b000000-0000-4000-8000-000000000014'::uuid, 'Dodatki', 'item',
    'Tryb ekspresowy',
    'Skrócenie terminu realizacji projektu o połowę - dopłata.', 90000, 40),
   ('1b000000-0000-4000-8000-000000000015'::uuid, 'Dodatki', 'discount',
    'Rabat za polecenie',
    'Rabat dla klientów z polecenia. Wartość dodatnia, kalkulacja odejmuje.', 100000, 50)
 ) as v(id, category, kind, name, description, price, ord)
 where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Grupy biblioteczne — gotowe zestawy startowe.
--    items to SNAPSHOT pozycji w formacie Item z QuoteBody (nie klucze obce).
-- -----------------------------------------------------------------------------
insert into public.library_groups (id, workspace_id, name, items, sort_order)
select v.id, w.id, v.name, v.items, v.ord
  from public.workspaces w
 cross join (values
   ('1c000000-0000-4000-8000-000000000001'::uuid, 'Kuchnia', '[
     {"id":"2c000000-0000-4000-8000-000000000101","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny kuchni, dwa warianty.","qty":14,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
     {"id":"2c000000-0000-4000-8000-000000000102","kind":"item","name":"Projekt mebli na wymiar","description":"Zabudowa kuchenna, rysunek techniczny i dobór frontów.","qty":1,"unitPriceCents":55000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000011"},
     {"id":"2c000000-0000-4000-8000-000000000103","kind":"item","name":"Wizualizacje 3D pomieszczenia","description":"Trzy ujęcia kuchni.","qty":2,"unitPriceCents":45000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000003"}
   ]'::jsonb, 10),
   ('1c000000-0000-4000-8000-000000000002'::uuid, 'Łazienka', '[
     {"id":"2c000000-0000-4000-8000-000000000201","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny łazienki.","qty":8,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
     {"id":"2c000000-0000-4000-8000-000000000202","kind":"item","name":"Projekt wykonawczy","description":"Rozrys płytek, kłady ścian, detale.","qty":8,"unitPriceCents":12000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000002"},
     {"id":"2c000000-0000-4000-8000-000000000203","kind":"item","name":"Wizualizacje 3D pomieszczenia","description":"Trzy ujęcia łazienki.","qty":1,"unitPriceCents":45000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000003"}
   ]'::jsonb, 20)
 ) as v(id, name, items, ord)
 where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Wyceny (3 statusy). Totale policzone ręcznie i zgodne z calcQuoteTotals():
--    net = suma(qty * unitPriceCents dla enabled item) - suma(discount),
--    gross = round(net * (1 + vatRate/100)).
-- -----------------------------------------------------------------------------

-- 6a. ZAAKCEPTOWANA — mieszkanie 62 m2.
--     pozycje: 1 772 000 gr, rabat: 100 000 gr, netto: 1 672 000, brutto: 2 056 560
insert into public.quotes (
  id, workspace_id, client_id, number, title, status, body,
  total_net_cents, total_gross_cents, currency, client_name,
  sent_at, accepted_at, valid_until, created_by, created_at, updated_at
)
select
  '1d000000-0000-4000-8000-000000000001'::uuid,
  w.id,
  '1f000000-0000-4000-8000-000000000001'::uuid,
  'WYC/2026/07/0001',
  'Projekt wnętrza mieszkania 62 m2',
  'accepted',
  '{
    "title": "Projekt wnętrza mieszkania 62 m2",
    "subtitle": "Mokotów, ul. Wiktorska - mieszkanie dwupokojowe",
    "intro": "Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac i wycenę projektu wnętrza.",
    "projectDescription": "Kompleksowy projekt mieszkania o powierzchni 62 m2 wraz z nadzorem autorskim nad realizacją. Zakres obejmuje koncepcję, dokumentację wykonawczą oraz wizualizacje pomieszczeń dziennych.",
    "client": { "name": "Marta i Piotr Kowalscy", "phone": "+48 601 111 222", "email": "kowalscy@example.com" },
    "validDays": 14,
    "vatRate": 23,
    "pricesInclude": "net",
    "sections": [
      {
        "id": "2a000000-0000-4000-8000-000000000101",
        "title": "Projekt wnętrza",
        "groups": [
          {
            "id": "2b000000-0000-4000-8000-000000000101",
            "name": "Dokumentacja projektowa",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000301","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny, dwa warianty rozwiązań, moodboard. Cena za m².","qty":62,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
              {"id":"2c000000-0000-4000-8000-000000000302","kind":"item","name":"Projekt wykonawczy","description":"Rysunki techniczne, kłady ścian, detale, rozrys płytek. Cena za m².","qty":62,"unitPriceCents":12000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000002"}
            ]
          },
          {
            "id": "2b000000-0000-4000-8000-000000000102",
            "name": "Wizualizacje",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000303","kind":"item","name":"Wizualizacje 3D pomieszczenia","description":"Salon, kuchnia, sypialnia, łazienka.","qty":4,"unitPriceCents":45000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000003"}
            ]
          }
        ],
        "items": []
      },
      {
        "id": "2a000000-0000-4000-8000-000000000102",
        "title": "Nadzór nad realizacją",
        "groups": [],
        "items": [
          {"id":"2c000000-0000-4000-8000-000000000304","kind":"item","name":"Nadzór autorski - wizyta","description":"Sześć wizyt na budowie w trakcie realizacji.","qty":6,"unitPriceCents":40000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000006"},
          {"id":"2c000000-0000-4000-8000-000000000305","kind":"item","name":"Odbiór końcowy inwestycji","description":"Protokół usterek i lista poprawek.","qty":1,"unitPriceCents":50000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000010"}
        ]
      },
      {
        "id": "2a000000-0000-4000-8000-000000000103",
        "title": "Rabaty",
        "groups": [],
        "items": [
          {"id":"2c000000-0000-4000-8000-000000000306","kind":"discount","name":"Rabat za polecenie","description":"Klient z polecenia - rabat kwotowy.","qty":1,"unitPriceCents":100000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000015"}
        ]
      }
    ],
    "preparedBy": "Anna Demo",
    "showDisabledItems": true
  }'::jsonb,
  1672000,
  2056560,
  'PLN',
  'Marta i Piotr Kowalscy',
  now() - interval '40 days',
  now() - interval '35 days',
  (now() - interval '26 days')::date,
  '11111111-1111-4111-8111-111111111111',
  now() - interval '42 days',
  now() - interval '35 days'
from public.workspaces w
where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- 6b. WYSŁANA — kuchnia + łazienka. Zawiera pozycję WYŁĄCZONĄ (Tryb ekspresowy)
--     oraz rabat. pozycje aktywne: 403 000, rabat: 40 000,
--     netto: 363 000, brutto: 446 490
insert into public.quotes (
  id, workspace_id, client_id, number, title, status, body,
  total_net_cents, total_gross_cents, currency, client_name,
  sent_at, valid_until, created_by, created_at, updated_at
)
select
  '1d000000-0000-4000-8000-000000000002'::uuid,
  w.id,
  '1f000000-0000-4000-8000-000000000002'::uuid,
  'WYC/2026/08/0002',
  'Projekt kuchni i łazienki',
  'sent',
  '{
    "title": "Projekt kuchni i łazienki",
    "subtitle": "Remont dwóch pomieszczeń w domu jednorodzinnym",
    "intro": "Poniżej zakres prac projektowych dla kuchni i łazienki. Pozycje wyłączone są widoczne, ale nie wliczają się do sumy.",
    "projectDescription": "Projekt kuchni o powierzchni 14 m2 oraz łazienki 8 m2. Kuchnia z zabudową na wymiar, łazienka z pełną dokumentacją wykonawczą i rozrysem płytek.",
    "client": { "name": "Anna Nowak", "phone": "+48 602 333 444", "email": "anna.nowak@example.com" },
    "validDays": 14,
    "vatRate": 23,
    "pricesInclude": "net",
    "sections": [
      {
        "id": "2a000000-0000-4000-8000-000000000201",
        "title": "Kuchnia",
        "groups": [
          {
            "id": "2b000000-0000-4000-8000-000000000201",
            "name": "Projekt kuchni",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000401","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny kuchni, dwa warianty.","qty":14,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
              {"id":"2c000000-0000-4000-8000-000000000402","kind":"item","name":"Projekt mebli na wymiar","description":"Zabudowa kuchenna, rysunek techniczny i dobór frontów.","qty":1,"unitPriceCents":55000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000011"}
            ]
          }
        ],
        "items": []
      },
      {
        "id": "2a000000-0000-4000-8000-000000000202",
        "title": "Łazienka",
        "groups": [
          {
            "id": "2b000000-0000-4000-8000-000000000202",
            "name": "Projekt łazienki",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000403","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny łazienki.","qty":8,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
              {"id":"2c000000-0000-4000-8000-000000000404","kind":"item","name":"Wizualizacje 3D pomieszczenia","description":"Dwa ujęcia łazienki.","qty":2,"unitPriceCents":45000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000003"}
            ]
          }
        ],
        "items": [
          {"id":"2c000000-0000-4000-8000-000000000405","kind":"item","name":"Tryb ekspresowy","description":"Skrócenie terminu realizacji o połowę. Pozycja wyłączona - klient zdecydował się na termin standardowy.","qty":1,"unitPriceCents":90000,"enabled":false,"libraryItemId":"1b000000-0000-4000-8000-000000000014"}
        ]
      },
      {
        "id": "2a000000-0000-4000-8000-000000000203",
        "title": "Dodatki",
        "groups": [],
        "items": [
          {"id":"2c000000-0000-4000-8000-000000000406","kind":"item","name":"Kompletacja materiałów","description":"Zamówienia i pilnowanie terminów dostaw.","qty":1,"unitPriceCents":60000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000007"},
          {"id":"2c000000-0000-4000-8000-000000000407","kind":"discount","name":"Rabat na projekt","description":"Rabat przy zleceniu dwóch pomieszczeń.","qty":1,"unitPriceCents":40000,"enabled":true,"libraryItemId":null}
        ]
      }
    ],
    "preparedBy": "Anna Demo",
    "showDisabledItems": true
  }'::jsonb,
  363000,
  446490,
  'PLN',
  'Anna Nowak',
  now() - interval '5 days',
  (now() + interval '9 days')::date,
  '11111111-1111-4111-8111-111111111111',
  now() - interval '6 days',
  now() - interval '5 days'
from public.workspaces w
where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- 6c. SZKIC — bez numeru (numer nadaje next_quote_number przy wysyłce).
--     netto: 405 000, brutto: 498 150
insert into public.quotes (
  id, workspace_id, client_id, number, title, status, body,
  total_net_cents, total_gross_cents, currency, client_name,
  created_by, created_at, updated_at
)
select
  '1d000000-0000-4000-8000-000000000003'::uuid,
  w.id,
  '1f000000-0000-4000-8000-000000000003'::uuid,
  null,
  'Projekt biura 45 m2',
  'draft',
  '{
    "title": "Projekt biura 45 m2",
    "subtitle": "Lokal usługowy - open space z zapleczem",
    "intro": "Wstępna wycena do omówienia. Zakres może się zmienić po wizji lokalnej.",
    "projectDescription": "Projekt koncepcyjny biura o powierzchni 45 m2. Zakres do doprecyzowania po spotkaniu.",
    "client": { "name": "Tomasz Wiśniewski", "phone": "+48 603 555 666", "email": "t.wisniewski@example.com" },
    "validDays": 7,
    "vatRate": 23,
    "pricesInclude": "net",
    "sections": [
      {
        "id": "2a000000-0000-4000-8000-000000000301",
        "title": "Projekt",
        "groups": [
          {
            "id": "2b000000-0000-4000-8000-000000000301",
            "name": "Dokumentacja",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000501","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny open space i zaplecza.","qty":45,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"}
            ]
          }
        ],
        "items": []
      }
    ],
    "preparedBy": "Anna Demo",
    "showDisabledItems": false
  }'::jsonb,
  405000,
  498150,
  'PLN',
  'Tomasz Wiśniewski',
  '11111111-1111-4111-8111-111111111111',
  now() - interval '1 day',
  now() - interval '2 hours'
from public.workspaces w
where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 7. Szablon wyceny — punkt startowy dla nowych ofert (bez danych klienta).
-- -----------------------------------------------------------------------------
insert into public.quote_templates (id, workspace_id, name, body)
select
  '1e000000-0000-4000-8000-000000000001'::uuid,
  w.id,
  'Standardowy projekt wnętrza',
  '{
    "title": "Projekt wnętrza",
    "subtitle": "",
    "intro": "Dziękujemy za zainteresowanie współpracą. Poniżej przedstawiamy zakres prac i wycenę.",
    "projectDescription": "",
    "client": { "name": "", "phone": "", "email": "" },
    "validDays": 14,
    "vatRate": 23,
    "pricesInclude": "net",
    "sections": [
      {
        "id": "2a000000-0000-4000-8000-000000000901",
        "title": "Projekt wnętrza",
        "groups": [
          {
            "id": "2b000000-0000-4000-8000-000000000901",
            "name": "Dokumentacja projektowa",
            "items": [
              {"id":"2c000000-0000-4000-8000-000000000901","kind":"item","name":"Projekt koncepcyjny wnętrza","description":"Układ funkcjonalny, dwa warianty rozwiązań, moodboard. Cena za m².","qty":1,"unitPriceCents":9000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000001"},
              {"id":"2c000000-0000-4000-8000-000000000902","kind":"item","name":"Projekt wykonawczy","description":"Rysunki techniczne, kłady ścian, detale. Cena za m².","qty":1,"unitPriceCents":12000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000002"}
            ]
          }
        ],
        "items": []
      },
      {
        "id": "2a000000-0000-4000-8000-000000000902",
        "title": "Nadzór nad realizacją",
        "groups": [],
        "items": [
          {"id":"2c000000-0000-4000-8000-000000000903","kind":"item","name":"Nadzór autorski - wizyta","description":"Wizyta na budowie, notatka z ustaleń.","qty":4,"unitPriceCents":40000,"enabled":true,"libraryItemId":"1b000000-0000-4000-8000-000000000006"}
        ]
      }
    ],
    "preparedBy": "Anna Demo",
    "showDisabledItems": true
  }'::jsonb
from public.workspaces w
where w.owner_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;
