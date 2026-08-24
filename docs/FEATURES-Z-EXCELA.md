# Toolier — funkcje brakujące względem Excela klienta

Źródło: `klientowy_excel.xlsx` (6 arkuszy: `TERMIN - DANE`, `TERMIN - DOKUMENT`, `OFERTA - DANE`, `OFERTA - DOKUMENT`, `OFERTY`, `ETAPY WSPÓŁPRACY`, `CENNIK USŁUG DODATKOWYCH`).
Dokument jest **specyfikacją funkcji**: model domenowy, wzory z arkusza, kryteria parytetu. Odwołania do warstw zgodne z `01-ARCHITECTURE.md` (`domain/`, `data/`, `features/`, `pdf/`, `supabase/migrations/`).

> **Wchłonięty do rozpiski 2026-08-22.** Chunki `F1.1`…`F7.3` mają już swoje zadania `T-30`…`T-49` w `06-TASKS.md` — **kolejność, zależności i kolizje z istniejącym kodem są tam**, nie tutaj. Ten plik pozostaje źródłem „co i według jakiego wzoru”, `06-TASKS.md` jest źródłem „kiedy i w jakiej kolejności”. Zanim zaczniesz którykolwiek chunk, przeczytaj **§8 Ustalenia po zderzeniu z kodem** na końcu tego pliku — kilka założeń z sekcji poniżej nie zgadza się ze stanem repozytorium.

---

## 0. Co Excel robi, a czego nasz PRD nie ma — mapa luk

| # | Mechanizm w Excelu | Gdzie | Status w Toolier | Feature |
|---|---|---|---|---|
| 1 | **Cennik parametryczny**: usługa = `BAZA` + Σ(`cena za pomieszczenie` × `ilość`) po zaznaczonych pomieszczeniach | `OFERTA - DANE` F–S, `OFERTA - DOKUMENT` K95–K107 | Brak. Mamy tylko `qty × unitPrice` | **F1** |
| 2 | **Pomieszczenia jako wymiar wyceny**: lista pomieszczeń z ilością (`x2`) i flagą „w projekcie" (M) + osobną flagą „w części technicznej" (A) | `OFERTA - DOKUMENT` A/G/J/M w wierszach 21–90 | Grupy są tylko nagłówkami. Brak ilości grupy i flag | **F1** |
| 3 | **Pozycje per pomieszczenie** (Projekt wizualny, Oświetlenie, Modelowanie 3D, Wizualizacje 3D z liczbą kadrów, Lista zakupowa) powielane dla każdego pomieszczenia | `OFERTA - DOKUMENT` 22–92 | Ręczne kopiowanie. Brak „szablonu pomieszczenia" z cenami zależnymi od typu pomieszczenia | **F1** |
| 4 | **Wariant pozycji**: `Wizualizacja 3D` vs `Wizualizacja 360` (inne cennik, dropdown) + `liczba kadrów` (F) → `cena_pom + baza × kadry` | `OFERTA - DOKUMENT` E26/F26/K26 | Brak | **F1** |
| 5 | **Tryb godzinowy**: `SYSTEM PRACY = godzinowy` → wszystkie wartości to minuty, cena = `min/60 × stawka` | `OFERTA - DANE` C48, C53 | Brak | **F2** |
| 6 | **Szacowanie pracochłonności**: minuty z wybranych etapów (`cena / stawka × 60`) + suma minut komunikacji | `OFERTA - DANE` U11–U40, R48 | Brak | **F2** |
| 7 | **Rabaty procentowe** (25% „wizualizacje uproszczone", 20% „projekt on-line") | `OFERTA - DANE` E42–E43 | Mamy tylko kwotowe | **F3** |
| 8 | **Rabaty warunkowe**: 5% za „kompletny etap" — tylko gdy wszystkie pozycje etapu = TAK; `MROUND(…,10)` | `OFERTA - DOKUMENT` K114–K116 | Brak | **F3** |
| 9 | **Auto-opisy**: opis pozycji zbudowany z listy zaznaczonych pomieszczeń („Widoki ścian/mebli: kuchnia, salon x2.") i liczby mnogiej (`kadr`/`kadry`) | `OFERTA - DOKUMENT` F102/L102, G51 | Brak | **F4** |
| 10 | **Kalkulator terminu**: dni robocze architekta i inwestora per etap i per pomieszczenie; start → `WORKDAY.INTL` → „optymalne" i „najpóźniejsze" zakończenie; przeliczenie na dni kalendarzowe wg dni roboczych/tydz. | `TERMIN - DANE`, `TERMIN - DOKUMENT` | Brak całkowicie | **F5** |
| 11 | **Dokument „Etapy współpracy"**: checklista etapów z opisem, ✓ zawarty / ✗ niezawarty, legenda, nota o kolejności prac | `ETAPY WSPÓŁPRACY` | Brak | **F6** |
| 12 | **Dokument „Cennik usług dodatkowych"**: pozycje z **przedziałem cen** (300–1200 zł), terminem („4–7 dni"), stawkami `zł/h`, przypisami | `CENNIK USŁUG DODATKOWYCH` | Brak (nasze pozycje mają jedną cenę) | **F6** |
| 13 | **Pakiet dokumentów dla inwestora**: ten sam inwestor i architekt we wszystkich 4 dokumentach, różna ważność (7 / 14 dni) | nagłówki wszystkich arkuszy | Wycena jest jedynym dokumentem | **F6** |
| 14 | **Rejestr ofert**: LP, data, nr, **rodzaj**, inwestor, tel, e-mail, **miasto**, **notatki** | `OFERTY` | Lista wycen bez miasta, rodzaju i notatek | **F7** |
| 15 | **Stopka „CZYNNE"**: godziny otwarcia pn–pt / sobota; tytuł zawodowy wystawiającego („projektant wnętrz") | stopki wszystkich dokumentów | Brand kit nie ma godzin ani tytułu | **F7** |
| 16 | **Podgląd sum per etap** (funkcjonalny / wizualny / techniczny / pozostałe / rabaty) | `OFERTA - DANE` R50–R54 | `TotalsCard` pokazuje tylko sumę globalną | **F7** |

