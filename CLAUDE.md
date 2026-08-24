# Toolier — CLAUDE.md

> **Nazwa produktu: Toolier** (do 2026-08-24 „Anzorge" — nazwa repo/katalogu zostaje, w kodzie i UI obowiązuje Toolier; podmiana to zadanie T-65). Historyczne notatki w `06-TASKS.md` i `CHANGELOG.md` mogą mówić „Anzorge" — to ten sam produkt.

Desktopowa aplikacja (Tauri 2) — **workspace / back office studia projektowania wnętrz**: klienci → projekty → wyceny, termin, dokumenty, pliki. Rdzeń to interaktywna wycena TAK/NIE z brandowanym PDF. Model SaaS: subskrypcja **98,99 zł/mies. lub 999,99 zł/rok** przez Stripe (bez darmowego planu, trial 14 dni), konta i dane w Supabase.

Hierarchia danych: **STUDIO (workspace) → KLIENT → PROJEKT → wyceny / termin / dokumenty / pliki / notatki.** Po zalogowaniu użytkownik widzi klientów; wycena żyje wewnątrz projektu. Szczegóły: `docs/FEATURES-Z-KONCEPCJI.md`.

Ten plik jest źródłem prawdy o zasadach pracy. Szczegóły są w `docs/` — **zawsze przeczytaj właściwy plik przed rozpoczęciem zadania**:

| Plik | Kiedy czytać |
|---|---|
| `docs/00-PRD.md` | Zakres, funkcje, role, fazy |
| `docs/01-ARCHITECTURE.md` | Stack, struktura katalogów, warstwy, konwencje |
| `docs/02-DATABASE.md` | Schemat Supabase, RLS, migracje |
| `docs/03-BILLING.md` | Stripe, Edge Functions, gating subskrypcji |
| `docs/04-PDF.md` | Generowanie PDF i brand kit |
| `docs/05-UI.md` | Design system, komponenty, layout |
| `docs/06-TASKS.md` | Lista zadań w kolejności — pracuj po jednym |
| `docs/07-BUILD-MACOS.md` | Budowanie podpisanego `.dmg` na macOS |
| `docs/FEATURES-Z-EXCELA.md` | Funkcje z arkusza klienta (cennik parametryczny, pomieszczenia, rabaty %, harmonogram, pakiet dokumentów) — model i wzory dla zadań T-30…T-49. **§8 zawiera korekty założeń wobec stanu kodu — przeczytaj przed startem chunku.** |
| `docs/FEATURES-Z-KONCEPCJI.md` | Oś aplikacji z koncepcji `reference/nowosci.md`: klienci, projekty, pliki i archiwum dokumentów w Storage, wersje wycen, restrukturyzacja biblioteki (grupy/jednostki/biblioteka przykładowa), pakiety, rebranding Toolier i nowa cena — model i reguły dla zadań T-53…T-66. **§0 = zamknięte decyzje, §9 = kolizje z kodem — przeczytaj przed startem chunku.** |
| `reference/nowosci.md`, `reference/bilbioteka.md`, `reference/inspiracja 1.jpeg`, `reference/inspiracja 2.jpeg` | Źródła koncepcji. Z inspiracji bierzemy **użyteczność i przepływy**, nie wygląd. Czytaj, gdy zadanie odwołuje się do nich wprost. |

## Stack (nie negocjujemy bez powodu)

- **Tauri 2** (Rust backend, minimalny — tylko to, czego webview nie zrobi)
- **React 19 + TypeScript (strict) + Vite**
- **Tailwind CSS 4 + shadcn/ui** (Radix) + `lucide-react`
- **Zustand** (stan UI / edytor wyceny) + **TanStack Query** (dane z Supabase)
- **react-hook-form + zod** (formularze i walidacja — zod jest też źródłem typów domenowych)
- **Supabase** (Auth, Postgres, Storage, Edge Functions)
- **Stripe** Checkout + Customer Portal + Webhooks (przez Edge Functions)
- **@react-pdf/renderer** do PDF (w webview, fonty embedowane)
- **Vitest** + Testing Library; Rust: `cargo test`
- **pnpm**, ESLint (flat config), Prettier

## Zasady kodu

1. **Domena jest w `src/domain/`** i nie importuje niczego z React, Supabase ani Tauri. Obliczenia wyceny (`calcQuoteTotals`), schematy zod, typy — czyste funkcje, 100% testowalne.
2. **Dostęp do danych tylko przez `src/data/`** (repozytoria). Komponenty nie wołają `supabase.from()` bezpośrednio. Hooki TanStack Query żyją obok repozytoriów w `src/data/queries/`.
3. **Feature folders**: `src/features/<nazwa>/` zawiera komponenty, hooki i store danej funkcji. Współdzielone UI w `src/components/ui/` (shadcn) i `src/components/shared/`.
4. **Jeden plik = jedna odpowiedzialność.** Plik komponentu >250 linii → podziel.
5. **Nazewnictwo:** komponenty `PascalCase.tsx`, hooki `useX.ts`, reszta `kebab-case.ts`. Typy domenowe bez prefiksu `I`/`T`.
6. **Brak `any`.** Brak `// @ts-ignore`. Brak `console.log` w commitach (używaj `src/lib/logger.ts`).
7. **Teksty UI po polsku**, w `src/i18n/pl.ts` (przygotowane pod i18n, ale na start tylko PL). Nie hardkoduj stringów w JSX poza prototypami.
8. **Pieniądze = liczby całkowite w groszach** (`number`, int). Formatowanie tylko w warstwie prezentacji przez `formatMoney()`.
9. **Migracje Supabase tylko przez pliki SQL** w `supabase/migrations/`. Nigdy nie zmieniaj schematu z dashboardu bez migracji. Każda tabela ma RLS.
10. **Sekrety nigdy w repo.** Frontend widzi tylko `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`. Klucz Stripe secret i webhook secret — tylko w Edge Functions.
11. **Tauri commands (Rust)** tylko dla: zapis pliku PDF na dysk, dialogi systemowe, deep link, updater, keychain (sesja). Logika biznesowa nie idzie do Rusta.
13. **Pliki użytkownika = Supabase Storage (bucket `files`) + wiersz w tabeli `files`.** Metadane w Postgresie są jedynym źródłem listy; limit 2 GB/workspace i 25 MB/plik egzekwowany w bazie (trigger), nie tylko w UI. Każdy wygenerowany PDF może trafić do archiwum klienta jako plik `kind: 'generated'`.
14. **Dane klienta w wycenie są snapshotem** (`body.client`) skopiowanym z `clients` w chwili utworzenia — edycja klienta nie zmienia wysłanej oferty. Odświeżenie jest jawną akcją użytkownika.
12. **Commity:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `db:`). Jeden task z `docs/06-TASKS.md` = jedna gałąź / jeden PR.

