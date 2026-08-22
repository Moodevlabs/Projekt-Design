# Projekt Anzorge — CLAUDE.md

Desktopowa aplikacja (Tauri 2) do tworzenia interaktywnych wycen/ofert z brandowanym PDF. Model SaaS: subskrypcja 19,99 zł/mies. przez Stripe, konta i dane w Supabase.

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
| `docs/FEATURES-Z-EXCELA.md` | Funkcje z arkusza klienta (cennik parametryczny, pomieszczenia, rabaty %, harmonogram, pakiet dokumentów) — model i wzory dla zadań T-30…T-49. **§8 zawiera korekty założeń wobec stanu kodu — przeczytaj przed startem chunku.** |

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
