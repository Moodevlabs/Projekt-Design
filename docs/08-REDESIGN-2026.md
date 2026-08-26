# 08 — Redesign Toolier 2026 (brąz / beż / papier)

> **Status:** plan. Nic z tego nie jest jeszcze zaimplementowane.
> **Źródła:** `reference/nowy wyglad.png` (makieta), `reference/logotypy/*.svg` (sygnet, napis, lockup).
> **Zakres:** kompletna wymiana warstwy wizualnej aplikacji. Zero zmian w domenie, repozytoriach, schemacie bazy i logice liczącej.
> **Kolejność:** chunki **T-74 … T-82**, każdy = jedna gałąź / jeden PR (CLAUDE.md §12). Całość **przed T-17** — T-17 mówi wprost „docelowa kolorystyka przyjdzie na końcu budowy", a instalator i ikony aplikacji nie mają sensu przed rebrandingiem.

---

## 0. Teza — co się zmienia w założeniu, nie w odcieniu

Dziś obowiązuje teza z **T-08a**:

> „Chrom aplikacji jest ze szkła, dokument jest z papieru."

Powłoka jest **chłodna** (`#eceef1`), półprzezroczysta, rozmyta (`backdrop-filter`), a wycena jest **ciepła** (`#FAF7F1`). Kontrast chrom ↔ dokument niesie **temperatura**: zimne szkło oprawia ciepły papier.

Makieta odwraca to o 180°. Powłoka jest **ciepła i płaska**: brązowa szyna `#33251e`, beżowy pas `#efece8`, jasna kanwa, ostre krawędzie, zero rozmycia. Gdyby zostawić szkło i tylko przemalować tokeny, wyszłaby najgorsza możliwa kombinacja — rozmycie ciepłego beżu przez ciepły beż daje brudną, mulistą szarość (blur bez różnicy luminancji pod spodem nie ma czego załamać, a `saturate(175%)` na brązie robi rdzę).

Nowa teza:

> **„Aplikacja jest drukowaną teczką atelier. Szyna to brązowa okładka, kanwa to papier roboczy, wycena to biała kartka na wierzchu."**

Kontrast chrom ↔ dokument przestaje być **temperaturą**, a staje się **jasnością i materiałem**: ciepła, matowa, tonalna powłoka — i czysto biała, ostro odcięta cieniem kartka wyceny. To działa **lepiej** niż dziś, bo dokument nie musi już konkurować z kolorem, tylko z jasnością — a biel na beżu odcina się mocniej niż biel na chłodnej szarości.

**Cztery plany, monotonicznie od ciemnego do jasnego:**

```
szyna #33251e  →  pas #efece8  →  kanwa #f7f4f0  →  karta #ffffff  →  [kartka wyceny #ffffff + cień]
```

Makieta pokazuje karty **ciemniejsze** niż kanwa (szare prostokąty na bieli). **Świadomie od tego odstępujemy**: cała aplikacja jest zbudowana na założeniu „karta unosi się nad tłem" (`card-surface`, cienie, `PageSection`), a odwrócenie tej relacji wymagałoby przeprojektowania każdej listy i każdego pustego stanu. Bierzemy z makiety **kolejność planów i płaskość**, nie dokładne wartości dwóch prostokątów, które w makiecie są placeholderami.

---

## 1. Paleta — pełna rampa z dwóch podanych kolorów

Podane: **`#33251e`** (brąz ciemny) i **`#efece8`** (beż jasny). Reszta jest z nich wyprowadzona — ta sama rodzina odcienia (~25° hue), niska chroma, monotoniczna jasność.

### 1.1 Neutralne ciepłe

| Token | Wartość | Rola |
|---|---|---|
| `--espresso` | `#1f1611` | Najgłębszy brąz — hover CTA, nagłówki H1 na jasnym |
| `--brown` | `#33251e` | **Marka.** Szyna, CTA, atrament |
| `--beige` | `#efece8` | **Marka.** Pas topbara, główki tabel, pigułka aktywna na szynie |
| `--canvas` | `#f7f4f0` | Tło aplikacji (między beżem a bielą) |
| `--surface` | `#ffffff` | Karty |
| `--surface-2` | `#f4f0eb` | Panele zagnieżdżone, hover wiersza |
| `--ink` | `#33251e` | Tekst podstawowy |
| `--ink-soft` | `#74645a` | Tekst drugorzędny (≈5.0:1 na kanwie) |
| `--ink-faint` | `#a4968a` | Placeholdery, wyłączone (≥3:1, nigdy nie niesie treści) |
| `--hair` | `rgba(51, 37, 30, 0.12)` | Linie |
| `--hair-strong` | `rgba(51, 37, 30, 0.20)` | Ramki kontrolek, obrys CTA |