## Workflow pracy z zadaniami

1. Otwórz `docs/06-TASKS.md`, weź **pierwsze niezrobione** zadanie (chyba że użytkownik wskaże inne).
2. Przeczytaj dokumenty wymienione w zadaniu.
3. Zaplanuj krótko (5–10 linii), potem implementuj.
4. Uruchom `pnpm lint && pnpm typecheck && pnpm test`. Nic nie może być czerwone.
5. Odhacz zadanie w `docs/06-TASKS.md` (`[x]`) i dopisz 1–2 zdania „co zrobiono / na co uważać".
6. Nie rób „przy okazji" rzeczy spoza zadania. Zanotuj pomysły w `docs/IDEAS.md`.

## Komendy

```
pnpm install
pnpm tauri dev          # app dev
pnpm dev                # sam frontend w przeglądarce (mock Tauri API)
pnpm lint / typecheck / test
pnpm tauri build
supabase start          # lokalny stack
supabase db reset       # migracje + seed
supabase functions serve
```

## Czego NIE robić

- Nie dodawaj bibliotek bez uzasadnienia w PR (Redux, MUI, moment, axios — nie).
- Nie wywołuj Stripe z frontendu poza `redirectToCheckout` / otwarciem URL.
- Nie licz totali w komponentach — tylko `domain/quote/calc.ts`.
- Nie generuj PDF po stronie serwera (na start). PDF powstaje lokalnie w webview.
- Nie rób własnego auth. Supabase Auth, sesja w keychain przez `tauri-plugin-stronghold`/`keyring`.
- Nie buduj wersji web/SaaS w przeglądarce „przy okazji" — decyzja D6: desktop zostaje na 1.0. Kod ma pozostać przeglądarkowy (`pnpm dev` działa), ale nie dokładaj warstw pod hosting.
- Nie rób z Toolier systemu project-management: bez Gantta z osią czasu, kalendarza, chatu, faktur, CRM sprzedażowego, katalogu produktów (koncepcja §17). Pomysły → `docs/IDEAS.md`.
