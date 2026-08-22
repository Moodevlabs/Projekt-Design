# 06 — Zadania (wykonuj po kolei, jedno na raz)

Format: `- [ ] T-xx Nazwa` — czytaj: wymagane dokumenty → kryteria akceptacji. Po ukończeniu: `[x]` + notatka.

## Faza 0 — Fundament

- [x] **T-01 Bootstrap repo** (01-ARCHITECTURE)
  `pnpm create tauri-app` (React+TS+Vite), Tailwind 4, shadcn init, ESLint flat + Prettier, `tsconfig` strict + path alias `@/`, Vitest, skrypty `lint/typecheck/test`. Struktura katalogów z 01-ARCHITECTURE (puste `index.ts` gdzie trzeba). `.env.example`. Tauri: okno 1280×800 min 1024×680, tytuł „Anzorge".
  ✅ `pnpm tauri dev` otwiera pustą apkę z Tailwindem; `pnpm lint typecheck test` przechodzą.
  > **Zrobione.** Scaffold ręczny (nie `create-tauri-app`), bo repo miało już `CLAUDE.md`/`docs` w rootcie. Zielone: `lint`, `typecheck`, `test`, `build`, `cargo check`.
  > **Uwaga:** w `globals.css` token `accent` z `docs/05-UI` nazywa się `--cta`/`--color-cta` (i jest zmapowany na shadcn `--primary`), bo `accent` w shadcn/ui oznacza jasną powierzchnię hover — kolizja nazw. CTA używaj przez `bg-primary`.
  > **Uwaga:** ikona aplikacji generowana skryptem `node scripts/make-icon.mjs` → `pnpm exec tauri icon` (podmień `src-tauri/icons/source.png` na docelowy logotyp).

- [x] **T-02 Domain: model wyceny + kalkulacje** (01-ARCHITECTURE §4)
  `domain/quote/schema.ts` (zod), `calc.ts`, `factory.ts`, `reorder.ts`, `domain/money.ts`, `domain/numbering.ts`. Pełne testy (rabaty, qty, wyłączone, VAT, parseMoney z PL formatami, move w obrębie i między grupami).
  ✅ Pokrycie `domain/` ≥ 90%.
  > **Zrobione.** 135 testów, pokrycie `domain/`: 100% linii/funkcji/instrukcji, 99,4% gałęzi.
  > **Na co uważać:**
  > - **VAT przy `pricesInclude:'gross'`**: `vatCents` to *różnica* `brutto − netto`, nie osobne zaokrąglenie — dzięki temu `netto + VAT === brutto` co do grosza. Nie „popraw" tego na mnożenie.
  > - **Rabat > suma**: `netCents = max(0, …)`, ale `itemsCents`/`discountsCents` trzymają prawdziwe wartości, żeby UI pokazało „rabat 50 zł" mimo zerowej sumy.
  > - `roundCents` = half **away from zero** (nie `Math.round`) — symetryczne dla rabatów. Wartość każdej pozycji zaokrąglana osobno, przed sumowaniem.
  > - `calcSectionTotals`/`calcGroupTotals` domyślnie liczą **bez VAT** — UI musi przekazać `{ vatRate, pricesInclude }` z `body`.
  > - Funkcje z `reorder.ts` zwracają **tę samą referencję** przy no-opie (mniej przerysowań w React).
  > - Odstępstwo od 01-ARCHITECTURE §4: `vatRate` zawężone do 0–100, żeby tryb brutto nie dzielił przez zero.

