# 01 — Architektura

## 1. Decyzje (i dlaczego)

| Obszar | Decyzja | Uzasadnienie |
|---|---|---|
| Powłoka | **Tauri 2** | Mały binar, Rust tylko do spraw systemowych, webview = znany stack React. |
| UI | React 19 + Vite + TS strict | Spójne z resztą Twojego stacku; HMR w Tauri działa dobrze. |
| Styling | Tailwind 4 + shadcn/ui | Szybko, bez lock-inu w bibliotekę komponentów; shadcn kopiuje kod do repo. |
| Stan | Zustand (edytor) + TanStack Query (serwer) | Edytor wyceny to duży, często mutowany obiekt → Zustand z `immer`. Listy/detale z bazy → Query z cache i optimistic updates. |
| Walidacja/typy | zod | Jedna definicja → typ TS + walidacja wejścia + walidacja JSON z bazy. |
| Dane | Supabase jako **jedyne źródło prawdy** w fazach 1–2 | Offline-first z SQLite i sync to dużo złożoności. Robimy to w fazie 3, gdy będzie wiadomo, że ktoś tego potrzebuje. TanStack Query `persistQueryClient` daje read-only cache offline za darmo. |
| Struktura wyceny w bazie | **JSONB** `quotes.body` (sekcje/grupy/pozycje) + kolumny indeksowane (status, total, klient) | Wycena to dokument, edytowany w całości w edytorze. Normalizacja do 3 tabel dałaby 10× więcej zapytań i konfliktów przy autozapisie. Statystyki pozycji (faza 3) — widok materializowany z `jsonb_array_elements`. |
| PDF | @react-pdf/renderer w webview | Deklaratywne layouty, łatwy branding, embed fontów, paginacja za darmo. Rust/`printpdf` = za dużo pracy; `window.print()` = brak kontroli. |
| Płatności | Stripe Checkout + Portal + webhook → Supabase | Zero PCI, subskrypcje, faktury, dunning – wszystko u Stripe. Aplikacja czyta tylko tabelę `subscriptions`. |
| Sesja | `tauri-plugin-stronghold` (lub `keyring`) | Refresh token nie w localStorage webview. |
| Linki zewnętrzne | `tauri-plugin-opener` + `tauri-plugin-deep-link` (`anzorge://`; od T-65 `toolier://`) | Checkout/OAuth w przeglądarce systemowej, powrót do aplikacji. |

## 2. Struktura repo