⚠️ **`--ink-soft` to `#74645a`, nie `#7a6a5f`.** Ta druga wartość ma na kanwie 4,59:1 — formalnie zdaje AA, ale bez marginesu na antyaliasing i na inne tło (na `--surface-2` już nie zdaje). `#74645a` daje ≈5,0:1 wszędzie.

### 1.2 Szyna (ciemne tło — własna rampa)

Na brązie nie da się użyć `--ink-soft` ani `--hair`; ciemna powierzchnia potrzebuje własnych tokenów, inaczej wszędzie wylądują `white/65` w JSX (dzisiejszy stan `Sidebar.tsx`).

| Token | Wartość | Rola |
|---|---|---|
| `--rail` | `#33251e` | Tło szyny |
| `--rail-deep` | `#2a1e18` | Stopka szyny, wcięcie pod zwiniętą pozycją |
| `--rail-ink` | `#efece8` | Etykiety aktywne / hover |
| `--rail-ink-soft` | `rgba(239, 236, 232, 0.62)` | Etykiety spoczynkowe (≈5,7:1 na brązie) |
| `--rail-hair` | `rgba(239, 236, 232, 0.14)` | Kreska między grupami nawigacji |
| `--rail-pill` | `#efece8` | Blok aktywnej pozycji |
| `--rail-pill-ink` | `#33251e` | Tekst na aktywnej pozycji |

### 1.3 Barwy funkcyjne — dostrojone do ciepła

Dzisiejsze `#2f855a` (zieleń) i `#de8b2c` (bursztyn) na beżu wyglądają jak wklejone z innego systemu — obie mają chłodniejszy odcień niż podłoże. Przesuwamy je w oliwkę i ochrę, zachowując **te same role i tę samą kolejność ciemności** (to nośnik informacji w `StatusMark`, nie dekoracja).

| Token | Dziś | Nowe | Rola |
|---|---|---|---|
| `--status-draft` | `#de8b2c` | `#b8863b` | Szkic — ochra, „jeszcze u nas" |
| `--status-sent` | `#6ab98a` | `#7d9068` | Wysłana — jasna oliwka, „u klienta" |
| `--status-accepted` | `#2c7a51` | `#4a6340` | Zaakceptowana — głęboka oliwka |
| `--status-rejected` | `#c05a4e` | `#a8503c` | Odrzucona — terakota |
| `--status-expired` | `#9aa0aa` | `#9c9088` | Wygasła / archiwalna — ciepła szarość |
| `--positive` | `#2f855a` | `#4a6340` | = accepted |
| `--warning` | `#b7791f` | `#b07d2c` | |
| `--danger` | `#c53030` | `#a8402f` | |
| `--discount` | `#b9634a` | `#b9634a` | **Bez zmian** — terakota rabatów była ciepła od początku i wpasowuje się bez ruchu |

⚠️ **Zieleń i ochra nie mogą zbliżyć się do siebie na tyle, żeby przestały się rozróżniać.** `#b8863b` i `#7d9068` mają podobną jasność — w `StatusMark` to nie problem (informację niesie **liczba odcinków**, barwa tylko wzmacnia), ale gdyby ktoś kiedyś użył samego koloru bez toru, straci różnicę. Zasada zostaje: **kolor nigdy nie jest jedynym nośnikiem.**

### 1.4 Palety, które zostają prawie nietknięte

- `src/features/library/categories/swatches.ts` — `sand`, `sage`, `clay`, `moss` są już ciepłe i pasują. Do przestrojenia tylko trzy chłodne: `sky #9DB4C0` → `#a9b3ae`, `plum #A98BA5` → `#a8909c`, `slate #8C93A8` → `#948c86`.
- `src/features/auth/GoogleButton.tsx` — hexy `#4285F4` / `#34A853` / `#FBBC05` / `#EA4335` to **logo Google**. Nie ruszamy; brand guidelines Google zabraniają przemalowania.