Rzeczy z Excela, które **już mamy** (nie rozpisuję): TAK/NIE per pozycja, rabaty kwotowe, suma / rabaty / po rabacie, inwestor + tel + mail, data + ważność, opisy pozycji, sekcje/etapy, dane wystawiającego, `qty`.

Błędy Excela, których **nie przenosimy** (warto wiedzieć przy testach parytetu): `#REF!` w `OFERTA - DANE` U20/U22, odwołanie do nieistniejącego `M50/J50` w K104, `IF(K15="TAK", 'TERMIN - DANE'!T11)` bez `,0` (zwraca FALSE = 0, działa przypadkiem).

---

## F1 — Cennik parametryczny i pomieszczenia

To największa luka i jednocześnie funkcja, która odróżni Toolier od „listy z cenami". Cel: użytkownik definiuje raz **reguły cenowe** (usługa ma bazę + cenę zależną od pomieszczenia), a wycena liczy się sama po zaznaczeniu pomieszczeń.

### Model domenowy (delta do `QuoteBody`)

```ts
// domain/quote/schema.ts — rozszerzenia (wersja schematu: bodyVersion: 2)
const RoomType = z.object({ id, name: z.string(), slug: z.string() });          // workspace-level (np. kuchnia, salon)

const Room = z.object({                                                          // instancja w wycenie
  id: z.string().uuid(),
  roomTypeId: z.string().uuid().nullable(),   // null = własne, spoza słownika
  label: z.string(),                          // "salon z jadalnią", "korytarz + schody"
  qty: z.number().int().positive().default(1),
  includedInVisual: z.boolean().default(true),    // = kolumna M w Excelu
  includedInTechnical: z.boolean().default(true), // = kolumna A w Excelu
});

const PricingRule = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('flat') }),                                   // dotychczasowe unitPriceCents × qty
  z.object({ mode: z.literal('per_room'),                                  // baza + Σ per pomieszczenie
            baseCents: z.number().int(),
            perRoomCents: z.record(z.string() /*roomTypeId*/, z.number().int()),
            defaultPerRoomCents: z.number().int().default(0),              // dla pomieszczeń spoza słownika
            roomScope: z.enum(['visual','technical','all']) }),            // który flag pomieszczenia decyduje
  z.object({ mode: z.literal('per_frame'),                                 // wizualizacje: cena_pom + baza × kadry
            baseCents: z.number().int(), perRoomCents: z.record(...), defaultPerRoomCents: ... }),
]);

const Item = Item.extend({
  pricing: PricingRule.default({ mode: 'flat' }),
  roomId: z.string().uuid().nullable().default(null),   // pozycja przypięta do pomieszczenia (blok per-room)
  frames: z.number().int().positive().optional(),       // tylko per_frame
  variantOf: z.string().uuid().nullable().default(null),// F1.4: pozycja ma warianty (3D / 360)
});

const Section = Section.extend({
  kind: z.enum(['generic','rooms']).default('generic'), // sekcja typu rooms renderuje bloki per pomieszczenie
});

const QuoteBody = QuoteBody.extend({ bodyVersion: z.literal(2), rooms: z.array(Room).default([]) });
```

Obliczenie pozycji (`domain/quote/calc.ts`):
```
flat:      unitPriceCents × qty
per_room:  baseCents + Σ_{r ∈ rooms, flag(r, roomScope)} (perRoomCents[r.roomTypeId] ?? defaultPerRoomCents) × r.qty
per_frame: (perRoomCents[room] ?? default) + baseCents × frames, × room.qty   (pozycja ma roomId)
```
Wszystko w groszach, zaokrąglenie dopiero w `formatMoney`.

### Chunki