```
anzorge/
├── CLAUDE.md
├── docs/
├── .claude/commands/          # /task, /review, /migration
├── package.json  pnpm-lock.yaml  vite.config.ts  tailwind.config.ts
├── tsconfig.json  eslint.config.js  .prettierrc
├── .env.example
├── index.html
├── src/
│   ├── main.tsx                # bootstrap: QueryClient, Router, Providers
│   ├── app/
│   │   ├── router.tsx          # TanStack Router lub react-router (wybierz react-router v7, data mode)
│   │   ├── providers.tsx
│   │   └── layouts/AppShell.tsx   # sidebar + topbar (docs/05-UI.md)
│   ├── domain/                 # CZYSTE: zero importów z react/supabase/tauri
│   │   ├── quote/
│   │   │   ├── schema.ts       # zod: Quote, Section, Group, Item
│   │   │   ├── calc.ts         # calcQuoteTotals(), applyVat()
│   │   │   ├── factory.ts      # newQuote(), newItem(), fromTemplate()
│   │   │   ├── reorder.ts      # moveItem(), moveGroup()
│   │   │   └── calc.test.ts
│   │   ├── library/schema.ts   # + units.ts (jednostki), categories
│   │   ├── client/schema.ts    # Client, Project, statusy (T-53/54)
│   │   ├── files/schema.ts     # File, FileKind, DocType, isAllowedExtension (T-55)
│   │   ├── brand/schema.ts
│   │   ├── money.ts            # formatMoney(grosze, currency), parseMoney()
│   │   └── numbering.ts        # generateQuoteNumber(pattern, seq, date)
│   ├── data/
│   │   ├── supabase.ts         # klient + session storage adapter (keychain)
│   │   ├── repos/
│   │   │   ├── quotes.repo.ts
│   │   │   ├── library.repo.ts
│   │   │   ├── templates.repo.ts
│   │   │   ├── clients.repo.ts     # T-53
│   │   │   ├── projects.repo.ts    # T-54
│   │   │   ├── files.repo.ts       # Storage (bucket `files`) + tabela `files` w jednym repo (T-55)
│   │   │   ├── workspace.repo.ts
│   │   │   └── subscription.repo.ts
│   │   ├── queries/            # hooki TanStack Query, 1 plik per repo
│   │   │   ├── useQuotes.ts    # useQuotesList, useQuote, useSaveQuote...
│   │   │   └── ...
│   │   └── types.generated.ts  # `supabase gen types typescript`
│   ├── features/
│   │   ├── auth/               # LoginPage, RegisterPage, useAuth, AuthGate
│   │   ├── billing/            # SubscriptionPage, useSubscription, PaywallGate
│   │   ├── dashboard/
│   │   ├── quotes/
│   │   │   ├── list/
│   │   │   └── editor/
│   │   │       ├── QuoteEditorPage.tsx
│   │   │       ├── editor.store.ts     # Zustand+immer: stan edytowanej wyceny, dirty, autosave
│   │   │       ├── useAutosave.ts
│   │   │       ├── components/ (QuoteHeader, SectionBlock, GroupBlock, ItemRow, TotalsCard, LibraryPicker, ...)
│   │   │       └── dnd/                # @dnd-kit
│   │   ├── clients/            # ClientsPage, ClientPage (zakładki), ClientForm, ClientPicker (T-53)
│   │   ├── projects/           # ProjectPage (zakładki Wyceny/Dokumenty/Pliki/Notatki), ProjectForm (T-54)
│   │   ├── files/              # FilesTab (drag&drop, lista), DocumentsTab (archiwum PDF), useUpload (T-55/56)
│   │   ├── library/            # items/ groups(=Zestawy)/ categories/ pricing/ rooms/ service-editor/ (T-59…62)
│   │   ├── templates/
│   │   ├── brand/              # BrandSettingsPage + LivePdfPreview (sekcja Ustawień od T-58)
│   │   ├── command/            # paleta ⌘K (T-58)
│   │   └── settings/
│   ├── pdf/
│   │   ├── QuotePdfDocument.tsx        # @react-pdf/renderer
│   │   ├── components/ (PdfHeader, PdfItemRow, PdfTotals, PdfFooter)
│   │   ├── fonts/ (ttf + register.ts)
│   │   ├── theme.ts                    # mapowanie brand kit → style
│   │   └── export.ts                   # blob → Tauri save dialog
│   ├── components/
│   │   ├── ui/                 # shadcn
│   │   └── shared/             # Money, StatusBadge, EmptyState, ConfirmDialog
│   ├── lib/                    # logger, cn(), tauri.ts (wrappery invoke), dates
│   ├── i18n/pl.ts
│   └── styles/globals.css
├── src-tauri/
│   ├── Cargo.toml  tauri.conf.json  capabilities/default.json
│   └── src/
│       ├── main.rs  lib.rs
│       └── commands/ (files.rs, deep_link.rs)
├── supabase/
│   ├── config.toml
│   ├── migrations/             # 0001_init.sql, 0002_billing.sql ...
│   ├── seed.sql
│   └── functions/
│       ├── stripe-create-checkout/
│       ├── stripe-create-portal/
│       ├── stripe-webhook/
│       └── _shared/ (stripe.ts, supabaseAdmin.ts, cors.ts)
└── tests/ (e2e później)
```

## 3. Warstwy i przepływ danych

```
UI (features/*) ──► queries (TanStack) ──► repos ──► supabase-js ──► Postgres (RLS)
       │                                                    ▲
       └── editor.store (Zustand) ──► useAutosave ──► quotes.repo.update()
       │
       └── domain/* (calc, schema) — używane wszędzie, nie zależy od niczego
```