---

## 2. Typografia

**Faculty Glyphic** (display) + **Inter** (interfejs).

```
--font-display: 'Faculty Glyphic', 'Iowan Old Style', Georgia, serif;
--font-sans:    'Inter Variable', ui-sans-serif, system-ui, 'Segoe UI', sans-serif;
```

Instalacja: `@fontsource/faculty-glyphic` (5.3.0) + istniejący `@fontsource-variable/inter`.
**`@fontsource-variable/instrument-sans` wylatuje** z `package.json` — nic go nie będzie używać.

### ⚠️ Trzy pułapki, które trzeba rozbroić w T-74, zanim cokolwiek wygląda

**1. Faculty Glyphic ma jedną wagę — 400. Nie ma variable.**
Sprawdzone: `@fontsource-variable/faculty-glyphic` nie istnieje w rejestrze (404), pakiet statyczny waży 78 kB. Dziś **każde** miejsce z `font-display` w kodzie ma obok `font-semibold` albo `font-medium` (`Topbar.tsx`, `AuthLayout.tsx`, `Sidebar.tsx`, nagłówki kart). Przeglądarka wyrenderuje to jako **sztuczny pogrubiony** — rozmazany, z zalanymi światłami w szeryfach glificznych. Wygląda jak zepsuty font, nie jak decyzja.
→ Hierarchia na tekście display idzie przez **stopień pisma, wersaliki i światło międzyliterowe**, nigdy przez wagę. Każda para `font-display` + waga w JSX musi zniknąć.
Skala sprawdzona: `font-display` występuje w `src/**/*.tsx` **8 razy — i wszystkie 8 są sparowane z `font-semibold` albo `font-medium`.** Nie ma ani jednego miejsca, które przetrwa podmianę kroju bez poprawki.

**2. `.tabular` jest dziś spięte z `--font-display`.**
```css
.tabular { font-variant-numeric: tabular-nums; font-family: var(--font-display); }
```
Po podmianie zmiennej **wszystkie kwoty w aplikacji** przeskoczyłyby do Faculty Glyphic. Font glificzny nie ma gwarantowanych cyfr tabularnych — a to jest narzędzie do wycen, w którym kolumna pieniędzy nie ma prawa skakać przy zmianie cyfry.
→ **Rozdzielić:** `.tabular` dostaje `font-family: var(--font-sans)`. Liczby zostają w Inter z `tabular-nums`. Faculty Glyphic nie dotyka pieniędzy.

**3. Ta sama zasada w PDF.**
`src/pdf/theme.ts` ma własną listę fontów (Lato / Inter / Playfair / DM Sans / Source Serif) osadzonych jako `.ttf`. Faculty Glyphic **nie jest** tam automatycznie dostępny i dodanie go to osobna decyzja (T-81, opcjonalne) — brand kit jest konfigurowany przez klienta, a nie przez nas.

### 2.1 Skala

| Rola | Krój | Ustawienia |
|---|---|---|
| Tytuł strony (`PULPIT`) | Faculty Glyphic | 22px, `uppercase`, `tracking .06em` |
| H1 / H2 w treści | Faculty Glyphic | 19–24px, waga 400 |
| Logo w powłoce | SVG (nie tekst) | — |
| Etykiety nawigacji, główki tabel, „oczka" sekcji | Inter | 11–12px, `uppercase`, `tracking .12em`, `--ink-soft` |
| Tekst interfejsu | Inter | 13–14px, 400/500 |
| Kwoty i liczby | Inter | `tabular-nums`, `font-feature-settings: 'ss01'` |

Nowa utility `.label-caps` (Inter + wersaliki + światło) — jedno miejsce zamiast powtarzanego `text-[11px] uppercase tracking-[.12em]` w 30 komponentach. To jest wzorzec z makiety (`KLIENCI`, `STUDIO`, `WYCENY`) i pojawi się też nad każdą listą i w główkach tabel.

---

## 3. Płaskość — co znika

