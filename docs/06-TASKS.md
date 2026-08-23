# 06 — Zadania (wykonuj po kolei, jedno na raz)

Format: `- [ ] T-xx Nazwa` — czytaj: wymagane dokumenty → kryteria akceptacji. Po ukończeniu: `[x]` + notatka.

**Numer to tożsamość zadania, nie kolejność.** Kolejność wykonania = pozycja na liście. Po wchłonięciu `FEATURES-Z-EXCELA.md` (2026-08-22) zadania T-30+ zostały wplecione **pomiędzy** T-11…T-17, bo część z nich musi wyprzedzić PDF i brand kit — inaczej pisalibyśmy je dwa razy. Stare numery zostawiono nietknięte, żeby notatki i commity dalej się zgadzały.

Zadania oznaczone `(F…)` pochodzą z `FEATURES-Z-EXCELA.md` — tam jest pełna specyfikacja, wzory z arkusza i model domenowy. Tutaj jest **kolejność, zależności i kolizje z istniejącym kodem**; nie duplikuję treści tamtego dokumentu.

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
  > - **Wyjście musi domknąć zapis (naprawione 2026-08-22).** Debounce zostawiał okno 800 ms, w którym zmiana istniała wyłącznie w pamięci: cleanup hooka kasował timer i nie zapisywał niczego, więc „poprawiam cenę i klikam Wyceny" gubiło poprawkę bez śladu. To samo dotyczyło zamknięcia okna. Teraz odmontowanie edytora i zamknięcie okna wymuszają zapis oczekujących zmian — w Tauri przez `onCloseRequested` (wstrzymujemy zamknięcie, zapisujemy, domykamy sami przez `destroy()`, stąd `core:window:allow-destroy` w capabilities), w przeglądarce przez `beforeunload` z `preventDefault`, bo tam nie da się poczekać na obietnicę. Test na to jest i **zweryfikowałem, że zawodzi po usunięciu flushu**.
  > - **Zapis w locie a wyjście to dwa różne przypadki.** Autozapis pomija zapis, który już leci (kolejna zmiana i tak zaplanuje następny), ale wyjście **czeka** na niego i dopisuje to, co powstało w międzyczasie — drugiej okazji nie będzie.
  > - **Odpowiedź serwera sprawdza `quoteId`, zanim ruszy store.** Zapis potrafi wrócić po wyjściu, kiedy w edytorze jest już inna wycena; `markSaved` na ślepo wpisałby jej `updated_at` starej wyceny i następny zapis wywaliłby się konfliktem.
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
  > - **Systemowy kursor `grab` jest na Windows BIAŁY** i na białej kartce wyceny praktycznie znika. Stąd własny kursor: atramentowa łapka z białą otoczką (`paint-order: stroke`), wstawiona jako SVG w `data:` URI, z systemowym `grab`/`grabbing` jako zapasem po przecinku.
  > - **Podglądem przeciągania jest sam wiersz, a „trzymam" komunikuje kursor.** Wiersz zostaje w pełni czytelny (unosi się cieniem, nie blednie), a klasa `is-dragging` na `<body>` wymusza `grabbing` na całej stronie — wskaźnik dawno opuścił uchwyt. Klasa jest zdejmowana także przy odmontowaniu, inaczej kursor przykleiłby się do całej aplikacji (jest na to test).
  > - **Nie ma przycisków ▲▼ ani plakietki pod kursorem** — obie rzeczy powstały, a potem zostały świadomie usunięte na rzecz samego przeciągania. Nie przywracaj ich bez powodu; gdyby miały wrócić, funkcje `nudge*` czekają gotowe i przetestowane w `domain/quote/reorder.ts`.
  > - **Klawiaturowa ścieżka a11y zostaje mimo usunięcia strzałek**: uchwyt jest przyciskiem dostępnym tabem, a `KeyboardSensor` obsługuje `Space` → strzałki → `Space`.
  > - **Ruch „w to samo miejsce" odsiewa `resolveDrop`, nie store.** Domena przy poprawnych id zawsze zwraca nowy dokument, więc store nie ma jak rozpoznać ruchu bez efektu — porównanie referencji chroni tylko przed nieznanym id.

- [x] **T-10 Biblioteka** (00-PRD §4.1)
  Strona biblioteki, `LibraryPicker` w edytorze, „zapisz do biblioteki", „zapisz wszystko", kaskada zmian do otwartej wyceny (dialog).
  ✅ Scenariusz: edytuj cenę w bibliotece → pyta → aktualizuje pozycję w otwartej wycenie powiązaną `libraryItemId`.
  > **Zrobione.** Strona biblioteki (zakładki Pozycje/Grupy, edycja w miejscu, kategorie, szukajka), `LibraryPicker` w edytorze (popover z szukajką, kategoria kontekstu na górze, druga zakładka z zestawami), „zapisz do biblioteki" przy pozycji i „zapisz wszystko" w menu paska, kaskada z dialogiem.
  > **✅ ZWERYFIKOWANE:** 328 testów jednostkowych + 35 integracyjnych. Scenariusz z kryterium ma własny test na **prawdziwym store edytora** (`items/useCascadePrompt.test.ts`).
  > **Na co uważać:**
  > - **Biblioteka musi dać się otworzyć Z WNĘTRZA edytora** i dlatego jest też panelem bocznym (`LibrarySheet`), nie tylko stroną. Przejście na `/biblioteka` odmontowuje edytor, ten przy odmontowaniu **czyści wycenę ze store'u i wyłącza autozapis** — czyli nie ma już „otwartej wyceny", do której cokolwiek mogłoby skaskadować. Kaskada zbudowana wyłącznie pod stronę nigdy by nie zadziałała; w prototypie biblioteka też była modalem nad wyceną i to jest ten sam powód.
  > - **Kaskadują tylko nazwa, opis i cena**, i to wyłącznie te **zmienione**. `enabled`, `qty` i kolejność należą do konkretnej wyceny — zmiana wpisu bibliotecznego nie ma prawa ich nadpisać.
  > - **Najpierw zapis w bibliotece, potem pytanie.** Odmowa zostawia zmianę w bibliotece i nie dotyka wyceny; to dwa niezależne byty.
  > - Pytanie pojawia się tylko, gdy zmieniło się kaskadujące pole **i** w otwartej wycenie są powiązane pozycje — inaczej dialog byłby czystym hałasem.
  > - Wstawiona z biblioteki pozycja dostaje `libraryItemId` i to jest jedyny haczyk, po którym kaskada ją później odnajduje.
  > - Kierunek zależności: **edytor wystawia operację, biblioteka o nią prosi** (`useLibraryCascade`). Odwrotny kierunek robił z tego w prototypie plątaninę.
  >
  > **Domknięte po przeglądzie (2026-08-22).** Przegląd gotowego T-10 wykazał, że część biblioteki tylko wyglądała na skończoną:
  > - **Picker w edytorze nie otwierał się w ogóle.** `AddLink` brał tylko `icon`/`children`/`onClick` i wyrzucał resztę propsów, więc jako dziecko `PopoverTrigger asChild` zjadał ref i atrybuty stanu od Radiksa — popover przełączał stan, ale nie miał kotwicy. Testy tego nie widziały, bo w jsdom treść i tak trafia do DOM; test sprawdza teraz `aria-expanded`/`data-state`, nie sam tekst.
  > - **Zestawów nie dało się wypełnić.** Grupę biblioteczną można było stworzyć tylko pustą i przemianować — żadna ścieżka UI nie zapisywała `items`. Doszło: „zapisz zestaw do biblioteki" przy grupie w edytorze oraz dodawanie/usuwanie pozycji i edycja ilości na karcie zestawu.
  > - **Snapshot zestawu gubił `qty`.** Seed zapisywał ilości (Kuchnia = 14 m² projektu), a schemat je wycinał. `qty` jest teraz w `LibraryItemSnapshotSchema` z `default(1)`, więc stare wpisy w jsonb dalej się parsują.
  > - **Pozycja zapisana z wyceny nie dostawała `libraryItemId`** — czyli kaskada omijała pozycję, z której wpis dopiero co powstał. Teraz wiąże się po udanym zapisie.
  > - **„Dodaj pozycję" przy wpisanej frazie wyglądało na zepsute** — nowa pozycja nie pasowała do filtra i znikała. Fraza jest czyszczona; kategoria przeciwnie, zostaje i nowa pozycja do niej wpada.
  >
  > Zapisy do biblioteki wyjechały ze strony do `useSaveToLibrary` — `QuoteEditorPage` miał 391 linii, a logiki w komponencie nie dało się sprawdzić na prawdziwym store.

### Model wyceny v2 — musi wyprzedzić PDF

> **Dlaczego tutaj, a nie na końcu.** `F1` (pomieszczenia i cennik parametryczny) oraz `F3` (rabaty procentowe i warunkowe) zmieniają **kształt `QuoteBody`**, a T-13 renderuje dokładnie ten kształt. Zrobienie PDF-a przed nimi oznacza napisanie go dwa razy: raz na płaskich pozycjach, drugi raz na blokach per pomieszczenie i osobnej liście rabatów. Ta sama logika dotyczy T-11 (szablon zapisuje `body`) i T-12 (formularz brandingu, do którego `F7.2` dokłada pola).
>
> Koszt tej decyzji: pierwszy PDF powstaje później. Uznałem to za tańsze niż przepisywanie — jeśli wolisz mieć PDF wcześniej, powiedz, wtedy T-13 idzie zaraz po T-30 w wersji „bez pomieszczeń", z jawnym długiem do spłaty.