- **Pliki** (T-55): `features/files` → `useFiles` → `files.repo` → **Storage (bajty) + tabela `files` (metadane)**. Kolejność uploadu: obiekt → wiersz; nieudany wiersz kasuje obiekt. Lista zawsze z tabeli, nigdy z listowania bucketa. Pobieranie: signed URL (60 s) → w Tauri `save_file`, w przeglądarce `<a download>`. Upload: w Tauri `dialog.open` / `onDragDropEvent` (ścieżki), w przeglądarce `<input type=file>` / `File` — obie ścieżki za wspólnym adapterem w `lib/tauri.ts`, jak przy zapisie PDF.
- **Archiwum dokumentów** (T-56): jedno wejście w `pdf/export.ts` po udanym renderze woła `files.repo.archiveGeneratedPdf` — nie pięć osobnych hooków eksportu.
- **Klient w wycenie to snapshot** (`body.client`) kopiowany z `clients` przy tworzeniu wyceny w projekcie; kolumny `quotes.client_name`/`city` są kopią z `body` (jak dotąd) i zapisują się w `saveQuote`.
- Edytor trzyma **cały dokument wyceny** w Zustand. Każda zmiana → `calcQuoteTotals()` → derived selectors. Autosave wysyła cały `body` JSONB + zdenormalizowane `total_cents`, `status`, `client_name`.
- Konflikt zapisu: `quotes.updated_at` porównywane optymistycznie (`.eq('updated_at', lastSeen)`); przy konflikcie toast „Wycena zmieniona w innym miejscu — przeładuj".

## 4. Model domenowy (zod, skrót)

```ts
const Item = z.object({
  id: z.string().uuid(),
  kind: z.enum(['item', 'discount']),
  name: z.string().min(1),
  description: z.string().default(''),
  qty: z.number().positive().default(1),
  unitPriceCents: z.number().int(),      // dla discount: dodatnia wartość, calc odejmuje
  enabled: z.boolean().default(true),
  libraryItemId: z.string().uuid().nullable().default(null),
});
const Group = z.object({ id, name, items: z.array(Item) });
const Section = z.object({ id, title, groups: z.array(Group), items: z.array(Item) });
const QuoteBody = z.object({
  title, subtitle, intro, projectDescription,
  client: { name, phone, email },
  validDays: z.number().int().default(7),
  vatRate: z.number().default(23), pricesInclude: z.enum(['net','gross']),
  sections: z.array(Section),
  preparedBy: z.string(),
  showDisabledItems: z.boolean().default(true),
});
```

`calcQuoteTotals(body)` → `{ itemsCents, discountsCents, netCents, vatCents, grossCents }` — czysta funkcja z testami (w tym: rabat > suma, pozycje wyłączone, qty ułamkowe).

## 5. Tauri — zakres Rusta

Komendy:
- `save_file(bytes, suggested_name) -> path` (dialog + zapis)
- `open_path(path)` (po zapisie PDF)
- deep link handler `toolier://auth/callback?...` i `toolier://billing/success` (do T-65 jeszcze `anzorge://`)
- updater (faza 2)

Capabilities (`capabilities/default.json`): tylko `dialog:allow-save`, `fs:allow-write` w zakresie wybranym przez użytkownika, `opener:allow-open-url` dla whitelisty (`https://checkout.stripe.com`, `https://billing.stripe.com`, Supabase auth URL), `deep-link`.

CSP w `tauri.conf.json`: `connect-src` tylko Supabase URL + `https://api.stripe.com` (jeśli w ogóle). Brak `unsafe-eval`.

## 6. Środowiska

- `local` — `supabase start` + Stripe CLI (`stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`).
- `staging` — osobny projekt Supabase + Stripe test mode.
- `prod` — Supabase EU + Stripe live.

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_APP_ENV=local
```

## 7. Testy

- `domain/**` — jednostkowe, cel 90%+.
- `data/repos` — integracyjne na lokalnym Supabase (skrypt `pnpm test:db`).
- Edge Functions — Deno test z mockiem Stripe.
- UI — Testing Library dla `ItemRow`, `TotalsCard`, `PaywallGate`.
- Smoke e2e (faza 2): `tauri-driver` / WebdriverIO.
