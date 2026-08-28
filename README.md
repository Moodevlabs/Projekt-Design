# Toolier

**Back office studia projektowania wnętrz.** Klienci, projekty, wyceny, termin
i dokumenty w jednym miejscu — zamiast w Excelu, Wordzie i folderach na dysku.

Rdzeniem jest **interaktywna wycena**: inwestor dostaje link, sam przełącza
pozycje TAK/NIE, widzi kwotę na żywo i akceptuje albo zostawia uwagi. Projektant
dostaje powiadomienie i gotowy, brandowany PDF do archiwum.

Aplikacja desktopowa na Windows 10+ i macOS 12+.

---

## Co potrafi

- **Klienci → projekty → wyceny.** Dane inwestora wpisujesz raz; kopiują się do
  dokumentów jako snapshot, więc edycja klienta nie zmienia wysłanej oferty.
- **Wycena z biblioteki usług.** Własne cenniki, ceny za pomieszczenie, tryb
  godzinowy, warianty pozycji, rabaty procentowe i warunkowe.
- **Link dla klienta.** Oferta w przeglądarce z przełącznikami i akceptacją
  online — bez zakładania konta po stronie inwestora.
- **Dokumenty.** Brandowany PDF wyceny, szacowany termin, etapy współpracy,
  cennik usług dodatkowych. Każdy eksport ląduje w archiwum klienta.
- **Wersje i historia.** v1, v2… w jednej linii, z porównaniem: co doszło,
  co zniknęło i o ile zmieniła się kwota.
- **Pliki klienta** w chmurze, z koszem na 30 dni i limitem 2 GB na konto.
- **Praca bez sieci.** Nieudany zapis trafia do lokalnej kolejki i idzie, gdy
  połączenie wróci — bez cichego nadpisywania cudzych zmian.

## Pobranie

Instalatory dla Windows i macOS: **[Releases](../../releases/latest)**.

Aplikacja sprawdza aktualizacje przy starcie i instaluje je na kliknięcie
w *Ustawienia → Aplikacja → Aktualizacje*. Nic nie instaluje się samo.

## Licencja

**Oprogramowanie komercyjne. Wszelkie prawa zastrzeżone.**

Repozytorium jest publiczne wyłącznie dlatego, że z jego wydań korzysta
mechanizm aktualizacji. Publiczny kod **nie** znaczy otwarta licencja: kod,
znaki towarowe i materiały graficzne pozostają własnością autorów i nie ma
zgody na ich kopiowanie, modyfikowanie ani rozpowszechnianie.

Dostęp do aplikacji jest w modelu subskrypcji, z 14-dniowym okresem próbnym.

---

## Stack

| Warstwa | Technologia |
|---|---|
| Powłoka | Tauri 2 (Rust — minimalnie: pliki, dialogi, keychain, deep link, updater) |
| Interfejs | React 19, TypeScript (strict), Vite, Tailwind CSS 4, shadcn/ui |
| Stan | Zustand (edytor) + TanStack Query (dane) |
| Formularze | react-hook-form + zod |
| Backend | Supabase — Auth, Postgres z RLS, Storage, Edge Functions |
| Płatności | Stripe Checkout + Customer Portal + webhooki |
| PDF | @react-pdf/renderer (render w aplikacji, fonty osadzone) |
| Testy | Vitest + Testing Library |

Logika domenowa (`src/domain/`) jest czysta — nie zna Reacta, Supabase ani
Tauri. Wszystkie obliczenia wyceny mają tam testy jednostkowe.

## Struktura

```
src/domain/     obliczenia i model — bez zależności od frameworków
src/data/       repozytoria Supabase i hooki TanStack Query
src/features/   ekrany i komponenty per obszar
src/pdf/        dokumenty @react-pdf
apps/share/     osobna aplikacja: strona oferty dla inwestora
src-tauri/      warstwa Rust
supabase/       migracje SQL i Edge Functions
```

## Rozwój

Wymagane: **Node 22+**, **pnpm 10**, **Rust** (stabilny) oraz
[zależności systemowe Tauri](https://tauri.app/start/prerequisites/).

```bash
pnpm install
cp .env.example .env      # uzupełnij adres i klucz Supabase
pnpm tauri dev            # aplikacja
```

`pnpm dev` uruchamia sam interfejs w przeglądarce — przydatne przy pracy nad
widokami, bez kompilacji Rusta.

### Kontrola jakości

```bash
pnpm lint
pnpm typecheck
pnpm test                 # testy jednostkowe
pnpm test:db              # testy integracyjne — wymagają lokalnego Supabase
```

### Baza danych

```bash
supabase start            # lokalny stack w Dockerze
supabase db reset         # migracje + dane startowe
supabase db push          # wypchnięcie migracji na projekt w chmurze
```

Schemat zmienia się **wyłącznie** przez pliki w `supabase/migrations/`.
Każda tabela ma włączone RLS.

### Strona oferty

```bash
pnpm dev:share            # http://localhost:1430
pnpm build:share          # build produkcyjny do dist-share/
```

## Wydanie

1. Podnieś numer wersji w **trzech** plikach — muszą się zgadzać:
   `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.
2. Opisz zmiany w `CHANGELOG.md`.
3. Otaguj i wypchnij:

   ```bash
   git tag v1.2.2 && git push origin v1.2.2
   ```

Workflow zbuduje paczki dla macOS (Apple Silicon i Intel) oraz Windows,
przepuści testy jako bramkę, podpisze wszystko i wygeneruje `latest.json`
dla aktualizacji.

Wydanie powstaje jako **szkic**. To celowe: `latest.json` staje się widoczny
dla zainstalowanych aplikacji dopiero w chwili publikacji, więc ten moment
wybiera człowiek.

> Podpisywanie wymaga sekretów skonfigurowanych w ustawieniach repozytorium
> (klucz aktualizacji, certyfikat Developer ID, dane do notaryzacji).

---

Developed by **AnzorgeDesign** & **Moodevlabs**