- [x] **T-30 Wersjonowanie `body` + szkielet migracji** (F1.1 — część)
  `bodyVersion` w `QuoteBodySchema` (**dziś tego pola nie ma — brak pola == v1**, migracja musi to rozpoznawać, a nie zakładać `bodyVersion: 1`). `domain/quote/migrate.ts` z `migrateBody(raw) → v2`; wpięcie przy odczycie w `quotes.repo` (miejsce gotowe — jest `safeParse` + `bodyError`) i **w `templates.repo`, który trzyma taki sam `body`**. Zapis zawsze w najnowszej wersji.
  ✅ Stara wycena i stary szablon z bazy wczytują się bez zmiany totali; `bodyError` dalej łapie faktycznie uszkodzony JSON.
  ⚠️ Snapshoty w `library_groups.items` to **osobny** schemat (`LibraryItemSnapshotSchema`) — ma własną ścieżkę zgodności (`qty` dodano z `default(1)`), nie podpinaj go pod `migrateBody`.
  > **Zrobione.** `domain/quote/migrate.ts`: `CURRENT_BODY_VERSION`, rejestr `MIGRATIONS`, `runMigrations`, `migrateBody`, `readBodyVersion`. `bodyVersion` w schemacie jako `z.literal(CURRENT).default(CURRENT)`, `newQuoteBody` stempluje nowe dokumenty. 376 testów jednostkowych + 37 integracyjnych.
  > **Na co uważać:**
  > - Mechanizm wszedł **przed** pierwszą zmianą modelu (wtedy `CURRENT_BODY_VERSION` = 1, rejestr pusty), żeby dokumenty zapisywane od tamtej chwili miały stempel. T-31 dopisał krok `1:` i podbił stałą na 2 — dokładnie tak, jak zaplanowano.
  > - **Migracja wpięta w `parseQuoteBody`, a nie w repozytoria.** Okazało się, że to jedno wejście dla `quotes.body` **i** `templates.body`, więc oba dostały migrację za darmo. Nie dubluj jej w repo.
  > - **Dokument z nowszej wersji jest odrzucany**, nie okrajany po cichu — ląduje w `bodyError` z „Zaktualizuj aplikację". Bez tego starsza apka zapisałaby z powrotem dokument bez pól, których nie rozumie, i skasowała dane.
  > - `bodyVersion` jest **literałem**, nie luźną liczbą: pominięcie migracji staje się wtedy natychmiastowym błędem walidacji zamiast cichego zapisu.
  > - Mechanizm ma testy na **sztucznym rejestrze** (`runMigrations` przyjmuje rejestr parametrem), więc dopisanie prawdziwego kroku w T-31 ich nie wywróci.

- [x] **T-31 Domena: pomieszczenia i reguły cenowe** (F1.1)
  `Room`, `PricingRule` (`flat` / `per_room` / `per_frame`), rozszerzenia `Item`/`Section`/`QuoteBody`, `calcItemCents(item, rooms)`, przepięcie `calcQuoteTotals`.
  ✅ Parytet z arkuszem: K95 (200 + 15×7 pomieszczeń) i K26 (350 + 50×kadry); pomieszczenie `includedInVisual=false` + `includedInTechnical=true` liczy się tylko do części technicznej.
  ⚠️ **Rozstrzygnij przed kodowaniem, czym jest blok pomieszczenia.** `FEATURES` opisuje go jako nowy byt wewnątrz sekcji `kind:'rooms'`. Tymczasem DnD stoi dziś na trzech poziomach (`section` → `group` → `item`, cele `item-list`/`section-groups` w `dnd/drop-resolution.ts`), a `GroupBlock` ma już nagłówek, sumę, przełącznik zbiorczy i przeciąganie. Tańszą drogą jest **`Group.roomId`** — pomieszczenie to grupa wskazująca na `Room`. Wtedy przeciąganie, zapis zestawu do biblioteki i kaskada działają bez dopisywania czwartego poziomu. Jeśli wybierzesz osobny byt, policz w PR koszt duplikacji DnD.
  > **Zrobione.** `RoomSchema`, `RoomScopeSchema`, `PricingRuleSchema` (unia po `mode`), `Item.pricing`/`roomId`/`frames`, `QuoteBody.rooms`, `calcItemCents(item, rooms)`; `bodyVersion` podbite do 2 wraz z krokiem migracji. 394 testy jednostkowe (17 parytetu cennika) + 37 integracyjnych.
  > **Na co uważać:**
  > - **`Section.kind: 'rooms'` świadomie NIE weszło.** Spór „grupa czy nowy byt” dotyczy układu i DnD, a nie liczenia — odłożony do **T-35**, żeby nie przesądzać go w domenie. Samo liczenie działa niezależnie od tego, jak pozycje są w dokumencie poukładane.
  > - **`rooms` muszą dojechać do `calcSectionTotals` i `calcGroupTotals`** (`TotalsOptions.rooms`, domyślnie `[]`). Wołający bez nich policzy pozycji `per_room` **samą bazę** i nagłówek sekcji pokaże inną kwotę niż podsumowanie. Dziś to nieszkodliwe (nie da się jeszcze utworzyć pozycji parametrycznej z UI), ale **przy T-35 trzeba przejść po `SectionBlock`/`GroupBlock`/`TotalsCard` i podać `rooms`**.
  > - **`qty` pozycji mnoży wynik w każdym trybie.** W arkuszu usługi parametryczne mają `qty = 1`, więc parytet jest zachowany, a `2` robi to, czego użytkownik się spodziewa.
  > - **Pozycja `per_frame` bez `roomId` liczy się raz, po cenie domyślnej.** Cicha zerowa cena znaczyłaby, że wizualizacja „luzem” wypada z wyceny.
  > - Zaokrąglamy **raz**, na wartości pozycji — składniki (cena za pomieszczenie × ilość) sumują się w pełnej precyzji.
  > - Pozycje wstawiane z biblioteki dostają na razie `pricing: flat`; własne reguły cenowe wpisów bibliotecznych to **T-34**.

- [x] **T-32 Domena: rabaty procentowe i warunkowe** (F3.1)
  `Discount` (fixed/percent, scope quote/section/items, `condition`, `roundToCents`), `QuoteBody.discounts`, `calcDiscounts`, clamp do podstawy, migracja `kind:'discount'` → `Discount{type:'fixed'}`.
  ✅ Parytet: K114 (5% tylko przy 5/5 TAK, `MROUND` 10 zł), 25% na pozycjach z tagiem `visualization`; 100% pokrycia `calcDiscounts`.
  ⚠️ **To najbardziej rozlana zmiana w całym pakiecie.** `kind === 'discount'` siedzi dziś w ~20 plikach: `calc.ts`, `Money`, `ItemRow`, `GroupBlock`, `SectionBlock`, `TotalsCard`, `KindToggle`, `LibraryItemCard`, `GroupItemsList`, seed i komplet testów. Rabat w bibliotece i w snapshotach zestawów (T-10) też jedzie na `kind`. Zaplanuj to jako jedno przejście, nie „przy okazji".
  > **Zrobione.** `DiscountSchema`, `QuoteBody.discounts`, `domain/quote/discounts.ts` (`calcDiscounts`, `roundToStep`), `bodyVersion` 3 z krokiem migracji. **100% pokrycia `discounts.ts`** w każdym wymiarze (statements/branch/functions/lines). 415 testów jednostkowych + 37 integracyjnych.
  > **Na co uważać:**
  > - **Stare rabaty (`kind: 'discount'`) NIE zostały przeniesione — świadomie.** Migracja dodaje tylko pustą listę, a `calcQuoteTotals` sumuje **oba** źródła. Przeniesienie ich teraz znaczyłoby, że rabaty znikają z edytora, bo nie ma jeszcze czym ich narysować. **Konwersja + usunięcie `kind: 'discount'` należy do T-36** — dopiero tam robi się to „jedno przejście" po ~20 plikach. To celowy krok pośredni (expand teraz, contract przy UI), nie zapomniany dług.
  > - **Rabaty liczą się od pozycji, nie od rabatów.** Pozycje `kind: 'discount'` są wyłączone z podstawy procentu — inaczej procent naliczałby się od cudzej obniżki.
  > - **Rabat na całość liczy się od kwoty już pomniejszonej** o rabaty sekcyjne i pozycyjne (stąd sortowanie zakresów). Dwa rabaty po 50% dają 75%, a nie darmową wycenę.
  > - **Suma rabatów jest przycinana do sumy pozycji** — arkusz tego nie pilnuje, my tak.
  > - **Pusty zakres nie spełnia warunku kompletności.** „Wszystkie z zera” to brak etapu, nie kompletny etap.
  > - `DiscountLine` zwraca `enabledInScope`/`itemsInScope` — to z tego T-36 zrobi etykietę „Warunek niespełniony (4/5 pozycji)". Bez niej zero wygląda jak błąd, a nie jak zachęta do dobrania etapu.
  > - Test parytetu 25% zrobiony na `scope: 'items'`, a nie na tagu `visualization` — **tagi pozycji przychodzą dopiero z T-42**.

- [x] **T-33 Słownik typów pomieszczeń** (F1.2)
  Migracja `room_types` + seed 14 typów w `handle_new_user()`, `room-types.repo`, `useRoomTypes`.
  ✅ Nowe konto dostaje 14 typów; usunięcie używanego typu to soft delete z ostrzeżeniem.
  ⚠️ UI tego słownika mieszka w ustawieniach — rób go razem z **T-16**, nie osobno, żeby nie budować dwa razy tej samej strony.
  > **Zrobione.** Migracja `0006_room_types.sql` (tabela, indeksy, RLS, granty, `seed_room_types()`, `handle_new_user()` + backfill), `room-types.repo.ts`, `useRoomTypes`, `queryKeys.roomTypes`. 419 testów jednostkowych, 44 integracyjne, **20/20 pgTAP**. UI świadomie zostawione do T-16.
  > **Na co uważać:**
  > - **Nowa tabela nie dziedziczy grantów.** 0004 nadaje je hurtem przez `on all tables in schema public`, co obejmuje tylko tabele istniejące w tamtej chwili. Bez jawnego `grant` w swojej migracji PostgREST odpowiada `42501 permission denied` — i to **zanim RLS w ogóle dojdzie do głosu**, więc objaw („brak uprawnień” nawet dla `service_role`) nie wskazuje na przyczynę. Każda kolejna migracja z nową tabelą musi to powtórzyć.
  > - **Seed jest osobną funkcją `seed_room_types(ws)`**, bo korzystają z niego dwa miejsca: trigger zakładania konta i backfill istniejących workspace’ów. Dwie kopie listy rozjechałyby się przy pierwszej zmianie. Funkcja jest idempotentna (pomija slugi, które workspace już ma).
  > - **`slug` nie zmienia się razem z nazwą** — to po nim reguły cenowe trafiają w kolumnę macierzy (F1.3) i po nim idzie import CSV. Gdyby szedł za nazwą, poprawienie literówki wyzerowałoby ceny. `RoomTypePatch` celowo nie zawiera `slug`.
  > - **Unikalność sluga dotyczy tylko żywych wpisów** (indeks częściowy `where deleted_at is null`), więc raz usunięta „kuchnia” daje się dodać z powrotem.
  > - Usuwanie to **soft delete** — `roomTypeId` siedzi w regułach cenowych i w pomieszczeniach zapisanych wycen. Ostrzeżenie „X pozycji używa tego typu” dochodzi razem z UI w T-16.

