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
  > **⚠️ NIEZWERYFIKOWANE:** na maszynie budującej nie ma Dockera ani Podmana, więc `supabase db reset` i `supabase test db` **nie zostały uruchomione**. Składnia całego SQL sprawdzona parserem PostgreSQL 17 (0 błędów), a `body` w seedzie zwalidowane pod `QuoteBodySchema` wraz z przeliczeniem totali. Po zainstalowaniu Dockera odpal: `pnpm db:start && pnpm db:reset && pnpm db:test && pnpm db:types`.
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
  > **⚠️ NIEZWERYFIKOWANE end-to-end:** brak projektu Supabase i Dockera, więc „rejestracja → dashboard", „restart zachowuje sesję" i „wylogowanie czyści keychain" **nie zostały przeklikane**. Pokryte testami jednostkowymi: adapter keychaina (w tym fallback i to, że nic nie ląduje w `localStorage`), parsowanie deep linka OAuth, zachowanie `AuthGate` w czterech stanach.
  > **Na co uważać:**
  > - **Nie ma sesji w `localStorage`** — to celowe. W `pnpm dev` sesja żyje w pamięci i ginie po odświeżeniu strony; realny keychain jest tylko pod `pnpm tauri dev`.
  > - `AuthGate` w stanie `loading` pokazuje szkielet, a **nie** ekran logowania — inaczej przy każdym starcie migałoby logowanie (odczyt keychaina jest asynchroniczny). Jest na to test.
  > - Klucze metadanych przy rejestracji (`company`, `full_name`) muszą zgadzać się z triggerem `handle_new_user()` z migracji 0004 — to z nich powstaje workspace i profil.
  > - Google OAuth otwiera **przeglądarkę systemową** (Google blokuje webview) i wraca deep linkiem; `anzorge://auth/recovery` dodane do `additional_redirect_urls` w `config.toml`. W panelu Supabase trzeba dodać oba adresy ręcznie.
  > - `onSubmit` formularzy owinięty w `void form.handleSubmit(…)(event)` — inaczej ESLint słusznie krzyczy `no-misused-promises`.

- [ ] **T-06 Repozytoria + queries** (01-ARCHITECTURE §2–3)
  `quotes/library/templates/workspace/subscription.repo.ts` + hooki. Parse zod przy odczycie. Optimistic update dla toggli statusów.
  ✅ Testy integracyjne na lokalnym Supabase dla quotes.repo (CRUD + konflikt `updated_at`).

- [ ] **T-07 Lista wycen + dashboard (dane realne)** (05-UI §3)
  ✅ Filtry, szukaj, sort, menu ⋯ (duplikuj/archiwizuj); dashboard liczy statystyki z `quotes`.

- [ ] **T-08 Edytor wyceny — rdzeń** (05-UI §3, 01-ARCHITECTURE §3)
  `editor.store.ts` (Zustand+immer), `QuoteHeader`, `SectionBlock`, `GroupBlock`, `ItemRow`, `TotalsCard`, tryb edycja/podgląd, inline edit, toggle, dodawanie/usuwanie, autosave z wskaźnikiem, numer z `next_quote_number`.
  ✅ Parytet funkcjonalny z `projekt.html` bez biblioteki/DnD/PDF. 300 pozycji bez laga (profil React).

- [ ] **T-09 Drag & drop + przyciski góra/dół** (05-UI §5)
  @dnd-kit, keyboard sensor, `domain/quote/reorder.ts`.
  ✅ Przenoszenie pozycji między grupami i sekcjami, grup między sekcjami; a11y z klawiatury.

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