- [x] **T-03 Supabase: migracje 0001–0003, triggery, RLS, seed** (02-DATABASE)
  `supabase init`, migracje, `seed.sql`, `supabase gen types`. Skrypt `pnpm db:reset`, `pnpm db:types`.
  ✅ `supabase db reset` bez błędów; test SQL (pgTAP lub prosty skrypt) że user A nie widzi wycen usera B.
  > **Zrobione (kod).** 5 migracji + `seed.sql` + `supabase/tests/rls.test.sql` (pgTAP, 19 assertów) + `config.toml` + placeholder `src/data/types.generated.ts`. `supabase` jako devDependency — nie trzeba globalnej instalacji.
  > **✅ ZWERYFIKOWANE na lokalnym stacku (Docker 29.7.2):** `pnpm db:reset` przechodzi bez błędów (5 migracji + seed), `pnpm db:test` → **19/19 assertów pgTAP PASS** (izolacja workspace’ów, brak zapisu do `subscriptions`, brak dostępu do `stripe_events`, twarde read-only po wygaśnięciu triala), `pnpm db:types` wygenerowało prawdziwe typy i `pnpm typecheck` jest zielony.
  > **Pułapka przy starcie:** `supabase start` **przerywa start**, jeśli `config.toml` deklaruje `[functions.<nazwa>]` bez istniejącego `supabase/functions/<nazwa>/index.ts`. Sekcje dla trzech funkcji Stripe są **zakomentowane** — odkomentuj je w T-14 razem z utworzeniem katalogów.
  > **Na co uważać:**
  > - `workspace_members` — polityka SELECT NIE woła `is_member()` (cykl 42P17), tylko `user_id = auth.uid()`. Lista współpracowników (T-27) będzie wymagała RPC `security definer`.
  > - `0004` robi `revoke all on all tables in schema public from anon, authenticated` i nadaje granty jawnie. **Każda kolejna migracja dodająca tabelę musi nadać własne granty i polityki** — inaczej domyślne uprawnienia Supabase znowu wpuszczą `anon`.
  > - `next_quote_number` jest `security definer` i wymaga `is_member` ORAZ `workspace_can_write`.
  > - `stripe_events` ma RLS ON i **zero polityk** (brak `workspace_id`) — dostęp tylko `service_role`.
  > - `workspace_can_write()` musi zostać logicznie identyczne z `domain/billing/entitlement.ts` — test parytetu jest w T-15.