- [x] **T-34 Biblioteka: reguły cenowe** (F1.3 — bez widoku zbiorczego)
  `library_items.pricing jsonb`, przełącznik trybu na karcie pozycji, stawki per typ pomieszczenia.
  ✅ Reguła zapisana w bibliotece wchodzi do nowej wyceny; kaskada do otwartej wyceny obejmuje `pricing`.
  > **Zrobione.** Migracja `0007_library_pricing.sql`, `LibraryItemSchema.pricing`, miękkie parsowanie reguły w repo, `PricingEditor` + `PricingModeToggle` na karcie pozycji, kaskada rozszerzona o `pricing`. 424 testy jednostkowe, 47 integracyjnych.
  > **Na co uważać:**
  > - **Kaskada porównuje reguły przez `JSON.stringify`, nie po referencji.** Reguła to zagnieżdżony obiekt (mapa stawek), więc po każdym odczycie z bazy jest inną referencją — porównanie tożsamości pytałoby o kaskadę przy każdym zapisie, nawet gdy nic się nie zmieniło.
  > - **Przełączenie trybu buduje regułę od zera**, zamiast doklejać pola. Inaczej po `per_room → flat → per_room` w JSON-ie zostawałyby śmieci po nieaktywnym trybie. Stawki przenoszą się między trybami parametrycznymi świadomie — to zwykle ta sama tabela cen.
  > - **Puste pole stawki znaczy „domyślna”, nie zero.** Macierz pokazuje w takim wierszu wartość domyślną, żeby to, co widać, zgadzało się z tym, co się policzy.
  > - **Nieczytelna reguła w `jsonb` degraduje pozycję do `flat`**, a nie wywala biblioteki — jedna zepsuta pozycja nie może zabrać użytkownikowi całego cennika. Cena jednostkowa zostaje.
  > - `@tanstack/react-table` **nie** zostało dodane. Stawki to kilkanaście wierszy na kartę, `MoneyInput` już był — biblioteka nic by nie wniosła poza zależnością.

- [x] **T-50 Macierz cennika i import CSV** (F1.3 — reszta)
  Widok `pozycje (wiersze) × typy pomieszczeń (kolumny)` z edycją w komórkach i filtrem po kategorii — dla ludzi, którzy lubią Excela. Import CSV macierzy (kolumny = slugi typów), parser w `domain/library/csv.ts`.
  ✅ Zmiana stawki w widoku zbiorczym daje ten sam efekt co edycja na karcie; import z pliku o kolumnach ze slugami wgrywa stawki bez ruszania pozostałych pól.
  ⚠️ `slug` jest kluczem importu — patrz notatka w T-33 o tym, dlaczego nie zmienia się razem z nazwą.
  > **Zrobione.** `domain/library/csv.ts` (parser), `features/library/pricing/` — `PricingMatrixTab`, `CsvImportDialog`, `csv-apply.ts`. Trzecia zakładka biblioteki. 477 testów jednostkowych, 47 integracyjnych.
  > **Na co uważać:**
  > - **Pusta komórka to „brak stawki", nie zero.** Zapisanie zera przy imporcie częściowo wypełnionego arkusza skasowałoby cennik. Ta sama zasada w trzech miejscach: parser pomija puste komórki, `buildPricingFromCsv` **dokłada** stawki zamiast podmieniać całą mapę, a macierz pokazuje w pustej komórce wartość domyślną — czyli to, co faktycznie się policzy.
  > - **Import jest dwuetapowy.** Najpierw podgląd (ile dopasowano, co odpadło, jakie kolumny są spoza słownika, które wiersze mają problemy), zapis dopiero po potwierdzeniu. Cennik to dane wpisywane godzinami.
  > - **Wiersz bez odpowiednika nie zakłada nowej pozycji** — import ma uzupełnić cennik, nie rozmnożyć bibliotekę o literówki. Nazwy dopasowujemy bez wielkości liter i nadmiarowych spacji.
  > - **Samo otwarcie macierzy nic nie zapisuje.** Pozycja stałocenowa staje się parametryczna dopiero, gdy ktoś wpisze jej stawkę; jej dotychczasowa cena zostaje wtedy bazą. Jest na to test.
  > - Parser radzi sobie z tym, co realnie wypluwa Excel: separator `;` albo `,`, przecinek dziesiętny, BOM, cudzysłowy i `""` w środku tekstu. **Nie wstawiaj znaku BOM dosłownie w kodzie** — ESLint go odrzuca (`no-irregular-whitespace`); porównujemy `charCodeAt(0) === 0xfeff`.
  > - `@tanstack/react-table` dalej niepotrzebne — kilkanaście kolumn, zwykła tabela z `overflow-x-auto`.

- [x] **T-35 Edytor: panel pomieszczeń** (F1.4 — bez bloków per pomieszczenie)
  `RoomsPanel`, akcje store (`addRoom`/`updateRoom`/`removeRoom`), dopisek „baza + 7 pom.".
  ✅ Scenariusz z arkusza: 7 pomieszczeń → 200 + Σ; wyłączenie T dla salonu zdejmuje 15 zł; `kuchnia x2` podwaja składnik.
  > **Zrobione.** `RoomsPanel` + `RoomRow` nad `TotalsCard`, akcje store, `rooms` przepięte do `SectionBlock`/`GroupBlock`/`ItemRow`, rozbicie ceny przy pozycji parametrycznej. Scenariusz z arkusza ma własny test na prawdziwym store (`rooms-scenario.test.ts`). 441 testów jednostkowych, 47 integracyjnych.
  > **Na co uważać:**
  > - **Złapany błąd z T-31: `ItemRow` liczył wartość ręcznie** (`qty × unitPriceCents`), więc pozycja parametryczna pokazywała w wierszu inną kwotę niż podsumowanie. Teraz liczy `calcItemCents`. Szukając tej pułapki patrzyłem na `calcSectionTotals`/`calcGroupTotals` i przeoczyłem, że wiersz ma własne obliczenie — **jeśli dojdzie kolejne miejsce pokazujące kwotę pozycji (PDF!), sprawdź je pod tym kątem**.
  > - **`rooms` musi mieć stabilną referencję.** Przekazanie `[]` inline zabija `memo` na wierszach — test wydajnościowy to wychwycił (8 renderów zamiast 5). W aplikacji `body.rooms` jest stabilne dzięki immerowi.
  > - **Pozycja parametryczna nie ma pola ceny jednostkowej w trybie edycji.** Cena wynika z reguły; pole sugerowałoby, że da się ją nadpisać, a wpisana wartość nie miałaby wpływu na wynik.
  > - **Usunięcie pomieszczenia ODPINA pozycje, nie kasuje ich** (wbrew pierwotnej notatce). Użytkownik usuwa pomieszczenie, nie usługi — ale martwy `roomId` zostawiłby pozycję `per_frame` liczoną po cenie nieistniejącego pomieszczenia, więc czyścimy wskaźnik. Dialog potwierdzenia mówi wprost, co się stanie.
  > - Liczba w dopisku jest filtrowana **po zasięgu reguły**, więc „3 pom." zgadza się z kwotą także wtedy, gdy część pomieszczeń ma odznaczoną flagę.

- [x] **T-51 Edytor: bloki per pomieszczenie** (F1.4 — reszta, bez wariantów 3D/360)
  Blok na każde pomieszczenie, „dodaj pozycję do wszystkich pomieszczeń", stepper kadrów dla `per_frame`.
  ✅ Powielenie usługi na 7 pomieszczeń jednym kliknięciem.
  > **Zrobione.** `Group.roomId`, akcje `addRoomBlocks` / `insertItemToRoomBlocks`, nagłówek bloku z etykietą pomieszczenia i `×qty`, „Rozpisz na pomieszczenia" w sekcji, drugi picker „Do wszystkich pomieszczeń" w bloku, pole liczby kadrów w wierszu. 486 testów jednostkowych, 47 integracyjnych.
  > **Rozstrzygnięcie odłożonej decyzji: blok pomieszczenia to GRUPA z `roomId`.** DnD zna wyłącznie sekcje, grupy i pozycje (`dnd/drop-resolution.ts`), więc osobny byt znaczyłby czwarty poziom i duplikat całej logiki przeciągania. Grupa dała przeciąganie, zapis zestawu do biblioteki i kaskadę bez jednej linijki w DnD.
  > **Na co uważać:**
  > - **`bodyVersion` NIE został podbity.** `Group.roomId` ma `default(null)`, więc stare dokumenty wczytują się bez kroku migracji — wersję podbijamy tylko wtedy, gdy trzeba **przekształcić** kształt, a nie dołożyć pole z wartością domyślną.
  > - **Nazwa bloku pochodzi z `Room.label` i nie jest edytowalna w nagłówku** — edycja w dwóch miejscach rozjechałaby etykietę z tym, co liczy cennik. `group.name` zapisujemy mimo to, żeby zestaw zapisany do biblioteki i wycena po usunięciu pomieszczenia miały czytelny nagłówek.
  > - **Każda kopia pozycji dostaje własne `id` i własny `roomId`.** Wspólna referencja znaczyłaby, że edycja jednej pozycji zmienia je we wszystkich pomieszczeniach.
  > - **Powtórne „Rozpisz" nie dubluje bloków** i nie brudzi dokumentu, gdy nie ma czego dodać — inaczej autozapis leciałby po nic. Akcja mówi, ile bloków przybyło; przy kilkunastu wierszach naraz cisza byłaby niepokojąca.
  > - **Pomieszczenie odznaczone w obu częściach zostaje widoczne, ale oznaczone `(pominięte)`** — ma być jasne, dlaczego blok liczy zero.
  > - W trybie `per_frame` wiersz pokazuje **liczbę kadrów zamiast ilości**: bez tego pola ten tryb byłby w praktyce nieużywalny, bo wszystko liczyłoby się jak jeden kadr.

