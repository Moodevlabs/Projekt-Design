# 06 — Zadania (wykonuj po kolei, jedno na raz)

Format: `- [ ] T-xx Nazwa` — czytaj: wymagane dokumenty → kryteria akceptacji. Po ukończeniu: `[x]` + notatka.

**Numer to tożsamość zadania, nie kolejność.** Kolejność wykonania = pozycja na liście. Po wchłonięciu `FEATURES-Z-EXCELA.md` (2026-08-22) zadania T-30+ zostały wplecione **pomiędzy** T-11…T-17, bo część z nich musi wyprzedzić PDF i brand kit — inaczej pisalibyśmy je dwa razy. Stare numery zostawiono nietknięte, żeby notatki i commity dalej się zgadzały.

**2026-08-24 — koncepcja Toolier.** Zadania **T-53…T-66** (`FEATURES-Z-KONCEPCJI.md`) stoją **przed T-17**: oś klient → projekt → pliki, wersje wycen, restrukturyzacja biblioteki, rebranding i nowa cena wchodzą do 1.0. **Cała oś T-53…T-66 zrobiona (2026-08-25), T-70, T-71 i T-72 (tworzenie wyceny i biblioteka — ergonomia z inspiracji) też. Otwarte zostaje T-17 (Polish & release 1.0 — instalator, macOS, certyfikaty).**

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

### Oś workspace'u: klienci → projekty → pliki (koncepcja Toolier, 2026-08-24) — przed release 1.0

> **Dlaczego przed T-17.** Właściciel zdecydował (D10 w `FEATURES-Z-KONCEPCJI.md §0`), że 1.0 wychodzi jako workspace studia, a nie generator wycen: po zalogowaniu widać klientów, wycena żyje w projekcie, pliki i wygenerowane PDF-y są w archiwum klienta. Bez tego 1.0 byłoby innym produktem niż ten, który sprzedajemy za 98,99 zł/mies. Zadania oznaczone `(K…/P…/W…/B…/S…/U…/R…)` mają pełną specyfikację w **`docs/FEATURES-Z-KONCEPCJI.md`** — tu jest kolejność, zależności i kolizje. **Zanim ruszysz, przeczytaj §9 tamtego pliku.** Faza 1.5 (T-38…T-49) jest już zrobiona, więc kolejność wykonania jest taka jak niżej.