- [x] **T-04 AppShell + routing + design tokens** (05-UI)
  `globals.css` z tokenami, shadcn komponenty z listy, `AppShell` (sidebar+topbar), router z placeholderami stron, `EmptyState`, `StatusBadge`, `Money`.
  ✅ Nawigacja działa, wygląd zgodny z 05-UI §2.
  > **Zrobione.** `globals.css` (tokeny + `@theme inline`), `AppShell` = `Sidebar` (72px, ikony, aktywna = czarne kółko) + `Topbar` (tytuł z `handle.title` routera, szukajka ⌘K jako placeholder, CTA „Nowa wycena"). Router `react-router` v7 data mode, ścieżki w `src/app/routes.ts`. Shared: `Money`, `StatusBadge`, `EmptyState`, `PageSection`, `ConfirmDialog`.
  > **Pułapka (jest test regresji):** `TooltipTrigger asChild` (Radix Slot) scala `className` jako **string**, więc funkcyjny `className={({isActive}) => …}` NavLinka wycieka do DOM jako tekst. W `Sidebar` liczymy `isActive` przez `useMatch`. Ten sam problem dotknie każdego `NavLink`/`Link` owiniętego w `asChild`.
  > **Pułapka:** jsdom nie ma `matchMedia`/`ResizeObserver` — polyfille są w `vitest.setup.ts` (używa ich sonner i Radix).

## Faza 1 — MVP

- [x] **T-05 Auth** (02-DATABASE §2, 01-ARCHITECTURE §1 sesja)
  `data/supabase.ts` z custom storage (stronghold/keyring przez Tauri command; fallback do memory w `pnpm dev`), Login/Register/Reset, `AuthGate`, Google OAuth przez deep link `anzorge://auth/callback` (PKCE). Po rejestracji trigger tworzy workspace.
  ✅ Rejestracja → dashboard; restart apki zachowuje sesję; wylogowanie czyści keychain.
  > **Zrobione (kod).** Komendy Rust `secret_get/set/delete` (crate `keyring`, usługa `pl.anzorge.app`), `data/session-storage.ts` (keychain w Tauri, pamięć w `pnpm dev`), `data/supabase.ts` (PKCE, `detectSessionInUrl: false`), `AuthProvider` + `useAuth`, `AuthGate`, ekrany Login/Register/Reset/NewPassword (react-hook-form + zod, komunikaty PL w `errors.ts`), Google OAuth przez przeglądarkę systemową + deep link, menu konta z wylogowaniem w sidebarze. 160 testów zielonych.
  > **✅ ZWERYFIKOWANE na żywym Supabase i prawdziwym keychainie:**
  > - `src/features/auth/signup.integration.test.ts` (`pnpm test:db`) — jedno `signUp` tworzy przez trigger komplet: workspace o nazwie z metadanych, członkostwo `owner`, profil, brand kit i subskrypcję `trialing` z trialem 13–14 dni bez `stripe_customer_id`; nowy użytkownik widzi przez RLS **dokładnie jeden** workspace — swój.
  > - `cargo test --lib` — 4 testy komend keychaina na prawdziwym magazynie poświadczeń Windows: zapis→odczyt, brak wpisu = `None` (a nie błąd), kasowanie idempotentne, nadpisanie.
  > - Jednostkowo: adapter sesji (fallback + to, że nic nie ląduje w `localStorage`), parsowanie deep linka OAuth, `AuthGate` w czterech stanach.
  > **⚠️ Nadal nieprzeklikane ręcznie:** powrót deep linkiem z Google w zbudowanej aplikacji.
  > **Pułapka złapana dopiero w oknie Tauri (jest na to test):** **Windows Credential Manager przyjmuje najwyżej 2560 bajtów na wpis, licząc po zakodowaniu hasła w UTF-16** (`TooLong("password encoded as UTF-16", 2560)`). Sesja Supabase — dwa JWT plus obiekt użytkownika — ma kilka kilobajtów i nie miała szans się zmieścić. Komendy `secret_*` dzielą więc wartość na kawałki po 1000 bajtów (≈2000 po UTF-16), a licznik kawałków zapisywany jest **na końcu**, żeby niedokończony zapis czytał się jako brak sesji, a nie jako obcięty token.
  > **Druga pułapka, ta sama awaria:** adapter magazynu sesji ma **pamięć podręczną przed keychainem**. Wcześniej nieudany zapis lądował w pamięci, ale odczyt i tak pytał keychain, ten uczciwie odpowiadał „brak wpisu" — sesja znikała tuż po zalogowaniu i supabase-js wysyłał kolejne zapytania jako `anon`. Objaw był mylący: aplikacja logowała, po czym pokazywała pustkę. Jest test regresji.
  > **Na co uważać:**
  > - **Nie ma sesji w `localStorage`** — to celowe. W `pnpm dev` sesja żyje w pamięci i ginie po odświeżeniu strony; realny keychain jest tylko pod `pnpm tauri dev`.
  > - `AuthGate` w stanie `loading` pokazuje szkielet, a **nie** ekran logowania — inaczej przy każdym starcie migałoby logowanie (odczyt keychaina jest asynchroniczny). Jest na to test.
  > - Klucze metadanych przy rejestracji (`company`, `full_name`) muszą zgadzać się z triggerem `handle_new_user()` z migracji 0004 — to z nich powstaje workspace i profil.
  > - Google OAuth otwiera **przeglądarkę systemową** (Google blokuje webview) i wraca deep linkiem; `anzorge://auth/recovery` dodane do `additional_redirect_urls` w `config.toml`. W panelu Supabase trzeba dodać oba adresy ręcznie.
  > - `onSubmit` formularzy owinięty w `void form.handleSubmit(…)(event)` — inaczej ESLint słusznie krzyczy `no-misused-promises`.

- [x] **T-06 Repozytoria + queries** (01-ARCHITECTURE §2–3)
  `quotes/library/templates/workspace/subscription.repo.ts` + hooki. Parse zod przy odczycie. Optimistic update dla toggli statusów.
  ✅ Testy integracyjne na lokalnym Supabase dla quotes.repo (CRUD + konflikt `updated_at`).
  > **Zrobione.** Repozytoria: `quotes`, `library`, `templates`, `subscription`, `brand`, `workspace`. Hooki w `src/data/queries/` (jeden plik per repo), klucze wyłącznie z `src/data/query-keys.ts`.
  > **✅ ZWERYFIKOWANE:** `pnpm test:db` → **35 testów integracyjnych na żywym Supabase** (4 pliki), `pnpm test` → 163 jednostkowe, `pnpm lint` i `pnpm typecheck` zielone.
  > **Na co uważać:**
  > - **Blokada optymistyczna:** `saveQuote` wymaga `lastSeenUpdatedAt` i porównuje przez `.eq('updated_at', …)`. Brak trafienia = `ConflictError`, a dane w bazie zostają nietknięte (jest test, który to sprawdza). Edytor (T-08) musi trzymać ostatnio widziany `updated_at` i po konflikcie przeładować, a nie ponawiać zapis.
  > - **Uszkodzone `body` nie wywala aplikacji:** `quotes.repo` i `templates.repo` zwracają `body: null` + `bodyError` z opisem. UI ma pokazać „wycena uszkodzona", nie biały ekran.
  > - **Pułapka kluczy cache:** `queryKeys.quotes()` = `['quotes']` jest prefiksem także dla detalu `['quotes','detail',id]`. Operacje listowe używają predykatu `q.queryKey[1] !== 'detail'` — bez tego `setQueriesData` próbowałby mapować pojedynczą wycenę jak tablicę.
  > - **`useSetQuoteStatus` ma pełny optimistic update** z rollbackiem. Rollback jest konieczny, bo przy odbiciu od RLS (read-only po wygasłym trialu) UI pokazywałby „wysłana", a użytkownik byłby przekonany, że oferta poszła do klienta.
  > - `TemplateSummary.itemCount` liczy **wszystkie** pozycje, a `totalNetCents` tylko włączone — świadome, opisane w JSDoc.
  > - `SubscriptionStatusSchema` siedzi tymczasowo w `subscription.repo.ts`; przenieść do `domain/billing/` przy T-15.
  > - **`pnpm test:db` ≠ `pnpm db:test`**: pierwsze to testy integracyjne repozytoriów (Vitest), drugie to testy RLS w pgTAP. Oba wymagają `pnpm db:start`.

- [x] **T-07 Lista wycen + dashboard (dane realne)** (05-UI §3)
  ✅ Filtry, szukaj, sort, menu ⋯ (duplikuj/archiwizuj); dashboard liczy statystyki z `quotes`.
  > **Zrobione.** Lista: pigułki statusów, szukajka, sortowanie (4 warianty), tabela, menu ⋯ z edycją/duplikacją/archiwizacją (z potwierdzeniem). Pulpit: 4 kafle z `calcDashboardStats`, 5 ostatnich wycen, karta subskrypcji z paskiem triala.
  > **✅ ZWERYFIKOWANE:** 176 testów jednostkowych (w tym 6 dla statystyk i 7 dla listy) + 35 integracyjnych; obejrzane na żywo na danych z seeda — kafle liczą się zgodnie z danymi (średnia 3840 zł = (4050+3630)/2), filtr statusu robi realny round-trip do bazy.
  > **Na co uważać:**
  > - **Filtrowanie, szukanie i sortowanie robi Postgres**, nie przeglądarka — filtry wchodzą do klucza zapytania. Nie „optymalizuj" tego na filtrowanie w JS, bo lista ma rosnąć do tysięcy wycen.
  > - **Statystyki liczą się z listy, która i tak jest w cache** — pulpit nie bije po bazie drugi raz. Jeśli lista kiedyś dostanie paginację, kafle trzeba przenieść na osobne zapytanie agregujące.
  > - Wszystkie cztery kafle dotyczą **bieżącego miesiąca liczonego w strefie użytkownika**, nie w UTC. Zmiana zakresu = zmiana etykiet w `i18n/pl.ts`.
  > - `acceptanceRate` ma w mianowniku tylko **rozstrzygnięte** (accepted + rejected). Gdyby liczyć też `sent`, wskaźnik spadałby za każdym razem, gdy ktoś wyśle świeżą ofertę.
  > - Pusta lista rozróżnia „nie masz jeszcze wycen" od „filtr nic nie zwrócił" — są na to osobne teksty i test.
  > **Nie przeklikane ręcznie:** zawartość rozwijanego menu ⋯ (Radix otwiera się na `pointerdown`, nie da się tego wyklikać skryptem). Obecność przycisku per wiersz pokrywa test jednostkowy, a same akcje `duplicateQuote`/`archiveQuote` mają testy integracyjne na żywej bazie.

- [x] **T-08 Edytor wyceny — rdzeń** (05-UI §3, 01-ARCHITECTURE §3)
  `editor.store.ts` (Zustand+immer), `QuoteHeader`, `SectionBlock`, `GroupBlock`, `ItemRow`, `TotalsCard`, tryb edycja/podgląd, inline edit, toggle, dodawanie/usuwanie, autosave z wskaźnikiem, numer z `next_quote_number`.
  ✅ Parytet funkcjonalny z `projekt.html` bez biblioteki/DnD/PDF. 300 pozycji bez laga (profil React).
  > **Zrobione.** `editor.store.ts` (Zustand+immer), `useAutosave`, `QuoteEditorPage`, `EditorTopbar`, `QuoteHeader`, `SectionBlock`, `GroupBlock`, `ItemRow`, `TotalsCard`, `ItemToggle`, `InlineText`, `InlineMoney`, `AddLink`, `DragHandle`, `SaveIndicator`.
  > **✅ ZWERYFIKOWANE:** 227 testów jednostkowych + 35 integracyjnych; obejrzane na żywo na wycenie z seeda — przełączenie pozycji w podglądzie przeliczyło sumy i **autozapis utrwalił zmianę w bazie** (`enabled:false`, totale przeliczone, `updated_at` podbity).
  >
  > **Decyzje wobec prototypu (z analizy `reference/projekt.html`):**
  > - **Rabat to `kind` pozycji, nie flaga sekcji.** W prototypie rabat mógł istnieć tylko w dedykowanej sekcji i nie dało się go utworzyć z UI (`newItem(rabat)` ignorował argument). U nas jest `+ Dodaj rabat` przy każdej sekcji i grupie.
  > - **`Group.enabled` NIE istnieje w schemacie** — stan przełącznika grupy wyliczamy z pozycji (`wszystkie` / `żadna` / `część` → stan pośredni). Prototypowy `recalc()` i tak nigdy nie czytał `room.on`.
  > - **`issueDate` dodane do `QuoteBodySchema`** (opcjonalne, `null` → UI pokazuje `created_at`). Prototyp pozwalał wpisać dowolną datę; wycenę przygotowuje się nieraz z inną datą niż dzień utworzenia.
  > - Pozostałe świadome uproszczenia (`section.extra`, stopka per wycena) — w `docs/IDEAS.md`.
  >
  > **Na co uważać:**
  > - **Przełącznik TAK/NIE działa także w podglądzie** — to nie przeoczenie, tylko sedno produktu. W podglądzie znikają wszystkie inne kontrolki (test to pilnuje).
  > - **Wyłączona pozycja tylko zmienia kolor** nazwy i kwoty. Bez `opacity`, bez przekreślenia — klient ma czytać, z czego rezygnuje. Jest test, który blokuje „poprawienie" tego na wyszarzenie.
  > - **Ramki pól istnieją zawsze, tylko są przezroczyste** poza trybem edycji — dzięki temu przełączenie trybu nie przesuwa layoutu ani o piksel.
  > - **Konflikt `updated_at` jest trwały** (`hasConflict`): po nim autozapis milczy aż do przeładowania. Bez tego kolejna edycja odblokowałaby zapis i nadpisała cudze zmiany.
  > - **Wydajność stoi na dwóch rzeczach naraz**: strukturalnym współdzieleniu z immera (nietknięte gałęzie zachowują referencję) i `memo` na `ItemRow`/`GroupBlock`/`SectionBlock`. Test `SectionBlock.perf.test.tsx` sprawdza mechanizm — zweryfikowałem, że **zawodzi po usunięciu `memo`**. Sesji React Profilera nie uruchamiałem.
  > - Pola wielolinijkowe mają własny auto-rozmiar — `contentEditable` dawał to za darmo, `<textarea>` nie.
  > - Trasa edytora ustawia `handle.hideTopbar`, bo edytor ma własny pasek.

- [x] **T-08a Przebudowa systemu wizualnego** (05-UI) — *zadanie wstawione na życzenie w trakcie Fazy 1*
  ✅ Nowoczesny „liquid glass", czarny rozwijany sidebar z animowanym wskaźnikiem, pulpit bez szablonowych kafelków.
  > **Teza:** **chrom aplikacji jest ze szkła, dokument jest z papieru.** Powłoka (sidebar, paski, karty) cofa się; wycena jest ciepłym, matowym arkuszem leżącym na podłożu i wychodzi do przodu. Szkło oprawia papier — to koduje strukturę produktu (narzędzie kontra artefakt dla klienta).
  > **Na co uważać:**
  > - **Szkło to nie sam blur.** Potrzebne są cztery rzeczy naraz: rozmycie, **podbicie nasycenia** (bez tego wychodzi brudna szarość), włos obramowania jaśniejszy u góry niż u dołu (odblask, robiony maską na `::before`, nie `border`) i cień w kolorze atramentu, nie czerni. Do tego **różnica jasności pod spodem** — na płaskim tle szkło nie ma czego załamać i wygląda jak biały div.
  > - **Nawigacja jest ciemna, treść jasna** — czarna szyna, jasne szkło, ciepły papier dokumentu: trzy wyraźne plany.
  > - **Wskaźnik aktywnego ekranu ma dwie postacie.** Pasek zwinięty: **wcięcie** w prawej krawędzi szyny, obejmujące ikonę — wybrany ekran zlewa się z treścią, więc ikona leży na jasnym tle i jest atramentowa. Pasek rozwinięty: pigułka pod całym wierszem. Wąska szyna ikon lubi znacznik na krawędzi, wiersz pełnej szerokości lubi tło.
  > - **Wcięcie to nie plamka w przybliżonym kolorze.** Jest wypełnione **tym samym** polem światła co tło strony, renderowanym z `background-attachment: fixed` — dzięki temu jest zakotwiczone w widoku i pasuje co do piksela, zamiast rozjeżdżać się z tłem.
  > - **Wskaźnik to dwa zagnieżdżone elementy.** Zewnętrzny robi przesunięcie (`transition`), wewnętrzny rozciągnięcie (`animation`). Na jednym elemencie biłyby się o `transform`.
  > - **Znacznik statusu nie jest pigułką i nie ma być.** Status wyceny to pozycja w ciągu (szkic → wysłana → rozstrzygnięcie), a nie tag z chmury. Trzyodcinkowy tor daje się skanować pionowo w kolumnie i niesie **dwa niezależne kanały**: liczba odcinków to postęp, barwa to kondycja oferty (bursztyn = jeszcze u nas, zieleń = u klienta, im ciemniejsza tym bliżej domknięcia). Napis zostaje neutralny, żeby nie tracić kontrastu na drobnym stopniu — i żeby sam układ odcinków plus słowo wystarczyły osobie nierozróżniającej barw.
  > - **Pasek okresu próbnego zmienia barwę wraz z zapasem dni** (`trial-tone.ts`): zieleń → bursztyn → czerwień. Interpolacja jest dwuodcinkowa, bo prosta między zielenią a czerwienią przechodzi przez brudną oliwkę.
  > - **Dokument jest biały**, nie beżowy — paleta `--doc-*` jest neutralna poza jednym wyjątkiem: rabaty zostają w terakocie, bo ujemna kwota musi się odróżniać także przy pobieżnym czytaniu.
  > - **W podglądzie pola renderują się jako TEKST, nie `readonly` input.** Input nie potrafi zawijać, więc dłuższe wartości (najczęściej e-mail) były ucinane na krawędzi pola; przy okazji czytnik ekranu nie ogłasza już podglądu jako formularza.
  > - Etykiety w nagłówku wyceny stoją **nad** wartościami, a nie obok — w jednym wierszu na wartość zostawało kilkadziesiąt pikseli.
  > - **Kolorystyka jest tymczasowa: szarobiel.** Chrom ma nie konkurować z dokumentem. Docelowa paleta powstanie na końcu budowy (T-17). Nie dokładaj tu akcentów kolorystycznych „bo pusto".
  > - Fonty (`Inter` + `Instrument Sans` na tytuły, etykiety i **liczby**) są hostowane u siebie przez `@fontsource-variable` — w aplikacji desktopowej nie zależymy od sieci ani nie rozluźniamy CSP dla Google Fonts.
  > - Trasa może ustawić `handle.hideTopbar` — korzysta z tego edytor, który ma własny pasek.
  > - **Podpis w tle wymaga, żeby korzeń powłoki był pozycjonowany** (`relative`). Element pozycjonowany — a taki jest `AppCredit` — rysuje się nad każdą **statyczną** treścią niezależnie od kolejności w drzewie. Bez tego podpis przechodził nad arkuszem wyceny (papier nie ma `position`), choć karty z `position: relative` już go poprawnie zasłaniały. Klasyczna pułapka reguł nakładania CSS.
  > - Jedyny mocny efekt na pulpicie to **osiadające liczby** (`useCountUp`, rAF, ease-out, `prefers-reduced-motion` → od razu wynik). To nawiązanie do sedna produktu: sumy, która przelicza się po przełączeniu pozycji. Nie dokładaj drugiej animacji „dla równowagi".

- [x] **T-09 Drag & drop + przyciski góra/dół** (05-UI §5)
  @dnd-kit, keyboard sensor, `domain/quote/reorder.ts`.
  ✅ Przenoszenie pozycji między grupami i sekcjami, grup między sekcjami; a11y z klawiatury.
  > **Zrobione.** `@dnd-kit` (pointer + keyboard sensor), czysta funkcja `dnd/drop-resolution.ts`, akcje kolejności w store, uchwyty przeciągania na pozycjach, grupach i sekcjach. Zmiana kolejności idzie **wyłącznie przeciąganiem**.
  > **✅ ZWERYFIKOWANE:** 288 testów jednostkowych (16 dla rozstrzygania celu upuszczenia) + 35 integracyjnych. Na żywo: przestawienie zmieniło kolejność i **autozapis utrwalił ją w bazie**; przeniesienie **samą klawiaturą** (`Space` → `↓` → `Space`, bez myszy) przestawiło element i ogłosiło to komunikatem dla czytnika ekranu.
  > **Na co uważać:**
  > - **`SortableContext` kasuje memoizację, jeśli dostanie nową tablicę `items`.** Zmiana kontekstu przerenderowuje wszystkich konsumentów `useSortable` **niezależnie od `memo`** — naiwne `items.map(i => i.id)` w ciele komponentu sprawiało, że edycja jednej nazwy przerysowywała całą listę. Stąd `useStableIds`: referencja zmienia się tylko przy zmianie składu lub kolejności. Test `SectionBlock.perf.test.tsx` to pilnuje i **złapał tę regresję** przy podpinaniu DnD.
  > - **Funkcje z `reorder.ts` robią `structuredClone`, a proxy immera się nie sklonuje.** Store zdejmuje najpierw zwykły obiekt przez `current()`.
  > - Puste grupy i sekcje mają **własne cele upuszczenia** (`item-list`, `section-groups`) — bez nich nie dałoby się niczego do nich przenieść, bo nie byłoby czego dotknąć.
  > - Uchwyt przeciągania jest **przyciskiem z etykietą**, nie ikoną: sensor klawiatury potrzebuje czegoś, na co da się przejść tabem.
  > - **Podglądem przeciągania jest sam wiersz, a „trzymam" komunikuje kursor.** Wiersz zostaje w pełni czytelny (unosi się cieniem, nie blednie), a klasa `is-dragging` na `<body>` wymusza `grabbing` na całej stronie — wskaźnik dawno opuścił uchwyt. Klasa jest zdejmowana także przy odmontowaniu, inaczej kursor przykleiłby się do całej aplikacji (jest na to test).
  > - **Nie ma przycisków ▲▼ ani plakietki pod kursorem** — obie rzeczy powstały, a potem zostały świadomie usunięte na rzecz samego przeciągania. Nie przywracaj ich bez powodu; gdyby miały wrócić, funkcje `nudge*` czekają gotowe i przetestowane w `domain/quote/reorder.ts`.
  > - **Klawiaturowa ścieżka a11y zostaje mimo usunięcia strzałek**: uchwyt jest przyciskiem dostępnym tabem, a `KeyboardSensor` obsługuje `Space` → strzałki → `Space`.
  > - **Ruch „w to samo miejsce" odsiewa `resolveDrop`, nie store.** Domena przy poprawnych id zawsze zwraca nowy dokument, więc store nie ma jak rozpoznać ruchu bez efektu — porównanie referencji chroni tylko przed nieznanym id.

- [ ] **T-10 Biblioteka** (00-PRD §4.1)
  Strona biblioteki, `LibraryPicker` w edytorze, „zapisz do biblioteki", „zapisz wszystko", kaskada zmian do otwartej wyceny (dialog).
  ✅ Scenariusz: edytuj cenę w bibliotece → pyta → aktualizuje pozycję w otwartej wycenie powiązaną `libraryItemId`.

- [ ] **T-11 Szablony** (00-PRD §4.1)
  ✅ Zapisz jako szablon, nowa z szablonu, nadpisz, usuń.

- [ ] **T-12 Brand kit — ustawienia + Storage** (04-PDF §3–4, 02-DATABASE storage)
  Formularz, upload logo do bucketa `brand`, signed URL, walidacja kolorów, kontrast.
  ✅ Zapis i odczyt; logo widoczne po restarcie.

- [ ] **T-13 PDF** (04-PDF)
  `QuotePdfDocument`, fonty, theme z brand kitu, worker, eksport przez Tauri `save_file` + `open_path`, live preview w ustawieniach brandingu, snapshot test renderu (pdf → png przez `pdf-to-img` w teście lub porównanie struktury).
  ✅ PDF 10 stron < 3 s; polskie znaki; wyłączone pozycje wg ustawienia; numeracja stron.

- [ ] **T-14 Stripe — Edge Functions + webhook** (03-BILLING)
  3 funkcje + `_shared`, idempotencja, mapowanie statusów, testy Deno z mockiem.
  ✅ `stripe trigger` aktualizuje `subscriptions` lokalnie.

- [ ] **T-15 Gating + ekran subskrypcji** (03-BILLING §4)
  `domain/billing/entitlement.ts` (parytet z SQL — test), `useSubscription`, `PaywallGate`, banner read-only, pasek triala, deep link `anzorge://billing/*`, polling po powrocie.
  ✅ Symulacja: ustaw `trial_ends_at` w przeszłość → edytor read-only, RLS odrzuca update; kup → `active` → edycja wraca.

- [ ] **T-16 Ustawienia workspace + konto**
  Waluta, VAT, wzorzec numeracji, `showDisabledItems`, zmiana hasła, eksport danych (JSON), usuń konto (Edge fn `delete-account`).
  ✅ Zmiana wzorca numeracji wpływa na kolejną wycenę.

- [ ] **T-17 Polish & release 1.0**
  Pusty stan onboardingu (3 kroki: logo → biblioteka → pierwsza wycena), obsługa błędów (ErrorBoundary, toasty), ikony aplikacji, `tauri build` Win+mac, podpisywanie (notarization macOS, cert Win — zanotuj w README co trzeba mieć), CHANGELOG.
  ✅ Instalator działa na czystej maszynie.

## Faza 2

- [ ] T-18 Klienci (CRM-lite) + przypięcie do wyceny
- [ ] T-19 Auto-update (tauri-plugin-updater, endpoint w Supabase Storage / GitHub Releases)
- [ ] T-20 Wysyłka e-mail z PDF (Resend) + szablon wiadomości
- [ ] T-21 Tryb ciemny + paleta komend ⌘K + skróty
- [ ] T-22 Wersjonowanie wyceny
- [ ] T-23 Import/eksport CSV (biblioteka, lista wycen)
- [ ] T-24 Wiele walut i lokalizacja liczb

## Faza 3

- [ ] T-25 Link online dla klienta (osobna apka web `apps/share` — Vite, ten sam `domain/`), tabela `quote_shares`, RLS dla anon przez token (RPC `get_shared_quote(token)`)
- [ ] T-26 Akceptacja online + podpis + powiadomienie (Realtime)
- [ ] T-27 Wielu użytkowników w workspace (zaproszenia e-mail, role)
- [ ] T-28 Statystyki wyłączanych pozycji (widok materializowany)
- [ ] T-29 Offline: SQLite (tauri-plugin-sql) + kolejka sync

## Notatki z wykonania
(dopisuj pod zadaniem po ukończeniu)