| Znika | Zastąpione przez |
|---|---|
| `.glass`, `.glass-strong` (blur + saturate + gradientowy włos) | `.surface-card` — nieprzezroczysta biel, `1px solid var(--hair)`, miękki ciepły cień |
| `.glass-dark` | `.rail` — pełny `#33251e`, bez rozmycia |
| `.card-surface` (duplikat `.glass` dla kart) | `.surface-card` (jedna klasa zamiast dwóch bliźniaczych) |
| `--field` + `body::before` (radialne pole światła) | Płaskie `--canvas`. Pole istniało **wyłącznie** po to, żeby szkło miało co załamywać — bez szkła jest niewidoczne i kosztuje jeden `fixed` layer |
| Poświata w `AuthLayout` | j.w. |
| `--glass-*` (9 tokenów) | usunięte |

**Cienie ciepłe, nie czarne:**
```css
--shadow-card:  0 1px 2px rgba(51,37,30,.05), 0 8px 24px -12px rgba(51,37,30,.12);
--shadow-sheet: 0 1px 3px rgba(51,37,30,.06), 0 24px 48px -20px rgba(51,37,30,.20);
```

**Promienie w dół** (makieta jest niemal ostrokątna):
`--radius-card: 20px → 10px`, `--radius-control: 12px → 8px`, `--radius-pill: 999px` zostaje tylko dla znaczników statusu i awatara.

**Zysk uboczny, nie kosmetyczny:** `backdrop-filter` na całej wysokości szyny i przyklejonego topbara to dwa pełnoekranowe przemalowania przy każdym przewinięciu w WebView2. Ich usunięcie zdejmuje najdroższą rzecz w renderze — i eliminuje `@supports not (backdrop-filter)` (trzy fallbacki w `globals.css`).

---

## 4. Logotypy

Trzy pliki, trzy różne zastosowania. Wszystkie mają wpisany `fill: #33251e` w `<style>` z klasą `.cls-1` — **w tej postaci są bezużyteczne na brązowej szynie** (brąz na brązie). Muszą stać się komponentami z `fill="currentColor"`.

| Plik | viewBox | Zastosowanie |
|---|---|---|
| `sygnet.svg` | 426 × 464 | Zwinięta szyna, favicon, ikona aplikacji, ikona instalatora, awatar zastępczy |
| `toolier napis.svg` | 1080 × 309 | Rozwinięta szyna (sam wordmark), stopki, nagłówek PDF (opcjonalnie) |
| `toolier logo.svg` | 1080 × 464 | Ekran logowania — pełny lockup z „WEB STUDIO FOR YOUR ATELIER" i „2026" |

⚠️ **Makieta pokazuje w szynie pełny lockup z tagline'em, a nie sam napis.** Użytkownik opisał lockup jako „logo do ekranu logowania". To sprzeczność do rozstrzygnięcia — patrz **Decyzja D-2**.