**F1.1 Domena: pomieszczenia i reguły cenowe**
- `domain/quote/schema.ts`: `Room`, `PricingRule`, rozszerzenia `Item`/`Section`/`QuoteBody`, `bodyVersion: 2`.
- `domain/quote/migrate.ts`: `migrateBody(v1) → v2` (wszystkie istniejące pozycje → `pricing: {mode:'flat'}`, `rooms: []`). Wywoływana w `quotes.repo` przy odczycie; zapis zawsze w v2.
- `domain/quote/calc.ts`: `calcItemCents(item, rooms)`, `calcQuoteTotals` używa nowej funkcji.
- Testy: parytet z Excelem — odtwórz `OFERTA - DOKUMENT` K95 (projekt budowlany: 200 + 15×7 pomieszczeń) i K26 (wizualizacja: 350 + 50×kadry). Przypadek: pomieszczenie `includedInVisual=false` a `includedInTechnical=true` (Excel: wiersz 49 „salon" M=NIE, A=TAK).
✅ `calcQuoteTotals` zwraca identyczne kwoty jak arkusz dla 3 zadanych konfiguracji; migracja v1→v2 nie zmienia totali starych wycen.

**F1.2 Słownik typów pomieszczeń (workspace)**
- Migracja `NNNN_room_types.sql`: `room_types (id, workspace_id, name, slug, sort_order, deleted_at)`; seed 14 typów z Excela (sień/hol, korytarz, kuchnia, jadalnia, salon, toaleta, łazienka, pralnia, sypialnia, garderoba, pokój dziecięcy, gabinet, spiżarnia, schody) tworzony w `handle_new_user()`.
- `data/repos/room-types.repo.ts` + `useRoomTypes`.
- UI: `features/settings/RoomTypesSection.tsx` — lista z inline-edit, dodaj/usuń/sortuj. Usunięcie typu użytego w regułach cenowych → soft delete + ostrzeżenie „X pozycji bibliotecznych używa tego typu".
✅ CRUD; nowe konto ma 14 typów.

**F1.3 Biblioteka: reguły cenowe per pozycja (macierz)**
- `library_items.pricing jsonb` (migracja) — ta sama zod `PricingRule`.
- UI w bibliotece: edycja pozycji dostaje przełącznik trybu (Stała / Per pomieszczenie / Per kadr) i **macierz** `typ pomieszczenia × cena` (tabela z inputami, kolumna „domyślna dla pozostałych"). To jest odwzorowanie arkusza `OFERTA - DANE` F–S.
- Widok „Macierz cennika": jedna tabela `pozycje (wiersze) × typy pomieszczeń (kolumny)` z edycją w komórkach, filtr po kategorii — dla ludzi, którzy lubią Excela. `features/library/PricingMatrixPage.tsx`, komponent tabeli na `@tanstack/react-table` (dodajemy do stacku, uzasadnienie: wirtualizacja + edycja komórek).
- Import z CSV macierzy (kolumny = slugi typów) — prosty parser w `domain/library/csv.ts`.
✅ Zmiana ceny w macierzy natychmiast wpływa na nową wycenę z tej pozycji; kaskada do otwartej wyceny (istniejący mechanizm) obejmuje `pricing`.

**F1.4 Edytor: panel pomieszczeń + sekcja typu `rooms`**
- `features/quotes/editor/components/RoomsPanel.tsx` w prawej kolumnie (nad `TotalsCard`): lista pomieszczeń wyceny — nazwa (combobox ze słownika + własna), `×qty`, dwa przełączniki: **W (wizualny)** / **T (techniczny)** (= kolumny M i A). Dodaj / usuń / kolejność.
- Sekcja `kind: 'rooms'`: renderuje **blok per pomieszczenie** (nagłówek = label pomieszczenia, `x2` jeśli qty>1, wyszarzony gdy `includedInVisual=false`), a w nim pozycje z `roomId`. Przycisk „Dodaj pozycję do wszystkich pomieszczeń" (wstawia klon z biblioteki z `roomId` do każdego pomieszczenia z flagą W). Dodanie nowego pomieszczenia → pytanie „Skopiować zestaw pozycji z pomieszczenia X?".
- Pozycje `per_room` poza sekcją rooms pokazują pod ceną szary dopisek „baza 200 zł + 7 pom." z tooltipem rozpisującym składniki (transparentność dla użytkownika, który nie ufa automatowi).
- Warianty (`variantOf`): w `ItemRow` zamiast nazwy — `Select` (Wizualizacja 3D / Wizualizacja 360), zmiana podmienia `pricing` i opis; liczba kadrów jako mały stepper przy pozycji `per_frame`.
- `editor.store`: akcje `addRoom`, `updateRoom`, `removeRoom` (usunięcie pomieszczenia usuwa pozycje z jego `roomId` po potwierdzeniu), `setItemVariant`, `setItemFrames`. Każda zmiana pomieszczenia → recalc.
✅ Scenariusz z Excela: 7 pomieszczeń, „Projekt budowlany" TAK → cena = 200 + Σ; wyłącz T dla salonu → cena spada o 15 zł; `kuchnia x2` → podwaja składnik kuchni.

**F1.5 PDF: pomieszczenia i składniki ceny**
- `pdf/components/PdfRoomBlock.tsx`: nagłówek pomieszczenia z `x2`, pozycje pod spodem; pomieszczenia z obiema flagami = false pomijane (lub wyszarzone wg `showDisabledItems`).
- Nagłówek dokumentu: wiersz **„Pomieszczenia: wiatrołap, korytarz, kuchnia, salon z jadalnią x2"** (auto z `rooms`, jak `OFERTA - DOKUMENT` D11) — przełącznik w ustawieniach wyceny `showRoomsSummary`.
- Opcja `showPriceBreakdown`: pod ceną pozycji `per_room` drobny tekst „baza + 7 pom." (domyślnie wyłączone — klient końcowy nie musi widzieć mechaniki).
✅ Snapshot PDF z sekcją rooms; brak regresji dla wycen v1.

---

## F2 — Tryb godzinowy i pracochłonność

Excel ma globalny przełącznik `SYSTEM PRACY`: w trybie godzinowym **wszystkie wartości w cenniku są minutami**, cena = `minuty / 60 × stawka`. Odwrotnie: z cen wylicza minuty pracy (kolumna U) i sumę minut komunikacji.

### Model
```ts
// QuoteBody
pricingBasis: z.enum(['amount','time']).default('amount'),
hourlyRateCents: z.number().int().nullable(),         // kopia ze stawki workspace w chwili utworzenia (snapshot!)
// Item — gdy pricingBasis==='time', unitPriceCents/baseCents/perRoomCents są MINUTAMI (int), nie groszami.
```
Decyzja: **nie** wprowadzamy osobnych pól `minutes`; reinterpretujemy te same liczby wg `pricingBasis`, dokładnie jak Excel (`D10 = IF(C53="TAK","MINUTY","ZŁOTÓWKI")`). Dzięki temu biblioteka i macierz działają w obu trybach bez duplikacji. Konwersja w jednym miejscu: `domain/quote/calc.ts → toCents(value, body)`.

### Chunki

**F2.1 Domena: `pricingBasis` + stawka**
- Schemat, `toCents()`, `calcQuoteTotals` zwraca dodatkowo `{ minutesTotal, minutesBySection }` gdy `time`.
- `workspaces.settings.hourlyRateCents` (bez migracji — JSONB settings) + `defaultPricingBasis`.
- Testy: parytet `K22 = (100+100) × qty × 200/60` przy stawce 200 zł; zaokrąglenie do grosza dopiero na poziomie pozycji (Excel nie zaokrągla — my zaokrąglamy per pozycja `Math.round`, udokumentować różnicę w teście).
✅ Ta sama wycena przełączona amount↔time daje zgodne wyniki dla stawki 60 zł/h (1 min = 1 zł) — test kontrolny.

**F2.2 UI: przełącznik trybu i stawka w wycenie**
- `QuoteHeader`: segment „Wycena: Kwotowa | Godzinowa"; w trybie godzinowym pole „Stawka zł/h" (prefill ze settings, zapis snapshotu w body) i etykiety inputów cen zmieniają się na „min".
- `ItemRow`: w trybie time pokazuje `45 min → 150 zł` (minuty edytowalne, kwota wyliczona).
- `TotalsCard`: dodatkowy wiersz „Pracochłonność: 18 h 20 min".
- Zmiana trybu w wycenie z pozycjami → dialog: „Przeliczyć wartości?" (Konwertuj wg stawki / Zostaw liczby / Anuluj).
✅ Przełączenie nie psuje autosave ani kaskady biblioteki.

**F2.3 Pracochłonność (wariant odwrotny z Excela)**
- W trybie `amount` liczymy szacunek czasu `cena / stawka × 60` na żądanie (ikonka zegara w `TotalsCard` → popover: minuty per sekcja + „komunikacja projektowa" osobno, jeśli pozycja ma tag `communication`).
- Tag pozycji: `Item.tags: string[]` (np. `communication`, `meeting`) — wykorzystane też w F5.
- Dashboard (f2): „Średnia pracochłonność zaakceptowanych wycen".
✅ Popover pokazuje sumę minut zgodną z `OFERTA - DANE` U/R48 dla seedu.

---

## F3 — Rabaty procentowe i warunkowe

### Model
```ts
const Discount = z.object({                     // zastępuje Item.kind === 'discount' (migracja: stare → {type:'fixed'})
  id, name, description, enabled,
  type: z.enum(['fixed','percent']),
  valueCents: z.number().int().optional(),      // fixed
  percent: z.number().min(0).max(100).optional(),
  scope: z.enum(['quote','section','items']),   // na co % 
  sectionId: z.string().uuid().optional(),
  itemIds: z.array(z.string().uuid()).optional(),
  condition: z.enum(['always','all_items_in_scope_enabled']).default('always'),  // „kompletny etap"
  roundToCents: z.number().int().default(0),    // 1000 = MROUND(…,10 zł) jak w Excelu
});
QuoteBody.discounts: z.array(Discount)
```
Rabaty wychodzą z listy pozycji do **osobnej listy** (Excel też ma je w osobnej sekcji `RABATY`). W UI nadal renderowane jako ostatnia sekcja „Rabaty", ale z innym `Row`.

### Chunki

**F3.1 Domena rabatów**
- Schemat, migracja body (`kind:'discount'` → `Discount{type:'fixed', scope:'quote'}`), `calcDiscounts(body, itemTotals)`: kolejność — najpierw rabaty na pozycje/sekcje, potem na całość; warunek `all_items_in_scope_enabled`; zaokrąglenie `roundToCents`; rabat nie może przekroczyć podstawy (clamp) — Excel tego nie pilnuje, my tak.
- Testy parytetu: K114 (5% z etapu funkcjonalnego tylko gdy 5/5 TAK, MROUND 10), K115 (wizualny: warunek „wszystkie pozycje we wszystkich pomieszczeniach W"), procent 25% „wizualizacje uproszczone" na pozycjach z tagiem `visualization`.
✅ 100% pokrycie `calcDiscounts`.

**F3.2 UI rabatów w edytorze**
- `DiscountRow`: toggle, nazwa, typ (zł / %), wartość, zakres (Cała wycena / Sekcja ▾ / Wybrane pozycje — multiselect popover), checkbox „tylko gdy cały zakres zaznaczony", zaokrąglenie.
- Rabat warunkowy niespełniony: wiersz wyszarzony z etykietą „Warunek niespełniony (3/5 pozycji)" — użytkownik widzi, *dlaczego* 0 zł.
- Biblioteka: rabaty jako osobna zakładka (`library_items.kind='discount'` + `pricing`→`discount jsonb`).
✅ Odwzorowanie sekcji `RABATY` z Excela 1:1.

**F3.3 PDF rabatów**
- Sekcja „Rabaty": dla `%` drukujemy „−5% (etap funkcjonalny) … −120 zł"; niespełnione warunkowe pomijamy lub pokazujemy „0 zł — warunek: kompletny etap" (ustawienie `showUnmetDiscounts`, domyślnie **pokazuj** — to narzędzie sprzedażowe: klient widzi, co zyska, dobierając cały etap).
✅ Snapshot.

---

## F4 — Auto-opisy i placeholdery

Excel składa opis z danych („Widoki ścian/mebli: kuchnia, salon x2.", `kadr`/`kadry`). Uogólniamy do placeholderów w opisie pozycji.

**F4.1 Silnik placeholderów** — `domain/quote/template-text.ts`
- Składnia `{rooms}`, `{rooms:technical}`, `{rooms:visual}`, `{room}` (w bloku per-room), `{qty}`, `{frames}`, `{frames|kadr|kadry|kadrów}` (polska liczba mnoga: 1 / 2–4 / 5+ z regułą 12–14), `{client}`, `{validUntil}`, `{hourlyRate}`.
- Czysta funkcja `renderText(template, ctx)`; nieznany placeholder zostaje jak jest.
- Testy: „kuchnia, salon x2.", `1 kadr / 3 kadry / 5 kadrów / 22 kadry / 12 kadrów`.
✅ Funkcja + testy.

**F4.2 UI**
- Opis pozycji i wstęp wyceny renderowane przez `renderText` w trybie podglądu i w PDF; w trybie edycji surowy tekst + przycisk `{}` wstawiający placeholder z listy.
- Biblioteka: opisy z placeholderami w seedzie (np. „Projekt szczegółowy — widoki ścian/mebli: {rooms:technical}.").
✅ Edycja pomieszczeń aktualizuje opis na żywo.

---

## F5 — Kalkulator terminu (Harmonogram)

Osobny moduł + osobny dokument PDF „Szacowany termin". Excel: per etap `dni architekta` i `dni inwestora` (bo inwestor też „zużywa" czas: decyzje, inspiracje, spotkania), per pomieszczenie dla etapów wizualnych, z ilością; suma dni roboczych obu stron; start → `WORKDAY` → optymalne zakończenie (tylko dni architekta) i najpóźniejsze (architekt + inwestor); przelicznik dni robocze → kalendarzowe wg dni roboczych w tygodniu (osobno dla architekta i inwestora: `D7`, `D8`).

### Model
```ts
// domain/schedule/schema.ts
const ScheduleStage = z.object({
  id, name: z.string(), owner: z.enum(['provider','client']),      // ARCH. / INW.
  baseDays: z.number().min(0),                                       // „cały projekt"
  perRoomDays: z.record(roomTypeId, z.number()), defaultPerRoomDays: z.number().default(0),
  roomScope: z.enum(['visual','technical','all','none']),
  enabled: z.boolean().default(true),
  linkedItemTags: z.array(z.string()).default([]),                   // auto-włącz gdy w wycenie jest pozycja z tagiem (np. 'visualization')
});
const ScheduleBody = z.object({
  startDate: z.string().date().nullable(),
  providerWorkdaysPerWeek: z.number().int().min(1).max(7).default(5),
  clientWorkdaysPerWeek: z.number().int().min(1).max(7).default(5),
  stages: z.array(ScheduleStage),
  holidays: z.enum(['PL','none']).default('PL'),
});
```
Harmonogram żyje w **wycenie** (`quotes.schedule jsonb` nullable) — używa tych samych `rooms`. Wynik: `{ providerDays, clientDays, calendarDaysOptimal, calendarDaysLatest, endOptimal, endLatest, perStage[] }`.

### Chunki

**F5.1 Domena harmonogramu**
- Schemat, `calcSchedule(schedule, rooms, now)`, `domain/dates/workdays.ts`: `addWorkdays(date, n, holidays)`, polskie święta stałe + Wielkanoc (algorytm Meeusa) + Boże Ciało; bez zewnętrznej biblioteki świąt. `date-fns` do arytmetyki.
- Parytet z `TERMIN - DOKUMENT`: O37/Q37 (sumy), O39 (`dni/5×7`), O47/O49 (`WORKDAY.INTL`).
- Szablon domyślny etapów (11 z Excela: Inwentaryzacja, Rzuty funkcjonalne, Finalny rzut, Spotkania, Inspiracje, Moodboard, Wizualizacje 3D, Rysunki techniczne, Teczka, Komunikacja) w `domain/schedule/defaults.ts` + `workspaces.settings.scheduleTemplate`.
✅ Testy: święta 2026/2027, przejście przez rok, 6-dniowy tydzień inwestora.

**F5.2 UI zakładki „Termin" w edytorze wyceny**
- `QuoteEditorPage` dostaje zakładki: **Wycena | Termin | Dokumenty** (F6). Zakładka Termin: data startu (date picker), dni robocze/tydz. ×2, tabela etapów: włącz, nazwa, właściciel (pill ARCH./INW.), dni bazowe, rozwijana macierz per pomieszczenie (tylko gdy `roomScope≠none`). Prawa kolumna: karta wyniku — „Dni robocze: architekt 43 / inwestor 36", „Optymalne zakończenie: 12 lut 2027", „Najpóźniejsze: 2 kwi 2027", pasek z etapami (prosty Gantt z `recharts` lub czysty CSS; CSS).
- Auto-sync: włączenie w wycenie pozycji z tagiem `visualization` włącza etap „Wizualizacje 3D" (jednorazowo, z toastem „Włączono etap …" i cofnij).
- Ustawienia workspace: edycja szablonu etapów i domyślnych dni.
✅ Edycja pomieszczeń w zakładce Wycena zmienia wynik w zakładce Termin.

**F5.3 PDF „Szacowany termin"**
- `pdf/SchedulePdfDocument.tsx`: tabela pomieszczenia × etapy z ✓/— (jak `TERMIN - DOKUMENT` B15–N32), kolumny „dni robocze architekt / inwestor", sumy, blok „Ramy czasowe projektu" z trzema datami, stopka brand kitu. Ważność dokumentu osobna (domyślnie 7 dni).
✅ Snapshot; A4 mieści 18 pomieszczeń bez łamania tabeli w środku wiersza.

---

## F6 — Pakiet dokumentów: Etapy współpracy, Cennik dodatkowy, wysyłka zestawu

Excel to w praktyce **4 dokumenty dla jednego inwestora** z jednego źródła danych. Wprowadzamy pojęcie **typu dokumentu** w ramach wyceny, a nie osobnych encji — wszystko odwołuje się do `quotes.id`, żeby numer, klient i stopka były jedne.

### Model
```ts
// quotes.documents jsonb: { stages?: StagesDoc, priceList?: PriceListDoc, schedule: → F5 }
const StageEntry = z.object({ id, name, description, included: z.boolean(), sectionLabel: z.string().optional() }); // sectionLabel = "ETAP FUNKCJONALNY"
const StagesDoc = z.object({ validDays: z.number().default(14), entries: z.array(StageEntry), footnote: z.string() });

const PriceListEntry = z.object({
  id, name, description,
  priceMinCents: z.number().int(), priceMaxCents: z.number().int().nullable(),   // "300–1200 zł" lub "50 zł"
  unit: z.enum(['total','hour']),                                                  // "zł/h"
  leadTime: z.string().optional(),                                                 // "4–7 dni"
});
const PriceListDoc = z.object({ validDays, groups: z.array({ title, note?: string, entries }), footnotes: string[] });
```
Szablony obu dokumentów w workspace (`workspace_doc_templates` — migracja: `id, workspace_id, kind ('stages'|'price_list'), name, body jsonb`), a w wycenie snapshot z możliwością edycji.

### Chunki

**F6.1 Dokument „Etapy współpracy"**
- Migracja `workspace_doc_templates`, seed 19 etapów z Excela z opisami i podziałem (ogólne / funkcjonalny / wizualny / techniczny / nadzór).
- Zakładka **Dokumenty → Etapy współpracy**: lista etapów z checkboxem „zawarty", inline-edit opisu, drag, przypis końcowy. Auto-sugestia: etapy z tagiem pasującym do pozycji w wycenie zaznaczone (`StageEntry.linkedItemTags`).
- PDF `StagesPdfDocument.tsx`: dwie kolumny (✓/✗ + nazwa | opis), nagłówki etapów, legenda, przypis, stopka.
✅ Parytet z arkuszem `ETAPY WSPÓŁPRACY`.

**F6.2 Dokument „Cennik usług dodatkowych"**
- Seed grup z Excela (Opracowania techniczne / Wizualizacje / Spotkania i komunikacja) z przedziałami i terminami.
- Zakładka Dokumenty → Cennik: grupy, pozycje z `min–max`, jednostka, termin; przypisy.
- `formatMoneyRange(min, max, unit)` w `domain/money.ts` („300–1 200 zł", „250 zł/h").
- PDF `PriceListPdfDocument.tsx` (kolumny: nazwa | opis | termin | cena).
- **Most do wyceny**: przycisk „Dodaj do wyceny jako pozycję" (bierze `priceMin`, nazwa, opis) — cennik jest też źródłem dosprzedaży.
✅ Parytet z arkuszem `CENNIK USŁUG DODATKOWYCH`.

**F6.3 Eksport pakietu**
- Dialog „Eksportuj": checkboxy [Wycena] [Termin] [Etapy współpracy] [Cennik]; opcja „Jeden plik PDF" (scalanie — `pdf-lib` w webview, dodajemy do stacku; lekka, czysta JS) lub osobne pliki do wybranego folderu.
- Nazwy: `{number}-wycena.pdf`, `{number}-termin.pdf`, … lub `{number}-pakiet.pdf`.
- Ważność per dokument (Excel: oferta 7 dni, etapy/cennik 14 dni) — pole w każdym docu, domyślne w brand kicie.
✅ Pakiet 4 dokumentów < 5 s, numeracja stron ciągła w trybie „jeden plik" (przełącznik).

---

## F7 — Drobne luki: rejestr, brand kit, podsumowania

**F7.1 Rejestr ofert — pola z arkusza `OFERTY`**
- `quotes`: `city text`, `internal_notes text`, `doc_kind text default 'offer'` (offer | schedule_only | price_list_only — gdy ktoś wysyła sam cennik; w praktyce `documents` z F6 to pokrywa, ale kolumna ułatwia filtr).
- `clients` (f2): `city`. Lista wycen: kolumna „Miasto", filtr, szybkie notatki (popover z textarea, autosave).
- Eksport rejestru do CSV/XLSX w układzie Excela: `LP | DATA | NR OFERTY | RODZAJ | INWESTOR | TELEFON | E-MAIL | MIASTO | NOTATKI` (użytkownicy będą chcieli „swój stary arkusz").
✅ Eksport otwiera się w Excelu bez przekodowania (UTF-8 BOM, `;` jako separator dla PL locale).

**F7.2 Brand kit — godziny otwarcia i tytuł**
- `brand_kits`: `opening_hours jsonb` (`[{label:'poniedziałek – piątek', hours:'8.00 – 16.00'}, {label:'sobota (tylko spotkania)', hours:'10.00 – 13.00'}]`), `signer_title text` („projektant wnętrz"), `signer_name text`.
- UI w brandingu: edytowalna lista wierszy godzin (max 4); sekcja „Wystawiający: imię / tytuł".
- PDF: blok „wystawił: {signer_title} {signer_name}" + stopka z kolumną „CZYNNE" (wszystkie 4 dokumenty).
✅ Stopka identyczna z arkuszami.

**F7.3 Podsumowanie per sekcja**
- `calcQuoteTotals` zwraca `bySection: {sectionId, itemsCents, discountsCents}` (prawdopodobnie już częściowo jest — upewnij się, że uwzględnia rabaty zakresowe z F3).
- `TotalsCard`: rozwijany blok „Per etap" (funkcjonalny 950 zł / wizualny 9 200 zł / …).
- PDF: opcjonalny wiersz sumy pod każdą sekcją (`showSectionSubtotals`).
✅ Suma sekcji = suma pozycji sekcji − rabaty sekcji.

---

## Kolejność wdrożenia i zależności

```
F1.1 ─► F1.2 ─► F1.3 ─► F1.4 ─► F1.5
 │                 │
 ├─► F2.1 ─► F2.2 ─► F2.3
 ├─► F3.1 ─► F3.2 ─► F3.3
 ├─► F4.1 ─► F4.2
 └─► F5.1 ─► F5.2 ─► F5.3 ─► F6.3
F7.2 ─► F6.1, F6.2 ─► F6.3
F7.1, F7.3 — niezależne, można wrzucić w dowolnym momencie
```

Sugerowana kolejność sprintów: **F1 → F3 → F7.2 → F4 → F2 → F5 → F6 → F7.1/F7.3**. F1 i F3 są warunkiem, żeby klient z tego Excela w ogóle mógł przenieść swój cennik; F5 i F6 to to, co sprawi, że przestanie otwierać Excela.

## Nowe zależności (do uzasadnienia w PR)
- `@tanstack/react-table` — macierz cennika (F1.3).
- `pdf-lib` — scalanie PDF-ów (F6.3).
- `date-fns` — arytmetyka dat (F5.1); święta liczymy sami.

## Zmiany w bazie (zbiorczo)
| Migracja | Zmiana |
|---|---|
| `room_types` | nowa tabela + seed w `handle_new_user()` |
| `library_items.pricing jsonb`, `library_items.discount jsonb`, `library_items.tags text[]` | F1.3, F3.2, F2.3 |
| `quotes.schedule jsonb`, `quotes.documents jsonb`, `quotes.city`, `quotes.internal_notes`, `quotes.doc_kind` | F5, F6, F7.1 |
| `workspace_doc_templates` | F6 |
| `brand_kits.opening_hours jsonb`, `signer_title`, `signer_name` | F7.2 |
| `workspaces.settings` (JSONB, bez migracji): `hourlyRateCents`, `defaultPricingBasis`, `scheduleTemplate`, `defaultValidDays.{offer,schedule,stages,priceList}` | F2, F5, F6 |

Wszystkie nowe kolumny JSONB walidowane zodem przy odczycie (zasada z `CLAUDE.md` §2), `bodyVersion` w każdym dokumencie, migracje body w `domain/*/migrate.ts`.

---

## 8. Ustalenia po zderzeniu z kodem (2026-08-22)

Przegląd specyfikacji wobec faktycznego stanu repozytorium. Punkty 1–5 to **korekty założeń** — bez nich chunki wywrócą się na starcie.

**1. `bodyVersion` jeszcze nie istnieje.** `QuoteBodySchema` nie ma dziś takiego pola, więc nie ma czegoś takiego jak „zapisane v1”. `migrateBody` musi traktować **brak pola** jako v1, a nie czytać `bodyVersion: 1`. Poza tym ten sam `body` trzymają **szablony** (`templates`), więc migracja obowiązuje w `templates.repo`, nie tylko w `quotes.repo`. Miejsce wpięcia jest gotowe — oba repozytoria już robią `safeParse` i wystawiają `bodyError`.

**2. Blok pomieszczenia lepiej oprzeć na istniejącej grupie.** Specyfikacja wprowadza sekcję `kind:'rooms'` z blokami per pomieszczenie jako nowym bytem. Tymczasem drag & drop stoi na trzech poziomach (`section` → `group` → `item`, cele `item-list` i `section-groups` w `dnd/drop-resolution.ts`), a `GroupBlock` ma już nagłówek, sumę, przełącznik zbiorczy i uchwyt przeciągania. **`Group.roomId` daje to samo bez czwartego poziomu** i bez duplikowania DnD, zapisu zestawów do biblioteki i kaskady. Jeśli mimo to wybierzemy osobny byt — trzeba policzyć koszt w PR.

**3. `kind:'discount'` jest rozlany po ~20 plikach.** Zamiana rabatów na osobną listę (F3) dotyka `calc.ts`, `Money`, `ItemRow`, `GroupBlock`, `SectionBlock`, `TotalsCard`, `KindToggle`, `LibraryItemCard`, `GroupItemsList`, seed i komplet testów. Rabaty są też w bibliotece i w snapshotach zestawów (T-10). To jedno duże przejście, nie refaktor „przy okazji”.

**4. Kaskada nie obejmie `pricing` sama z siebie.** Mechanizm z T-10 przenosi **wyłącznie `name`, `description`, `unitPriceCents` i tylko te zmienione** — to świadome zawężenie (`cascadeFields` w `features/library/items/item-draft.ts`, `LibraryCascadePatch` w `editor.store.ts`). F1.3 musi rozszerzyć oba miejsca i dopisać test.

**5. Tryb godzinowy ma dziurę na granicy biblioteki.** Decyzja „te same pola `*Cents` znaczą minuty w trybie `time`” jest tania w domenie, ale `formatMoney`, `Money`, `MoneyInput` i kaskada biblioteki nie wiedzą o trybie. Pozycja zapisana do biblioteki z wyceny godzinowej wjedzie do wyceny kwotowej jako grosze — **45 min stanie się 45 groszami**. Trzeba albo zapisywać `pricingBasis` przy wpisie bibliotecznym, albo zablokować kaskadę i wstawianie między trybami. Rozstrzygnięcie należy do F2.1, nie do UI.

**6. Snapshoty zestawów mają własną ścieżkę zgodności.** `library_groups.items` to nie `QuoteBody` — waliduje je `LibraryItemSnapshotSchema` i zgodność wstecz robi się tam przez `default()` (tak dodano `qty`). Nie podpinaj ich pod `migrateBody`.

**7. Sumy per sekcja są już policzone.** `calcSectionTotals` i `calcGroupTotals` istnieją w `domain/quote/calc.ts` — F7.3 to rozszerzenie wyniku `calcQuoteTotals` o `bySection`, a nie nowa kalkulacja.

**8. Kolejność: model przed PDF.** F1 i F3 zmieniają kształt `QuoteBody`, który renderuje T-13. Dlatego w rozpisce stoją **przed** PDF-em i przed brand kitem (F7.2 to trzy pola w tym samym formularzu i tej samej stopce). Odwrotna kolejność oznacza pisanie PDF-a dwa razy.

**9. Zakres 1.0.** F1 i F3 zostają w Fazie 1 — bez nich klient nie przeniesie cennika z arkusza. F2, F4, F5 i F6 przeniesione do **Fazy 1.5**: każde to osobny moduł (harmonogram ma własną domenę dat i świąt, pakiet dokumentów to trzy nowe generatory PDF), a 1.0 nie może się o nie opóźnić.

**10. Drobiazg redakcyjny.** Nagłówek mówi o „6 arkuszach”, a wymienia siedem nazw.
