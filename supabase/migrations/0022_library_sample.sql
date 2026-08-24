-- =============================================================================
-- 0022_library_sample.sql — biblioteka przykładowa na start konta (B4, T-62)
--
-- 8 grup / 38 usług z `reference/bilbioteka.md`. Nazwy i opisy przepisane
-- **dosłownie** — to autorski tekst napisany pod projektantów wnętrz, a nie
-- placeholder do poprawienia.
--
-- **Ceny są puste (`null` = wycena indywidualna).** Podpowiadanie stawek
-- rynkowych to sugerowanie komuś, ile ma brać za swoją pracę — aplikacja nie
-- ma o tym zdania (decyzja D4).
--
-- „Sposób wyceny" z arkusza mapuje się na parę `(pricing.mode, unit)`; przy
-- alternatywie („za m² / kwota stała") bierzemy **pierwszą**.
-- =============================================================================

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
        workspace_id, category, category_id, kind, name, description,
        unit_price_cents, unit, unit_label, sort_order, is_sample, pricing
      )
      values (
        ws,
        grupa.name,
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

comment on function public.seed_library_sample(uuid) is
  'Wstawia 8 grup i 38 uslug przykladowych (bilbioteka.md) bez cen. Idempotentna — pomija workspace z jakakolwiek usluga.';

revoke all on function public.seed_library_sample(uuid) from public;
grant execute on function public.seed_library_sample(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Wpięcie w zakładanie konta.
--
-- **Bez backfillu istniejących workspace'ów** (koncepcja §5 reguła 8): mają
-- swoje dane, a dosypanie im 38 obcych pozycji byłoby wtargnięciem do cudzej
-- biblioteki.
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

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT na auth.users: workspace, czlonkostwo, profil, brand kit, trial, typy pomieszczen i biblioteka przykladowa.';