Dziś w kodzie stoją w tych miejscach **litery „A"** — `Sidebar.tsx:200` (biała kulka z „A") i `AuthLayout.tsx:35` (czarna kulka z „A"). To zostało po nazwie „Anzorge" i jest ostatnim widocznym śladem starej marki w interfejsie.

---

## 5. Chunki

Każdy chunk kończy się zielonym `pnpm lint && pnpm typecheck && pnpm test` i wpisem w `docs/06-TASKS.md`.

---

### T-74 — Fundament: tokeny i fonty
**Cel:** cała aplikacja robi się ciepła jednym commitem, zanim ktokolwiek dotknie komponentu.

- `src/styles/globals.css`: wymiana `:root` na paletę z §1 (neutralne, szyna, funkcyjne), nowe cienie i promienie z §3, przemapowanie bloku shadcn (`--background`, `--primary`, `--border`, `--ring`…).
- `package.json`: `+ @fontsource/faculty-glyphic`, `− @fontsource-variable/instrument-sans`. Import w `src/main.tsx`.
- `@theme inline`: `--font-display` → Faculty Glyphic, `--color-*` dociągnięte o `--color-beige`, `--color-rail*`, `--color-ink-faint`.
- **Rozdzielenie `.tabular` od `--font-display`** (§2 pułapka 2).
- Nowa utility `.label-caps`.
- Usunięcie `--field` i `body::before`.

✅ `pnpm dev` — aplikacja jest ciepła, czytelna i nic nie jest nieklikalne. Szkło jeszcze jest (znika w T-76), ale rozmywa już beż.
⚠️ Ten chunk **celowo nie rusza JSX-a**. Jeśli coś wygląda źle po samej podmianie tokenów, to znaczy, że kolor był zahardkodowany w komponencie — zapisz gdzie, to materiał dla T-79/T-80, a nie do naprawy tutaj.
⚠️ Testy do sprawdzenia: `src/domain/brand/color.test.ts`, `src/pdf/theme.test.ts` — dotyczą brand kitu i PDF-a, **nie powinny** zaczerwienić się w tym chunku. Jeśli się zaczerwienią, znaczy że ruszyłeś za dużo.

---

### T-75 — Logotypy jako komponenty + ikony aplikacji
**Cel:** znika ostatnia litera „A"; marka jest w interfejsie, w oknie i w instalatorze.

- `src/assets/brand/`: `Sygnet.tsx`, `Wordmark.tsx`, `LogoLockup.tsx` — SVG przepisane na JSX, `<style>`/`.cls-1` usunięte, `fill="currentColor"`, `role="img"` + `<title>`, `aria-hidden` gdy obok jest tekst.
- `Sidebar.tsx`: kulka z „A" → `<Sygnet>` (zwinięta) / `<Wordmark>` (rozwinięta), w `--rail-ink`.
- `AuthLayout.tsx`: kulka z „A" → `<LogoLockup>` w `--brown`; usunięcie duplikującego się `pl.app.name` i `pl.app.tagline` (lockup **zawiera** tagline w krzywych — zostawienie obu daje tagline dwa razy).
- `index.html`: `<link rel="icon">` z sygnetem (SVG + fallback PNG 32px).
- `src-tauri/icons/`: regeneracja z sygnetu (`pnpm tauri icon`). Potrzebny master **1024×1024 PNG** — sygnet na `#efece8` z zapasem marginesu, nie na przezroczystości: ikona na ciemnym pasku zadań Windows zniknęłaby.
- `src-tauri/tauri.conf.json`: ikona instalatora i `productName`.
- `AppCredit.tsx`: podpis „Developed by AnzorgeDesign & Moodevlabs" przestrojony na `--ink-faint` (dziś liczy na chłodne tło).

✅ Aplikacja w pasku zadań, w oknie i na ekranie logowania pokazuje Toolier. `grep -rnE '^\s*A\s*$' src --include=*.tsx` nic nie zwraca (dziś: dwa trafienia).
⚠️ `toolier logo.svg` ma 13 kB i kilkadziesiąt ścieżek (tekst w krzywych). Inline w JSX jest OK (jeden ekran, jedno wystąpienie), ale **nie** wsadzaj go do `Sidebar.tsx`, który montuje się przy każdym renderze powłoki.
⚠️ **Nie ruszaj `logoDarkPath`/`logoLightPath` w brand kicie.** To logo *klienta* na jego PDF, nie nasze.

---

### T-76 — Płaskość: koniec szkła
**Cel:** wymiana warstwy materiałowej w jednym miejscu, żeby kolejne chunki restylowały już na docelowym podłożu.

- `globals.css` `@layer components`: `.glass`, `.glass-strong`, `.glass-dark`, `.card-surface` → `.surface-card`, `.surface-band`, `.rail`. Znikają maski `-webkit-mask-composite` i trzy bloki `@supports not (backdrop-filter)`.
- Usunięcie tokenów `--glass-*`.
- Przepięcie 5 plików używających `glass`: `Sidebar.tsx`, `Topbar.tsx`, `AuthLayout.tsx`, `DashboardEmptyState.tsx`, `quotes/editor/components/EditorTopbar.tsx`.
- `PageSection.tsx`, `EmptyState.tsx`, `components/ui/card.tsx` — na `.surface-card` i nowe promienie.
- `.quote-sheet`: cień na ciepły (`--shadow-sheet`) — biała kartka na beżowej kanwie ma się odciąć mocniej niż dziś.

✅ `grep -rn "backdrop-filter\|glass" src/` zwraca zero. Karty czytają się jako uniesione bez rozmycia.
⚠️ **Kolejność chunków jest tu istotna.** Robienie tego po T-77/T-78 znaczyłoby restylowanie komponentów dwa razy: raz na szkle, raz na płasko.

---

### T-77 — Powłoka: szyna i pas
**Cel:** to, co widać na makiecie.

- `Sidebar.tsx`: `.rail`, etykiety `.label-caps` w `--rail-ink-soft` → `--rail-ink` na hover; wszystkie `white/65`, `white/25`, `border-[#131519]` zamienione na tokeny szyny.
- Wskaźnik aktywnej pozycji: biała pigułka `999px` → beżowy **blok** `--rail-pill` z promieniem 6px, tekst `--rail-pill-ink`. Mechanizm (jedna kulka przejeżdżająca między wierszami) **zostaje** — jest dobry i przetestowany (`Sidebar.test.tsx` sprawdza `data-testid="nav-active-marker"`).
- ⚠️ **`nav-pill-stretch` do usunięcia** — animacja „kropli, która się rozciąga i osiada" należała do języka liquid glass. Na drukarskim, płaskim brązie czyta się jak usterka. Zostaje sam przesuw (`transition: transform`), zostaje `--ease-liquid`.
- `Topbar.tsx`: pas `--beige` na całą szerokość, tytuł Faculty Glyphic wersalikami; pole wyszukiwania z `border-white/60 bg-white/45` (liczyło na szkło) na `--surface` + `--hair-strong`.
- CTA „NOWA WYCENA": ramka, wersaliki, światło międzyliterowe — patrz **Decyzja D-3**.
- `AccountMenu`: awatar i kropka statusu subskrypcji na brązie (dziś `border-[#131519]`).
- `AppShell.tsx`: komentarz „treść przewija się POD paskiem — szkło ma co rozmywać" przestaje być prawdą; pas jest teraz nieprzezroczysty.

✅ Zrzut ekranu pulpitu zestawiony z `reference/nowy wyglad.png` różni się tylko tam, gdzie odstąpiliśmy świadomie (§0, D-1…D-3).
⚠️ `Sidebar.test.tsx` i `AppShell.test.tsx` asertują strukturę, nie kolory — powinny przejść bez zmian. Jeśli padną, sprawdź czy nie zgubiłeś `data-expanded` albo `aria-current`.

---

### T-78 — Kontrolki shadcn
**Cel:** 24 komponenty w `src/components/ui/` mówią tym samym językiem co powłoka.

- `button.tsx` — najważniejszy. Wszystkie warianty (`default` brąz / `outline` ramka / `secondary` beż / `ghost` / `destructive` / `link`), promienie `rounded-md` → `--radius-control`, nowy wariant **`frame`** dla CTA z makiety (jeśli D-3 = „ramka").
- `input`, `textarea`, `select`, `label`, `form` — ramka `--hair-strong`, focus `--ring` w brązie zamiast szarości.
- `switch` — stan włączony w `--brown` (dziś liczy na `--primary`, więc pójdzie sam; sprawdzić kontrast kciuka).
- `badge`, `table` (główki na `.label-caps` + `--beige`), `tabs` (podkreślenie brązem), `separator`, `progress`, `skeleton` (puls w cieple, nie w szarości).
- Warstwy nad treścią: `dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`, `command`, `sonner` — cienie ciepłe, nakładka `rgba(51,37,30,.32)` zamiast czerni.
- `scroll-area`, `avatar`, `alert`.

✅ Przegląd wszystkich stanów: hover, focus-visible, disabled, invalid — na kanwie, na karcie i na beżowym pasie.
⚠️ **`focus-visible` to nie kosmetyka.** Dziś `--ring: #9aa0aa` (chłodna szarość) jest ledwo widoczny; na beżu zniknie zupełnie. Nowy `--ring` musi być brązowy i mieć ≥3:1 wobec **obu** podłoży (kanwa i karta).
⚠️ Nie przepisuj tych plików od zera — to komponenty shadcn, przyszłe `npx shadcn add` je nadpisze. Zmieniaj tylko klasy w `cva`.

---

### T-79 — Statusy i barwy funkcyjne
**Cel:** informacja niesiona kolorem zostaje czytelna po ociepleniu palety.

- `StatusMark.tsx` — nowe wartości `--status-*` (§1.3). Struktura toru bez zmian.
- `src/features/dashboard/trial-tone.ts` — `GREEN #2c7a51` / `AMBER #de8b2c` / `RED #c0392b` → tokeny `--positive` / `--warning` / `--danger`. **Zahardkodowane hexy do wyrzucenia** (CLAUDE.md: kolory idą przez tokeny). Test `trial-tone.test.ts` asertuje wartości — zaktualizować razem.
- `swatches.ts` — trzy chłodne odcienie (§1.4).
- `GoogleButton.tsx` — tło/ramka na tokeny, **hexy logo Google zostają nietknięte**.
- `Money.tsx` i wszystko z `.tabular` — weryfikacja, że kwoty są w Inter, a nie w Faculty Glyphic (regresja z §2 pułapka 2).

✅ Rejestr wyceń z pięcioma statusami obok siebie — każdy rozróżnialny. Sprawdzone też w symulacji deuteranopii (DevTools → Rendering → Emulate vision deficiencies): tor odcinków niesie postęp bez koloru.

---

### T-80 — Ekrany treści
**Cel:** przejście po wszystkim, co nie jest powłoką ani kontrolką. Największy chunk — **jeśli przekroczy jeden PR, tnij po obszarach**, nie po typach zmian.

| Obszar | Pliki |
|---|---|
| Pulpit | `features/dashboard/*` — kafle statystyk, `OnboardingChecklist`, `DashboardEmptyState`, karta subskrypcji |
| Klienci i projekty | `features/clients/*`, `features/projects/*` — listy, zakładki, nagłówki, pigułki filtrów |
| Wyceny (rejestr) | `features/quotes/list/*` |
| Edytor wyceny | `features/quotes/editor/*` — `EditorTopbar`, `TotalsCard`, `ItemRow`, `LibraryPicker`, `CategoryPills`, panele boczne |
| Biblioteka | `features/library/*` — tabela usług, edytor usługi, grupy, zestawy, pomieszczenia, macierz stawek |
| Szablony, Pliki, Ustawienia, Pomoc, Subskrypcja | `features/templates/*`, `features/files/*`, `features/settings/*`, `features/help/*`, `features/billing/*` |
| Auth | `features/auth/*` |
| Wspólne | `EmptyState`, `ConfirmDialog`, `NotesPanel`, `PlaceholderMenu`, `PageSection` |

Powtarzalne wzorce do ujednolicenia przy okazji (bez zmiany zachowania): główki list na `.label-caps`, pigułki filtrów na `--surface-2` / `--brown`, puste stany na wspólny rytm.

✅ Klik przez wszystkie trasy z `routes.ts` bez ani jednego elementu w chłodnej szarości.
⚠️ **To jest chunk stylowania, nie refaktoru.** Pokusa „przy okazji poprawię ten układ" jest tu największa. Pomysły → `docs/IDEAS.md` (CLAUDE.md, workflow §6).

---

### T-81 — Dokument wyceny i PDF
**Cel:** kartka i jej wydruk zgadzają się z marką — z pełnym rozeznaniem, że to **dane klienta**, a nie nasz motyw.

- `.quote-doc` w `globals.css` — `--doc-ink #16181c` → `#33251e`, `--doc-hair` w ciepło, `--doc-sage` (przygaszony atrament etykiet) w brąz. Biel kartki `--doc-bg #ffffff` **zostaje biała** (§0).
- `src/pdf/theme.ts` — `INK #21201C` → `#33251e`, `HAIR #E3DFD7` dostrojony, `DISCOUNT` bez zmian.
- ⚠️ **Domyślne wartości brand kitu — decyzja, nie oczywistość.** `schema.ts` ma `accentColor: '#21201C'`, `bgColor: '#FAF7F1'`. Zmiana `default()` w zodzie dotyczy **tylko nowych workspace'ów** — istniejące mają wartości zapisane w wierszu i nic ich nie ruszy. Jeśli mają się zmienić także istniejące, to **migracja SQL** i pytanie, czy wolno nadpisać kolor, który klient sam ustawił. Domyślnie: **nie nadpisujemy**. Patrz **D-4**.
- Opcjonalnie: Faculty Glyphic jako pozycja w `FontFamilySchema` (wymaga `.ttf` w `src/pdf/fonts/`, licencja OFL to dopuszcza).

✅ PDF wygenerowany na świeżym koncie ma brąz Toolier; PDF istniejącego klienta z własnym akcentem — nie zmienił się ani o piksel.
⚠️ `pdf/theme.test.ts` i `domain/brand/schema.test.ts` asertują hexy — aktualizacja razem ze zmianą, nie po niej.

---

### T-82 — Domknięcie
**Cel:** dokumentacja mówi prawdę i nie zostaje martwy kod.

- **`docs/05-UI.md` §1 przepisany** — dzisiejsza sekcja tokenów podaje `#F2F4F8`, `#15161A`, Inter i „inspiracja: dashboard edukacyjny". Po redesignie to nieprawda w każdym wierszu. §2 (opis sidebara: „logo Toolier — do dostarczenia logotypu, litera «T» w czarnym kółku") też jest nieaktualny.
- Nagłówek tezy w `globals.css` — dziś opisuje szkło.
- `CHANGELOG.md` — wpis w `[Nieopublikowane]`.
- **Audyt kontrastu** (WCAG AA): tekst ≥4,5:1, elementy interfejsu i `focus-visible` ≥3:1. Sprawdzić na **wszystkich czterech** podłożach: szyna, pas, kanwa, karta.
- `prefers-reduced-motion` i `prefers-contrast` — po usunięciu `nav-pill-stretch` sprawdzić, czy blok redukcji ruchu dalej ma co redukować.
- Zrzuty ekranu do `README.md`.
- `pnpm build` + `pnpm tauri build` — weryfikacja, że fonty i SVG wchodzą do bundla (Faculty Glyphic to nowy asset w łańcuchu Vite).
- Usunięcie martwych tokenów i klas.

✅ `docs/05-UI.md` da się przeczytać jako opis tego, co jest na ekranie. `pnpm lint && pnpm typecheck && pnpm test` zielone. Instalator się buduje.

---

## 6. Decyzje do potwierdzenia

Każda ma zapisaną rekomendację — brak odpowiedzi = idziemy rekomendacją.

**D-1 — Karty jaśniejsze czy ciemniejsze od kanwy?**
Makieta: karty szare na białym tle. Rekomendacja: **odwrotnie** — kanwa `#f7f4f0`, karty białe (uzasadnienie w §0). Odstępstwo świadome.

**D-2 — Co stoi w szynie: sam napis czy pełny lockup?**
Makieta pokazuje lockup z tagline'em i rokiem; opis mówi, że lockup jest do ekranu logowania. Rekomendacja: **sygnet (zwinięta) / napis (rozwinięta) w szynie, pełny lockup na logowaniu.** Powód: szyna ma dwa stany szerokości (76 / 244 px) i zwęża się animacją — lockup z trzema wierszami tagline'u w 244 px byłby nieczytelny, a w 76 px nie zmieściłby się wcale. Tagline ma sens tam, gdzie widzi go ktoś, kto jeszcze nie jest w aplikacji.

**D-3 — Główne CTA: wypełnione czy w ramce?**
Makieta: „+ NOWA WYCENA" jako prostokąt z obrysem. Rekomendacja: **ramka tylko dla tego jednego przycisku w pasie** (leży na beżu, wypełniony brąz krzyczałby), **wypełniony brąz dla CTA w treści** — tam konkuruje z kartami i musi wygrać. To dwa różne konteksty, nie niekonsekwencja.

**D-4 — Czy nowa paleta wchodzi do istniejących brand kitów?**
Rekomendacja: **nie.** Zmieniamy tylko `default()` dla nowych workspace'ów. Kolor na PDF jest własnością klienta.

**D-5 — Tryb ciemny (T-21, Faza 2).**
Nie robimy teraz, ale tokeny mają być tak nazwane, żeby dało się go dołożyć bez przepisywania: `--rail-*` to już gotowa ciemna rampa. Rekomendacja: **nie zaczynać**, tylko nie zabetonować.

---

## 7. Czego ten redesign NIE robi

- Nie zmienia układu żadnego ekranu, nawigacji ani przepływu. Wymiana skóry, nie szkieletu.
- Nie dotyka `src/domain/`, `src/data/`, migracji, Edge Functions ani Stripe'a.
- Nie dokłada bibliotek animacyjnych ani nowych zależności poza jednym fontem (`@fontsource/faculty-glyphic`); jedna wylatuje (`instrument-sans`).
- Nie wprowadza trybu ciemnego (T-21).
- Nie zmienia treści `src/i18n/pl.ts` — poza usunięciem duplikatu tagline'u na ekranie logowania (T-75).