- [x] **T-52 Warianty pozycji (3D / 360)** (F1.4 — ostatni fragment)
  `Item.variantOf`, wybór wariantu w wierszu zamiast nazwy, podmiana reguły cenowej i opisu przy zmianie.
  ✅ Zmiana wariantu podmienia `pricing` i opis, nie ruszając ilości ani stanu TAK/NIE.
  ⚠️ Wydzielone z T-51: bloki per pomieszczenie działają bez wariantów, a warianty to zmiana **modelu biblioteki**, nie edytora.
  > **Zrobione.** Migracja `0010_library_variants.sql` (kolumna `variant_of` + wyzwalacz płaskiej grupy), `domain/library/variants.ts`, `useVariantOptions`, `ItemVariantSelect` w wierszu, `VariantField` na karcie biblioteki, akcja `setItemVariant`. 644 testy jednostkowe, 21 integracyjnych dla biblioteki.
  > **Rozstrzygnięcie odłożonej decyzji: wariant to OSOBNY WPIS biblioteczny wskazujący na lidera**, a nie lista wariantów w jednym wpisie. Trzy powody:
  > - wariant różni się dokładnie tymi polami, które wpis biblioteczny już ma (nazwa, opis, cena, reguła) — lista w `jsonb` byłaby drugą kopią tego samego modelu, z własnym parsowaniem i własną migracją;
  > - wycena wiąże się z biblioteką przez `libraryItemId`, więc zmiana wariantu to przepięcie **jednego pola**. Kaskada zmian i licznik „ile pozycji używa tego wpisu" działają bez zmian; przy liście wariantów każde z tych miejsc potrzebowałoby drugiego klucza;
  > - macierz cennika i import CSV (T-50) operują na wierszach — warianty jako wiersze pojawiają się tam same z siebie, w `jsonb` byłyby niewidoczne.
  > **Odstępstwo od `FEATURES §F1.4`:** `Item.variantOf` w wycenie **nie powstało**. Wiersz już wie, którym wpisem bibliotecznym jest, a grupa wynika z biblioteki — drugie pole byłoby kopią cudzej informacji, a kopie się rozjeżdżają. Jeśli wpis biblioteczny zniknie, wiersz zostaje ze zwykłą nazwą; to akceptowalne.
  > **Na co uważać:**
  > - **Grupa jest płaska i pilnuje tego BAZA** (wyzwalacz), nie tylko UI. Wariant wariantu znaczyłby, że „rodzeństwo" zależy od tego, od którego wpisu zacząć liczyć. Testy integracyjne sprawdzają **treść** komunikatu z wyzwalacza — samo `rejects.toThrow()` przechodziłoby również bez niego, bo `updateLibraryItem` rzuca też przy zerowej liczbie wierszy.
  > - **`on delete set null`, nie `cascade`.** Skasowanie lidera zostawia warianty jako samodzielne pozycje; kaskada skasowałaby razem z „Wizualizacją 3D" także „360" — czyli cudzy cennik przy okazji sprzątania jednego wpisu.
  > - **Mapa wariantów jest indeksowana po każdym członku grupy, nie po liderze** — wiersz wyceny nie ma skąd znać lidera.
  > - **Pusta mapa to stała `NO_VARIANTS`.** `new Map()` przy każdym renderze przebiłoby `memo` na wszystkich wierszach naraz — dokładnie ten błąd złapał kiedyś test wydajnościowy na `rooms={[]}` (T-35). Jest na to osobny test.
  > - **Wariant zastępuje nazwę wiersza, a nie stoi obok niej** — inaczej dałoby się wpisać „Wizualizacja 3D" przy wybranym wariancie 360 i nikt by tego nie wyłapał.
  > - **Kandydaci na lidera pochodzą z całej biblioteki, nie z przefiltrowanego widoku.** Stąd `useAllLibraryItems()` — osobna nazwa, bo dwa wywołania `useLibraryItems` z różnymi argumentami w jednym pliku czytają się jak pomyłka.
  > - **jsdom nie ma pointer capture**, a Radix woła go przy otwieraniu `Select`. Polyfill jest w `vitest.setup.ts`; bez niego test kliknięcia w listę wywala się myląco („nie znaleziono opcji").

- [x] **T-36 Edytor: UI rabatów** (F3.2 — bez zakładki w bibliotece)
  `DiscountRow` (typ zł/%, zakres, warunek, zaokrąglenie), wyszarzony rabat niespełniony z licznikiem „3/5 pozycji".
  ✅ Sekcja `RABATY` z arkusza odwzorowana 1:1.
  > **Zrobione.** Migracja v3→v4 (rabaty-pozycje → `body.discounts`), akcje store, `DiscountsSection` + `DiscountRow` na końcu dokumentu, „Dodaj rabat" zniknęło z sekcji i grup, rabat wstawiony z biblioteki trafia na listę rabatów. 451 testów jednostkowych, 47 integracyjnych.
  > **Na co uważać:**
  > - **Migracja NIE naprawia uszkodzeń — i to jest zasada, nie szczegół.** Pierwsza wersja kroku v3→v4 robiła `Array.isArray(sections) ? sections : []`, przez co dokument z zepsutym `sections` po cichu stawał się **pustą wyceną** zamiast trafić do `bodyError`. Złapał to test integracyjny „nie wywala się na uszkodzonym body". Dokument o niespodziewanym kształcie przepuszczamy nietknięty — od odrzucania jest walidacja. Jest na to osobny test.
  > - **Kwota po migracji musi się zgadzać co do grosza.** Pozycja-rabat liczyła się jako `qty × cena`, więc do rabatu kwotowego idzie iloczyn, nie sama cena jednostkowa. `enabled` też przenosimy — to były widoczne dla klienta wiersze.
  > - **`Item.kind` zostaje w modelu**, bo używa go biblioteka (rabat jako wpis biblioteczny) i snapshoty zestawów. W wycenie pozycje `kind: 'discount'` już nie powstają: „Dodaj rabat" tworzy `Discount`, a wpis biblioteczny oznaczony jako rabat jest przechwytywany przy wstawianiu i również staje się rabatem.
  > - **Zakres rabatu czyści wskazania przy zmianie** — inaczej rabat przełączony z „wybrane pozycje" na „cała wycena" pamiętałby stare `itemIds`.
  > - Osobna **zakładka rabatów w bibliotece** (F3.2, ostatni punkt) świadomie nie weszła: rabaty biblioteczne działają dziś przez `library_items.kind`, a przenoszenie ich na własną strukturę to zmiana schematu biblioteki — wchodzi razem z **T-50**, gdzie i tak ruszamy tamten model.

- [x] **T-37 Podsumowania per sekcja** (F7.3)
  `calcSectionBreakdown` z uwzględnieniem rabatów zakresowych; rozwijany blok „Per etap” w `TotalsCard`.
  ✅ Suma sekcji = pozycje sekcji − rabaty sekcji.
  > **Zrobione.** `calcSectionBreakdown` w `domain/quote/calc.ts` + rozwijany blok w `TotalsCard` (pokazywany dopiero przy 2+ sekcjach). 493 testy jednostkowe, 47 integracyjnych.
  > **Na co uważać:**
  > - **Rabat na całą wycenę NIE jest rozdzielany między sekcje.** Rozsmarowanie go proporcjonalnie dałoby liczby, których użytkownik nie odtworzy ręcznie — a ten podział służy właśnie do sprawdzania. Do sekcji trafia tylko rabat, który na pewno do niej należy: `scope: 'section'` wskazujący tę sekcję albo `scope: 'items'`, którego **wszystkie** pozycje w niej leżą.
  > - Rabat rozłożony na dwie sekcje nie trafia do żadnej — świadomie, z tego samego powodu.
  > - Blok jest **zwinięty domyślnie i ukryty przy jednej sekcji**: to narzędzie do sprawdzania, a nie główna liczba.

### Reszta Fazy 1

- [x] **T-11 Szablony** (00-PRD §4.1)
  ✅ Zapisz jako szablon, nowa z szablonu, nadpisz, usuń.
  ⚠️ Po T-30: szablon zapisuje `body`, więc musi przejść tę samą migrację wersji co wycena.
  > **Zrobione.** `TemplatesPage` + `TemplateCard` (lista, zmiana nazwy w miejscu, nowa wycena z szablonu, usuwanie), `useTemplateActions` + dialogi w edytorze („Zapisz jako szablon”, „Nadpisz szablon”), `renameTemplate` w repo i hook. 499 testów jednostkowych, 48 integracyjnych.
  > **Na co uważać:**
  > - **Szablon NIE zabiera danych klienta ani daty wystawienia.** Inaczej nowa wycena z szablonu startowałaby z cudzym nazwiskiem i telefonem — pomyłka, którą łatwo wysłać do klienta. Jest na to test.
  > - **Zapisujemy `structuredClone`, nie referencję** do dokumentu w edytorze; dalsze pisanie po zapisie nie może zmieniać treści wysłanej do bazy. To samo przy tworzeniu wyceny z szablonu — od tej chwili oba dokumenty żyją osobno.
  > - **Nadpisanie pokazuje nazwę celu w chwili kliknięcia** i nie da się go cofnąć, dlatego wybór szablonu i potwierdzenie są w jednym dialogu.
  > - Pozycja „Nadpisz szablon" znika z menu, gdy nie ma żadnego szablonu — martwa opcja tylko myli.
  > - Szablon z uszkodzonym `body` **zostaje na liście**, ale bez przycisku tworzenia wyceny: ukrycie go zostawiłoby wiersz, którego nie da się ani użyć, ani skasować.
  > - Migracja `body` działa dla szablonów od T-30 — `parseQuoteBody` jest wspólnym wejściem, więc dokumenty sprzed wersjonowania wczytują się tak samo jak wyceny (jest test integracyjny).

- [x] **T-12 Brand kit — ustawienia + Storage** (04-PDF §3–4, 02-DATABASE storage) **+ F7.2**
  Formularz, upload logo do bucketa `brand`, signed URL, walidacja kolorów, kontrast.
  Z `F7.2`: `opening_hours jsonb` (max 4 wiersze), `signer_title`, `signer_name` — stopka „CZYNNE” i blok „wystawił”.
  ✅ Zapis i odczyt; logo widoczne po restarcie; stopka zgodna z arkuszami.
  ⚠️ Scalone świadomie: `F7.2` to trzy pola w tym samym formularzu i tej samej stopce PDF. Osobne zadanie znaczyłoby drugie przejście przez branding i drugą korektę layoutu stopki.
  > **Zrobione.** Migracja `0008_brand_signer_hours.sql`, `openingHours`/`signerName`/`signerTitle` w schemacie i repo, operacje Storage (`uploadLogo`/`removeLogo`/`getLogoUrl`) + hooki, pełny formularz `BrandSettingsPage` z `LogoField`. 512 testów jednostkowych, 52 integracyjne, 20/20 pgTAP.
  > **Na co uważać:**
  > - **Ścieżka logo ma znacznik czasu w nazwie.** Signed URL i podgląd cache'ują się po adresie, więc nadpisanie tej samej ścieżki pokazywałoby stare logo do czasu wyczyszczenia cache.
  > - **Kolejność przy podmianie logo: plik → ścieżka w brand kicie → kasowanie starego pliku.** Odwrotna zostawiałaby brand kit wskazujący na plik, którego nie ma. Nieudane kasowanie tylko logujemy — dla użytkownika liczy się, że logo zniknęło, a nie los obiektu w Storage.
  > - **Formularz trzyma własny szkic i zapisuje jawnie.** Brand kit czyta generator PDF i podgląd, więc zapis przy każdym klawiszu przerysowywałby dokument w trakcie pisania. Pasek zapisu pojawia się dopiero przy zmianach.
  > - **Puste pole tekstowe zapisuje się jako `null`, nie pusty string** — kolumny są nullable, a pusty string udawałby w PDF wypełnioną wartość.
  > - **Rozmiar i typ pliku sprawdzamy przed wysyłką**, mimo że bucket i tak by odrzucił: komunikat ze Storage jest po angielsku i mówi o MIME, a użytkownik ma usłyszeć, że plik jest za duży.
  > - Jasny wariant logo pokazujemy na ciemnym tle — na białym podglądzie byłby niewidoczny i wyglądałby jak nieudany upload.
  > - **Pułapka narzędziowa:** `supabase db reset` potrafi wywalić się na kroku Storage **po** zastosowaniu migracji. Jeśli w tym stanie odpalisz `db:types`, plik typów nadpisze się okrojoną wersją. Generuj do pliku tymczasowego i sprawdź, zanim podmienisz `types.generated.ts`.

- [x] **T-13 PDF** (04-PDF) **+ F1.5, F3.3**
  `QuotePdfDocument`, fonty, theme z brand kitu, worker, eksport przez Tauri `save_file` + `open_path`, live preview w ustawieniach brandingu, snapshot test renderu (pdf → png przez `pdf-to-img` w teście lub porównanie struktury).
  Z `F1.5`: bloki pomieszczeń z `x2`, wiersz „Pomieszczenia: …” (`showRoomsSummary`), opcjonalny rozkład ceny (`showPriceBreakdown`, domyślnie **off**).
  Z `F3.3`: sekcja rabatów z „−5% (etap funkcjonalny)”, niespełnione warunkowe pokazywane domyślnie (narzędzie sprzedażowe).
  ✅ PDF 10 stron < 3 s; polskie znaki; wyłączone pozycje wg ustawienia; numeracja stron; snapshot z sekcją pomieszczeń i rabatami.
  > **Zrobione.** `domain/brand/color.ts` (kontrast WCAG), `pdf/theme.ts`, `pdf/QuotePdfDocument.tsx` z blokami pomieszczeń i sekcją rabatów, `pdf/document-content.ts`, `pdf/file-name.ts`, `useExportPdf`, **fonty (użytkownik wrzucił komplet 2026-08-23)**, **podgląd na żywo w brandingu**, **render w Web Workerze z powrotem na główny wątek**, **pytanie „Oznaczyć jako wysłaną?"**. 665 testów jednostkowych.
  > **Na co uważać (fonty):**
  > - **Rejestracja jest PER KRÓJ, nie na komplet.** Pierwsza wersja ustawiała jeden wspólny znacznik: wystarczyło, że brakuje jednego z pięciu plików, i wszystkie kroje — łącznie z wgranymi — spadały na Helveticę. Z zewnątrz wyglądało to tak, jakby wrzucenie fontów nic nie dało. Teraz decyduje `isPdfFontRegistered(family)`.
  > - **Kroje z rozmiarami optycznymi bierzemy w wersji 18 pt** (Inter 4.x wydaje 18/24/28). To cięcie pod tekst ciągły; 24 i 28 pt są rysowane pod duże nagłówki i w akapicie są za wąskie. Nazwy plików muszą się zgadzać z `FONT_FILES`.
  > - **Osadzanie fontu testujemy inaczej niż jego obecność.** Produkcyjna rejestracja bierze adresy z `import.meta.glob(…, '?url')`, czyli `/src/pdf/fonts/…` — poprawne w przeglądarce, ale w Node `@react-pdf` otwiera to jako ścieżkę pliku i dostaje `ENOENT`. Dlatego `fonts/register.test.ts` pilnuje obecności plików i wag 400/700, a `polish-chars.test.tsx` rejestruje ze ścieżek dyskowych i sprawdza, że krój **naprawdę trafia do pliku** (z kontrolą negatywną na Helveticę).
  > **Na co uważać (worker i podgląd):**
  > - **Worker jest przyspieszeniem, nie warunkiem działania.** `@react-pdf` nie deklaruje wsparcia dla Web Workerów, więc `render.tsx` przy każdym błędzie (brak `window`, timeout, wywrotka przy ładowaniu modułu) wraca na główny wątek i zapamiętuje to na resztę sesji. Eksport oferty nie ma prawa polec dlatego, że optymalizacja nie wypaliła. **Sam render w workerze nie był sprawdzony w prawdziwej przeglądarce** — testy pokrywają ścieżkę decyzyjną i powrót, nie zachowanie `@react-pdf` poza głównym wątkiem.
  > - **Podgląd renderuje SZKIC, nie zapisany brand kit** — inaczej byłby bezużyteczny dokładnie wtedy, gdy jest potrzebny. Debounce 500 ms, licznik pokoleń przeciw wyścigom i zwalnianie poprzedniego `blob:`; bez tego ostatniego każda zmiana koloru zostawia kilkusetkilobajtowy plik w pamięci karty.
  > - **Wariant logo w podglądzie liczy ten sam helper co generator** (`isLightBackground`), a nie przepisana reguła. Dwie kopie tej decyzji rozjechałyby się przy pierwszej zmianie.
  > - **Pytamy o „wysłaną" tylko dla szkicu i raz na sesję edytora**, po UDANYM zapisie pliku. Zamknięty dialog zapisu to nie eksport. Cofanie wyceny zaakceptowanej do „wysłanej" niszczyłoby informację.
  > **Na co uważać:**
  > - **PDF to TRZECIE miejsce liczące kwotę pozycji** (po podsumowaniu i wierszu w edytorze) — czyta `calcItemCents`, nie liczy po swojemu. Dokładnie ta pułapka wyszła w T-35.
  > - **`renderToString` z `@react-pdf` zwraca binarny PDF, nie XML.** Testy szukające tekstu w tym wyniku są bezwartościowe: `not.toContain('cokolwiek')` zawsze przechodzi. Dlatego reguły treści siedzą w `document-content.ts` jako czyste funkcje, a render sprawdzamy nagłówkiem `%PDF-` i rozmiarem bufora.
  > - **Blok pomieszczenia odznaczonego w obu częściach nie trafia do oferty**, choć w edytorze zostaje widoczny — tam musi dać się z powrotem włączyć, tutaj byłby szumem.
  > - **Blok wskazujący na skasowane pomieszczenie dalej się drukuje** (z nazwą grupy): lepiej niepełny nagłówek niż ciche wycięcie pozycji z oferty, którą klient już widział.
  > - Kolor tekstu w nagłówku i wariant logo **wynikają z kontrastu**, nie z progu jasności — `contrastText` porównuje oba warianty, bo przy kolorach ze środka skali próg wskazuje gorszy.
  > - Logo trafia do pliku jako **data URL**, nie link: podpisany URL wygasa, a dokument ma być samodzielny.

- [x] **T-14 Stripe — Edge Functions + webhook** (03-BILLING)
  3 funkcje + `_shared`, idempotencja, mapowanie statusów, testy Deno z mockiem.
  ✅ `stripe trigger` aktualizuje `subscriptions` lokalnie.
  > **Zrobione i ZWERYFIKOWANE na żywym sandboxie Stripe** (`sk_test_`, konto PL). Produkt „Anzorge Pro" i ceny `pro_monthly` (19,99 PLN) / `pro_yearly` (199 PLN) założone przez API, `tax_behavior: inclusive`. Checkout przetestowany end-to-end: logowanie kontem z seeda → funkcja → **prawdziwy URL `checkout.stripe.com`**. Webhook przetestowany podpisem HMAC liczonym samodzielnie (bez Stripe CLI): zły podpis → 400, poprawny event → zapis statusu, powtórka → bez zmian, nieznany status → `incomplete`. Po testach baza przywrócona do stanu z seeda.
  > **Dwa realne błędy złapane dopiero przez uruchomienie — oba przeszłyby review:**
  > - **Zapis `stripe_customer_id` szedł klientem użytkownika**, a `subscriptions` ma politykę „członkowie czytają, nikt z klienta nie pisze" (0004). Update nie rzucał błędem — po prostu nie ruszał żadnego wiersza. Efekt: klient Stripe powstawał, my o nim nie wiedzieliśmy i przy kolejnym zakupie zakładaliśmy drugiego. **Zapis musi iść przez `service_role`.**
  > - **Webhook traktował KAŻDY błąd insertu do `stripe_events` jako „już przetworzony"** i zwracał 200. Brakowało kolumny `type` (NOT NULL), więc w praktyce **żaden webhook nigdy by nie zadziałał**, a Stripe — dostając 200 — nigdy by nie ponowił. Teraz rozróżniamy `23505` (prawdziwa powtórka) od reszty, która daje 500 i wymusza ponowienie.
  > **Na co uważać:**
  > - **Ceny szukamy po `lookup_key`, nie po ID w sekretach** — jeden sekret mniej do ustawienia przy wdrożeniu, a przypięcie ID przez `STRIPE_PRICE_MONTHLY`/`_YEARLY` dalej działa jako override.
  > - `constructEventAsync`, nie `constructEvent`: w Deno kryptografia jest asynchroniczna i wariant synchroniczny rzuca.
  > - Stripe SDK wymaga `Stripe.createFetchHttpClient()` — bez tego próbuje użyć node'owego `http` i nie startuje.
  > - **Mapowanie statusów jest zduplikowane** (`src/domain/billing/entitlement.ts` i `supabase/functions/_shared/subscription-status.ts`), bo Deno nie importuje z `src/`. Pilnuje ich `edge-parity.test.ts`, który czyta plik funkcji i porównuje mapowanie — bez uruchamiania Deno.
  > - Hot reload `supabase functions serve` **wywraca runtime przy edycji pliku** (błąd montowania w Dockerze). Po każdej zmianie restartuj serwer, zamiast diagnozować 502.
  > - **To NIE jest plan „Pro" i nie ma wersji darmowej.** Aplikacja jest płatna w całości, a `monthly`/`yearly` to wyłącznie **częstotliwość płatności**. Nazwa produktu w Stripe jest widoczna klientowi na stronie płatności, więc „Anzorge Pro" sugerowałoby istnienie darmowego tieru — poprawione w sandboxie i w kodzie (migracja `0009_plan_naming.sql` przenosi też stare wartości kolumny `plan`). Okres próbny to czas na sprawdzenie, a nie darmowy tier.
  > **Czego brakuje do produkcji:** `STRIPE_WEBHOOK_SECRET` z prawdziwego endpointu (lokalnie użyłem własnego), `supabase secrets set` na projekcie w chmurze i podpięcie URL webhooka w panelu Stripe.

- [x] **T-15 Gating + ekran subskrypcji** (03-BILLING §4)
  `domain/billing/entitlement.ts` (parytet z SQL — test), `useSubscription`, `PaywallGate`, banner read-only, pasek triala, deep link `anzorge://billing/*`, polling po powrocie.
  ✅ Symulacja: ustaw `trial_ends_at` w przeszłość → edytor read-only, RLS odrzuca update; kup → `active` → edycja wraca.
  > **Zrobione.** `useEntitlement` (stan uprawnienia dla UI), `useBillingActions` (Checkout/Portal w przeglądarce systemowej), `SubscriptionPage`, `ReadOnlyBanner` nad edytorem, `TrialBar` w panelu bocznym, deep link `anzorge://billing/success|cancel` w `RootLayout` z pollingiem. 22 nowe testy; 596 zielonych.
  > **Ważne — to nie jest „plan Pro".** Aplikacja jest płatna w całości, nie ma wersji darmowej ani pakietów. Ekran daje wybór **częstotliwości płatności** (miesięcznie/rocznie), nie tieru. Jest test, który pilnuje, żeby słowo „Pro" ani „darmowy" nie wróciło do tego ekranu — jeśli kiedyś naprawdę pojawią się pakiety, trzeba go świadomie usunąć.
  > **Na co uważać:**
  > - **Blokujemy tylko wtedy, gdy *wiemy*, że dostęp wygasł.** `useSubscription` jest wyłączone, dopóki nie znamy workspace'u, a wyłączone zapytanie **nie jest** `isLoading` — sprawdzanie `isLoading` dawało na starcie „brak subskrypcji" i na moment zamykało edytor każdemu, łącznie z płacącymi. Dlatego warunkiem jest `isSuccess`, a nie brak ładowania. Błąd sieci też znaczy „nie wiem" i nie odbiera prawa zapisu — prawdziwą granicą jest RLS.
  > - **Autozapis milczy, gdy dostęp wygasł** (`useAutosave`). Nie jest to dublowanie RLS: zablokowany UPDATE wraca z bazy **cicho, zerem zmienionych wierszy**, a nasz zapis porównuje `updated_at` — użytkownik zobaczyłby „wycena zmieniona w innym miejscu" zamiast prawdy o wygaśnięciu. Jest na to test regresji (sprawdzony sabotażem).
  > - `toRepoError` uznaje za RLS **wyłącznie `42501`**. Kusi, żeby dopisać `PGRST116` („brak wiersza"), ale ten kod dostajemy też, gdy rekord nie istnieje albo się zmienił — wysyłalibyśmy ludzi do płatności za cudzy błąd.
  > - Tryb edycji to `mode === 'edit' && canWrite`, liczone przy renderze — dostęp może wygasnąć przy otwartym edytorze i dokument zamyka się na pisanie od razu, bez przeładowania.
  > - Testy powłoki (`AppShell`, `Sidebar`) mockują `useEntitlement`, żeby `TrialBar` nie wciągał tam TanStack Query i Supabase.
  > **Nie zweryfikowane na żywo:** pełna ścieżka „wygasły trial → read-only" wymaga ręcznego cofnięcia `trial_ends_at` w bazie; pokryte testami, ale nieprzeklikane.

- [x] **T-16 Ustawienia workspace + konto** **+ UI z F1.2**
  Waluta, VAT, wzorzec numeracji, `showDisabledItems`, zmiana hasła, eksport danych (JSON), usuń konto (Edge fn `delete-account`).
  Z `F1.2`: `RoomTypesSection` — lista typów pomieszczeń z inline-edit, dodawaniem, usuwaniem i kolejnością.
  ✅ Zmiana wzorca numeracji wpływa na kolejną wycenę; typy pomieszczeń edytowalne.
  ⚠️ `workspaces.settings` to JSONB bez migracji — `hourlyRateCents`, `defaultPricingBasis`, `scheduleTemplate` i `defaultValidDays.*` dokładają się tu bez ruszania schematu, ale **każde czytane przez zod** (CLAUDE.md §2). Pola pod F2/F5/F6 dodawaj razem z ich zadaniami, nie na zapas.
  > **Zrobione.** `WorkspaceSettingsSection` (waluta, VAT, netto/brutto, wzorzec numeracji z podglądem na żywo, `showDisabledItems`), `RoomTypesSection` (F1.2 — inline-edit, dodawanie, usuwanie), `AccountSection` (zmiana hasła, eksport JSON, kasowanie konta), `export.repo.ts`, `useExportData`, Edge Function `delete-account`. 26 nowych testów; 622 zielone.
  > **Na co uważać:**
  > - **Eksport idzie po surowe wiersze, nie po zmapowane typy.** `listQuotes` zwraca same nagłówki (bez `body`) — zrzut zbudowany na nim byłby spisem tytułów zamiast kopią pracy. Jest na to test. Z tego samego powodu eksport obejmuje `clients`, których warstwa repozytoriów jeszcze nie ma.
  > - **Eksport i zmiana hasła działają bez aktywnego dostępu.** Reszta ustawień to zapis, więc jest zablokowana. Odcięcie eksportu za brak płatności byłoby trzymaniem cudzej pracy jako zakładnika.
  > - **`delete-account` ma ustaloną kolejność i nie wolno jej zmienić:** (1) anulowanie subskrypcji w Stripe, (2) pliki ze Storage, (3) użytkownik. Skasowanie konta bez (1) zostawiłoby aktywne obciążenie karty za usługę, do której nie ma dostępu. Kaskada `on delete cascade` sprząta tabele, ale **nie rusza bucketa** — stąd (2). Gdy (1) albo (2) padnie, przerywamy: lepiej zostawić konto do ponownej próby niż skasować dane i stracić możliwość odwołania płatności.
  > - Kasowanie konta ma **dwie bariery** (przepisanie słowa + dialog) i nie wylogowuje po nieudanej próbie — inaczej człowiek wylądowałby na logowaniu w przekonaniu, że konta już nie ma.
  > - Zmiana nazwy typu pomieszczenia **nie rusza `slug`a** (klucz cennika parametrycznego). Test tego pilnuje — gdyby slug szedł za nazwą, poprawka literówki wyzerowałaby ceny w zapisanych wycenach.
  > - W testach `userEvent.type` nie nadaje się do wzorca numeracji: `{` otwiera tam opis klawisza, a tokeny to właśnie klamry. Używamy `fireEvent.change`.
  > **Nie zweryfikowane na żywo:** `delete-account` nie było uruchamiane (skasowałoby konto testowe); wymaga `supabase functions deploy delete-account`.

- [ ] **T-17 Polish & release 1.0**
  Pusty stan onboardingu (3 kroki: logo → biblioteka → pierwsza wycena), obsługa błędów (ErrorBoundary, toasty), ikony aplikacji, `tauri build` Win+mac, podpisywanie (notarization macOS, cert Win — zanotuj w README co trzeba mieć), CHANGELOG.
  ✅ Instalator działa na czystej maszynie.

## Faza 1.5 — reszta pakietu z Excela (zaraz po 1.0)

> **Dlaczego to nie wchodzi do 1.0.** `F1` i `F3` są w Fazie 1, bo bez nich klient z tego arkusza **nie przeniesie swojego cennika** — to warunek wejścia. `F2`, `F4`, `F5` i `F6` są tym, co sprawi, że przestanie otwierać Excela, ale każde z nich to osobny moduł (harmonogram to własna domena, dat i świąt; pakiet dokumentów to trzy nowe generatory PDF). Wepchnięcie ich do 1.0 przesuwa premierę o miesiące przy zerowym zysku dla pierwszego wydania. Rekomenduję 1.1 wkrótce po 1.0 — jeśli uznasz inaczej, przenieś je do Fazy 1; zależności na to pozwalają.

- [x] **T-38 Silnik placeholderów w opisach** (F4.1)
  `domain/quote/template-text.ts`, `renderText`, `{rooms}`, `{frames|kadr|kadry|kadrów}` z polską liczbą mnogą (reguła 12–14), nieznany placeholder zostaje dosłownie.
  ✅ „kuchnia, salon x2.”; `1 kadr / 3 kadry / 5 kadrów / 22 kadry / 12 kadrów`.
  > **Zrobione.** `renderText`, `polishPlural`, `PLACEHOLDER_HINTS`; czysta domena, bez zależności. 29 testów.
  > **Na co uważać:**
  > - **Nieznany placeholder ZOSTAJE dosłownie** — tak samo nieznany wariant (`{rooms:kuchnia}`) i placeholder bez danych w kontekście (`{frames}` przy pozycji bez kadrów). Ciche zniknięcie znaczyłoby zdanie z dziurą, wysłane do klienta bez szansy, że ktoś to zauważy. Literówka ma być widoczna.
  > - **Wyjątek 12–14 w liczbie mnogiej jest istotny**, nie kosmetyczny: „22 kadry", ale „12 kadrów". To jedyne miejsce, gdzie sama końcówka prowadzi na manowce, a oferta to dokument handlowy.
  > - **`{rooms:visual}` i `{rooms:technical}` używają tego samego zakresu co cennik parametryczny** — zdanie wymienia dokładnie te pomieszczenia, za które klient płaci w danej pozycji. Rozjazd między tekstem a kwotą byłby gorszy niż brak tekstu.
  > - Wzorzec placeholdera dopuszcza tylko litery w nazwie, żeby nie zjadać zwykłych klamr w tekście (`{a+b}`, `{}`). Jest na to test.

- [x] **T-39 Auto-opisy w UI i PDF** (F4.2)
  Render w podglądzie i PDF, surowy tekst w edycji, przycisk `{}` z listą placeholderów, seed opisów z placeholderami.
  ✅ Zmiana pomieszczeń aktualizuje opis na żywo.
  > **Zrobione.** `domain/quote/text-context.ts` (wspólny kontekst), render w `ItemRow`, `QuoteHeader` i `QuotePdfDocument`, `PlaceholderMenu` (przycisk `{}`), opisy z placeholderami w seedzie. 707 testów.
  > **Na co uważać:**
  > - **Kontekst placeholderów budują TE SAME funkcje w edytorze i w PDF.** Gdyby każde miejsce składało go po swojemu, oferta mogłaby wymieniać inne pomieszczenia niż to, co widział autor — dokładnie ta klasa błędu, która wyszła przy kwotach pozycji w T-35. Jest na to test spójności.
  > - **`DocumentTextInfo` to rozbite kawałki, a nie całe `QuoteBody`** — i to jest wymaganie wydajnościowe. Wiersze są zmemoizowane, a `body` dostaje nową referencję przy każdym naciśnięciu klawisza; przekazanie go w dół przerysowywałoby wszystkie pozycje przy każdej literze. `rooms` i `client` zmieniają referencję tylko wtedy, gdy naprawdę się zmienią. Test wydajnościowy `SectionBlock.perf` tego pilnuje.
  > - **W edycji pole pokazuje surowy tekst, w podglądzie podstawiony** (`InlineText` dostał `display`). Bez tego nie dałoby się poprawić placeholdera, który się nie podstawił — użytkownik widziałby wynik i nie miał czego kliknąć.
  > - **`{frames}` trafia do kontekstu tylko przy pozycji liczonej za kadr.** Przy innych trybach ta liczba nic nie znaczy, a wstawienie jedynki byłoby zmyślaniem; dosłowny placeholder pokazuje pomyłkę autora tekstu.
  > - **Przycisk `{}` dokleja na KOŃCU, nie w miejscu kursora.** Pola trzymają własny szkic i zatwierdzają go przy utracie ogniskowania, a otwarcie menu właśnie ją zabiera — udawanie, że wiemy, gdzie stał kursor, wstawiałoby w losowe miejsce.
  > - Przycisku `{}` **nie ma przy wierszu wyceny**, tylko przy wstępie, opisie projektu i na karcie biblioteki. Opisy pozycji kaskadują z biblioteki, więc szablon zdania autoruje się tam raz; kolejny przycisk w każdym z kilkuset wierszy byłby szumem. To odstępstwo od litery `F4.2`.
  > **Nie sprawdzone na żywo:** seed z placeholderami wykonuje się bez błędów (`psql`, exit 0), ale ma `on conflict do nothing` — istniejąca baza deweloperska zachowa stare opisy do czasu `supabase db reset`.

- [x] **T-40 Tryb godzinowy — domena** (F2.1)
  `pricingBasis`, snapshot `hourlyRateCents` w `body`, `toCents()`, `minutesTotal`/`minutesBySection`.
  ✅ Wycena przełączona amount↔time przy stawce 60 zł/h daje zgodne liczby.
  > **Zrobione.** `pricingBasis` + `hourlyRateCents` w `QuoteBody`, `toCents`/`toMinutes`/`PricingContext`, rozdział `calcItemUnits` (jednostki) od `calcItemCents` (grosze), `calcWorkload`, `hourlyRateCents`/`defaultPricingBasis` w ustawieniach workspace, migracja `0011_library_pricing_basis.sql`. 723 testy jednostkowe, 24 integracyjne dla biblioteki.
  > **Rozstrzygnięcie pułapki nazw: wpis biblioteczny SAM MÓWI, czym są jego liczby** (`library_items.pricing_basis`). Dane opisują siebie, zamiast zależeć od tego, kto je czyta. Alternatywa (blokada kaskady między trybami) byłaby mniejszą zmianą, ale zostawiałaby bibliotekę, w której nie da się odróżnić 45 minut od 45 groszy — a to samo pytanie wróciłoby przy imporcie CSV, macierzy cennika i eksporcie danych.
  > **Na co uważać:**
  > - **`calcItemCents` wymaga trybu jako argumentu** — nie ma wartości domyślnej i to jest celowe. Domyślny „kwotowy" przepuszczałby po cichu wycenę godzinową liczoną jak kwotowa (45 minut → 45 groszy). To samo dotyczy `calcSectionTotals`/`calcGroupTotals`, gdzie tryb jest **osobnym argumentem**, a nie polem w częściowych opcjach: pominięte pole wpadłoby cicho w domyślne, osobny argument zmusza wołającego do odpowiedzi. Kompilator wskazał przy tej zmianie dokładnie te miejsca, które pokazują kwotę.
  > - **Zaokrąglamy PER POZYCJĘ, arkusz nie zaokrągla wcale.** Przy stawce niepodzielnej przez 60 rozejdziemy się z Excelem o grosze — jest na to jawny test z wyliczoną różnicą. Wybór jest po stronie użytkownika: kwoty wierszy muszą się dodawać do pokazanej sumy, bo klient sumuje kolumnę.
  > - **Rabaty są w złotówkach w OBU trybach.** Rabat to ustępstwo na cenie, nie na pracy — „rabat 500 zł" znaczy 500 zł także w wycenie godzinowej. Dlatego `calcDiscounts` liczy już na groszach, nie na jednostkach.
  > - **Brak stawki w trybie godzinowym daje 0, a nie wyjątek.** Wycena bez stawki jest niedokończona, ale ma się otwierać i dawać poprawić; rzucenie błędu z funkcji liczącej zamieniłoby brakujące pole w biały ekran.
  > - **`calcWorkload` liczy z surowych jednostek, nie z groszy przez `toMinutes`** — droga w tę i z powrotem przez stawkę gubi resztę przy zaokrągleniu, a minuty są tym, co użytkownik faktycznie wpisał.
  > - **`bodyVersion` NIE został podbity** — oba nowe pola mają wartości domyślne, więc stare dokumenty wczytują się bez kroku migracji (ta sama zasada co przy `Group.roomId` w T-51).
  > - Świadome odstępstwo od `FEATURES §F2.1`: minuty **nie siedzą w `calcQuoteTotals`**, tylko w osobnym `calcWorkload`. Inaczej każdy odbiorca podsumowania musiałby obsługiwać pola, które w trybie kwotowym zawsze są puste.
  > **Nie zrobione tutaj (świadomie, wchodzi z T-41):** picker biblioteki nie sprawdza jeszcze, czy jednostka wpisu zgadza się z trybem wyceny. Dziś jest to nieosiągalne — trybu godzinowego nie da się włączyć bez UI — ale **przy T-41 to jest pierwsza rzecz do zrobienia**, zanim przełącznik trafi do interfejsu.

- [x] **T-41 Tryb godzinowy — UI** (F2.2)
  Segment „Kwotowa | Godzinowa” w `QuoteHeader`, pole stawki, etykiety „min”, `45 min → 150 zł` w wierszu, „Pracochłonność” w `TotalsCard`, dialog przy zmianie trybu.
  ✅ Przełączenie nie psuje autozapisu ani kaskady.
  > **Zrobione.** `convert-units.ts` (przeliczanie jednostek), zabezpieczenie pickera biblioteki, `PricingBasisCard`, `setPricingBasis` w store, `usePricingBasisChange` + dialog, minuty w `ItemRow` (`45 min → 90 zł`), pracochłonność w `TotalsCard`, `domain/time.ts`, stawka i domyślny tryb w ustawieniach, `quoteBodyFromSettings`. 762 testy.
  > **Domknięcie długu z T-40:** picker biblioteki **przelicza albo odmawia**. Wpis godzinowy wstawiany do wyceny kwotowej idzie przez `convertItemUnits` po stawce dokumentu; bez stawki nie ma kursu wymiany, więc odmawiamy z komunikatem. Wstawienie liczby „jak leci" wpisałoby 45 groszy tam, gdzie ktoś policzył 45 minut pracy.
  > **Na co uważać:**
  > - **`convertUnits` zwraca `null`, a nie zero ani wartość niezmienioną.** Obie „wygodne" odpowiedzi byłyby kłamstwem: zero wpisuje do oferty darmową pracę, wartość niezmieniona myli grosze z minutami. `null` zmusza wołającego, żeby coś z tym zrobił. Konwersja pozycji jest **atomowa** — przeliczenie samej ceny jednostkowej przy nietkniętej regule dałoby pozycję, w której dwie liczby znaczą co innego.
  > - **Dialog pyta tylko wtedy, gdy jest o co pytać.** Pusta wycena przełącza się od razu. Obie odpowiedzi są sensowne: „Przelicz" (mam gotową wycenę i chcę ją zobaczyć od strony czasu) i „Zostaw liczby" (liczby od początku były minutami, tylko dokument miał zły tryb). Cicha konwersja w którąkolwiek stronę zepsułaby połowę przypadków.
  > - **Przeliczenie rusza WYŁĄCZNIE liczby cenowe.** `qty`, `frames`, `enabled` i pomieszczenie opisują zakres pracy, a nie jej wartość.
  > - **Karta trybu stoi w prawej kolumnie, nie na papierze** — odstępstwo od `FEATURES §F2.2`, gdzie przełącznik miał trafić do nagłówka dokumentu. Stawka godzinowa to liczba wewnętrzna; na arkuszu idącym do klienta „150 zł/h" mówi mu, ile zarabiasz na godzinę, a to informacja do ujawniania świadomie, nie przez układ formularza.
  > - **W trybie godzinowym wiersz edytuje MINUTY, kwota jest wynikiem.** Pole ze złotówkami sugerowałoby, że da się ją wpisać wprost — a wpisana kwota i tak wróciłaby zaokrąglona po przeliczeniu na minuty.
  > - **Brak stawki mówi o sobie wprost** („bez stawki wszystkie kwoty wychodzą zerowe”). Bez tego komunikatu wycena wygląda na zepsutą.
  > **Przy okazji naprawione:** nowa wycena brała VAT, tryb cen i `showDisabledItems` z wartości zaszytych w `newQuoteBody`, więc **ustawienie VAT 8% w ustawieniach i tak dawało w dokumencie 23%**. Teraz idzie przez `quoteBodyFromSettings` — i to jest **kopia, nie odwołanie**: późniejsza zmiana stawki czy VAT-u nie rusza ofert, które już poszły. Jest na to test.

- [x] **T-42 Szacowanie pracochłonności** (F2.3)
  Popover z minutami per sekcja, tag `communication`, `Item.tags`.
  ✅ Suma minut zgodna z `OFERTA - DANE` U/R48 dla seedu.
  > **Zrobione.** `Item.tags`, `TAG_COMMUNICATION`, `calcWorkload` w wariancie odwrotnym (`kwota / stawka × 60`), `WorkloadPopover` pod zegarem w `TotalsCard`, przełącznik etykiety w wierszu. 778 testów.
  > **Na co uważać:**
  > - **`available` odróżnia „zero minut" od „nie wiem".** W trybie kwotowym szacunek wymaga stawki, której dokument nie ma — bierzemy ją z ustawień workspace'u. Bez niej popover mówi, czego brakuje, zamiast pokazywać zera, które wyglądałyby jak wynik.
  > - **Wycena godzinowa IGNORUJE stawkę z ustawień** — minuty są w niej wprost, a podstawienie cudzej stawki przeliczyłoby je drugi raz. Jest na to test.
  > - **Komunikacja jest WLICZONA w sumę, nie doliczona obok**, i popover mówi to wprost. Inaczej suma nie zgadzałaby się z rozbiciem na sekcje i wyglądała na policzoną dwa razy.
  > - **Szacunek pod zegarem, a nie w wierszu podsumowania.** W trybie kwotowym to liczba wyliczona wstecz z ceny, a nie czas, który ktoś wpisał; postawiona obok sum wyglądałaby na równie pewną co one. Popover mówi wprost, że to szacunek — zanim ktoś zaplanuje po nim tydzień pracy.
  > - **`Item.tags` to luźna lista stringów, nie enum.** To notatki o charakterze pracy (`communication`, `meeting`), a nie wymiar, po którym cokolwiek się liczy. Zamknięty zbiór wymuszałby migrację przy każdej nowej etykiecie, a nieznana etykieta nie ma prawa zepsuć dokumentu (jest na to test).
  > - `bodyVersion` **nie podbity** — `tags` ma wartość domyślną, więc stare dokumenty wczytują się bez kroku migracji.
  > - W wierszu jest **przełącznik**, a nie lista tagów: `communication` to jedyna etykieta, która dziś cokolwiek liczy, a rozwijana lista sugerowałaby wybór tam, gdzie są dwie odpowiedzi.
  > **Czego NIE dało się sprawdzić:** kryterium mówi o parytecie z `OFERTA - DANE` U/R48, ale **arkusza nie ma w repozytorium**, a `FEATURES` podaje tylko wzór, bez wartości oczekiwanych. Zweryfikowany jest **wzór** (`kwota / stawka × 60`) i sposób sumowania komunikacji; zgodność liczbowa z konkretnym arkuszem pozostaje niesprawdzona.
  > **Nie zrobione (faza 2, zgodnie z `FEATURES`):** kafel „Średnia pracochłonność zaakceptowanych wycen" na pulpicie — oznaczony tam jako `(f2)`.

- [x] **T-43 Harmonogram — domena** (F5.1)
  `domain/schedule/`, `calcSchedule`, `domain/dates/workdays.ts` (polskie święta: stałe + Wielkanoc algorytmem Meeusa + Boże Ciało), szablon 11 etapów.
  ✅ Święta 2026/2027, przejście przez rok, 6-dniowy tydzień inwestora.
  ⚠️ `date-fns` to nowa zależność — uzasadnij w PR. Sama arytmetyka dni roboczych jest trywialna; `date-fns` bierzemy dla formatowania i bezpiecznych operacji na strefach, nie dla `addWorkdays`.
  > **Zrobione.** `domain/dates/workdays.ts` (polskie święta z Wielkanocą wg Meeusa, `addWorkdays`), `domain/schedule/` (schemat, `calcSchedule`, szablon 11 etapów), `scheduleTemplate` w ustawieniach workspace'u, migracja `0012_quote_schedule.sql` + obsługa w repozytorium. 820 testów jednostkowych, 16 integracyjnych dla wycen.
  > **Odstępstwo od `FEATURES`: NIE dodałem `date-fns`.** Potrzebna tu arytmetyka to „dodaj dzień" i „jaki to dzień tygodnia"; biblioteka byłaby wielokrotnie większa od tego, co z niej weźmiemy, a lista świąt i tak wymaga własnego kodu (Wielkanoc jest ruchoma). CLAUDE.md §„Czego NIE robić" mówi wprost o nieuzasadnionych bibliotekach.
  > **Na co uważać:**
  > - **Wszystko liczymy na UTC**, mimo że to daty bez godziny. Arytmetyka na czasie lokalnym gubi albo dokłada dzień przy zmianie czasu — a przesunięcie terminu oddania projektu o dobę dwa razy w roku to błąd, którego nikt nie powiąże z DST. Jest na to test.
  > - **`addWorkdays` liczy święta z ROKU KAŻDEGO mijanego dnia**, nie tylko z roku startu. Przełom roku ma cztery dni wolne w krótkim odstępie (25–26 XII, 1 i 6 I), a to typowy moment startu projektu — liczenie tylko z roku startu dałoby termin o kilka dni za wcześnie. Test przechodzi przez tę granicę.
  > - **Dwa terminy, nie jeden.** Optymalny liczy same dni wykonawcy, najpóźniejszy dokłada dni inwestora. Każda strona chodzi po **swoim** tygodniu roboczym (`D7`/`D8` z arkusza), bo inwestor bywa dostępny w soboty. Podanie jednej daty byłoby obietnicą, której nikt nie kontroluje w całości.
  > - **Bez daty startu nie zgadujemy terminów** (`null`), ale dni i zgrubny przelicznik `dni / 5 × 7` z arkusza (`O39`) zostają dostępne. To dwie różne liczby i obie są potrzebne: przelicznik przy planowaniu „ile to potrwa", `realCalendarDays` gdy termin jest już konkretny i mają się zgadzać święta.
  > - **`quotes.schedule` jest nullable i to znaczące:** `null` = „ta wycena nie ma harmonogramu", pusty obiekt = „ma, ale bez etapów".
  > - **`saveQuote` pomija `schedule`, gdy go nie podano.** Zakładki „Wycena" i „Termin" zapisują ten sam wiersz — gdyby zapis dokumentu wysyłał `null`, każda edycja pozycji kasowałaby ustawiony termin. Jest na to test integracyjny.
  > - Model etapu jest **bliźniaczo podobny do cennika parametrycznego** (baza + składnik per pomieszczenie, ten sam `roomScope`) i to celowe — termin i cena mają obejmować dokładnie te same pomieszczenia.
  > - Szablon etapów daje **świeże `id` przy każdym wywołaniu**: etap należy do konkretnej wyceny, wspólne `id` znaczyłoby, że edycja jednego harmonogramu rusza drugi.
  > **Czego NIE dało się sprawdzić:** kryterium mówi o parytecie z `TERMIN - DOKUMENT` (O37/Q37, O39, O47/O49), ale **arkusza nie ma w repozytorium** — tak samo jak przy T-42. Zweryfikowane są wzory i zachowanie na własnych przypadkach (święta 2026/2027, przełom roku, sześciodniowy tydzień inwestora); zgodność liczbowa z tamtym plikiem pozostaje niesprawdzona.

- [ ] **T-44 Harmonogram — zakładka w edytorze** (F5.2)
  Zakładki **Wycena | Termin | Dokumenty**, tabela etapów, karta wyniku, Gantt na czystym CSS, auto-sync etapów po tagach pozycji.
  ✅ Zmiana pomieszczeń w zakładce Wycena zmienia wynik w zakładce Termin.
  ⚠️ Zakładki zmieniają szkielet `QuoteEditorPage`, który dziś jest jednym widokiem z własnym paskiem (`handle.hideTopbar`). Zaplanuj, co się dzieje z autozapisem i `LibrarySheet` przy przełączaniu zakładek — store jest jeden na całą wycenę.

- [ ] **T-45 PDF „Szacowany termin”** (F5.3)
  `SchedulePdfDocument`, tabela pomieszczenia × etapy, blok „Ramy czasowe”, osobna ważność.
  ✅ A4 mieści 18 pomieszczeń bez łamania wiersza w środku.

- [ ] **T-46 Dokument „Etapy współpracy”** (F6.1)
  Migracja `workspace_doc_templates`, seed 19 etapów, zakładka Dokumenty, `StagesPdfDocument`.
  ✅ Parytet z arkuszem `ETAPY WSPÓŁPRACY`.
  ⚠️ To **nie to samo** co T-11: tam szablon całej wyceny (tabela `templates`), tu szablon dokumentu towarzyszącego. Nazwy w UI muszą je rozróżniać, inaczej użytkownik utonie w dwóch „szablonach”.

- [ ] **T-47 Dokument „Cennik usług dodatkowych”** (F6.2)
  Przedziały cen, jednostka `zł/h`, termin realizacji, `formatMoneyRange`, `PriceListPdfDocument`, przycisk „Dodaj do wyceny jako pozycję”.
  ✅ Parytet z arkuszem `CENNIK USŁUG DODATKOWYCH`.

- [ ] **T-48 Eksport pakietu dokumentów** (F6.3)
  Dialog wyboru dokumentów, scalanie do jednego PDF albo osobne pliki, nazwy `{number}-wycena.pdf`, ważność per dokument.
  ✅ Pakiet 4 dokumentów < 5 s, ciągła numeracja stron w trybie „jeden plik”.
  ⚠️ `pdf-lib` — nowa zależność, uzasadnij w PR.

- [ ] **T-49 Rejestr ofert — pola z arkusza `OFERTY`** (F7.1)
  `quotes.city`, `internal_notes`, `doc_kind`; kolumna „Miasto”, filtr, szybkie notatki; eksport CSV w układzie arkusza.
  ✅ Eksport otwiera się w Excelu bez przekodowania (UTF-8 BOM, separator `;`).
  ⚠️ Pokrywa się z **T-23** (import/eksport CSV) i **T-18** (klienci — `city` naturalnie należy do klienta, nie do wyceny). Zrób te trzy razem albo świadomie zduplikuj `city`.

## Faza 2

- [ ] T-18 Klienci (CRM-lite) + przypięcie do wyceny
- [ ] T-19 Auto-update (tauri-plugin-updater, endpoint w Supabase Storage / GitHub Releases)
- [ ] T-20 Wysyłka e-mail z PDF (Resend) + szablon wiadomości
- [ ] T-21 Tryb ciemny + paleta komend ⌘K + skróty
- [ ] T-22 Wersjonowanie wyceny — historia wersji dokumentu dla użytkownika (nie mylić z **T-30**, które wersjonuje *schemat* `body` na potrzeby migracji)
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
