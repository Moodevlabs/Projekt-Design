# Toolier — funkcje z koncepcji „workspace studia" (klienci, projekty, pliki, biblioteka)

Źródła: `reference/nowosci.md` (dokument koncepcyjny „Workspace / back office dla projektantów wnętrz", 23.08.2026), `reference/bilbioteka.md` (demo biblioteki usług: 8 grup / 38 usług), `reference/inspiracja 1.jpeg` (lista usług w bibliotece) i `reference/inspiracja 2.jpeg` (pełnoekranowy edytor usługi). **Z inspiracji bierzemy użyteczność i przepływy, nie wygląd** — system wizualny jest opisany w `05-UI.md` i nie zmienia się przez ten dokument.

Dokument jest **specyfikacją funkcji**: model domenowy, reguły biznesowe, kryteria odbioru. Odwołania do warstw zgodne z `01-ARCHITECTURE.md`. Kolejność, zależności i numery zadań (`T-53`…`T-66`) są w `06-TASKS.md` — ten plik mówi „co i według jakich reguł", tamten „kiedy". **Zanim zaczniesz którykolwiek chunk, przeczytaj §9 Ustalenia po zderzeniu z kodem** na końcu.

Decyzje produktowe podjęte 2026-08-24 (właściciel): wszystkie rekomendacje z analizy przyjęte — patrz §0.

---

## 0. Decyzje (zamknięte)

| # | Decyzja | Rozstrzygnięcie |
|---|---|---|
| D1 | Projekt jako osobny byt między klientem a wyceną | **Tak, lekki.** `clients → projects → quotes`. Projekt to „teczka" jednej inwestycji. |
| D2 | Pliki wiązane z klientem czy projektem | **Oboma.** `files.client_id` zawsze, `project_id` opcjonalnie. Widok klienta pokazuje wszystkie, projekt — swoje. |
| D3 | Limity Storage | **2 GB na workspace, 25 MB na plik**, dowolny typ poza wykonywalnymi. Limit egzekwowany triggerem, nie tylko w UI. |
| D4 | Biblioteka przykładowa na start konta | **Tak, ceny puste**, wpisy oznaczone „Przykładowa", do usunięcia jednym przyciskiem. |
| D5 | Nazwy w bibliotece | Dotychczasowe „Grupy" (snapshoty pozycji) → **„Zestawy"**. Nowe **„Grupy"** = uporządkowany słownik kategorii (etap/dział). |
| D6 | Desktop vs web | **Desktop (Tauri) zostaje.** Koncepcja §15 rekomenduje web — świadomie odrzucone na 1.0; kod jest przeglądarkowy, wersja web to osobny projekt na później. |
| D7 | Wersjonowanie wycen | **Lekkie**: linia wersji + numer (v1, v2…), bez historii zmian dokumentu. Pełna historia zostaje w fazie 2 (T-22). |
| D8 | Jednostki | `ryczałt · szt. · m² · mb · godz. · wizyta · element · kadr · własna`. |
| D9 | „Wycena indywidualna" (cena `null`) | **Tak w 1.0.** Zmienia kształt `Item` → nowy `bodyVersion`. |
| D10 | Kolejność | **Najpierw oś Klient→Projekt→Pliki (T-53…T-58), potem biblioteka (T-59…T-63).** T-17 (release 1.0) idzie **za** tymi zadaniami — 1.0 wychodzi z klientami i plikami. |
| — | Nazwa i cena | Aplikacja nazywa się **Toolier**. Subskrypcja **98,99 zł/mies.** lub **999,99 zł/rok**. Rebranding kodu = T-65, cena = T-66. |

---

## 1. Mapa: koncepcja vs stan aplikacji

| Punkt z `nowosci.md` | Stan (2026-08-24) | Co dokłada ten dokument |
|---|---|---|
| P0 Konta / Studio | T-05, T-12 — gotowe | rebranding (T-65) |
| P0 Biblioteka usług: pozycje, kategorie, **jednostki**, ceny | T-10/34/50/52 — bez jednostek, kategorie jako wolny tekst | §5 (grupy, jednostki, „od", „indywidualnie", aktywna, biblioteka przykładowa) |
| P0 Szablony wycen | T-11 — tylko `body` | §6 (pakiet = wycena + termin + dokumenty) |
| P0 Wyceny: kalkulacje, rabaty, **wersje**, statusy, PDF | wszystko poza wersjami | §4 (wersje v1/v2, status `archived`) |
| P0 **Klienci** | tabela `clients` od `0001`, zero repo/UI | §2 |
| P0 **Projekty** | brak | §2 |
| P1 Kalkulator terminu, etapy, cennik dodatkowy | T-43…T-47 — gotowe | §7 (usługa dodatkowa → termin) |
| P1 **Dokumenty** (lista wygenerowanych PDF) | PDF tylko na dysk | §3 (archiwum w Storage) |
| „Biblioteka plików" (koncepcja: poza MVP) | brak | §3 — **w MVP** na życzenie właściciela |
| Notatki | `clients.notes`, `quotes.internal_notes` | §2 (projekt), bez osobnego modułu |

Czego z koncepcji **nie budujemy** (jej §13 i §17): portal klienta i akceptacja online (faza 3, T-25/26), e-podpis, faktury/księgowość, kalendarz, role zespołowe (T-27), AI, Gantt z osią czasu, moodboard, sourcing, chat, marketplace, aplikacja mobilna.

---

## 2. Klienci i projekty — oś aplikacji

Hierarchia: **STUDIO (workspace) → KLIENT → PROJEKT → wyceny / termin / dokumenty / pliki / notatki.** Po zalogowaniu użytkownik widzi klientów; wycena jest rzeczą wewnątrz projektu, a nie samodzielnym bytem na liście.

### Model

```sql
-- clients — istnieje od 0001; rozszerzenie:
alter table clients
  add column address text,              -- adres inwestycji (domyślny dla projektów)
  add column city text,
  add column status text not null default 'active' check (status in ('active','archived')),
  add column archived_at timestamptz;

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,                    -- „Dom 164 m²"
  address text, city text,
  area_m2 numeric(8,1),
  kind text,                             -- 'apartment' | 'house' | 'commercial' | 'other' | własny tekst
  status text not null default 'lead'
    check (status in ('lead','offer','in_progress','done','canceled')),
  start_date date,
  notes text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index on projects (workspace_id, client_id, status);

alter table quotes add column project_id uuid references projects(id) on delete set null;
create index on quotes (project_id, updated_at desc);
```

RLS: wzorzec z `02-DATABASE.md §3` (`is_member` + `workspace_can_write`), **jawne granty** (pułapka z T-33). `projects.workspace_id` jest zdenormalizowany celowo — polityki nie robią joina do `clients`.

Domena: `domain/client/schema.ts` (`ClientSchema`, `ProjectSchema`, statusy, etykiety statusów w `i18n`). Repozytoria: `clients.repo.ts`, `projects.repo.ts` + hooki `useClients`, `useProjects`. Klucze cache w `query-keys.ts` (pamiętaj o pułapce prefiksów z T-06).

### Reguły

1. **Dane klienta wpisuje się raz.** Nowa wycena w projekcie dostaje `body.client` **skopiowane** z klienta (nazwa, telefon, e-mail, miasto z projektu albo klienta). To **snapshot**: późniejsza edycja klienta nie zmienia wysłanej oferty. W szkicu (`draft`) jest przycisk „Odśwież dane klienta" — jawna akcja, nie automat. Konflikt `quotes.city` vs `clients.city` (zapowiedziany w T-49) rozstrzygnięty tak samo jak `client_name`: **źródłem jest klient/projekt, wycena trzyma kopię w `body.client` i w kolumnach listowych.**
2. **Wycena bez projektu jest dopuszczalna** („szybka wycena" z paska), ale UI prowadzi przez klienta: „Nowa wycena" na pulpicie pyta o klienta i projekt (z opcją „bez klienta"). `quotes.client_id` i `project_id` są nullable — istniejące wyceny nie mają czego stracić.
3. **Projekt to teczka, nie harmonogram.** Statusy projektu ustawia człowiek; nie liczymy ich z wycen. Wyjątek: oznaczenie wyceny jako `accepted` **proponuje** (toast z akcją, nie automat) przestawienie projektu na `in_progress`.
4. **Pomieszczenia zostają w wycenie** (`body.rooms`) — tam liczy je cennik. Projekt **nie** ma własnej listy pomieszczeń (odstępstwo od koncepcji §4.3, patrz §9.2). Nowa wycena w projekcie, który ma już wycenę, pyta: „Skopiować pomieszczenia z ostatniej wyceny?".
5. **Archiwizacja klienta** (soft) chowa go z list, ale nie rusza projektów ani wycen — dane są dostępne z poziomu wyceny (link do klienta pokazuje badge „zarchiwizowany"). Usunięcie klienta z projektami wymaga potwierdzenia z liczbą projektów i plików; kaskada w bazie jest, ale UI ma powiedzieć, co zniknie.
6. **Karta klienta pokazuje sumy z projektów**: liczba projektów, wartość zaakceptowanych wycen (z kolumny `total_net_cents`, nie z `body`), data ostatniej aktywności. Liczone w Postgresie (widok albo RPC), nie w przeglądarce — lista klientów ma rosnąć do setek.

### Chunki

**K1 Klienci — repo, lista, karta, przypięcie wyceny** *(T-53)*
- Migracja: kolumny w `clients`, backfill `clients.city` z `quotes.city` tam, gdzie wycena ma `client_id` (dziś brak takich — migracja bez efektu, ale idempotentna).
- `clients.repo` + `useClients`; lista `/klienci` (szukaj po nazwie/e-mailu/telefonie/mieście w Postgresie, sort, filtr aktywni/zarchiwizowani); karta `/klienci/:id` z zakładkami **Projekty | Wyceny | Dokumenty | Pliki | Notatki** (zakładki, których dane jeszcze nie istnieją — Dokumenty, Pliki — **nie pokazuj** do czasu T-55/T-56; zakładka do „wkrótce" jest gorsza niż jej brak — zasada z T-44).
- W edytorze: karta „Klient" w prawej kolumnie dostaje combobox wyboru klienta (z „+ Nowy klient" inline) i przycisk „Odśwież dane klienta".
- Lista wycen: kolumna „Klient" staje się linkiem do karty klienta; filtr po kliencie.
✅ Utworzenie klienta → nowa wycena z jego karty ma wypełnione dane inwestora; edycja telefonu klienta **nie** zmienia wysłanej wyceny; szukanie po fragmencie e-maila działa po stronie bazy.

**K2 Projekty** *(T-54)*
- Migracja `projects` + `quotes.project_id`; repo, hooki; `/klienci/:id/projekty/:projectId` z zakładkami **Wyceny | Dokumenty | Pliki | Notatki** (Termin jest zakładką wyceny, nie projektu — nie duplikujemy).
- Tworzenie projektu z karty klienta (nazwa, adres domyślnie z klienta, metraż, typ, status).
- Wycena tworzona z projektu dostaje `project_id`, `client_id` i snapshot klienta; „Skopiować pomieszczenia?" wg reguły 4.
- Lista wycen projektu grupuje po linii wersji (§4).
✅ Klient z dwoma projektami widzi dwie osobne listy wycen; wycena przeniesiona między projektami (menu ⋯ → „Przenieś do projektu") zmienia tylko `project_id`.

**K3 Pulpit i nawigacja pod klienta + ⌘K** *(T-58)*
- Sidebar: **Pulpit · Klienci · Wyceny · Biblioteka · Szablony · Ustawienia** (Branding wchodzi do Ustawień jako pierwsza sekcja; trasa `/branding` zostaje jako alias do `/ustawienia/branding`, żeby nie łamać istniejących linków i testów).
- Pulpit: nad dotychczasowymi kaflami blok **„Aktywni klienci i projekty"** (ostatnio edytowane projekty, max 6, z klientem i statusem) i przycisk „Nowy klient"; „Nowa wycena" z pulpitu pyta o klienta/projekt.
- Paleta ⌘K (dziś placeholder w `Topbar` z T-04): klienci, projekty, wyceny (numer/tytuł), usługi biblioteczne, akcje („Nowy klient", „Nowa wycena"). `cmdk` jest już w shadcn `command` — bez nowej zależności.
✅ Po zalogowaniu pierwszy ekran prowadzi do klientów; ⌘K znajduje klienta po fragmencie nazwy i otwiera kartę.

---

## 3. Pliki i dokumenty (Storage)

Każdy klient/projekt ma własne archiwum: pliki wrzucone przez użytkownika (rzuty, zdjęcia, umowy) **i** dokumenty wygenerowane przez aplikację (PDF wyceny, terminu, etapów, cennika, pakietu). Jedna tabela, jeden bucket, dwa `kind`.

### Model

```sql
-- bucket (prywatny), wzór: 0005_storage.sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 26214400);   -- 25 MiB; allowed_mime_types = null (blokujemy po rozszerzeniu, patrz reguła 3)

create table files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  kind text not null check (kind in ('upload','generated')),
  doc_type text,                         -- dla generated: 'quote' | 'schedule' | 'stages' | 'price_list' | 'package'
  quote_version int,                     -- dla generated: wersja wyceny w chwili eksportu
  name text not null,                    -- nazwa widoczna (edytowalna)
  mime text, size_bytes bigint not null,
  storage_path text not null unique,     -- {workspace_id}/{client_id}/{project_id|_}/{uuid}.{ext}
  created_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index on files (client_id, deleted_at, created_at desc);
create index on files (project_id, deleted_at, created_at desc);

alter table workspaces add column storage_quota_bytes bigint not null default 2147483648;  -- 2 GiB
alter table workspaces add column storage_used_bytes  bigint not null default 0;            -- utrzymywane triggerem na files
```

- Trigger `files_enforce_quota()` **before insert**: jeśli `storage_used_bytes + new.size_bytes > storage_quota_bytes` → `raise exception 'STORAGE_QUOTA_EXCEEDED'`. Trigger **after insert/update(deleted_at)/delete** aktualizuje `storage_used_bytes`. Soft delete zwalnia miejsce dopiero po fizycznym usunięciu obiektu — patrz reguła 5.
- Polityki na `storage.objects` dla bucketa `files`: kopia polityk `brand` (`storage_workspace_id(name)` + `is_member` + `workspace_can_write`). Pobieranie przez signed URL (60 s).
- `delete-account` (T-16) i `export.repo` (eksport danych) **muszą objąć bucket `files`** — patrz §9.6.

Domena: `domain/files/schema.ts` (`FileSchema`, `FileKind`, `DocType`, `isAllowedExtension`, `fileNameForGenerated`). Repo `files.repo.ts` łączy Storage + tabelę: `uploadFile`, `listFiles`, `renameFile`, `deleteFile`, `getDownloadUrl`.

### Reguły

1. **Metadane w Postgresie, bajty w Storage.** Listowanie po Storage API jest wolne i nie ma po czym szukać; tabela `files` jest jedynym źródłem listy. Obiekt bez wiersza to śmieć do sprzątnięcia, wiersz bez obiektu to błąd do pokazania („plik niedostępny"), nie biały ekran.
2. **Kolejność przy uploadzie: obiekt → wiersz.** Nieudany insert wiersza (np. quota) → usuń obiekt. Odwrotna kolejność zostawiałaby wiersz wskazujący na nic. Ta sama zasada co przy logo (T-12).
3. **Typy plików: blokujemy po rozszerzeniu, nie po MIME** (`exe, msi, bat, cmd, sh, ps1, dll, scr, js, jar, com`); MIME z przeglądarki jest niewiarygodne. Limit 25 MB sprawdzamy **przed** wysyłką z komunikatem po polsku — Storage odrzuci i tak, ale po angielsku (pułapka z T-12).
4. **Limit 2 GB jest twardy w bazie** (trigger), a UI pokazuje pasek zużycia w Ustawieniach i ostrzeżenie od 90%. Komunikat przy odbiciu: ile zajęte, ile trzeba zwolnić. Bez tego użytkownik zobaczy „błąd zapisu" i nie będzie wiedział dlaczego.
5. **Usuwanie: soft delete w tabeli + natychmiastowe skasowanie obiektu.** Kosz na pliki nie wchodzi w 1.0 — trzymanie obiektów „na wszelki wypadek" zjadałoby limit, którego użytkownik nie widzi. `deleted_at` zostaje jako ślad w wierszu (nazwa, kto, kiedy), obiekt znika. Zwalnianie limitu liczy się po skasowaniu obiektu.
6. **Dokument wygenerowany = plik `kind: 'generated'`.** Każdy eksport PDF (T-13/45/46/47/48) dostaje checkbox „Zapisz w dokumentach klienta" — **domyślnie włączony**, gdy wycena ma `client_id`, ukryty, gdy nie ma. Zapis do archiwum jest **niezależny** od zapisu na dysk: anulowanie dialogu zapisu pliku nie cofa archiwizacji, nieudana archiwizacja nie blokuje pliku na dysku (toast z „Ponów"). Pakiet zapisuje **jeden** wpis `doc_type: 'package'` (scalony PDF) albo osobne wpisy w trybie „osobne pliki".
7. **Archiwum nie renderuje ponownie.** Zakładka „Dokumenty" pokazuje pliki `generated` posortowane od najnowszych z numerem wyceny i wersją; „Otwórz" pobiera zapisany PDF. To domyka wymóg koncepcji §15 „PDF odtwarzalny / dokument wysłany archiwizowany jako konkretna wersja" bez zależności od bieżącej biblioteki i brand kitu.
8. **Pliki nie idą do szablonów ani duplikatów wycen.** Duplikat/nowa wersja wyceny nie kopiuje wpisów `files` — dokumenty są historią konkretnej wersji.

### Chunki

**P1 Pliki — bucket, tabela, limity, RLS, upload/lista/pobierz** *(T-55)*
- Migracja (bucket, tabela, granty, RLS, triggery kwoty), `files.repo`, `useFiles`, `domain/files/`.
- UI: zakładka **Pliki** u klienta i projektu: strefa drag&drop + przycisk (Tauri: `dialog.open` z `multiple`), lista (nazwa, typ, rozmiar, data, kto), zmiana nazwy inline, pobierz (signed URL → `save_file`), usuń z potwierdzeniem, podgląd obrazów w dialogu. Pasek zużycia w Ustawieniach → sekcja „Pliki".
- Testy integracyjne: kwota odbija (trigger), RLS odmawia cudzemu workspace'owi, soft delete zwalnia miejsce po usunięciu obiektu.
✅ Wrzucenie 3 plików z pulpitu Windows przeciągnięciem → widoczne u klienta i w projekcie; plik 30 MB odbity przed wysyłką po polsku; po zapełnieniu 2 GB insert odbity przez bazę z czytelnym komunikatem.

**P2 Archiwum dokumentów (PDF → Storage przy eksporcie)** *(T-56)*
- Checkbox w każdym dialogu eksportu; `archiveGeneratedPdf(quote, docType, bytes)` w `files.repo`; nazwa wg `pdf/file-name.ts` (z przyrostkami `-termin`, `-etapy`…).
- Zakładka **Dokumenty** u klienta i projektu; sekcja „Dokumenty" także w prawej kolumnie edytora (skrót: ostatnie 3 + link).
✅ Eksport wyceny v2 → w Dokumentach klienta pojawia się `WYC/…-v2-wycena.pdf`; otwarcie daje dokładnie ten plik, mimo późniejszej zmiany brand kitu.

---

## 4. Wersje wycen (v1 / v2) i status `archived`

### Model

```sql
alter table quotes
  add column lineage_id uuid,                       -- wspólny dla wszystkich wersji; backfill: = id
  add column version int not null default 1;
-- status: dochodzi 'archived'
alter table quotes drop constraint quotes_status_check;
alter table quotes add constraint quotes_status_check
  check (status in ('draft','sent','accepted','rejected','expired','archived'));
create unique index quotes_one_accepted_per_project
  on quotes (project_id) where status = 'accepted' and deleted_at is null and project_id is not null;
create index on quotes (lineage_id, version desc);
```

Domena: `QuoteStatusSchema` + `'archived'`; `domain/quote/versions.ts` (`nextVersionLabel`, `canCreateVersion`).

### Reguły

1. **„Nowa wersja" = duplikat w tej samej linii**: `lineage_id` ten sam, `version + 1`, `status: 'draft'`, **nowy numer** z `next_quote_number` (numer identyfikuje dokument u klienta; v2 to nowy dokument). Numer z sufiksem wersji w UI: `WYC/2026/08/0012 · v2`.
2. **Poprzednia wersja dostaje `archived`, jeśli była `draft`**; `sent`/`accepted`/`rejected` zostają — to fakty, nie robocze kopie.
3. **Jedna zaakceptowana wycena na projekt** — pilnuje indeks częściowy. Oznaczenie v2 jako `accepted` przy zaakceptowanej v1 → dialog: „v1 jest zaakceptowana. Zastąpić? (v1 → archiwalna)". Baza odbije wyścig; UI ma o tym powiedzieć po polsku (kod `23505` na tym indeksie → komunikat, nie „błąd zapisu").
4. **`archived` to status, nie `deleted_at`.** Archiwalne wersje są na liście projektu (zwinięte), w rejestrze (filtr) i w statystykach nie liczą się do „wysłanych". Dotychczasowa „Archiwizuj" z menu (soft delete, T-07) zostaje jako „Usuń" z koszem — **przemianować w UI**, bo dwa różne „archiwum" to pułapka.
5. **Duplikuj ≠ Nowa wersja.** „Duplikuj" (T-07) tworzy **nową linię** (`lineage_id = nowy id`, `version = 1`) — do użycia „ta sama oferta dla innego klienta". Oba przyciski zostają, z opisem w tooltipie.
6. **Szablon nie niesie `lineage_id` ani `version`** — zapis do szablonu (T-11) je pomija; wycena z szablonu zaczyna linię od v1.

### Chunk

**W1 Wersje wycen + status `archived`** *(T-57)*
- Migracja + backfill; akcja „Nowa wersja" w menu edytora i w wierszu listy; grupowanie po linii w projekcie i w rejestrze (wiersz główny = najnowsza wersja, rozwinięcie = starsze); badge wersji przy numerze; dialog zastąpienia zaakceptowanej.
- PDF: „v2" **nie** trafia na dokument klienta domyślnie (ustawienie `showVersionOnPdf`, domyślnie off) — inwestor nie musi wiedzieć, że to trzecie podejście; w nazwie pliku wersja **jest** zawsze (`-v2-`), żeby pliki się nie nadpisywały (zasada z T-45).
✅ Flow z koncepcji §11: v1 → zmiany → „Nowa wersja" → v2 oznaczona jako zaakceptowana; v1 archiwalna, jeden `accepted` w projekcie; rejestr pokazuje obie z filtrem.

---

## 5. Biblioteka — restrukturyzacja

Zakładki: **Usługi | Grupy | Zestawy | Pomieszczenia | Stawki**. Dwa pojęcia, które dziś zlewają się w jedno słowo, rozchodzą się: **Grupa** = dział/etap porządkujący usługi (koncepcja „01 · Przygotowanie projektu"); **Zestaw** = dotychczasowa `library_groups` (snapshot pozycji do wstawienia na raz, np. „Kuchnia").

### Model

```sql
create table library_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,                     -- „Przygotowanie projektu"
  code text,                              -- „01" — prefiks widoczny na liście, opcjonalny
  color text,                             -- token z palety (nie dowolny hex) — patrz 05-UI
  sort_order int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
alter table library_items
  add column category_id uuid references library_categories(id) on delete set null,
  add column unit text not null default 'lump'      -- 'lump'|'piece'|'m2'|'mb'|'hour'|'visit'|'element'|'frame'|'custom'
    check (unit in ('lump','piece','m2','mb','hour','visit','element','frame','custom')),
  add column unit_label text,                        -- tylko dla 'custom'
  add column min_price_cents bigint,                  -- „od 350 zł" na liście; null = brak
  add column active boolean not null default true,
  add column is_sample boolean not null default false;
-- unit_price_cents: dopuszczamy null = „wycena indywidualna"
alter table library_items alter column unit_price_cents drop not null;
```

Migracja danych: dla każdego workspace'u `distinct category` z `library_items` → wiersze `library_categories` (kolejność alfabetyczna, `code` puste), `category_id` ustawione; kolumna tekstowa `category` **zostaje na jedną wersję** jako kopia do wyszukiwania i zgodności z importem CSV, potem do usunięcia (zanotować w IDEAS/TASKS).

Domena (`domain/quote/schema.ts`, `domain/library/schema.ts`):
```ts
const Unit = z.enum(['lump','piece','m2','mb','hour','visit','element','frame','custom']);
Item.unit: Unit.default('lump'); Item.unitLabel: z.string().optional();
Item.unitPriceCents: z.number().int().nullable()      // null = indywidualnie → bodyVersion + 1
LibraryItem.categoryId, unit, unitLabel, minPriceCents, active, isSample
```
`domain/library/units.ts`: `formatUnit(unit, label)` → „/ m²", „/ h", „/ wizyta"; `unitForPricingMode(mode)` — podpowiedź (per_room → `lump`, per_frame → `frame`).

### Reguły

1. **Jednostka to etykieta ilości, tryb liczenia to osobna rzecz.** Osiem przycisków „sposób wyceny" z inspiracji mapuje się na **3 tryby liczenia + jednostkę**: Kwota stała = `flat/lump`; Za m² = `flat/m2`; Według pomieszczenia = `per_room`; Za kadr = `per_frame`; Za godzinę = `flat/hour`; Za wizytę = `flat/visit`; Za element = `flat/element`; Indywidualnie = `flat` z ceną `null`. Nie dokładamy trybów liczenia — `calcItemCents` nie zmienia się. W UI karty usługi te osiem opcji jest **jednym** wyborem (jak w inspiracji), a pod spodem ustawia parę `(mode, unit)`.
2. **„Indywidualnie" (`unitPriceCents: null`) nie wchodzi do sumy i jest widoczne.** W wierszu edytora i w PDF: „wycena indywidualna" zamiast kwoty; `TotalsCard` pokazuje dopisek „+ N pozycji wycenianych indywidualnie". Podsumowanie **nie** udaje, że pozycja kosztuje 0. To jest zmiana kształtu (`int` → `int | null`) → **`bodyVersion + 1`** z krokiem migracji, który niczego nie przekształca (stare dokumenty mają liczby) — ale literał wersji musi się zgadzać (zasada z T-30).
3. **`unit` w wycenie jest snapshotem z biblioteki** i kaskaduje jak nazwa/opis/cena (rozszerzyć `cascadeFields` i `LibraryCascadePatch` — trzecia zmiana tego samego miejsca, patrz T-34).
4. **Cena „od" jest informacją na liście, nie w obliczeniach.** `min_price_cents` pokazuje się w bibliotece i w pickerze („od 350 zł"); dla `per_room`/`per_frame` bez ręcznego „od" lista pokazuje „od {min(stawek)}" liczone w domenie (`minRuleCents(rule)`). Odstępstwo od inspiracji: **nie** ma „minimalnej wartości usługi w ofercie" jako reguły liczenia — clamp od dołu w `calc` to ukryta logika, której użytkownik nie odtworzy. Jeśli wróci, to jako osobny tryb z jawnym dopiskiem w wierszu.
5. **`active = false` chowa usługę z pickera i z „Rozpisz na pomieszczenia"**, ale nie z macierzy cennika ani z wycen, które ją mają. Kaskada dalej działa. Filtr „Pokaż nieaktywne" na liście.
6. **Grupa (kategoria) ma kolejność i kod.** Lista usług i picker sortują po `library_categories.sort_order`, potem `library_items.sort_order`. Pigułki filtrów nad listą = grupy w tej kolejności + „Wszystkie". Usunięcie grupy z usługami → soft delete grupy, usługi dostają `category_id = null` i lądują w „Bez grupy" (nie kasujemy usług przy sprzątaniu działu — ta sama zasada co przy wariantach w T-52).
7. **Zestawy** (dawne grupy) bez zmian w modelu; zmienia się tylko nazwa w UI i i18n. Picker w edytorze: zakładki „Usługi" i „Zestawy".
8. **Biblioteka przykładowa** (`bilbioteka.md`): 8 grup, 38 usług, `is_sample = true`, **`unit_price_cents = null`** (indywidualnie) — nie sugerujemy stawek. Jednostki i tryby wg tabeli w `bilbioteka.md` (kolumna „Sposób wyceny"; przy alternatywie „za m² / kwota stała" bierzemy pierwszą). Seed w `seed_library_sample(ws)` wołany z `handle_new_user()`; **idempotentny** (pomija workspace, który ma już jakąkolwiek usługę — nie dokładamy demo do cudzej biblioteki). Backfill istniejących workspace'ów: **nie** (mają swoje dane). Badge „Przykładowa" na liście; edycja dowolnego pola zdejmuje `is_sample` (użytkownik „wziął" wpis); w Ustawieniach → Biblioteka: „Usuń pozostałe przykładowe (N)". Onboarding (T-17): krok „Przejrzyj bibliotekę przykładową" zamiast „dodaj pierwszą pozycję".
9. **Statystyki użycia** („użyta w 24 projektach"): RPC `library_item_usage(ws)` po `quotes.body` (`jsonb_path_query` po `libraryItemId`, GIN index z 0001) → mapa `itemId → {quotes, lastUsedAt}`. Liczone na żądanie przy otwarciu karty, cache 5 min. Nie denormalizujemy — liczba nie jest krytyczna.

### Chunki

**B1 Grupy (słownik), zestawy, zakładki, Pomieszczenia** *(T-59)*
- Migracja `library_categories` + `category_id` + migracja danych; repo/hooki; zakładka **Grupy** (lista z drag kolejności, inline-edit nazwy i kodu, kolor z palety, licznik usług); zmiana nazw „Grupy → Zestawy"; zakładka **Pomieszczenia** = `RoomTypesSection` z Ustawień wyświetlona w bibliotece (jeden komponent, dwa miejsca; w Ustawieniach zostaje link); „Stawki" = obecna macierz (zmiana etykiety).
- Lista usług: pigułki grup + „Wszystkie", licznik „N usług", kolumny *Usługa / Grupa / Sposób wyceny / Cena / Aktywna*, przełącznik lista–siatka (siatka = dotychczasowe karty), „Pokaż więcej" po 50, split-button „Dodaj ▾" (Usługa / Zestaw / Import CSV).
- Import CSV (T-50): kolumna `grupa` dopasowuje po nazwie do słownika, nieznana → tworzy grupę (tu tworzymy — to jawny import, nie sprzątanie).
✅ Istniejące kategorie tekstowe po migracji są grupami w tej samej kolejności co alfabetycznie; picker w edytorze pokazuje usługi w kolejności grup; usunięcie grupy nie kasuje usług.

**B2 Jednostki, „od", „indywidualnie", aktywna** *(T-60)*
- Migracja kolumn; `Unit` w domenie; `bodyVersion + 1` (cena nullable); `formatUnit`; kaskada `unit`; wybór „sposobu wyceny" jako jedna kontrolka 8 opcji na karcie usługi (pod spodem `(mode, unit)`); pole „własna jednostka"; przełącznik „Aktywna"; „od" ręczne + wyliczone.
- Edytor: jednostka przy ilości w wierszu („× 14 m²"), „wycena indywidualna" w wierszu, dopisek w `TotalsCard`; PDF: kolumna ilości z jednostką, „wycena indywidualna" zamiast kwoty, dopisek w podsumowaniu.
✅ Usługa „Pomiar wnętrza, 12 zł / m², qty 80" liczy 960 zł i drukuje „80 m² × 12,00 zł"; pozycja „indywidualnie" nie zmienia sumy i jest w PDF; nieaktywna usługa znika z pickera, ale kaskada do otwartej wyceny działa.

**B3 Pełnoekranowy edytor usługi z podglądem + statystyki** *(T-61)*
- Trasa `/biblioteka/uslugi/:id` (i `/nowa`): układ z inspiracji 2 — lewa kolumna z numerowanymi sekcjami **1 Nazwa · 2 Opis (limit 500) · 3 Grupa · 4 Sposób wyceny · 5 Stawki wg pomieszczeń (tylko `per_room`/`per_frame`; z linkiem „Zarządzaj pomieszczeniami" → zakładka Pomieszczenia) · 6 Ustawienia dodatkowe (cena „od", jednostka własna, aktywna, warianty z T-52, etykiety z T-42)**; prawa kolumna: **„Podgląd w ofercie"** (ten sam `ItemRow` w trybie podglądu + dla `per_room` lista stawek jak na obrazku), **„Jak to działa?"** (tekst zależny od trybu — 4 warianty w i18n), **„Statystyki użycia"** (RPC z reguły 9).
- Karta na liście dostaje „Edytuj" → pełna strona; inline-edit na karcie zostaje dla nazwy/ceny (szybkie poprawki), reszta na stronie. Zapis jawny („Zapisz zmiany"), nie autozapis — jak w brandingu (T-12), bo kaskada pyta o zmiany w otwartej wycenie i nie może pytać przy każdym klawiszu.
- **Kaskada z pełnej strony**: `LibrarySheet` (T-10) zostaje panelem w edytorze; pełna strona **nie** ma otwartej wyceny, więc kaskada z niej nie działa — i to jest OK, ale strona ma o tym powiedzieć („zmiany trafią do nowych wycen; otwarte wyceny zaktualizuj z panelu biblioteki w edytorze").
✅ Edycja stawki „Kuchnia" na pełnej stronie odświeża podgląd bez zapisu; „Zapisz" zapisuje jednym wywołaniem; statystyka pokazuje liczbę wycen z tą usługą zgodną z seedem.

**B4 Biblioteka przykładowa na start konta** *(T-62)*
- `seed_library_sample(ws)` w migracji (treść z `bilbioteka.md` — nazwy i opisy przepisać **dosłownie**, to autorski tekst pod projektantów), wpięcie w `handle_new_user()`, `is_sample` na grupach i usługach, badge, „Usuń pozostałe przykładowe" w Ustawieniach → Biblioteka, zdejmowanie flagi przy edycji, krok onboardingu.
- `seed.sql` (demo) **nie** dostaje biblioteki przykładowej — ma własne 15 pozycji z cenami, których używają testy parytetu.
✅ Nowe konto ma 8 grup i 38 usług bez cen, wszystkie z badge; po edycji jednej badge znika tylko z niej; „Usuń pozostałe" kasuje 37 i puste grupy przykładowe, zostawia edytowaną.

---

## 6. Pakiety — szablon niesie termin i dokumenty

Koncepcja §7/§11: wybór „Projekt kompleksowy" ustawia naraz zakres wyceny, etapy współpracy i czasy. Dziś `quote_templates.body` niesie tylko wycenę (T-11), a harmonogram (T-43) i dokumenty (T-46) żyją w kolumnach `quotes.schedule` / `quotes.documents`.

```sql
alter table quote_templates
  add column schedule jsonb,      -- ScheduleBody | null
  add column documents jsonb;     -- QuoteDocuments | null
```

Reguły:
1. „Zapisz jako szablon" (T-11) pyta jednym dialogiem: **[x] wycena [x] termin [x] dokumenty** — zaznaczone to, co wycena faktycznie ma (brak = checkbox ukryty, zasada z T-48).
2. Nowa wycena z szablonu dostaje komplet; `schedule.startDate` **zerowana** (data startu należy do projektu, nie do pakietu); etapy dokumentów z `included` jak w szablonie.
3. Szablon **nie** niesie klienta, daty, numeru, wersji, plików (T-11, §4.6, §3.8).
4. Nazwa w UI: nadal **„Szablony"** (nie „Pakiety") — jedno słowo mniej do wyjaśniania; karta szablonu pokazuje ikony „wycena · termin · dokumenty" wg zawartości.

**Chunk S1** *(T-63)*: migracja, `templates.repo` (miękkie parsowanie obu kolumn — uszkodzony `schedule` nie blokuje użycia szablonu wyceny), dialog zapisu, tworzenie z szablonu, ikony na karcie.
✅ Szablon zapisany z harmonogramem → nowa wycena ma zakładkę Termin z etapami bez daty startu; szablon zapisany bez dokumentów nie tworzy pustej zakładki Dokumenty.

---

## 7. Usługi dodatkowe → wpływ na termin

Koncepcja §8/§16: dodanie usługi dodatkowej może zmieniać koszt **i** termin, a użytkownik może wyłączyć jeden z efektów. Dziś (T-47) cennik dodatkowy ma tekstowy `leadTime` („4–7 dni") i most „Dodaj do wyceny jako pozycję" (koszt).

Model (`domain/documents/price-list.ts`): `PriceListEntry.addedDays: z.number().int().min(0).nullable().default(null)` — liczba dni roboczych **wykonawcy**; `leadTime` (tekst do PDF) zostaje. Harmonogram: etap specjalny `kind: 'extras'` (jeden na wycenę, `owner: 'provider'`, `roomScope: 'none'`, `baseDays = Σ addedDays` dodanych usług) — tworzony/aktualizowany przez most, edytowalny ręcznie jak inne etapy.

Reguły:
1. Most dostaje dwa przełączniki: **„Dodaj do wyceny (koszt)"** i **„Dodaj do terminu (+N dni)"** — drugi widoczny tylko, gdy wpis ma `addedDays` i wycena ma harmonogram (albo proponuje go założyć).
2. Dni z usług dodatkowych są **osobnym etapem**, nie rozsmarowane po istniejących — użytkownik ma widzieć, skąd wzięło się +5 dni (ta sama zasada co przy rabatach na sekcje w T-37).
3. Usunięcie pozycji z wyceny **nie** zdejmuje dni automatycznie (automat cofający byłby zaskoczeniem — zasada z T-44); etap pokazuje listę usług, z których się składa, i pozwala usunąć każdą.

**Chunk U1** *(T-64)*: schemat, pole w zakładce Cennik, most z przełącznikami, etap `extras` w domenie i `ScheduleTab`, PDF terminu pokazuje etap jak każdy inny.
✅ Dodanie „Panorama 360, +3 dni" wydłuża „Optymalne zakończenie" o 3 dni robocze i pojawia się jako pozycja w wycenie; odznaczenie „koszt" dodaje tylko dni.

---

## 8. Rebranding i cena

**R1 Toolier** *(T-65)*: nazwa w `tauri.conf.json` (`productName`, `identifier`), tytuł okna, `package.json`, i18n (`pl.app.name`), ekrany auth, stopka „Toolier", ikona (`scripts/make-icon.mjs` → nowy logotyp od właściciela; do czasu dostarczenia zostaje „A" — zanotować), README, CHANGELOG, `docs/07-BUILD-MACOS.md`. **Deep link `anzorge://` → `toolier://`** (`config.toml` `additional_redirect_urls`, `deep-links.ts`, capabilities, panel Supabase — ręcznie). **Usługa keychain `pl.anzorge.app` → `pl.toolier.app`**: zmiana kasuje zapisane sesje użytkowników testowych — akceptowalne przed 1.0, ale trzeba to napisać w CHANGELOG. Seed `demo@anzorge.local` → `demo@toolier.local` (testy integracyjne!). Nazwy `Anzorge` w komentarzach i docs — grep i podmiana; nazwa repo/katalogu zostaje.
✅ `grep -ri anzorge src src-tauri supabase docs` zwraca tylko historyczne notatki w `06-TASKS.md` i `CHANGELOG.md`.

**R2 Cena 98,99 zł/mies., 999,99 zł/rok** *(T-66)*: nowe ceny w Stripe (nowe `price` z `lookup_key` `toolier_monthly` / `toolier_yearly`; stare archiwizować, nie usuwać — Stripe nie pozwala edytować kwoty), produkt „Toolier"; `SubscriptionPage` i pulpit pokazują kwoty z i18n (**jedno** miejsce: `pl.billing.prices`), testy `billing-ui.test.tsx`; `03-BILLING.md`. Roczna = 10 miesięcy w cenie 12 — pokazać oszczędność na ekranie („2 miesiące gratis").
✅ Checkout w sandboxie pokazuje 98,99 zł / 999,99 zł; test pilnuje, że stara kwota nie występuje w i18n.

---

## 9. Ustalenia po zderzeniu z kodem (2026-08-24)

1. **`clients` istnieje od `0001` z RLS i grantami (0004), ale bez `city`, `address`, `status`** i bez repozytorium. `export.repo` już eksportuje `clients` po surowych wierszach — po migracji nowe kolumny wejdą tam same. `quotes.client_id` jest FK od początku — używamy, nie dodajemy.
2. **Pomieszczenia zostają w wycenie, nie w projekcie** — odstępstwo od koncepcji §4.3 i §14 (`Room.project_id`). Cennik parametryczny, harmonogram, placeholdery `{rooms}` i bloki per pomieszczenie (T-31…T-51, T-43) czytają `body.rooms`; przeniesienie listy do projektu znaczyłoby drugie źródło prawdy i pytanie „która lista liczy", na które nie ma dobrej odpowiedzi. Projekt **podpowiada** pomieszczenia z ostatniej wyceny (kopia).
3. **Kolizja nazw `library_groups`.** Tabela `library_groups` to zestawy (snapshoty). Nowy słownik kategorii nazywa się **`library_categories`** w bazie i „Grupy" w UI; zestawy zostają w tabeli `library_groups` i nazywają się „Zestawy" w UI. **Nie zmieniaj nazwy tabeli** — snapshoty mają własną ścieżkę zgodności (T-30 ⚠️) i testy integracyjne.
4. **`unitPriceCents: null` zmienia kształt `Item` w ~20 miejscach**, tak jak `kind:'discount'` w T-36: `calcItemUnits`/`calcItemCents`, `ItemRow`, `InlineMoney`, `Money`, PDF (`PdfItemRow`), kaskada (`item-draft.ts`), snapshoty zestawów (`LibraryItemSnapshotSchema` — tam też nullable, z własnym `default`, nie przez `migrateBody`), CSV (pusta komórka ceny = null, a nie 0 — spójne z zasadą z T-50), `convertUnits` (null przechodzi jako null, nie jako 0). Jedno przejście, nie „przy okazji".
5. **`bodyVersion` idzie w górę tylko w B2** (cena nullable). Klient w `body.client` (K1), `unit` z `default('lump')`, `lineage`/`version` (kolumny, nie `body`) — bez podbicia (zasada z T-51).
6. **Dwa miejsca, które muszą poznać bucket `files`:** Edge Function `delete-account` (kolejność: Stripe → pliki ze **wszystkich** bucketów → użytkownik; T-16) oraz `export.repo`/`useExportData` (eksport JSON ma zawierać listę plików z metadanymi; same bajty — nie, ale z komunikatem, że pliki trzeba pobrać osobno). Pominięcie pierwszego zostawia osierocone obiekty na koncie Storage, za które płacimy.
7. **Snapshot klienta w `body.client` już istnieje** (`name`, `phone`, `email`, `city` z T-49). K1 nie zmienia kształtu — dodaje tylko `quotes.client_id` w zapisie i przycisk odświeżenia. `client_name`/`city` w kolumnach dalej są kopią z `body` — zapis jest w jednym miejscu (`saveQuote`), nie dokładaj drugiego.
8. **Sidebar liczy `isActive` przez `useMatch`** (pułapka z T-04) — nowe trasy zagnieżdżone (`/klienci/:id/projekty/:pid`) muszą podświetlać „Klienci"; użyj `useMatch({ path: routes.clients, end: false })`.
9. **Eksport PDF ma dziś cztery hooki** (`useExportPdf`, `useExportSchedulePdf`, `useExportStagesPdf`, `useExportPriceListPdf`) i `usePackageExport` — archiwizacja (P2) wchodzi w **jedno** wspólne miejsce (`pdf/export.ts` po udanym renderze), nie w pięć. Pytanie „Oznaczyć jako wysłaną?" (T-13) zostaje niezależne.
10. **`QuoteStatus` z `'archived'` dotyka `StatusBadge` (trzyodcinkowy tor z T-08a)** — archiwalna to nie etap w ciągu szkic→wysłana→rozstrzygnięcie; renderuj ją jako wygaszony tor bez odcinków, z etykietą, i dopisz test do tych, które pilnują znaczników statusu.
11. **Onboarding (T-17) i `OnboardingChecklist`** liczą krok „biblioteka" po istnieniu jakiejkolwiek pozycji — z biblioteką przykładową ten krok byłby od razu odhaczony. Zmienić na „istnieje pozycja bez `is_sample`" **albo** przemianować krok na „przejrzyj bibliotekę" i odhaczać po wejściu na stronę. Wybór w B4.
12. **`tauri-plugin-dialog` ma już `open` w capabilities?** Sprawdź `capabilities/default.json` — T-48 dodał `dialog:allow-open` dla wyboru folderu; upload plików potrzebuje `open` z `multiple: true` i `fs` do odczytu wybranej ścieżki (`fs:allow-read-file` w zakresie `$HOME/**` **albo** czytanie przez `<input type=file>` w webview — drugie nie wymaga uprawnień i działa w `pnpm dev`; drag&drop w Tauri daje ścieżki przez `onDragDropEvent`, w przeglądarce — `File`). Zaplanuj obie ścieżki w `lib/tauri.ts`, jak przy zapisie PDF.