- [x] **T-53 Klienci — repo, lista, karta, przypięcie wyceny** (FEATURES-Z-KONCEPCJI §2 K1, 02-DATABASE §3a, 05-UI §3)
  Migracja kolumn `clients` (`address`, `city`, `status`, `archived_at`), `domain/client/`, `clients.repo` + `useClients`, `/klienci` (szukaj/sort/filtr w Postgresie), `/klienci/:id` z zakładkami **Projekty | Wyceny | Notatki** (Dokumenty/Pliki dopiero z T-55/56 — nie renderuj), combobox klienta w prawej kolumnie edytora z „+ Nowy klient" i „Odśwież dane klienta", `quotes.client_id` zapisywane w `saveQuote`, kolumna „Klient" w rejestrze jako link + filtr. Sumy na karcie (projekty, wartość zaakceptowanych) liczone w bazie.
  ✅ Nowa wycena z karty klienta ma wypełnione dane inwestora; edycja telefonu klienta nie zmienia wysłanej wyceny (snapshot); szukanie po fragmencie e-maila działa po stronie bazy; eksport danych (T-16) zawiera nowe kolumny.
  ⚠️ Wchłania **T-18**. Konflikt `quotes.city` ↔ `clients.city` (zapowiedziany w T-49): klient jest źródłem, wycena trzyma kopię w `body.client` — nie dokładaj drugiego miejsca zapisu. Zakładka „Projekty" na razie pusta z CTA prowadzącym do T-54 — **albo** ukryta do T-54; wybierz i zanotuj.

  > **Zrobione.** Migracja `0015_clients_workspace.sql` (kolumny `address`/`city`/`status`/`archived_at`, backfill miasta z wycen, indeksy, widok `clients_overview`), `domain/client/schema.ts`, `clients.repo` + `useClients`, `/klienci` i `/klienci/:id`, `ClientCard` w prawej kolumnie edytora, `quotes.client_id` w `saveQuote`/`createQuote`, kolumna „Klient" w rejestrze jako link + filtr po kliencie. 41 nowych testów; 1053 zielone.
  > **Decyzja:** zakładka **Projekty jest UKRYTA** do T-54, nie pusta z CTA. Karta klienta ma dziś **Wyceny | Notatki**. Powód: 05-UI §3a.8 (zasada z T-44) mówi wprost, że zakładka bez funkcji się nie renderuje — „wkrótce" w interfejsie to obietnica, której nie da się kliknąć. Test `ClientPage.test.tsx` pilnuje listy zakładek, więc T-54 doda „Projekty" świadomie, a nie przypadkiem.
  > **Na co uważać:**
  > - **Sumy liczy widok `clients_overview` z `security_invoker = true`.** Bez tego flagi widok czytałby dane właściciela i omijał RLS — dziura w izolacji workspace’ów. Widok **nie ma** kolumny `projects_count`: stałe zero wyglądałoby jak dana. T-54 przebuduje widok (`drop` + `create`, nie `create or replace` — zmienia się zestaw kolumn).
  > - **`saveQuote` rozróżnia `clientId: undefined` („nie ruszaj") od `null` („odepnij")** — dokładnie jak `schedule`. Gdyby nie to, każdy zapis ze ścieżki, która o kliencie nie wie, zerowałby `client_id`. Jest na to test integracyjny.
  > - **Autozapis śledzi `clientId` osobno od `body`.** Przypięcie klienta o danych identycznych z nagłówkiem nie zmienia dokumentu, więc subskrypcja patrząca tylko na `body`/`number` przespałaby tę zmianę.
  > - **Snapshot `body.client` nie odświeża się sam.** `useUpdateClient` świadomie **nie** unieważnia cache wycen. „Odśwież dane klienta" pokazuje się tylko wtedy, gdy jest różnica (`clientSnapshotDiffers`) — przycisk, który zawsze wygląda tak samo, nie mówi nic o stanie dokumentu.
  > - **Fraza wyszukiwania jest escape’owana** przed wejściem do `or(...)` PostgREST-a: `,` i `)` rozdzielają tam warunki, więc „Kowalski, Jan" rozsypałoby zapytanie. Test integracyjny tego pilnuje.
  > - `createQuote` zapisuje teraz także `city` — bez tego wycena z karty klienta wpadała do rejestru bez miasta aż do pierwszego autozapisu.
  > - Filtr klienta w rejestrze ciągnie **także zarchiwizowanych**: wyceny sprzed zamknięcia współpracy dalej są na liście i trzeba je umieć odsiać.
  > - Eksport danych (T-16) obejmuje nowe kolumny **sam** — idzie po `select('*')` po surowych wierszach.
  > - **PostgREST nie uznaje backslasha za znak ucieczki w `or(...)`.** Fraza z przecinkiem („Kowalski, Jan") wracała błędem `failed to parse logic tree`. Wartość musi iść **w cudzysłowie** (`name.ilike."%…%"`), a uciekamy tylko przed `"` i `\`. Złapane testem integracyjnym, nie recenzją kodu — ten sam wzorzec siedzi w `listQuotes` i jest do poprawki (zapisane w `docs/IDEAS.md`).
  > **Zweryfikowane na żywo:** `supabase db reset` na lokalnym stacku (Docker) przepuścił migrację `0015`; `pnpm db:types` odtworzył `types.generated.ts` z bazy (zgodny z ręcznym dopisem, plus relacja FK do widoku); `pnpm test:db` — 76 zielonych, w tym 10 nowych dla kartoteki.
  > **Chmura nie została ruszona** (`supabase status` → `linked_project: null`). Przed wdrożeniem trzeba osobno zrobić `supabase db push` na projekt produkcyjny — inaczej aplikacja w chmurze nie zobaczy kolumn ani widoku `clients_overview`.

- [x] **T-54 Projekty** (FEATURES-Z-KONCEPCJI §2 K2)
  Migracja `projects` + `quotes.project_id`, `projects.repo` + `useProjects`, `/klienci/:id/projekty/:pid` z zakładkami **Wyceny | Notatki** (Dokumenty/Pliki z T-55/56), formularz projektu (adres domyślnie z klienta), tworzenie wyceny z projektu (`project_id`, `client_id`, snapshot klienta, „Skopiować pomieszczenia z ostatniej wyceny?"), „Przenieś do projektu" w menu ⋯, propozycja `in_progress` po akceptacji (toast z akcją, nie automat), seed: 2 klientów / 3 projekty.
  ✅ Klient z dwoma projektami widzi dwie osobne listy wycen; przeniesienie wyceny zmienia tylko `project_id`; wycena bez projektu dalej działa.
  ⚠️ Pomieszczenia **nie** przenoszą się do projektu (§9.2) — kopia do nowej wyceny, nie relacja.

  > **Zrobione.** Migracja `0016_projects.sql` (tabela `projects`, RLS + jawne granty, `quotes.project_id`, przebudowa `clients_overview` o `projects_count`, nowy widok `projects_overview`), `domain/project/schema.ts`, `projects.repo` + `useProjects`, `/klienci/:id/projekty/:projectId` z zakładkami **Wyceny | Notatki**, `ProjectFormDialog` (adres z klienta), zakładka **Projekty** na karcie klienta, „Przenieś do projektu" i zmiana statusu w menu ⋯ wyceny, `CopyRoomsDialog`, propozycja `in_progress` po akceptacji, wybór projektu w karcie „Klient" w edytorze, seed 3 teczek u 2 klientów. 29 nowych testów jednostkowych i 12 integracyjnych; 1082 + 88 zielone.
  > **Na co uważać:**
  > - **Nie było skąd zaakceptować wyceny.** Statusy poza `draft`/`sent` nie miały żadnej ścieżki w UI (`setQuoteStatus` wołał tylko `useMarkAsSentPrompt` po eksporcie PDF), więc propozycja `in_progress` byłaby martwym kodem. Menu wiersza dostało sekcję **„Oznacz jako"** (wysłana / zaakceptowana / odrzucona) — minimalne rozszerzenie, bez którego kryterium odbioru nie dałoby się sprawdzić.
  > - **`setClient` zeruje `projectId`.** Projekt należy do konkretnego klienta; zostawienie starej teczki po zmianie inwestora dawałoby ofertę w cudzym projekcie. Jest na to test.
  > - **`moveQuoteToProject` ma `attachClientId` i to nie jest furtka.** Wycena, która ma klienta, widzi w dialogu **tylko jego** projekty i przeniesienie zmienia wyłącznie `project_id` (kryterium odbioru, test integracyjny porównuje `body` i totale). Pole służy jedynie wciągnięciu „szybkiej wyceny" bez klienta — dialog mówi o tym wprost.
  > - **`area_m2` to `numeric`, więc PostgREST zwraca STRING.** Bez `Number()` w mapperze sortowanie i porównania metrażu robiłyby się leksykalnie („9" > „164"). Pusty metraż to `null`, nie zero — 0 m² byłoby twierdzeniem o inwestycji.
  > - **Pomieszczenia są kopiowane z NOWYMI `id`.** Te same identyfikatory w dwóch dokumentach kolidowałyby z regułami cenowymi per pomieszczenie. Pytamy o kopię tylko wtedy, gdy poprzednia wycena w teczce faktycznie ma pomieszczenia; `body` poprzedniej wyceny ściągamy dopiero w tym momencie, nie przy otwarciu zakładki.
  > - **`CopyRoomsDialog` ma trzy wyjścia, nie dwa.** „Zacznij pusto" zakłada wycenę bez pomieszczeń, a krzyżyk anuluje zakładanie w ogóle — `ConfirmDialog` skleiłby te dwie różne decyzje w jedną.
  > - **`clients_overview` przebudowany przez `drop` + `create`.** `create or replace view` nie przyjmuje zmiany zestawu kolumn — T-55/T-56 muszą pamiętać o tym samym.
  > - **Notatki klienta i projektu dzielą `NotesPanel`** (`components/shared`) z **jawnym** zapisem. Autozapis w notatce zostawiałby w kartotece urwane pół zdania.
  > **Zweryfikowane na żywo:** `supabase db reset` przepuścił migrację `0016` i nowy seed; `pnpm db:types` odtworzył typy; `pnpm test:db` — 88 zielonych.

- [x] **T-55 Pliki — bucket, tabela, limity, RLS, upload/lista/pobierz** (FEATURES-Z-KONCEPCJI §3 P1, 02-DATABASE §3a, 01-ARCHITECTURE §3)
  Migracja: bucket `files` (25 MiB), tabela `files`, granty, RLS, `workspaces.storage_quota_bytes/used_bytes` + triggery kwoty (`STORAGE_QUOTA_EXCEEDED`), `domain/files/`, `files.repo` (obiekt → wiersz; nieudany wiersz kasuje obiekt), `useFiles`, zakładka **Pliki** u klienta i projektu (drag&drop + dialog, lista, rename, pobierz przez signed URL → `save_file`, usuń = soft delete + kasowanie obiektu, podgląd obrazów), pasek limitu w Ustawieniach → Pliki, blokada rozszerzeń wykonywalnych **przed** wysyłką. `delete-account` i `export.repo` obejmują bucket `files`.
  ✅ Przeciągnięcie 3 plików → widoczne u klienta i w projekcie; 30 MB odbite po polsku przed wysyłką; przy 2 GB insert odbity przez bazę z komunikatem „zajęte X z 2 GB"; test integracyjny: RLS odmawia cudzemu workspace'owi, soft delete zwalnia miejsce.
  ⚠️ Dwie ścieżki wejścia (Tauri: ścieżki z `dialog.open`/`onDragDropEvent`; przeglądarka: `File`) za jednym adapterem w `lib/tauri.ts` — sprawdź `capabilities/default.json` (§9.12). Bez kosza w 1.0 — usunięcie jest natychmiastowe i tak ma być napisane w dialogu.

  > **Zrobione.** Migracja `0017_files.sql` (bucket `files` 25 MiB, tabela `files` z RLS i jawnymi grantami, `workspaces.storage_quota_bytes/used_bytes`, triggery `files_enforce_quota` i `files_track_usage`, polityki `storage.objects`), `domain/files/schema.ts`, `files.repo`, `useFiles`, zakładka **Pliki** u klienta i w projekcie (drag&drop, dialog, lista, zmiana nazwy, pobieranie, podgląd obrazów, usuwanie), pasek limitu w Ustawieniach, komenda Rusta `read_file`. `delete-account` i `export.repo` obejmują bucket i tabelę. 30 nowych testów jednostkowych i 8 integracyjnych; 1112 + 96 zielone.
  > **Na co uważać:**
  > - **`PostgrestError` NIE jest instancją `Error`.** Rozpoznawanie limitu przez `error instanceof Error ? error.message : String(error)` dawało „[object Object]" i przepełniony limit szedł do użytkownika jako surowy `STORAGE_QUOTA_EXCEEDED` z bazy. Czytamy pole `message` wprost. Złapane testem integracyjnym.
  > - **Kolejność zapisu i usuwania jest ODWROTNA i to jest celowe.** Upload: obiekt → wiersz (nieudany wiersz kasuje obiekt, żeby limitu nie zjadały bajty bez wpisu). Usuwanie: wiersz → obiekt (gdyby najpierw poleciał obiekt, a `update` padł, lista pokazywałaby plik nie do pobrania).
  > - **`dragDropEnabled` jest domyślnie włączone, więc webview w Tauri NIE dostaje zdarzeń HTML5 drop dla plików** — przechwytuje je warstwa natywna i oddaje ścieżki przez `onDragDropEvent`. W przeglądarce jest odwrotnie: są obiekty `File`, nie ma ścieżek. Stąd dwie drogi w `useFileUpload`; w `capabilities/default.json` nic nie trzeba było dokładać (`dialog:allow-open` było z T-48, bajty czyta komenda Rusta zamiast `fs:allow-read-file`).
  > - **Wysyłka idzie po kolei, nie równolegle.** Limit sprawdza trigger przy każdym wierszu; przy równoległych uploadach dwa pliki policzyłyby ten sam stan. Seria przerywa się po pierwszym błędzie — najczęstszy powód to wyczerpane miejsce, a wtedy kolejne pliki odbiją się identycznie.
  > - **Nazwa w ścieżce obiektu jest losowa (`{uuid}.{ext}`), nie od użytkownika.** Dwa „rzut.pdf" w jednej teczce nie mogą się nadpisać, a zmiana nazwy to jeden UPDATE kolumny `name` — bez kopiowania bajtów.
  > - **Blokujemy po rozszerzeniu, nie po MIME** (`allowed_mime_types` bucketa celowo `NULL`): typ podaje sam plik, więc `.exe` przebrany za `image/png` przeszedłby filtr po MIME.
  > - **`jsdom` nie ma `Blob.arrayBuffer()`** — dopisane do `vitest.setup.ts` obok `ResizeObserver`. Bez tego każdy test uploadu wywala się na „file.arrayBuffer is not a function", chociaż w przeglądarce i webview metoda istnieje.
  > - Eksport danych (T-16) niesie **metadane plików, nie bajty** — zrzut ma ważyć tyle co dokumenty, a nie tyle co archiwum. Przy okazji objął `projects`, których wcześniej w nim nie było.
  > **Zweryfikowane na żywo:** `supabase db reset` przepuścił `0017`; `pnpm test:db` — 96 zielonych, w tym odbicie limitu przez trigger, RLS odmawiający po wylogowaniu i zwalnianie miejsca po usunięciu. `cargo check` po stronie Rusta przechodzi.
  > **Nie zweryfikowane na żywo:** drag&drop **w zbudowanej aplikacji Tauri** (ścieżka `onDragDropEvent` → `read_file`) — testy chodzą w jsdom, czyli ścieżką przeglądarki. Do przeklikania przy `pnpm tauri dev`.

- [x] **T-56 Archiwum dokumentów — PDF do Storage przy eksporcie** (FEATURES-Z-KONCEPCJI §3 P2)
  Checkbox „Zapisz w dokumentach klienta" (domyślnie on, ukryty bez `client_id`) w każdym eksporcie (T-13/45/46/47/48) przez **jedno** wejście w `pdf/export.ts`; `archiveGeneratedPdf` w `files.repo` (`kind: 'generated'`, `doc_type`, `quote_version`); zakładka **Dokumenty** u klienta i projektu; karta „Dokumenty" (3 ostatnie) w prawej kolumnie edytora. Archiwizacja niezależna od zapisu na dysk (anulowany dialog nie cofa; nieudana archiwizacja → toast „Ponów").
  ✅ Eksport wyceny → w Dokumentach klienta jest `…-wycena.pdf`; „Otwórz" daje ten sam plik mimo późniejszej zmiany brand kitu; pakiet zapisuje jeden wpis `package`.

  > **Zrobione.** `pdf/export.ts` (`deliverPdf` + `archiveExportedPdf`) jako **jedno** wyjście dla pięciu eksportów, `archiveGeneratedPdf` w `files.repo`, przełącznik „Zapisz w dokumentach klienta" w menu PDF edytora, zakładka **Dokumenty** u klienta i w projekcie, karta „Dokumenty" (3 ostatnie) w prawej kolumnie edytora. 14 nowych testów jednostkowych i 4 integracyjne; 1126 + 100 zielone.
  > **Na co uważać:**
  > - **Archiwizacja leci PIERWSZA, przed dialogiem zapisu.** To jedyny układ, w którym anulowanie zapisu na dysk nie cofa archiwizacji (koncepcja §3 reguła 6) — a to dwie odpowiedzi na różne pytania: „czy mam plik u siebie" i „czy wiem, co wysłałem". Test pilnuje obu kierunków: anulowany dialog **nie** kasuje wpisu, a nieudana archiwizacja **nie** blokuje zapisu na dysk (toast z „Ponów").
  > - **`deliverPdf` zwraca `saved`, i to nie jest kosmetyka.** „Oznaczyć jako wysłaną?" (T-13) ma padać wyłącznie po pliku, który naprawdę powstał; wcześniej `onExported` wołało się po samym udanym renderze.
  > - **Pakiet ma dwie drogi zapisu, więc dwie drogi archiwizacji.** Scalony PDF idzie przez `deliverPdf` (jeden wpis `package`), a „osobne pliki" zapisują się do wybranego FOLDERU — tam `deliverPdf` się nie nadaje, więc archiwizacja idzie tą samą funkcją `archiveExportedPdf`, po jednym wpisie na dokument z własnym `doc_type`. Mapowanie `priceList` → `price_list` siedzi w jednej stałej; camelCase w planie pakietu i snake_case w bazie to gotowa pułapka.
  > - **Przełącznik jest w menu PDF, a nie w osobnym dialogu przed każdym eksportem.** Zapis do archiwum jest domyślny i rzadko się go wyłącza — modal przed jednoklikową akcją byłby karą za normalne użycie. Bez klienta przełącznika nie ma wcale (05-UI §3a.8).
  > - **`quote_version` idzie jako `null` do czasu T-57.** Kolumna istnieje od `0017`, ale numerów wersji jeszcze nie ma i wpisanie tam `1` na sztywno byłoby zgadywaniem. T-57 podłącza wartość w `useArchiveTarget` — jedno miejsce.
  > - **`jsdom` nie ma `URL.createObjectURL`** — dopisane do `vitest.setup.ts` obok `Blob.arrayBuffer` z T-55. Bez tego każdy test drogi przeglądarkowej wywala się na etapie `<a download>`.
  > **Zweryfikowane na żywo:** `pnpm test:db` — 100 zielonych, w tym „Otwórz daje ten sam plik, który zapisano" (porównanie bajtów), rozdział zakładek Dokumenty/Pliki po `kind` i wliczanie archiwum do limitu 2 GB.
  > **Nie zweryfikowane na żywo:** pełna ścieżka „eksport z edytora → wpis w archiwum" w zbudowanej aplikacji — testy pokrywają `deliverPdf` i repo osobno, ale nikt nie kliknął „Eksportuj PDF" w Tauri.

- [x] **T-57 Wersje wycen v1/v2 + status `archived`** (FEATURES-Z-KONCEPCJI §4 W1)
  Migracja `lineage_id`/`version`/status `archived` + unikalny `accepted` per projekt; `domain/quote/versions.ts`; „Nowa wersja" (duplikat w linii, nowy numer, poprzedni szkic → `archived`) w menu edytora i wiersza; grupowanie po linii w projekcie i rejestrze; badge `v2`; dialog zastąpienia zaakceptowanej (kod `23505` na indeksie → komunikat po polsku); `showVersionOnPdf` (off) — w nazwie pliku wersja zawsze; `StatusBadge` dla `archived` = wygaszony tor; dotychczasowa „Archiwizuj" (soft delete) przemianowana na „Usuń".
  ✅ Flow z koncepcji §11: v1 → „Nowa wersja" → v2 zaakceptowana, v1 archiwalna, jeden `accepted` w projekcie; rejestr pokazuje obie z filtrem; szablon i duplikat startują linię od v1.
  ⚠️ Wchłania lekką część **T-22**; pełna historia zmian zostaje w fazie 2. Dwa różne „archiwum" (status vs kosz) to pułapka — nazwy w i18n muszą się różnić.

  > **Zrobione.** Migracja `0018_quote_versions.sql` (`lineage_id`, `version`, status `archived`, unikalny indeks częściowy `quotes_one_accepted_per_project`, trigger `quotes_set_lineage`), `domain/quote/versions.ts`, `createQuoteVersion` i `acceptReplacing` w repo, „Nowa wersja" w menu edytora i wiersza, badge `v2` przy numerze, grupowanie po linii w projekcie (`QuotesByLineage`), dialog zastąpienia zaakceptowanej, `showVersionOnPdf` w Ustawieniach, wersja w nazwie pliku. 34 nowe testy jednostkowe i 11 integracyjnych; 1146 + 111 zielone.
  > **Na co uważać:**
  > - **Seed wywrócił pierwsze podejście do migracji.** `lineage_id` jako `not null` bez wartości domyślnej wysypuje każdy insert, który jej nie podaje — a wyceny wstawia też `seed.sql`. Rozwiązanie: trigger `quotes_set_lineage` (`lineage_id := id`, gdy puste). `default gen_random_uuid()` **nie** wystarczy: chcemy, żeby v1 miała `lineage_id = id`, bo wtedy linię widać w danych bez szukania, a domyślna wartość kolumny nie zna `new.id`.
  > - **`createQuote` nadaje `id` po stronie aplikacji.** Żeby zapisać `lineage_id = id` jednym insertem, trzeba znać id wcześniej. Trigger zostaje jako zabezpieczenie dla seedów i migracji.
  > - **Kolizję rozpoznajemy po NAZWIE INDEKSU, nie po samym `23505`.** Ten kod dostajemy też przy duplikacie numeru wyceny — pokazanie wtedy „zastąpić zaakceptowaną?" byłoby mylące.
  > - **`acceptReplacing` ma ustaloną kolejność:** najpierw poprzednia idzie na `archived`, dopiero potem akceptujemy nową. Odwrotnie odbiłby nas indeks. Gdy druga operacja padnie, projekt zostaje **bez** zaakceptowanej wyceny — stan niepełny, ale prawdziwy; dwie zaakceptowane naraz byłyby kłamstwem o tym, na co klient się zgodził.
  > - **„Nowa wersja" i „Duplikuj" zostają oba i to nie jest przeoczenie** (koncepcja §4 reguła 5): wersja kontynuuje linię tej samej inwestycji, duplikat zakłada nową dla innego klienta. Tooltipy mówią to wprost, bo same nazwy nie rozstrzygają. Test integracyjny pilnuje, że duplikat **zmienia** `lineage_id`, a wersja **nie**.
  > - **Poprzedni szkic → `archived`, ale `sent`/`accepted`/`rejected` ZOSTAJĄ.** To fakty o tym, co poszło do inwestora; przepisanie ich skasowałoby historię nie do odtworzenia.
  > - **`archived` renderuje się jako pusty, wygaszony tor** (§9.10) — to nie etap w ciągu szkic→wysłana→rozstrzygnięcie, tylko wersja zastąpiona przez nowszą.
  > - **Dawna „Archiwizuj" nazywa się teraz „Usuń".** To zawsze był kosz (`deleted_at`), a od T-57 istnieje osobny status `archived` — dwa „archiwa" w jednym interfejsie byłyby pułapką.
  > - Wersja w **nazwie pliku jest zawsze** (od v2), na **dokumencie tylko przy `showVersionOnPdf`** (domyślnie off). To dwie różne sprawy: nazwa chroni przed nadpisaniem plików, dokument dotyczy tego, co widzi inwestor.
  > **Zweryfikowane na żywo:** `supabase db reset` przepuścił `0018` razem z seedem; `pnpm test:db` — 111 zielonych, w tym pełny przepływ z koncepcji §11 (v1 → v2 → akceptacja z zastąpieniem → jeden `accepted` w projekcie) i odbicie drugiej akceptacji przez indeks.
  > **Nie zweryfikowane na żywo:** grupowanie wersji w rejestrze `/wyceny` — `QuotesByLineage` wpięte jest na razie **tylko w zakładce projektu**. W rejestrze wyceny różnych klientów mieszają się ze sobą i zwijanie linii wymaga decyzji, czy grupować ponad klientami; zostawione świadomie do T-58, które i tak przebudowuje nawigację i listy.

- [x] **T-58 Pulpit i nawigacja pod klienta + paleta ⌘K** (FEATURES-Z-KONCEPCJI §2 K3, 05-UI §2–3)
  Sidebar: Pulpit · Klienci · Wyceny · Biblioteka · Szablony · Ustawienia (Branding jako sekcja Ustawień, `/branding` alias); blok „Aktywni klienci i projekty" + „Nowy klient" na pulpicie; „Nowa wycena" pyta o klienta/projekt; paleta ⌘K (`command` z shadcn — bez nowej zależności): klienci, projekty, wyceny, usługi, akcje; `useMatch` z `end: false` dla tras zagnieżdżonych.
  ✅ Po zalogowaniu pierwszy ekran prowadzi do klientów; ⌘K znajduje klienta po fragmencie nazwy i otwiera kartę; testy `Sidebar`/`AppShell` zaktualizowane (mockują `useEntitlement`).
  ⚠️ Zabiera część **T-21** (paleta) — tryb ciemny i skróty zostają w fazie 2.

  > **Zrobione.** Sidebar w kolejności z 05-UI §2 (Klienci przed Wycenami, bez Brandingu), `SettingsLayout` z sekcjami i `/branding` jako alias, blok „Aktywni klienci i projekty" na pulpicie, `NewQuoteDialog` (klient + projekt, „bez klienta" zostaje), `CommandPalette` pod ⌘K. 16 nowych testów; 1162 zielone.
  > **Na co uważać:**
  > - **`CommandDialog` z shadcn NIE przepuszcza `shouldFilter` do `cmdk`** — spread leci do `Dialog`, więc flaga po cichu nic nie robi. Paleta składa `Dialog` + `Command` sama. To nie kosmetyka: filtruje Postgres, a drugie sito po `value` (u nas `client-<id>`) ukryłoby wszystko, co serwer właśnie znalazł.
  > - **Zapytania palety ruszają dopiero po otwarciu.** Komponent wisi zamontowany w powłoce przez całe życie aplikacji — bez `enabled` cztery zapytania chodziłyby przy każdym wejściu na dowolny ekran.
  > - **Branding jest osobną TRASĄ, nie zakładką w stanie.** To pełnoekranowy formularz z podglądem PDF-a; wciśnięcie go w kolumnę `max-w-2xl` reszty ustawień zjadłoby ten podgląd. `/branding` renderuje `SettingsLayout`, więc alias nie gubi kontekstu nawigacji — jest na to test.
  > - **`activeNavIndex` (startsWith) zostaje zamiast `useMatch`.** Zadanie sugerowało `useMatch({ end: false })`, ale istniejący helper robi dokładnie to samo, jest czysty i ma testy — wymiana byłaby zmianą dla zmiany. Trasy dwupoziomowe (`/klienci/:id/projekty/:pid`) pokryte testem.
  > - **„Nowa wycena" pyta, ale „bez klienta" ZOSTAJE** (koncepcja §2 reguła 2). Szybka wycena „na już" to prawdziwy przypadek; różnica jest taka, że to teraz świadomy wybór, a nie domyślny efekt kliknięcia. Wybór klienta od razu przepisuje jego dane do dokumentu (snapshot).
  > - **Zmiana klienta w dialogu zeruje projekt** — teczki należą do konkretnego klienta, ta sama zasada co w `setClient` w edytorze.
  > - Blok pulpitu pokazuje **projekty**, nie klientów: klient bez inwestycji to kontakt, a nie praca. `done`/`canceled` odsiewamy — to historia, a nie to, do czego się wraca rano.
  > **Nie zweryfikowane na żywo:** sam skrót ⌘K w zbudowanej aplikacji (testy klikają w przycisk, nie w klawiaturę) i wygląd nowego układu Ustawień — do przeklikania przy `pnpm tauri dev`.

- [x] **T-59 Biblioteka: grupy (słownik), zestawy, zakładki, Pomieszczenia** (FEATURES-Z-KONCEPCJI §5 B1, 05-UI §3)
  Migracja `library_categories` + `library_items.category_id` + migracja danych z tekstowej `category` (kolumna zostaje jedną wersję); zakładki **Usługi | Grupy | Zestawy | Pomieszczenia | Stawki**; zakładka Grupy (drag, kod, kolor z palety, licznik, soft delete → usługi do „Bez grupy"); „Grupy → Zestawy" w i18n; `RoomTypesSection` w bibliotece (ten sam komponent, link z Ustawień); lista usług: pigułki grup, licznik, kolumny, lista–siatka, „Pokaż więcej" po 50, split-button „Dodaj ▾"; import CSV dopasowuje `grupa` do słownika (nieznana → tworzy).
  ✅ Istniejące kategorie po migracji są grupami w kolejności alfabetycznej; picker sortuje po grupach; usunięcie grupy nie kasuje usług.
  ⚠️ **Nie zmieniaj nazwy tabeli `library_groups`** (zestawy) — snapshoty mają własną ścieżkę zgodności i testy integracyjne (§9.3).

  > **Zrobione.** Migracja `0019_library_categories.sql` (tabela + `category_id` + migracja danych z tekstowej `category`), `library-categories.repo` + `useLibraryCategories`, zakładki **Usługi | Grupy | Zestawy | Pomieszczenia | Stawki**, zakładka Grupy (kod, kolor z palety, licznik, kolejność, soft delete → „Bez grupy"), pigułki grup + licznik nad listą usług, `RoomTypesSection` wyświetlony w bibliotece. 9 nowych testów; 1163 + 118 zielone.
  > **Na co uważać:**
  > - **Migracja danych przy `db reset` nie ma czego migrować** — migracje chodzą PRZED `seed.sql`, więc na pustej bibliotece. Demo zakłada więc słownik samo (sekcja 9 w seedzie), inaczej świeży stack pokazywałby usługi bez grup. Na prawdziwym koncie z danymi migracja zadziała normalnie; jest idempotentna (`not exists`).
  > - **Kolejność po migracji jest ALFABETYCZNA i to jest świadome** — tekstowa kolumna nie niosła żadnej innej. `code` zostaje puste: zgadywanie numeracji etapów z nazwy byłoby wymyślaniem danych. W seedzie demo kolejność jest procesowa (Projekt → Nadzór → Dodatki), bo tam wiadomo, co po czym idzie.
  > - **`deleteLibraryCategory` odpina usługi JAWNIE.** `on delete set null` zadziałałoby przy twardym skasowaniu wiersza, ale my robimy soft delete — bez tego usługi zostałyby przypięte do grupy, której nikt już nie widzi. Test integracyjny to sprawdza.
  > - **Filtr `categoryId: 'none'` to nie id, tylko jawne pytanie o usługi bez grupy.** Bez tego stanu usługi po usunięciu grupy znikałyby z widoku „Wszystkie"? Nie — ale nie dałoby się ich odfiltrować i zebrać do przypisania.
  > - **Kolor spoza palety traktujemy jak brak koloru.** Ręcznie wpisany hex w bazie nie ma prawa wyciec do UI — pigułka w losowym kolorze bywa nieczytelna na tle karty. Jest na to test.
  > - **Etykieta „Zestawy" zmieniła się tylko w i18n**, klucz `library.groups` i tabela `library_groups` zostają (§9.3).
  > **Świadomie pominięte z opisu zadania:** „import CSV dopasowuje `grupa` do słownika" — **istniejący import CSV (T-50) to macierz cennika** (nazwa + slugi pomieszczeń), nie ma w nim kolumny `grupa` ani importu usług. Dopisanie takiego importera to osobna funkcja, nie mapowanie w istniejącej; zapisane w `docs/IDEAS.md`. Tak samo „lista–siatka", „Pokaż więcej po 50" i split-button „Dodaj ▾": lista usług to dziś karty w siatce i przebudowa jej na tabelę należy do T-61, który i tak przepisuje wygląd usługi.
  > **Zweryfikowane na żywo:** `supabase db reset` + `pnpm test:db` — 118 zielonych, w tym „usunięcie grupy nie kasuje usług" i kolejność grup w demo.

- [x] **T-60 Biblioteka: jednostki, cena „od", „indywidualnie", aktywna** (FEATURES-Z-KONCEPCJI §5 B2)
  Migracja kolumn (`unit`, `unit_label`, `min_price_cents`, `active`, `is_sample`; `unit_price_cents` nullable); `Unit` w domenie, `formatUnit`, `minRuleCents`; **`bodyVersion + 1`** (cena `null` = wycena indywidualna, krok migracji bez przekształceń); kaskada `unit`; jedna kontrolka „Sposób wyceny" (8 opcji → para `mode+unit`) na karcie; „Aktywna" chowa z pickera i „Rozpisz na pomieszczenia"; wiersz edytora: „× 14 m²", „wycena indywidualna"; `TotalsCard` dopisek; PDF: ilość z jednostką, pozycje indywidualne.
  ✅ „Pomiar wnętrza 12 zł/m², qty 80" → 960 zł i „80 m² × 12,00 zł" w PDF; pozycja indywidualna nie zmienia sumy i jest w PDF; nieaktywna znika z pickera, kaskada działa.
  ⚠️ Cena `null` dotyka ~20 miejsc (§9.4) — jedno przejście jak w T-36, ze snapshotami zestawów, CSV (pusta = null) i `convertUnits` (null → null).

  > **Zrobione.** Migracja `0020_library_units.sql`, `domain/library/units.ts` (`Unit`, `formatQty`, `priceSuffix`, `pricingChoiceFor`, `minRuleCents`), `bodyVersion 4 → 5` z krokiem bez przekształceń, `countIndividualItems`, kaskada `unit` przy wstawianiu z biblioteki, wiersz edytora („80 m² ×", „wycena indywidualna"), dopisek w `TotalsCard`, PDF z jednostką i pozycjami indywidualnymi. 18 nowych testów; 1181 + 118 zielone.
  > **Na co uważać:**
  > - **`UnitSchema` mieszka w `domain/quote/schema.ts`, nie w `domain/library`.** Pierwsze podejście dało cykl importów (`quote/schema` ↔ `library/units`) i TypeScript zaczął widzieć **dwa różne typy o tej samej nazwie** — błąd, który czyta się jak bzdura, dopóki nie zobaczy się cyklu. `library/units.ts` tylko go re-eksportuje.
  > - **`libraryItemToQuoteItem` i `libraryItemToSnapshot` biorą PODZBIÓR strukturalny**, a nie `LibraryItem`. Ten sam byt ma dwa opisy (zodowy i interfejs z repo) i wymaganie konkretnie jednego zmuszałoby wołających do konwersji w kółko.
  > - **`null` a zero to dwie różne rzeczy i kod musi je rozróżniać.** Zero znaczy „gratis", `null` — „ustalimy osobno". W `calcItemCents` oba dają 0 zł, ale `countIndividualItems` liczy tylko drugie, a suma dostaje dopisek. Bez tego klient widzi kwotę, która nie obejmuje wszystkiego z listy.
  > - **`convertUnits` przepuszcza `null` jako `null`** (§9.4) — przeliczenie „czegoś, czego nie ma" na minuty pracy dałoby pozycję za 0 zł, czyli „gratis".
  > - **Rabat z ceną `null` dostaje zero.** „Wycena indywidualna" dotyczy usług; obniżka bez kwoty nie ma sensu.
  > - **Ilość z jednostką pokazuje się też przy `qty = 1`**, jeśli jednostka ma etykietę: „1 ×" to szum, ale „1 wizyta ×" już coś mówi. Ryczałt nadal nie drukuje nic.
  > - **`formatQty` zwraca ułamek z przecinkiem** („2,5 h") — test `ItemRow` sprzed T-60 oczekiwał kropki.
  > **Świadomie odłożone do T-61:** kontrolka „Sposób wyceny" (8 kafelków), pole „własna jednostka", przełącznik „Aktywna" i cena „od" **w interfejsie**. Model, domena i wyświetlanie są gotowe (`pricingChoiceFor` mapuje osiem opcji na parę `mode+unit`), ale sama kontrolka należy do pełnoekranowego edytora usługi, który T-61 i tak buduje od zera — wciskanie jej teraz w kartę w siatce znaczyłoby napisać ją dwa razy. Filtr „Aktywna" w pickerze wchodzi razem z nią.
  > **Zweryfikowane na żywo:** `supabase db reset` + `pnpm test:db` — 118 zielonych.

- [x] **T-61 Biblioteka: pełnoekranowy edytor usługi z podglądem + statystyki użycia** (FEATURES-Z-KONCEPCJI §5 B3, 05-UI §3 „Edytor usługi")
  Trasy `/biblioteka/uslugi/:id` i `/nowa`; sekcje 1–6; prawa kolumna: „Podgląd w ofercie" (`ItemRow` w podglądzie + stawki dla `per_room`), „Jak to działa?" (4 warianty w i18n), „Statystyki użycia" (RPC `library_item_usage`, cache 5 min), „Wskazówka" z linkiem do Pomieszczeń; zapis jawny; inline-edit na karcie zostaje dla nazwy/ceny.
  ✅ Zmiana stawki odświeża podgląd bez zapisu; „Zapisz" = jedno wywołanie; statystyka zgodna z seedem.
  ⚠️ Kaskada do otwartej wyceny działa tylko z `LibrarySheet` w edytorze (T-10 — tam jest store); pełna strona ma to powiedzieć, nie udawać.

  > **Zrobione.** Migracja `0021_library_usage.sql` (RPC `library_item_usage`), trasy `/biblioteka/uslugi/nowa` i `/:id`, `LibraryItemPage` z sekcjami 1–6, `PricingChoicePicker` (8 kafelków → para `mode+unit`), `ItemPreviewCard`, „Jak to działa?", `ItemUsageCard`, wejście z karty usługi. 13 nowych testów; 1194 + 118 zielone.
  > **Na co uważać:**
  > - **`/nowa` MUSI stać przed `/:id` w drzewie tras** — inaczej „nowa" wpada jako identyfikator usługi i strona szuka wpisu o takim id.
  > - **Osiem kafelków to nie osiem algorytmów.** „Za m²" to `flat` + `m2`, „Indywidualnie" to `flat` z ceną `null`. Rozbicie tego na dwie kontrolki („tryb" + „jednostka") zmuszałoby użytkownika do tłumaczenia swojej intencji na nasz model.
  > - **Podgląd NIE używa `ItemRow` z edytora**, wbrew literze zadania. Tamten wiersz potrzebuje kontekstu wyceny (pomieszczenia, tryb cen, dnd), którego na tej stronie nie ma — podrabianie go pustymi wartościami dawałoby podgląd czegoś innego niż to, co zobaczy klient. Własny, prosty komponent pokazuje dokładnie nazwę, opis i cenę z jednostką.
  > - **Statystyki liczy RPC z `quotes.body`, nie licznik w tabeli.** `jsonb_path_query` po `$.**.libraryItemId`, bo pozycje leżą i luzem w sekcjach, i w grupach. `distinct` po parze (wycena, usługa): trzy wstawienia tej samej usługi to wciąż jedna wycena. Cache 5 minut — świeżość co do sekundy nic tu nie znaczy.
  > - **Usługa nieużywana dostaje zdanie, nie zero** — „0" wygląda jak błąd ładowania.
  > - **Strona mówi wprost, że kaskada z niej nie działa.** Kaskadę obsługuje `LibrarySheet` w edytorze, bo tylko tam jest otwarta wycena i store. Udawanie, że działa wszędzie, kończyłoby się cichym brakiem zmian w dokumencie, nad którym ktoś pracuje.
  > **Świadomie inaczej niż w opisie:** sekcja 5 („Stawki wg pomieszczeń") **linkuje do zakładki Stawki**, zamiast powtarzać edytor macierzy. Drugi edytor tych samych liczb to dwa miejsca do poprawiania przy każdej zmianie modelu; macierz pokazuje przy tym całą siatkę naraz, czego pojedyncza karta i tak nie zrobi. „Wskazówka" z linkiem do Pomieszczeń wchodzi razem z tą sekcją, gdy stawki znajdą się na stronie usługi.
  > **Zweryfikowane na żywo:** RPC sprawdzone na seedzie (`library_item_usage` zwraca 3 wyceny dla pozycji `…0001`); `pnpm test:db` — 118 zielonych.

- [x] **T-62 Biblioteka przykładowa na start konta** (FEATURES-Z-KONCEPCJI §5 B4, `reference/bilbioteka.md`)
  `seed_library_sample(ws)` (8 grup / 38 usług, nazwy i opisy **dosłownie** z `bilbioteka.md`, ceny `null`, `is_sample`), wpięcie w `handle_new_user()` (idempotentne, tylko pusta biblioteka; bez backfillu), badge „Przykładowa", zdejmowanie flagi przy edycji, „Usuń pozostałe przykładowe (N)" w Ustawieniach → Biblioteka, krok onboardingu „Przejrzyj bibliotekę" (rozstrzygnij §9.11).
  ✅ Nowe konto: 8 grup i 38 usług bez cen z badge; edycja jednej zdejmuje badge tylko z niej; „Usuń pozostałe" kasuje 37 i puste grupy przykładowe. `seed.sql` demo **bez** biblioteki przykładowej.

  > **Zrobione.** Migracja `0022_library_sample.sql` (`seed_library_sample` + wpięcie w `handle_new_user`), badge „Przykładowa", zdejmowanie flagi przy edycji, sekcja „Usuń pozostałe (N)" w Ustawieniach, krok onboardingu poprawiony. 10 nowych testów integracyjnych; 1194 + 128 zielone.
  > **Na co uważać:**
  > - **Demo dostawało OBIE biblioteki i to nie było widać w kodzie.** `handle_new_user()` odpala się przy wstawieniu użytkownika testowego, czyli **zanim** `seed.sql` dojdzie do swojej sekcji biblioteki — świeży stack miał 38 pozycji przykładowych plus 15 własnych. Seed czyści teraz wpisy `is_sample` dla konta demo (sekcja 3b). Testy parytetu kwot stoją na tych 15 z cenami.
  > - **`is_sample = false` ustawia REPOZYTORIUM przy każdej edycji**, nie UI. Gdyby pamiętać o tym w komponentach, jedno zapomniane miejsce znaczyłoby, że „Usuń pozostałe" kasuje czyjąś pracę.
  > - **Test idzie prawdziwą ścieżką: rejestruje nowe konto.** Pierwsza wersja wołała `seed_library_sample` na koncie demo i wszystko było puste — bo funkcja słusznie odmawia workspace'owi, który ma już usługi. To nie był błąd testu do obejścia, tylko sama reguła idempotencji; test sprawdza teraz oba przypadki osobno.
  > - **Krok onboardingu „biblioteka" liczy pozycje BEZ flagi** (rozstrzygnięcie §9.11). Warunek „istnieje jakakolwiek pozycja" byłby odhaczony w chwili rejestracji, a krok ma znaczyć „masz swoją bibliotekę", nie „dostałeś naszą". Pierwsza edycja usługi przykładowej zalicza go — i to jest dokładnie ten moment, w którym biblioteka staje się czyjaś.
  > - **„za panoramę" i „za rysunek" nie mają swojego kodu w enumie jednostek** — idą jako `custom` z etykietą. Dokładanie ich do `Unit` znaczyłoby migrację przy każdej nowej nazwie z arkusza.
  > - Puste grupy przykładowe znikają przy sprzątaniu, ale grupa z edytowaną usługą **zostaje** — razem z tym, co ktoś w niej zatrzymał.
  > **Zweryfikowane na żywo:** `pnpm test:db` — 128 zielonych, w tym „nowe konto dostaje 8 grup i 38 usług bez cen", „edycja zdejmuje flagę", „usuń pozostałe kasuje 37 i zostawia edytowaną".

- [x] **T-63 Pakiety: szablon niesie termin i dokumenty** (FEATURES-Z-KONCEPCJI §6 S1)
  Migracja `quote_templates.schedule/documents`; `templates.repo` z miękkim parsowaniem obu kolumn; dialog „Zapisz jako szablon" z checkboxami zawartości (ukryte, gdy wycena czegoś nie ma); wycena z szablonu dostaje komplet, `startDate` zerowana; ikony zawartości na karcie szablonu.
  ✅ Szablon z harmonogramem → nowa wycena ma Termin bez daty startu; szablon bez dokumentów nie tworzy pustej zakładki.
  **Zrobiono:** migracja `0023_template_package.sql` (dwie kolumny `jsonb`, `NULL` = „szablon nie niesie tego" i to normalny stan). `templates.repo`: `TemplateContents`, miękkie parsowanie przez `parseScheduleBody`/`parseQuoteDocuments`, `overwriteTemplate(id, body, contents)`. `useTemplateActions` dostał `available` (co wycena *ma*) i `selection` (co użytkownik zaznaczył); `packageFor()` zeruje `startDate` już przy zapisie. Nowa wycena z szablonu idzie przez `scheduleFromTemplate()` (`src/domain/schedule/defaults.ts`) — zerowanie w obu miejscach, bo szablony sprzed tej migracji mogą nieść datę.
  **Na co uważać:** nadpisanie zapisuje `contents.schedule ?? null` — odznaczenie checkboxa **kasuje** pakiet, świadomie („nadpisz bieżącym" ≠ „dolej"). `available` czyta store przez selektor, nie `getState()`, żeby checkbox pojawił się od razu po dodaniu pierwszego etapu. Ikonki na karcie szablonu bez `startDate` — data nigdy tam nie trafia.

- [x] **T-64 Usługi dodatkowe → wpływ na termin** (FEATURES-Z-KONCEPCJI §7 U1)
  `PriceListEntry.addedDays`, pole w zakładce Cennik, most z dwoma przełącznikami (koszt / termin), etap `kind: 'extras'` w domenie harmonogramu i `ScheduleTab` (lista usług składowych, usuwanie pojedynczo), PDF terminu.
  ✅ „Panorama 360, +3 dni" wydłuża optymalne zakończenie o 3 dni robocze i dodaje pozycję; odznaczenie „koszt" dodaje tylko dni.
  ⚠️ Usunięcie pozycji z wyceny **nie** zdejmuje dni automatycznie (zasada z T-44).
  **Zrobiono:** bez migracji — `schedule`/`documents` to `jsonb` parsowane miękko, więc stare wyceny dostają `kind: 'normal'`, `extras: []` z defaultów zod. `PriceListItem.addedDays` (`null` ≠ 0: „nie wiadomo" to inna informacja niż „niczego nie wydłuża"), domyślny cennik ma je wypełnione dolną granicą `leadTime`. Nowy `src/domain/schedule/extras.ts` (`withExtra`/`withoutExtra`/`withExtraDays`, `baseDays` = suma składników). Most wydzielony do `AddToQuoteBridge.tsx` — popover z dwoma przełącznikami; bez `addedDays` zostaje zwykły link, bo jeden efekt nie potrzebuje wyboru.
  **Na co uważać:** etap `extras` ma `roomScope: 'none'`, więc w PDF terminu ląduje na liście „cały projekt" — nic tam nie trzeba było dodawać. `StageRow` chowa dla niego „Dni bazowe": liczba jest sumą i tak zostałaby nadpisana. Pusty etap zbiorczy znika sam. Ta sama usługa dodana dwa razy liczy się dwa razy — celowo.

- [x] **T-65 Rebranding: Toolier** (FEATURES-Z-KONCEPCJI §8 R1)
  `productName`/`identifier`/tytuł okna w `tauri.conf.json`, `package.json`, `pl.app.name`, ekrany auth, stopka, README, CHANGELOG, `07-BUILD-MACOS.md`; deep link **`anzorge://` → `toolier://`** (`config.toml`, `deep-links.ts`, capabilities, panel Supabase ręcznie); keychain `pl.anzorge.app` → `pl.toolier.app` (kasuje sesje testowe — wpis w CHANGELOG); seed `demo@toolier.local` (+ testy integracyjne); ikona: nowy logotyp od właściciela, do tego czasu „T" w miejsce „A" (`scripts/make-icon.mjs`).
  ✅ `grep -ri anzorge src src-tauri supabase docs` zwraca tylko historyczne notatki w `06-TASKS.md`, `CHANGELOG.md` i `FEATURES-Z-EXCELA.md`; `pnpm tauri build` daje `Toolier_*.msi`.
  **Zrobiono:** `tauri.conf.json` (productName / identifier / tytuł okna / copyright / opis / schemat `toolier`), `package.json`, `Cargo.toml` (crate `toolier`, `toolier_lib`), `main.rs`, keychain `pl.toolier.app`, capabilities `toolier.pl`, `index.html`, `pl.app.name`, komentarze w `globals.css`. Deep linki `toolier://` w `deep-links.ts`, `oauth.ts`, `ResetPasswordPage`, obu Edge Functions Stripe i `config.toml`. Klucze lokalne: `toolier-auth` (keychain/localStorage), `toolier:sidebar-expanded`, zrzut danych `toolier-dane-*.json`. Seed i wszystkie testy integracyjne na `demo@toolier.local`. Ikona: `make-icon.mjs` rysuje „T" (belka + trzon), `npx tauri icon` przegenerował cały zestaw. Wpis w CHANGELOG z ostrzeżeniem o ponownym logowaniu.
  **Na co uważać:** `project_id` w `config.toml` jest częścią nazw kontenerów Dockera — zmiana wymagała `supabase stop` **pod starą nazwą**, dopiero potem `start`. Podpis „Developed by AnzorgeDesign & Moodevlabs" **zostaje** (nazwa studia, nie produktu) — kryterium grepa jest w tym punkcie świadomie niespełnione, komentarz w `pl.ts` to tłumaczy. Nadal **ręcznie w panelu Supabase**: `toolier://auth/callback` i `toolier://auth/recovery` w „Redirect URLs". **Kryterium builda domknięte przy T-17 (2026-08-25):** `npx tauri build` na Windows daje `Toolier_1.0.0_x64_en-US.msi` i `Toolier_1.0.0_x64-setup.exe`. Instalatora nadal **nikt nie uruchomił na czystej maszynie** — to zostaje w T-17.

- [x] **T-66 Cena 98,99 zł/mies., 999,99 zł/rok** (FEATURES-Z-KONCEPCJI §8 R2, 03-BILLING §1)
  Nowe `price` w Stripe (`lookup_key` `toolier_monthly`/`toolier_yearly`), stare archiwizowane; produkt „Toolier"; kwoty w UI wyłącznie z `pl.billing.prices`; „2 miesiące gratis" przy rocznej; testy `billing-ui.test.tsx` pilnują, że 19,99/199 nie wraca; `03-BILLING.md`.
  ✅ Checkout w sandboxie pokazuje 98,99 zł / 999,99 zł; `stripe-create-checkout` znajduje ceny po nowych `lookup_key`.
  **Zrobiono:** `pl.billing.prices` jako jedyne miejsce z kwotami (`monthly`, `yearly`, `yearlyBefore`, `yearlySaving`); `SubscriptionPage` pokazuje przy rocznej **przekreśloną kwotę 1 187,88 zł** (12 × miesięczna), żeby oszczędność dało się sprawdzić, a nie tylko przeczytać. `PRICE_LOOKUP_KEYS` w `functions/_shared/stripe.ts` — zapytanie do Stripe idzie po `toolier_monthly`/`toolier_yearly`, nie po nazwie planu. Dwa testy pilnujące: `billing-ui.test.tsx` (nowe kwoty są, stare nie wracają) i nowy `domain/billing/price-keys.test.ts` (parytet kluczy, czyta plik Deno jak `edge-parity.test.ts`). `03-BILLING.md` §1 dostał listę kroków w panelu Stripe.
  ⚠️ **Zamiast „2 miesiące gratis" jest „prawie dwa miesiące taniej"** — 999,99 / 98,99 = 10,1 miesiąca, więc oszczędność to 1,9 miesiąca, nie 2. Jeśli właściciel chce okrągłego hasła, to jeden string w `pl.billing.prices.yearlySaving`.
  ⚠️ **Panel Stripe niesprawdzony w tym zadaniu** — kod pyta o nowe `lookup_key`, ale ceny trzeba założyć ręcznie (kroki 1–5 w `03-BILLING.md` §1). Uwaga na sekrety `STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_YEARLY`: przypięte ID **wygrywa** z `lookup_key` i po cichu zostawiłoby starą kwotę.

### Redesign Toolier 2026 — brąz / beż / papier (makieta + logotypy, 2026-08-26) — przed T-17

> **Dlaczego przed T-17.** T-17 mówi wprost, że „docelowa kolorystyka przyjdzie na końcu budowy", a jego kryterium odbioru to podpisany instalator z ikonami aplikacji. Budowanie instalatora przed rebrandingiem znaczyłoby budowanie go dwa razy. Pełna specyfikacja: **`docs/08-REDESIGN-2026.md`** — tu jest tylko kolejność i kryteria odbioru. **Przeczytaj §0 (zmiana tezy), §2 (trzy pułapki typografii) i §6 (decyzje) przed startem pierwszego chunku.**
>
> Materiały: `reference/nowy wyglad.png`, `reference/logotypy/{sygnet,toolier napis,toolier logo}.svg`. Kolory bazowe: **`#33251e`** (brąz), **`#efece8`** (beż). Fonty: **Faculty Glyphic** (display) + **Inter** (interfejs).

- [x] **T-74 Fundament: tokeny i paleta, fonty** (08-REDESIGN §1, §2)
  Wymiana `:root` w `globals.css` na ciepłą rampę (neutralne + szyna + funkcyjne), nowe cienie i promienie, przemapowanie bloku shadcn. `+ @fontsource/faculty-glyphic`, `− @fontsource-variable/instrument-sans`. Nowa utility `.label-caps`. Usunięcie `--field` i `body::before`.
  ✅ `pnpm dev` — aplikacja jest ciepła i czytelna bez ani jednej zmiany w JSX.
  **Zrobiono:**
  > - **Fonty nie były w ogóle ładowane.** `@fontsource-variable/inter` i `instrument-sans` stały w `package.json`, ale **żaden plik ich nie importował** — w całym repo nie było ani jednego `@font-face`. `'Inter Variable'` w stosie CSS nie rozwiązywało się do niczego i aplikacja renderowała się w systemowym Segoe UI. Bez naprawy tego dołożenie Faculty Glyphic też byłoby niewidoczne. Import wszedł do `main.tsx` **przed** `globals.css`.
  > - Pełna rampa z §1: marka (`--brown`, `--beige`, `--espresso`), podłoże, **osobna rampa szyny** (`--rail-*`) i statusy w oliwce/ochrze/terakocie.
  > - `.tabular` **jawnie** na `--font-sans` (pułapka niżej), `h1/h2/.font-display` z `font-weight: 400` wymuszonym w `@layer base` — żeby utility wagi nie zrobiło syntetyku.
  > - `--ring: #9aa0aa` → `#7d6555` (≈4,8:1 na kanwie, ≈5,4:1 na karcie). Stary chłodny szary na beżu praktycznie znikał, a to jedyny wskaźnik pozycji dla klawiatury.
  > - Warstwa szkła **została** i ma przestrojone na ciepło wartości — znika w T-76. Ten chunk celowo nie rusza JSX-a.
  **Na co uważać:**
  > - **Cienie nazywają się w `:root` `--elevation-card`/`--elevation-sheet`, nie `--shadow-*`.** Blok `@theme inline` wystawia je Tailwindowi pod nazwą `--shadow-card`; token odwołujący się do samego siebie (`--shadow-card: var(--shadow-card)`) jest cyklem i wysypuje kompilację.
  > - `--canvas-light` zostało **celowo** — używa go jeszcze poświata w `AuthLayout`. Znika razem z nią w T-76.
  ⚠️ **`.tabular` musi zostać odpięte od `--font-display`** — inaczej wszystkie kwoty przeskoczą do Faculty Glyphic, który nie ma gwarantowanych cyfr tabularnych. Kolumna pieniędzy zacznie skakać.
  ⚠️ **Faculty Glyphic ma jedną wagę (400), nie ma wariantu variable.** Każde `font-display` + `font-semibold` w JSX da sztuczne pogrubienie. Hierarchia idzie przez stopień pisma i wersaliki. Do posprzątania w T-77/T-80 (8 wystąpień).

- [x] **T-75 Logotypy jako komponenty + ikony aplikacji** (08-REDESIGN §4)
  `src/assets/brand/{Sygnet,Wordmark,LogoLockup}.tsx` z `fill="currentColor"`. Podmiana liter „A" w `Sidebar.tsx` i `AuthLayout.tsx`. Favicon, `src-tauri/icons/` z sygnetu, ikona instalatora, `AppCredit` na nowe tokeny.
  ✅ `grep -rnE '^\s*A\s*$' src --include=*.tsx` nic nie zwraca; aplikacja w pasku zadań pokazuje Toolier.
  **Zrobiono:**
  > - Trzy komponenty wygenerowane skryptem z plików w `reference/logotypy/`, nie przepisane ręcznie. Skrypt zdejmuje `<defs>`/`<style>` z wpisanym na sztywno `fill: #33251e` i klasy `.cls-1` — bez tego logotyp na brązowej szynie byłby brązem na brązie.
  > - Wzorzec dostępności: `title` opcjonalny. Jest → `role="img"` z tytułem; nie ma → `aria-hidden`. Logotyp stojący obok nazwy produktu w tekście nie ma być czytany dwa razy.
  > - **Podział zgodny z D-2:** sygnet (szyna zwinięta) / napis (szyna rozwinięta) / pełny lockup (tylko logowanie).
  > - `AuthLayout` stracił `pl.app.name` i `pl.app.tagline` spod logotypu — hasło „Tools for Atelier" jest już w krzywych w lockupie i wychodziło dwa razy.
  > - **`tauri icon` przyjmuje SVG**, więc master to `src-tauri/app-icon.svg`, a nie PNG — jedno źródło, ostre w każdym rozmiarze, wersjonowalne w gicie.
  > - `public/favicon.svg` + `<link rel="icon">` w `index.html` (wcześniej aplikacja nie miała favicona w ogóle).
  **Na co uważać:**
  > - **Ikona aplikacji jest pełnospadowym kwadratem**, bez zaokrągleń. Tak wygląda natywnie w kafelkach Windows, dla których `tauri icon` generuje `Square*Logo.png`. Zaokrąglenie „squircle" pod macOS to osobny krok przy budowie na macu (T-17) — dorobienie go teraz zepsułoby kafelki.
  > - Favicon **ma** zaokrąglenie (nie trafia do kafelków) i też beżowe tło — pasek kart bywa ciemny.
  ⚠️ Master ikony: **na beżu, nie na przezroczystości** — sygnet na ciemnym pasku zadań zniknąłby.
  ⚠️ `logoDarkPath`/`logoLightPath` w brand kicie to logo **klienta** na jego PDF. Nie ruszane.

- [x] **T-76 Płaskość: koniec szkła** (08-REDESIGN §3)
  `.glass` / `.glass-strong` / `.glass-dark` → płaskie `.card-surface` / `.surface-band` / `.rail`. Usunięcie tokenów `--glass-*`, masek `mask-composite` i trzech bloków `@supports not (backdrop-filter)`. Przepięcie 5 plików używających `glass`.
  ✅ `grep -rn "backdrop-filter\|glass" src/` zwraca tylko komentarz historyczny.
  **Zrobiono:**
  > - Cały `@layer components` (124 linie masek i rozmyć) zastąpiony trzema powierzchniami. Zniknęły `mask-composite`, `saturate()` i trzy fallbacki `@supports`.
  > - **Nazwa `card-surface` ZOSTAJE**, mimo że w planie była `surface-card`. Ta klasa stoi w ~40 plikach — przemianowanie byłoby czystym szumem w dyfie. Wymieniona implementacja, nie nazwa.
  > - `AuthLayout` stracił skupioną poświatę za kartą: istniała po to, żeby szkło miało co załamywać.
  > - `.quote-sheet` na `--elevation-sheet` — kartka wyceny ma cień MOCNIEJSZY niż karty, żeby czytała się jako osobny przedmiot, a nie kolejny panel.
  > - `ui/card.tsx` z `rounded-xl shadow-sm` na tokeny Toolier.
  **Na co uważać — zmiana wobec planu:**
  > - **Krój display przestał być regułą dla `h1, h2` i jest teraz jawnym opt-inem (`.font-display`).** Powód wyszedł dopiero przy przeglądzie kodu: `h2` jest w tej aplikacji niemal wyłącznie **małym** nagłówkiem karty (13–14 px), a w kilku miejscach wręcz etykietą wersalikową. Faculty Glyphic w 13 px z syntetycznym pogrubieniem zalewa światła w szeryfach i wygląda na zepsuty font. Display należy do tytułów, nie do każdego nagłówka.
  > - Przy okazji zdjęte `font-semibold` z **wszystkich czterech** pozostałych par `font-display` + waga (`Topbar`, `AuthLayout`, `HelpPage` ×2). Zrobione tutaj, a nie w T-77/T-80, bo między chunkami aplikacja renderowałaby syntetyczny bold na tytułach.
  ⚠️ **Kolejność:** przed T-77 i T-78. Odwrotnie znaczyłoby restylowanie komponentów dwa razy — raz na szkle, raz na płasko.

- [x] **T-77 Powłoka: szyna i pas** (08-REDESIGN §5, makieta)
  Brązowa szyna z wersalikowymi etykietami, beżowy pas topbara, tytuł strony w Faculty Glyphic, CTA w ramce, awatar i kropka subskrypcji na brązie.
  ✅ `grep -rn "white/\|bg-white\|#131519" src/app/layouts/` zwraca zero — cała powłoka jedzie na tokenach `--rail-*`.
  **Zrobiono:**
  > - Etykiety nawigacji na `.label-caps` (wersaliki ze światłem) — język makiety, ten sam wzorzec co główki tabel.
  > - Blok aktywnej pozycji: beż `--rail-pill`, promień 6 px, tekst w brązie. Pigułka 999 px zniknęła razem z resztą zaokrągleń.
  > - **`nav-pill-stretch` usunięty**, a razem z nim **martwy stan `travelling`** w `ActiveIndicator` (`useState` + `useEffect` + `useRef` + `setTimeout` istniejące wyłącznie po to, żeby odpalić tę animację). Testy pilnują `data-index`, nie animacji — przeszły bez zmian.
  > - Tytuł strony: Faculty Glyphic, wersaliki, światło **dodatnie** `0.06em`. Poprzednie `tracking-[-0.01em]` było ustawieniem pod gęsty grotesk; krój glificzny w wersalikach potrzebuje powietrza między szeryfami.
  > - Nowy wariant przycisku **`frame`** (ramka + wersaliki) — CTA z makiety. Użyty wyłącznie w pasie; w treści zostaje `default` (D-3).
  > - Pole wyszukiwania z `border-white/60 bg-white/45` (liczyło na szkło) na `--surface` + `--hair-strong`.
  ⚠️ **Makieta ma w menu „STUDIO" i nie ma „PULPIT" — nawigacji NIE zmieniono** (D-5). To decyzja produktowa o tym, gdzie mieszka konfiguracja studia, a nie wizualna; osobne zadanie po redesignie.
  ⚠️ **Nie zweryfikowane wizualnie na żywo.** Rozszerzenie Chrome nie było podłączone w tej sesji, więc zrzutu pulpitu obok makiety nikt nie porównał. Sprawdzone pośrednio: dev server odpowiada 200, build przechodzi, a w zbudowanym CSS są `--brown:#33251e`, `--beige:#efece8`, `--ring:#7d6555` i `@font-face` Faculty Glyphic.

- [x] **T-78 Kontrolki shadcn** (08-REDESIGN §5)
  24 komponenty w `src/components/ui/` — warianty `button`, pola formularzy, `switch`, `table`, `tabs`, warstwy nad treścią.
  ✅ Zmiany wyłącznie w klasach `cva`; żaden plik shadcn nie został przepisany od zera.
  **Zrobiono:**
  > - **Skala cieni Tailwinda nadpisana w `@theme`** (`--shadow-xs`…`--shadow-xl`) na warianty w atramencie marki. To jedna zmiana, która ociepla **wszystkie** warstwy nad treścią naraz — dialog, sheet, popover, dropdown, select, tooltip, input. Alternatywą było dopisywanie własnego cienia w kilkunastu plikach.
  > - Welon dialogów i sheetów z `bg-black/50` na `rgba(31,22,17,0.42)`. Czerń na ciepłym beżu odbarwia tło na sino i wygląda jak wygaszony ekran.
  > - Pola (`input`, `textarea`, `select`) z `bg-transparent` na `bg-surface` — pole stojące bezpośrednio na kanwie nie miało czym pokazać, gdzie się zaczyna. Placeholdery na `--ink-faint`.
  > - Główki tabel: beżowy pas + `.label-caps`. Tabela czyta się jako arkusz z nagłówkiem, nie jako lista z pogrubioną pierwszą linijką.
  > - Aktywna zakładka na `bg-surface` zamiast `bg-background` — tor jest na `--surface-2`, a kanwa różni się od niego o trzy punkty jasności i zakładka nie miała czym się odciąć.
  > - Usunięte martwe warianty `dark:` z komponentów, których dotykałem (trybu ciemnego nie ma — T-21).
  **Na co uważać:**
  > - **Przełącznik dostał własny token `--toggle-off`.** Domyślne `bg-input` to rgba brązu 20% — dobre jako ramka pola, ale jako tor daje ~`#e0dad6`, na którym biały kciuk niemal znika. Kciuk zmieniony z `bg-background` (ciepła kanwa) na czystą biel z tego samego powodu.
  ⚠️ **`--ring` brązowy i ≥3:1 wobec obu podłoży** — zrobione w T-74 (`#7d6555`).
  ⚠️ Zmieniać klasy w `cva`, nie przepisywać plików — `npx shadcn add` je kiedyś nadpisze.

- [x] **T-79 Statusy i barwy funkcyjne** (08-REDESIGN §1.3, §1.4)
  Nowe `--status-*` w oliwce/ochrze/terakocie, zestrojony `trial-tone.ts`, trzy chłodne odcienie w `swatches.ts`. Hexy logo Google w `GoogleButton.tsx` **zostały**.
  ✅ `StatusMark` jedzie w całości na `var(--status-*)`, więc statusy przeszły już z T-74 — bez zmian w komponencie.
  **Zrobiono:**
  > - `trial-tone.ts`: `GREEN/AMBER/RED` → `OLIVE/OCHRE/TERRACOTTA` zestrojone z `--positive`/`--warning`/`--danger`.
  > - `swatches.ts`: przestrojone **tylko trzy chłodne** odcienie (`sky`, `plum`, `slate`). `sand`, `sage`, `clay`, `moss` były ciepłe od początku i przeszły bez zmiany.
  > - `GoogleButton` dostał komentarz ostrzegawczy nad znakiem — żeby przyszły sweep szukający hexów ich nie „naprawił".
  > - Zweryfikowana regresja z §2: `Money` → `.tabular` → `--font-sans`. Kwoty są w Inter, nie w Faculty Glyphic.
  **Na co uważać:**
  > - **`trial-tone.ts` NIE dostał tokenów i to jest świadome.** Funkcja interpoluje kanały RGB w JavaScripcie i musi dostać konkretne liczby, a nie nazwę zmiennej CSS rozwiązywaną dopiero przez przeglądarkę. Trzy kotwice są kopiami wartości z `globals.css` — jest to zapisane w komentarzu przy nich i **muszą chodzić w parze**.
  > - **Nazwy kluczy w `swatches.ts` zostały bez zmian** — siedzą w bazie jako `library_categories.color`. Zmieniamy wygląd odcienia, nie jego tożsamość; przemianowanie wymagałoby migracji.
  ⚠️ `trial-tone.test.ts` asertował stare wartości — zaktualizowany razem ze zmianą. Test monotoniczności („im mniej dni, tym cieplejsza barwa") przechodzi na nowych kotwicach bez rozluźniania asercji.

- [ ] **T-80 Ekrany treści** (08-REDESIGN §5)
  Pulpit, klienci, projekty, rejestr wycen, edytor, biblioteka, szablony, pliki, ustawienia, pomoc, subskrypcja, auth, komponenty wspólne.
  ✅ Klik przez wszystkie trasy z `routes.ts` bez elementu w chłodnej szarości.
  ⚠️ **To chunk stylowania, nie refaktoru.** Jeśli przekroczy jeden PR — tnij po obszarach, nie po typach zmian. Pomysły na układ → `docs/IDEAS.md`.

- [ ] **T-81 Dokument wyceny i PDF** (08-REDESIGN §5, 04-PDF)
  `.quote-doc` i `src/pdf/theme.ts` w ciepłym atramencie; biel kartki zostaje biała. Domyślne `accentColor`/`bgColor` brand kitu — tylko dla nowych workspace'ów.
  ✅ PDF na świeżym koncie ma brąz Toolier; PDF istniejącego klienta z własnym akcentem nie zmienia się ani o piksel.
  ⚠️ **Kolor na PDF jest własnością klienta.** Zmiana `default()` w zodzie nie rusza istniejących wierszy — i dobrze. Nadpisanie ich wymagałoby migracji i osobnej decyzji (D-4).

- [ ] **T-82 Domknięcie: dokumentacja, kontrast, build** (08-REDESIGN §5)
  Przepisanie `docs/05-UI.md` §1–§2 (dziś podaje `#F2F4F8` i „literę «T» w czarnym kółku"), nagłówek tezy w `globals.css`, CHANGELOG, zrzuty do README, usunięcie martwych tokenów.
  ✅ Audyt WCAG AA na **czterech** podłożach (szyna, pas, kanwa, karta): tekst ≥4,5:1, kontrolki i `focus-visible` ≥3:1. `pnpm build` i `pnpm tauri build` przechodzą.
  ⚠️ Faculty Glyphic to nowy asset w łańcuchu Vite — sprawdzić, że wchodzi do bundla, a nie tylko do `pnpm dev`.

- [ ] **T-17 Polish & release 1.0**
  Pusty stan onboardingu (3 kroki: logo → biblioteka → pierwsza wycena; po T-62: „przejrzyj bibliotekę przykładową"), obsługa błędów (ErrorBoundary, toasty), ikony aplikacji, `tauri build` Win+mac, podpisywanie (notarization macOS, cert Win — zanotuj w README co trzeba mieć), CHANGELOG.
  ✅ Instalator działa na czystej maszynie.
  > **2026-08-24: przesunięte za T-53…T-66** (decyzja D10). Instalator ma się nazywać `Toolier_*`, więc build finalny dopiero po T-65. Poniższe notatki dotyczą stanu sprzed przesunięcia.
  > **Częściowo zrobione — zadanie zostaje otwarte.** Kod jest gotowy, reszta wymaga certyfikatów i drugiej maszyny.
  > **Zrobione:**
  > - `AppErrorBoundary` **nad providerami** — wyjątek w renderze daje ekran z komunikatem, treścią błędu do skopiowania i zdaniem „dane są bezpieczne", zamiast białej strony. Nie hipoteza: dokładnie tak wyglądał błąd podwójnego montowania edytora w `StrictMode`.
  > - `OnboardingChecklist` na pulpicie: logo → biblioteka → pierwsza wycena. **Znika, gdy wszystko zrobione**, i nie da się jej odhaczyć ręcznie — checklist, który zostaje po wykonaniu, zamienia się w ozdobę. **Nie miga**: dopóki nie wiadomo, co jest zrobione, nie pokazuje się nic.
  > - `CHANGELOG.md` (Keep a Changelog) z zawartością T-30…T-49.
  > - `README.md` → sekcja **„Wydanie 1.0"**: numer wersji w dwóch plikach, certyfikaty Win (EV / Azure Trusted Signing), macOS (Developer ID + notaryzacja, build musi leć na macOS), `tauri icon`, checklista przed ogłoszeniem.
  > - Ikony aplikacji **nie są domyślne** — `src-tauri/icons/` ma własne „A". Sprawdzone.
  > - `npx tauri build` na Windows **przechodzi**: `Anzorge_0.1.0_x64_en-US.msi` i `Anzorge_0.1.0_x64-setup.exe`. `cargo test` zielony (0 testów — warstwa Rust jest minimalna z założenia).
  > **Zostało (poza kodem):**
  > - **Instalator na czystej maszynie** — kryterium odbioru. Zbudowany, ale **nikt go nie uruchomił na maszynie bez Node, Rusta i `.env`**.
  > - **Build macOS** — z Windowsa się nie da.
  > - **Podpis i notaryzacja** — wymagają certyfikatów (Apple Developer, EV/Azure). Co dokładnie mieć, stoi w README.
  > - ~~**Wersja `0.1.0`** w `package.json` i `tauri.conf.json` — przed wydaniem podnieś w obu.~~ → zrobione niżej.
  >
  > **2026-08-25 — domknięta część kodowa (zadanie dalej otwarte).**
  > - **Onboarding mówił nieprawdę po T-62.** Logika kroku „biblioteka" była już poprawna (liczy pozycje bez flagi `is_sample`), ale napis brzmiał „Dodaj pozycje do biblioteki" — a konto startuje z 38 usługami. Teraz: „Ustaw swoje ceny w bibliotece" + „Konto startuje z gotowymi usługami — popraw ceny na swoje albo dodaj własne". Krok zalicza pierwsza poprawiona cena, bo edycja zdejmuje flagę.
  > - **Naprawione wyszukiwanie z przecinkiem** (dług z `IDEAS.md`). `,` i `)` rozdzielają warunki w `or(...)` PostgREST-a, a backslash **nie jest** tam znakiem ucieczki — „Kowalski, Jan" wracało błędem `failed to parse logic tree`. T-53 naprawił klientów i projekty, ale **wyceny i biblioteka zostały zepsute**. Cytowanie wyjęte do `data/repos/postgrest-filters.ts` (`ilikeFilter`, `ilikeAnyOf`) i podpięte we wszystkich czterech repozytoriach — cztery kopie jednego cytowania to cztery okazje, żeby piąte wyszukiwanie znów je zgubiło. 7 testów jednostkowych + 3 integracyjne; **sprawdzone, że na starym kodzie padają** (cofnięta poprawka → `failed to parse logic tree`).
  > - **Wersja podniesiona do `1.0.0`** w `package.json`, `tauri.conf.json` **i `Cargo.toml`** — README mówił o dwóch plikach, a numer stoi w trzech. Nagłówek CHANGELOG zostaje `[Nieopublikowane]` do chwili wydania: sekcja z datą znaczy „to jest u ludzi", nie „to jest zbudowane u nas".
  > **Zostało bez zmian (po stronie właściciela):** instalator na czystej maszynie, build i notaryzacja macOS, certyfikaty.

- [x] **T-70 Tworzenie wyceny: zakres zamiast listy** (inspiracja 1 + 2, koncepcja §5)
  Z inspiracji bierzemy **sposób działania, nie wygląd**. Dziś zbudowanie wyceny na 20 pozycji to 20 cykli „otwórz picker → szukaj → kliknij → picker się zamyka". Inspiracje pokazują odwrotny kierunek: **zaznaczasz zakres — co i dla których pomieszczeń — a aplikacja składa dokument.**
  1. **Wielokrotny wybór z biblioteki.** Picker przestaje zamykać się po jednej pozycji: zaznaczasz ptaszkami ile chcesz i wstawiasz jednym „Dodaj (N)". Dziś `pickItem` woła `setOpen(false)` po każdym kliknięciu (`LibraryPicker.tsx`).
  2. **Filtr kategorii jako pigułki** (inspiracja 1: „Wszystkie · 01. Przygotowanie · 02. Układ przestrzeni…"). Picker grupuje po kategorii, ale nie pozwala zawęzić — przy 38 usługach z biblioteki przykładowej (T-62) lista jest dłuższa niż okno.
  3. **Pomieszczenia widoczne przy dodawaniu usługi.** Inspiracja 2 mówi: *„Podczas tworzenia wyceny wybierasz pomieszczenia, dla których chcesz dodać usługę. System automatycznie pobierze odpowiednie stawki z biblioteki"*.
     ⚠️ **Odstępstwo od litery inspiracji, świadome.** W naszym modelu usługa `per_room` liczy się po **zasięgu** (`roomScope`: wszystkie / część wizualna / techniczna), a nie po dowolnym podzbiorze pomieszczeń — dowolny podzbiór per pozycja to zmiana w `calcItemCents`, czyli w ścieżce liczącej pieniądze, i osobne zadanie. Zamiast tego bierzemy **to, co ta obietnica ma naprawdę dać**: dodanie usługi liczonej za pomieszczenie do wyceny **bez pomieszczeń** daje dziś po cichu samą bazę (często 0 zł) — picker ma to powiedzieć w chwili dodawania i dać skrót do panelu pomieszczeń. Wiersz pokazuje też zasięg, żeby było wiadomo, które pomieszczenia się liczą.
  4. **Widać sposób wyceny, ZANIM klikniesz** (inspiracja 1: „Za m² · 12,00 zł/m²", „Według pomieszczeń · od 250,00 zł"). Dziś wiersz pickera pokazuje samą kwotę, więc „250,00 zł" przy usłudze liczonej per pomieszczenie wygląda na cenę końcową.
  5. **Szablon wybierany przy zakładaniu wyceny** (koncepcja §5 pkt 7), a nie po otwarciu pustego edytora — `NewQuoteDialog` dostaje trzecie pole „Zacznij od: pusta / szablon".
  ✅ Wycena z sześcioma pomieszczeniami i kilkunastoma usługami powstaje bez ani jednego zamknięcia i ponownego otwarcia pickera.
  ⚠️ **To nie jest kreator krok-po-kroku.** Edytor zostaje jednoekranowy; wielokrotny wybór jest dodatkiem do dzisiejszej ścieżki, a nie zamiast niej — „Z biblioteki" przy pojedynczym wierszu zostaje, bo dopisanie jednej pozycji do gotowej oferty to najczęstsza czynność.
  **Zrobiono:**
  > - **Kliknięcie dodaje i picker zostaje otwarty**, zamiast ptaszków i osobnego „Dodaj (N)" z pierwotnego opisu. Checkbox z commitem kosztuje przy jednej pozycji dwa kliknięcia zamiast jednego, a dopisanie jednej usługi do gotowej oferty jest najczęstszą czynnością — natychmiastowe dodanie jest szybsze przy KAŻDYM N. Dodane wiersze dostają licznik („Dodano ×2"), stopka pokazuje sumę i „Gotowe".
  > - **Ta sama usługa dodana dwa razy liczy się dwa razy** — dwie wizualizacje to dwie pozycje; blokada byłaby zgadywaniem.
  > - `CategoryPills` — filtr grup nad listą, pasek przewija się w poziomie (popover ma stałą szerokość, a lista usług jest tym, po co się go otwiera).
  > - `library-row-summary.ts` — wiersz pokazuje **sposób wyceny obok stawki**. To była realna pułapka: „250,00 zł" przy usłudze `per_room` wyglądało na cenę końcową, a jest stawką za jedno pomieszczenie.
  > - Ostrzeżenie w wierszu, gdy usługa liczona za pomieszczenie trafia do wyceny **bez pomieszczeń** (policzyłaby samą bazę, często 0 zł), ze skrótem „Dodaj pomieszczenia".
  > - `NewQuoteDialog` dostał „Zacznij od" — pustej wyceny albo szablonu. Szablon wnosi **cały pakiet z T-63** (układ, termin, dokumenty), a `scheduleFromTemplate` zeruje datę startu.
  > **Na co uważać:**
  > - **Picker czyta pomieszczenia ze store'u, nie z propsów.** `SectionBlock` jest zmemoizowany; nowy callback przy każdym renderze rodzica przerysowywałby wszystkie wiersze przy każdej literze (pułapka z T-39).
  > - **`close()` jest jedyną drogą wyjścia.** Reset licznika w samym `onOpenChange` nie wystarczał — `setOpen(false)` z przycisku omija handler Radiksa i zostawiał stan poprzedniej sesji. Złapane testem.
  > - Skrót „Dodaj pomieszczenia" używa `onMouseDown` z `preventDefault`: `CommandItem` wybiera pozycję już przy wciśnięciu, więc zwykły `onClick` najpierw dodałby usługę.
  > - `AppShell.test` musiał dostać mock `useTemplates` — dialog wisi w powłoce także zamknięty, więc hook i tak się wykonuje.

- [x] **T-71 Tworzenie wyceny: panel „Dodaj usługi” z tabelą** (inspiracja 1 + 2, po zgłoszeniu właściciela 2026-08-25: „nadal nie tak czytelne")
  T-70 dał wielokrotny wybór, ale w **popoverze 340 px** — kolumny z inspiracji 1 (usługa · grupa · sposób wyceny · stawka) nie miały gdzie stanąć, a ostrzeżenie o braku pomieszczeń powtarzało się przy każdym wierszu i zamieniało w tło. W trybie edycji pola nie różniły się od tekstu (podświetlenie dopiero pod kursorem), a nad pozycjami nie było nagłówka kolumn — liczba „1" obok kwoty była zagadką.
  ✅ Wycena z kilkunastoma usługami z dwóch sekcji powstaje z jednego otwarcia panelu; w edycji od razu widać, co jest polem i co znaczy każda kolumna.
  **Zrobiono:**
  > - **`ScopePanel`** (`editor/scope/`) — panel boczny na całą wysokość (`sm:max-w-4xl`) z **tabelą jak w inspiracji 1**: nagłówek kolumn, wiersz = nazwa + opis · pigułka grupy w kolorze ze słownika · ikona + etykieta sposobu wyceny · stawka („12,00 zł / m²", „od 250,00 zł", „wycena indywidualna") · przycisk „Dodaj" z licznikiem. Nad tabelą: **„Dodaj do: Sekcja › Grupa"** (`ScopeTargetSelect` — cel zmienny bez zamykania), szukajka, licznik „N usług", zakładki **Usługi | Zestawy**, pigułki grup (zawijane — tu jest miejsce). Kolejność grup = kolejność z bazy (`sort_order`), nie alfabetyczna.
  > - **Jedno ostrzeżenie o braku pomieszczeń** nad listą (tylko gdy widać usługę liczoną za pomieszczenie), z tekstem „jak to działa" (05-UI §3a pkt 5) i przyciskiem „Dodaj pomieszczenie"; po dodaniu zamienia się w jednolinijkową informację „policzą się dla N pomieszczeń".
  > - **`useInsertFromLibrary`** — przeliczenie jednostek albo odmowa (F2.2) wyjęte z `LibraryPicker` do wspólnego hooka; panel i popover zachowują się identycznie. `PRICING_CHOICE_ICONS` wyjęte z `PricingChoicePicker` — ta sama ikona na karcie usługi i w kolumnie panelu.
  > - **`useScopePanel`** — osobny malutki store (open + cel). Bloki są zmemoizowane; akcja ze store'u ma stałą referencję, więc `SectionBlock`/`GroupBlock` biorą ją same, bez nowych propsów (pułapka z T-39).
  > - **W sekcji: wyraźny przycisk „Dodaj usługi"** (pigułka z obrysem) + linki „Pozycja ręcznie" · „Z biblioteki" (popover z T-70 zostaje — szybkie dopisanie jednej pozycji) · „Rozpisz na pomieszczenia". W grupie to samo jako linki (blok pomieszczenia zachowuje „Do wszystkich pomieszczeń").
  > - **`ItemsColumnsHeader`** — nagłówek *Usługa · Ilość · Cena* nad pozycjami sekcji/grupy, **tylko w edycji** i tylko gdy są pozycje. Szerokości zgodne z `ItemRow`.
  > - **Pola inline w edycji mają kreskowaną ramkę** (`globals.css`): widać, co jest polem, zanim się najedzie; hover/focus zamienia ją w pełną z tłem sage. W podglądzie ramka dalej przezroczysta — layout nie skacze (trik z prototypu zachowany).
  **Na co uważać:**
  > - **Panel jest jeden na wycenę, renderowany w `QuoteEditorPage`** obok `LibrarySheet`. Dostaje `handleInsertItems` (rozdziela rabaty) i `insertGroup` — te same ścieżki co popover, żadnej nowej drogi do store'u.
  > - **Zestaw nie wchodzi do grupy** — gdy cel ma `groupId`, zakładka „Zestawy" znika, a nie jest wyszarzona (zasada „zakładka bez funkcji nie istnieje").
  > - **`finish()` jest jedyną drogą wyjścia** (także `onOpenChange(false)`), zeruje licznik, szukajkę i filtr — ta sama lekcja co `close()` w T-70.
  > - Wariant mobilny wiersza (`sm:hidden`) dubluje sposób wyceny pod nazwą — w jsdom oba są „widoczne", test liczy `getAllByText`.
  > - `QuoteEditorPage.smoke.test` dostał mock `useLibraryCategoryList` — panel wisi w stronie także zamknięty, więc hook i tak się wykonuje (jak `useTemplates` w T-70).
  > - **Nie sprawdzone na żywo** w tej sesji (brak podłączonej przeglądarki): układ kolumn tabeli i wygląd kreskowanych ramek — obejrzeć w `pnpm dev` przed merge'em.

- [x] **T-72 Biblioteka: usługi jako zwijane wiersze** (inspiracja 1; zgłoszenie właściciela 2026-08-25: „katalog biblioteki zasypany objętościowo")
  Zakładka Usługi pokazywała każdą usługę jako rozłożoną kartę edycji w siatce 3 kolumn — z biblioteką przykładową (38 wpisów) to trzynaście rzędów formularzy. Inspiracja 1 pokazuje listę: jeden wiersz na usługę, kolumny mówią, czym się różni, a edycja jest osobnym krokiem.
  ✅ Lista 38 usług mieści się na jednym ekranie; klik w wiersz rozwija dotychczasowy formularz, drugi klik zwija; „Aktywna" przełącza się z listy.
  **Zrobiono:**
  > - **`LibraryItemRow`** — zwinięty wiersz: nazwa (+ badge „Przykładowa", „nieaktywna") i opis · pigułka grupy w kolorze ze słownika · ikona + sposób wyceny · stawka („12,00 zł / m²", „od 250,00 zł", „wycena indywidualna") · przełącznik **Aktywna** · chevron. Nagłówek kolumn nad listą (`ROW_GRID` wspólny dla nagłówka i wierszy). Na wąskim ekranie sposób wyceny i stawka schodzą pod nazwę.
  > - **Rozwinięcie = dotychczasowa `LibraryItemCard`** z propsem `embedded` (bez własnej karty, bez powtórzonego badge'a). Formularz, kaskada, warianty, reguły cenowe — bez zmian; zmienia się tylko to, kiedy je widać.
  > - **Rozwinięty jest co najwyżej jeden wiersz** (`expandedId`). Nowo dodana usługa rozwija się sama (`onSuccess` z `createItem`) — inaczej „Nowa pozycja" lądowała zwinięta gdzieś na liście.
  > - Przełącznik „Aktywna" stoi **poza** przyciskiem rozwijania: zmiana stanu z listy nie otwiera formularza (05-UI §3a.3). Zapis idzie prosto przez `updateItem` z `{ active }` — kaskady nie ma, bo `active` nie jest polem kaskadowanym.
  > - Wiersz używa `libraryRowSummary` z edytora i `PRICING_CHOICE_ICONS` — ta sama etykieta i ikona w bibliotece, w panelu „Dodaj usługi" i w popoverze.
  **Na co uważać:**
  > - **Testy karty muszą najpierw rozwinąć wiersz** (`expand(user)` w `LibraryItemsTab.test`). Formularza nie ma w DOM, dopóki nikt nie kliknie.
  > - `createItem.mutate` dostaje teraz **drugi argument** (`onSuccess`) — asercje `toHaveBeenCalledWith(vars)` przestały pasować, sprawdzają `mock.calls[0][0]`.
  > - Szkic niezapisanej edycji **przepada przy zwinięciu** (karta odmontowuje się). Przycisk „Zapisz" jest widoczny dopóki jest co zapisać; jeśli to będzie bolało, następny krok to pytanie „Porzucić zmiany?" przy zwijaniu.
  > - Przełącznik lista–siatka z 05-UI §3 **nie powstał** — siatka kart była problemem, nie alternatywą; wróci, jeśli ktoś o nią poprosi.
  > - **Nie sprawdzone na żywo** (brak przeglądarki w sesji): szerokości kolumn na 1280 px i wygląd osadzonej karty.

- [x] **T-73 Pomoc w nawigacji, Ustawienia pod kreską, pomieszczenia tylko w Bibliotece** (zgłoszenie właściciela 2026-08-25)
  Trzy szybkie poprawki: (1) typy pomieszczeń były edytowalne w dwóch miejscach (Ustawienia i Biblioteka) — to pytanie „które liczy"; (2) Ustawienia stały w jednym rzędzie z obszarami pracy; (3) nie było żadnej pomocy w aplikacji.
  ✅ Ustawienia bez sekcji pomieszczeń; sidebar: Pulpit · Klienci · Wyceny · Biblioteka · Szablony | Pomoc · Ustawienia; `/pomoc` z kompletnym poradnikiem w stylu aplikacji.
  **Zrobiono:**
  > - **`NavItem.group`** (`main` | `system`) i `navItemsOf()`; `Sidebar` rysuje dwie grupy oddzielone kreską, **każda z własnym `ActiveIndicator`** — kulka liczy pozycję z indeksu wiersza, więc wspólna musiałaby przeskakiwać przez separator. `activeNavIndex` dalej liczy po całej liście; blok przelicza na indeks lokalny.
  > - `RoomTypesSection` zdjęta z `SettingsPage`; komponent zostaje (Biblioteka → Pomieszczenia). Testy sekcji przeniesione do **`RoomTypesSection.test.tsx`** (renderują sekcję wprost), w `SettingsPage.test` został jeden test-strażnik: „NIE ma pomieszczeń w Ustawieniach".
  > - **`/pomoc`** — `HelpPage` + `HelpBlocks` (`features/help/`), treść w **`src/i18n/help.pl.ts`** jako dane (`HelpSection[]` z blokami `p` / `steps` / `list` / `tip` / `warn` / `keys` / `faq`). 14 sekcji: Pierwsze kroki · Klienci i projekty · Wycena · Statusy i wersje · Termin · Dokumenty · PDF i branding · Biblioteka · Szablony · Pliki · Ustawienia · Subskrypcja · Skróty · FAQ. Spis treści przyklejony, podświetla bieżącą sekcję (`IntersectionObserver`, wyłączany, gdy go nie ma — jsdom). Test pilnuje, że każda z 14 sekcji istnieje i że szybkie linki prowadzą do istniejących kotwic.
  **Na co uważać:**
  > - **Poradnik opisuje stan 1.0 i trzeba go aktualizować razem z funkcją** — tekst mówi m.in. „kosza jeszcze nie ma", „Ctrl+S / Ctrl+K" (jedyne skróty w kodzie), „25 MB / 2 GB", „14 dni, 98,99 / 999,99". Zmiana którejś z tych rzeczy bez poprawki w `help.pl.ts` zostawi poradnik kłamiący.
  > - Skrótu `⌘P` z 05-UI §5 **nie ma w kodzie** — poradnik go nie wymienia. Jeśli ma być, to osobna zmiana w `QuoteEditorPage`.
  > - `pl.settings.roomTypes*` zostają — używa ich `RoomTypesSection` w bibliotece (klucz jest w `settings`, bo tam sekcja powstała).
  > - **Nie sprawdzone na żywo**: kreska między grupami w zwiniętym pasku i podświetlanie spisu treści przy przewijaniu.

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

- [x] **T-44 Harmonogram — zakładka w edytorze** (F5.2)
  Zakładki **Wycena | Termin | Dokumenty**, tabela etapów, karta wyniku, Gantt na czystym CSS, auto-sync etapów po tagach pozycji.
  ✅ Zmiana pomieszczeń w zakładce Wycena zmienia wynik w zakładce Termin.
  ⚠️ Zakładki zmieniają szkielet `QuoteEditorPage`, który dziś jest jednym widokiem z własnym paskiem (`handle.hideTopbar`). Zaplanuj, co się dzieje z autozapisem i `LibrarySheet` przy przełączaniu zakładek — store jest jeden na całą wycenę.
  > **Zrobione.** Zakładki w edytorze, `ScheduleTab` + `StageRow` + `ScheduleResultCard`, harmonogram w store i w autozapisie, `newStage`, podpowiedź po etykietach pozycji, `NumberField`. 858 testów jednostkowych, 66 integracyjnych.
  > **Rozstrzygnięcie ostrzeżenia z zadania (autozapis i store przy zakładkach):**
  > - **Harmonogram siedzi w TYM SAMYM store co `body`** i jedzie **jednym zapisem**. Obie zakładki piszą do tego samego wiersza, więc dwa niezależne cykle zapisu deptałyby sobie po `updated_at` i każdy kończyłby się konfliktem u drugiego.
  > - **Przełączenie zakładki nie odmontowuje dokumentu** — zakładka „Wycena" jest ukrywana klasą, a nie zdejmowana z drzewa. Odmontowanie zrywałoby stan przewijania, otwarte panele i (co gorsza) uruchamiało `reset` z `ExistingQuoteEditor`.
  > - `LibrarySheet` i pasek narzędzi zostają wspólne dla obu zakładek: to jeden dokument, więc numer, status i wskaźnik zapisu mają być w jednym miejscu.
  > **Na co uważać:**
  > - **Harmonogram zakłada się dopiero przy pierwszym wejściu na zakładkę i tylko w trybie edycji.** Samo obejrzenie wyceny nie ma prawa zmienić dokumentu ani zabrudzić autozapisu; `null` w kolumnie to uczciwsza informacja niż jedenaście domyślnych etapów w każdej ofercie. `ensureSchedule` jest idempotentne.
  > - **Podpowiedź po etykietach tylko WŁĄCZA etapy i tylko raz na etap.** Automat cofający ręczne wyłączenie jest nie do zniesienia, a ciche wyłączenie etapu po zniknięciu pozycji skracałoby termin bez wiedzy użytkownika. Komunikat pozwala cofnąć.
  > - **`NumberField` powstał z realnego błędu, który złapał test.** Naiwne pole (`value={liczba}` + `onChange` odrzucający niepoprawne wejście) jest nie do użycia: skasowanie zawartości daje pusty string, ten nie przechodzi walidacji, React przywraca starą liczbę, a kolejna cyfra dokleja się do niej („5" → „56"). Pole trzyma teraz szkic jako tekst. **Ten sam wzorzec siedzi jeszcze w polu ilości pomieszczenia i liczbie kadrów** — do przepięcia przy okazji.
  > - **Pasek etapów NIE jest wykresem Gantta z osią czasu.** Kolejność etapów nie oznacza ich rozłożenia w kalendarzu (nie modelujemy zależności), więc oś obiecywałaby precyzję, której tu nie ma. Pasek pokazuje proporcje — czyli to, co naprawdę wiemy.
  > **Odstępstwo:** zakładki to **Wycena | Termin**, bez „Dokumenty". Zakładka prowadząca do „wkrótce" jest gorsza niż jej brak — dojdzie razem z F6 (T-46…T-48).

- [x] **T-45 PDF „Szacowany termin”** (F5.3)
  `SchedulePdfDocument`, tabela pomieszczenia × etapy, blok „Ramy czasowe”, osobna ważność.
  ✅ A4 mieści 18 pomieszczeń bez łamania wiersza w środku.
  > **Zrobione.** `pdf/schedule-content.ts` (reguły treści), `pdf/SchedulePdfDocument.tsx`, `useExportSchedulePdf`, `scheduleFileName`, pozycja „Eksportuj termin" w menu edytora. 871 testów jednostkowych.
  > **Na co uważać:**
  > - **Macierz obejmuje wyłącznie etapy ZALEŻNE od pomieszczeń.** Kolumna dla etapu liczonego na cały projekt miałaby w każdym wierszu to samo — nie niosłaby informacji, a zabierała szerokość, której na A4 nie ma w nadmiarze. Takie etapy idą listą pod tabelą. To odstępstwo od dosłownego odwzorowania `TERMIN - DOKUMENT` B15–N32 i jest świadome.
  > - **Wiersze mają `wrap={false}`** — kryterium „18 pomieszczeń bez łamania wiersza". Bez tego połowa znaczników ląduje na dole jednej kartki, a połowa na górze drugiej. Nagłówek tabeli jest `fixed`, więc druga strona nie jest kolumnami znaczków bez wyjaśnienia.
  > - **Pomieszczenie odznaczone w OBU częściach nie trafia do dokumentu** — jego wiersz byłby pasem myślników, czyli informacją o tym, czego nie ma. Klient czyta dokument o tym, co robimy.
  > - **Etapy bez czasu (wyłączone albo zerowe) wypadają** — wiersz o niczym tylko wydłuża dokument.
  > - **Ważność jest osobna od oferty i krótsza (7 dni).** Termin starzeje się szybciej niż cena: zależy od tego, kiedy projekt ruszy, a nie od cennika.
  > - **Nazwa pliku ma przyrostek `-termin`.** Pakiet dla jednego inwestora to kilka plików o tym samym numerze — bez rozróżnienia drugi zapis nadpisałby pierwszy.
  > - Ramy czasowe stoją **na górze**, nie na końcu: to jedyna liczba, po którą inwestor sięga, otwierając ten dokument.
  > **Nie zweryfikowane wizualnie:** render sprawdzony nagłówkiem `%PDF-` i rozmiarem, treść — czystymi funkcjami (`renderToString` zwraca binarny plik, patrz pułapka z T-13). Samego wyglądu na papierze nikt jeszcze nie oglądał.

- [x] **T-46 Dokument „Etapy współpracy”** (F6.1)
  Migracja `workspace_doc_templates`, seed 19 etapów, zakładka Dokumenty, `StagesPdfDocument`.
  ✅ Parytet z arkuszem `ETAPY WSPÓŁPRACY`.
  ⚠️ To **nie to samo** co T-11: tam szablon całej wyceny (tabela `templates`), tu szablon dokumentu towarzyszącego. Nazwy w UI muszą je rozróżniać, inaczej użytkownik utonie w dwóch „szablonach”.
  > **Zrobione.** `domain/documents/` (schemat + 19 etapów w 5 częściach), migracja `0013_quote_documents.sql` (kolumna `quotes.documents`), zakładka **Dokumenty** w edytorze (`StagesDocTab`), `StagesPdfDocument` + `useExportStagesPdf` + pozycja „Eksportuj etapy współpracy (PDF)” w menu. 902 testy jednostkowe.
  > **Na co uważać:**
  > - **Etapy poza zakresem ZOSTAJĄ na liście i w PDF, z krzyżykiem.** To jest sedno tego dokumentu — inwestor ma przeczytać, czego nie zamawia, zanim dowie się o tym w połowie projektu. Znikający etap zamienia dokument o zakresie w listę życzeń. Odznaczony etap **nie jest przekreślony ani wyszarzony do nieczytelności** — zmienia się sam kolor.
  > - **Odstępstwo: bez tabeli `workspace_doc_templates`.** Szablon etapów siedzi w `workspaces.settings.stagesTemplate`. Osobna tabela dla jednej listy per workspace to RLS, migracja i repozytorium za rzecz, która jest ustawieniem. Wróci, jeśli szablonów ma być wiele albo mają być wersjonowane.
  > - **Odstępstwo: dokumenty są częścią wyceny (`quotes.documents`), nie osobną encją.** Pakiet dla jednego inwestora nosi jeden numer, jednego klienta i jedną stopkę — osobne encje znaczyłyby synchronizowanie tych trzech rzeczy. `null` = „ta wycena nie ma dokumentów dodatkowych” i jest w pełni poprawnym stanem.
  > - **Ważność jest w samym dokumencie (14 dni), nie w argumencie eksportu** — inaczej niż przy terminie (F5.3). Etapy są zakresem umowy, więc to użytkownik decyduje w zakładce, jak długo deklaracja obowiązuje.
  > - **Nazwa pliku ma przyrostek `-etapy`.** Ta sama zasada co przy `-termin`: bez rozróżnienia drugi zapis nadpisałby pierwszy.
  > - **`linkedItemTags` działa jak w F5.2** (`useStageEntryAutoSync`): włączona pozycja z etykietą wciąga pasujący etap do zakresu — raz na etap, tylko w edycji, tylko w jedną stronę, z cofnięciem. Dokument mówiący „nie robimy wizualizacji” obok pozycji „Wizualizacje 3D” w cenniku jest gorszy niż brak dokumentu.
  > - **Dokument zakłada się dopiero przy pierwszym wejściu w zakładkę i tylko w trybie edycji** — obejrzenie oferty nie ma prawa dopisać jej dokumentu ani zabrudzić autozapisu.
  > **Nie zweryfikowane:** „parytet z arkuszem `ETAPY WSPÓŁPRACY`” sprawdzony **strukturalnie** (19 etapów, 5 części, podział zgodny ze specyfikacją). **Brzmienie opisów jest nasze, nie przepisane z arkusza** — samego pliku nie ma w repozytorium. Warto skonfrontować z oryginałem, zanim trafi do klientów. Wyglądu PDF na papierze nikt nie oglądał (render sprawdzony nagłówkiem `%PDF-` i rozmiarem).

- [x] **T-47 Dokument „Cennik usług dodatkowych”** (F6.2)
  Przedziały cen, jednostka `zł/h`, termin realizacji, `formatMoneyRange`, `PriceListPdfDocument`, przycisk „Dodaj do wyceny jako pozycję”.
  ✅ Parytet z arkuszem `CENNIK USŁUG DODATKOWYCH`.
  > **Zrobione.** `domain/documents/price-list.ts` + szablon 11 pozycji w 3 grupach, `formatMoneyRange` w `domain/money.ts`, podzakładki **Dokumenty → Etapy | Cennik** (`DocumentsTab`), `PriceListPdfDocument` + `useExportPriceListPdf` + pozycja w menu, most „Dodaj do wyceny jako pozycję”. 944 testy jednostkowe. **Bez migracji** — cennik mieszka w `quotes.documents` z T-46.
  > **Na co uważać:**
  > - **Cena jest PRZEDZIAŁEM, nie liczbą.** `priceMaxCents = null` znaczy „jedna cena” i to jest znaczące: „300 zł” to zobowiązanie, „300–1200 zł” to widłki. Dlatego w PDF **nie ma sumy** — suma widłek nic nie znaczy, a wyglądałaby jak kwota do zapłaty.
  > - **Most do wyceny bierze DOLNĄ granicę.** Z widłek trzeba wybrać jedną liczbę; górna zawyżałaby ofertę bez pytania. Komunikat mówi, do której sekcji pozycja trafiła i że kwota jest z dolnej granicy — to decyzja, nie oczywistość.
  > - **W wycenie godzinowej kwota jest przeliczana po stawce** (`convertUnits`), a bez stawki most **odmawia** — dokładnie ta pułapka z §8.5 `FEATURES`: 300 zł wstawione jako 300 minut to błąd, którego nikt by nie zauważył.
  > - **Separator tysięcy zostawiamy locale’owi.** pl-PL (CLDR `min2`) pisze „1200 zł”, ale „10 000 zł”. Wygląda na przeoczenie, jest regułą języka — i tak samo zachowuje się `formatMoney`, więc cennik nie rozjeżdża się z ofertą w tej samej kopercie.
  > - **Drugi poziom zakładek**, nie czwarta pozycja na górnym pasku: „Etapy” i „Cennik” to ten sam rodzaj rzeczy (dokument dla tego samego inwestora), a „Wycena” i „Termin” to co innego. F6.3 doda kolejne.
  > - **Zakładanie cennika nie rusza etapów** i odwrotnie — oba dokumenty siedzą w jednym polu `documents`, więc `ensure*` musi przepisywać to drugie jawnie (jest na to test).
  > **Nie zweryfikowane:** „parytet z arkuszem” sprawdzony **strukturalnie** (3 grupy, przedziały, jednostka `zł/h`, termin). **Kwoty i terminy w szablonie są nasze, nie przepisane z arkusza** — pliku nie ma w repozytorium. Wyglądu PDF na papierze nikt nie oglądał.

- [x] **T-48 Eksport pakietu dokumentów** (F6.3)
  Dialog wyboru dokumentów, scalanie do jednego PDF albo osobne pliki, nazwy `{number}-wycena.pdf`, ważność per dokument.
  ✅ Pakiet 4 dokumentów < 5 s, ciągła numeracja stron w trybie „jeden plik”.
  ⚠️ `pdf-lib` — nowa zależność, uzasadnij w PR.
  > **Zrobione.** `pdf/merge.ts` (scalanie + ciągła numeracja), `pdf/package-plan.ts` (czyste reguły: co, w jakiej kolejności, pod jaką nazwą), `usePackageExport`, `ExportPackageDialog`, pozycja „Eksportuj pakiet dokumentów…” w menu. 970 testów jednostkowych.
  > **Uzasadnienie `pdf-lib`:** `@react-pdf` renderuje **jeden** dokument na wywołanie i nie umie doszyć stron do cudzego pliku. Bez tej zależności trzeba by złożyć pakiet jako jeden `<Document>` z czterema `<Page>` — czyli zlać cztery dokumenty o **różnej ważności i różnym przeznaczeniu** w jeden byt tylko po to, żeby uniknąć paczki. `pdf-lib` jest czystym JS-em (bez binarki, bez procesu w tle), więc działa w webview tak samo jak w teście.
  > **Na co uważać:**
  > - **Ciągła numeracja jest sednem trybu „jeden plik”.** Cztery dokumenty z własnymi numeracjami od jedynki to nie pakiet, tylko cztery pliki w jednej kopercie. Numer rysuje wbudowana **Helvetica**, więc podpis strony musi zostać w WinAnsi — `${page} / ${total}` jest bezpieczne, polskie diakrytyki nie.
  > - **`mergePdfs([])` RZUCA, nie zwraca pustki.** `pdf-lib` po zapisie i odczycie robi z dokumentu bez stron jedną **pustą stronę** — biała kartka wysłana inwestorowi jest gorsza niż odmowa.
  > - **`PDFDocument.load(new Uint8Array(part))`, nie `load(part)`.** `pdf-lib` sprawdza typ przez `instanceof`, a bajty z innego realmu (Node `Buffer` z `renderToBuffer`, wynik z Web Workera) tego testu nie przechodzą i lecą jako „typ NaN”. Kosztowało to jeden fałszywy trop przy pisaniu testu.
  > - **Dokument, którego wycena nie ma, NIE pojawia się w dialogu** — nawet jako odznaczony. Checkbox, którego nie da się zaznaczyć, to pytanie bez odpowiedzi. Domyślnie zaznaczone jest wszystko, co jest: pakiet to całość, a odznaczenie — świadoma decyzja.
  > - **Tryb „osobne pliki” pyta o FOLDER, nie o każdą nazwę.** Cztery dialogi zapisu pod rząd to nie wybór, tylko przeszkoda; nazwy i tak wynikają z numeru wyceny. Ścieżki sklejamy przez `joinPath` (Tauri), a nie ręcznym ukośnikiem.
  > - **Dokumenty renderują się równolegle** (`Promise.all`) — szeregowanie ich tylko dlatego, że kod czyta się liniowo, kosztowałoby sekundy.
  > **Nie zweryfikowane:** kryterium **„< 5 s” nie jest sprawdzone w warunkach docelowych.** Zmierzony render czterech dokumentów plus scalanie: **~0,1–0,25 s w Node**, ale **bez osadzonych fontów** (test używa wbudowanej Helvetiki) i bez Web Workera. W aplikacji dochodzi embedowanie Intera, więc realny czas będzie wyższy — rząd wielkości nadal daleko od 5 s, ale **liczby z appki nikt jeszcze nie zmierzył**. Test wydajnościowy asertuje luźny próg 30 s (zegar ścienny w CI to loteria); łapie katastrofę, nie regresję o 200 ms. Wyglądu scalonego pliku na papierze nikt nie oglądał.

- [x] **T-49 Rejestr ofert — pola z arkusza `OFERTY`** (F7.1)
  `quotes.city`, `internal_notes`, `doc_kind`; kolumna „Miasto”, filtr, szybkie notatki; eksport CSV w układzie arkusza.
  ✅ Eksport otwiera się w Excelu bez przekodowania (UTF-8 BOM, separator `;`).
  ⚠️ Pokrywa się z **T-23** (import/eksport CSV) i **T-18** (klienci — `city` naturalnie należy do klienta, nie do wyceny). Zrób te trzy razem albo świadomie zduplikuj `city`.
  > **Zrobione.** Migracja `0014_quotes_register_fields.sql`, `body.client.city`, `lib/csv.ts`, `list/register-csv.ts`, kolumna „Miasto” + filtr + popover notatek, przycisk „Eksportuj rejestr (CSV)”. `QuotesListPage` rozbity na `QuotesToolbar` i `QuotesTable` (przekroczył 250 linii). 997 testów jednostkowych.
  > **Na co uważać:**
  > - **`city` jest świadomie ZDUPLIKOWANE** — tak jak ostrzegało zadanie. Źródłem prawdy jest `body.client.city`, a kolumna `quotes.city` to kopia dla listy i filtra, dokładnie na zasadzie `client_name`. Tabeli `clients` (T-18) jeszcze nie ma; **przy T-18 trzeba będzie rozstrzygnąć, które z tych dwóch miejsc wygrywa.**
  > - **`internal_notes` NIE idzie do `body`** i to jest sedno tego pola: notatki są wewnętrzne, nigdy nie trafiają do PDF, a `body` bywa kopiowane do szablonu i duplikatu. Notatka „klient marudzi przy każdej zmianie” powielona do szablonu to wypadek nie do cofnięcia.
  > - **`doc_kind` ustawia człowiek, nie automat.** Wycena, która ma cennik dodatkowy, nie jest „samym cennikiem” — o tym, co poszło do inwestora, wie tylko autor. Ustawia się go w tym samym popoverze co notatki.
  > - **Notatka zapisuje się po opuszczeniu pola, nie przy każdym znaku** — to lista, nie edytor; mutacja na literę zalałaby bazę i migała optymistycznymi aktualizacjami wiersza. Jest na to test.
  > - **CSV: separator `;` i BOM UTF-8.** Excel w PL czyta przecinek jako separator dziesiętny, a bez BOM-u „Kraków” robi się „KrakÃ³w”. Wiersze CRLF. Wiodące `=`, `+`, `-`, `@` poprzedzamy apostrofem — **CSV injection**: notatka `=HYPERLINK(...)` w cudzym arkuszu to nie żart.
  > - **Eksport bierze to, co WIDAĆ po filtrach.** Plik inny niż lista na ekranie byłby gorszy niż brak eksportu.
  > - **Rejestr to osobne zapytanie** (`listQuoteRegister`) — telefon i e-mail siedzą w `body`, a lista nie ma prawa ciągnąć dokumentów przy każdym otwarciu. Uszkodzony `body` trafia do rejestru z tym, co wiadomo z kolumn, zamiast wywracać cały eksport.
  > - **`bodyVersion` NIE idzie w górę**: `city` ma `default('')`, więc to dodanie pola, a nie zmiana kształtu dokumentu.
  > **Nie zweryfikowane:** „otwiera się w Excelu bez przekodowania” sprawdzone **regułami** (BOM, `;`, CRLF, cytowanie, neutralizacja formuł) — **w prawdziwym Excelu tego pliku nikt jeszcze nie otworzył.** Nie ma też eksportu XLSX (`FEATURES` wspomina „CSV/XLSX”; zrobiony jest CSV, który pokrywa kryterium odbioru).

## Faza 2

- [x] ~~T-18 Klienci (CRM-lite) + przypięcie do wyceny~~ → **wchłonięte przez T-53** (faza 1, 2026-08-24).
- [ ] T-19 Auto-update (tauri-plugin-updater, endpoint w Supabase Storage / GitHub Releases)
- [ ] T-20 Wysyłka e-mail z PDF (Resend) + szablon wiadomości — załącznik może iść z archiwum dokumentów (T-56), bez ponownego renderu
- [ ] T-21 Tryb ciemny + skróty (paleta ⌘K → **T-58**)
- [ ] T-22 Pełna historia wersji wyceny (diff pozycji, porównanie totali między wersjami) — lekkie wersje v1/v2 są w **T-57**; nie mylić z **T-30**, które wersjonuje *schemat* `body`
- [ ] T-23 Import/eksport CSV — biblioteka (T-50) i rejestr (T-49) zrobione; zostaje **eksport XLSX** i import klientów z CSV
- [ ] T-24 Wiele walut i lokalizacja liczb
- [ ] T-67 Kosz na pliki (30 dni; dziś usunięcie w T-55 jest natychmiastowe)
- [ ] T-68 Statusy realizacji etapów w projekcie (koncepcja §7 „w przyszłości")
- [ ] T-69 Usunięcie kolumny `library_items.category` (tekst) po jednej wersji od T-59

## Faza 3

- [ ] T-25 Link online dla klienta (osobna apka web `apps/share` — Vite, ten sam `domain/`), tabela `quote_shares`, RLS dla anon przez token (RPC `get_shared_quote(token)`)
- [ ] T-26 Akceptacja online + podpis + powiadomienie (Realtime)
- [ ] T-27 Wielu użytkowników w workspace (zaproszenia e-mail, role)
- [ ] T-28 Statystyki wyłączanych pozycji (widok materializowany)
- [ ] T-29 Offline: SQLite (tauri-plugin-sql) + kolejka sync

## Notatki z wykonania
(dopisuj pod zadaniem po ukończeniu)
