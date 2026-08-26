# 00 — PRD: Toolier

> **2026-08-24: zmiana nazwy (Anzorge → Toolier), ceny i osi produktu.** Toolier nie jest już „generatorem wycen", tylko **workspace'em / back office studia projektowania wnętrz**: klient → projekt → wyceny, termin, zakres, dokumenty, pliki. Generator wycen pozostaje modułem kluczowym. Źródło: `reference/nowosci.md`; specyfikacja: `docs/FEATURES-Z-KONCEPCJI.md`.

## 1. Czym jest produkt

Desktopowa aplikacja dla studiów projektowania wnętrz (samodzielny projektant, studio 2–10 osób; wtórnie: remontówki, freelancerzy, agencje), która porządkuje **administracyjną część pracy przy każdym kliencie**: przygotowanie oferty jako **interaktywnej wyceny z pozycjami TAK/NIE**, wyliczenie ceny i terminu z własnych cenników i pakietów, wysyłka brandowanych PDF, przechowywanie kolejnych wersji dokumentów i plików klienta w jednym miejscu (a od fazy 2 — link online, gdzie klient sam przełącza pozycje i akceptuje).

**Obietnica produktu:** ustaw studio raz (usługi, ceny, pakiety, czasy realizacji, szablony dokumentów); przy kolejnym kliencie wybierasz zakres, a aplikacja wykonuje powtarzalną pracę za Ciebie.

Toolier **nie jest** programem CAD, narzędziem do wizualizacji, katalogiem produktów ani systemem project-management (patrz §6).

Punkt wyjścia: prototyp HTML (`reference/projekt.html`) używany dla studia projektowego, arkusz Excel klienta (`docs/FEATURES-Z-EXCELA.md`) i koncepcja workspace'u (`reference/nowosci.md`).

## 2. Dla kogo

- **Projektant / studio** (użytkownik płacący): zakłada klientów i projekty, tworzy wyceny, zarządza biblioteką usług, brandingiem, plikami klienta. Dziś pracuje na Excelu, Wordzie, PDF-ach i folderach; chce **zachować własny sposób wyceniania**, nie dostosowywać się do sztywnego systemu.
- **Klient końcowy / inwestor** (nie loguje się): dostaje PDF / link.

Jedno konto = jedna firma (workspace). Wielu użytkowników w jednym workspace — **usunięte z planów 2026-08-26** (decyzja właściciela). Schemat bazy i tak to przewiduje (`workspaces`, `workspace_members`) i tak zostaje: koszt zerowy, a cofanie RLS byłoby ryzykiem bez zysku.

## 3. Model biznesowy

- Subskrypcja **98,99 zł / mies.** lub **999,99 zł / rok** (od 2026-08-24; wcześniej 19,99 / 199).
  **Nie ma wersji darmowej ani planów** — to opłata za korzystanie z aplikacji, a wybór dotyczy wyłącznie częstotliwości płatności. Okres próbny (14 dni, bez karty) to czas na sprawdzenie, a nie darmowy tier.
- W cenie: **2 GB plików na workspace** (pliki klientów + archiwum PDF), 25 MB na plik. Limit twardy w bazie.
- **Trial 14 dni** bez karty. Po trialu: aplikacja w trybie read-only (można oglądać i eksportować istniejące wyceny, nie można tworzyć nowych / edytować). To ważne — nie blokujemy człowiekowi dostępu do jego danych.
- Płatność przez Stripe Checkout w przeglądarce systemowej, powrót do aplikacji deep linkiem.

## 4. Funkcje

> **Zakres rozszerzony 2026-08-22.** Poniższe sekcje opisują parytet z prototypem `projekt.html`. Analiza arkusza klienta (`docs/FEATURES-Z-EXCELA.md`) dołożyła do fazy 1 dwie rzeczy, bez których nie da się przenieść cennika z Excela: **cennik parametryczny z pomieszczeniami** (usługa = baza + Σ ceny za pomieszczenie) oraz **rabaty procentowe i warunkowe**. Tryb godzinowy, auto-opisy, kalkulator terminu i pakiet dokumentów towarzyszących trafiły do fazy 1.5 — **wszystkie zrobione** (T-38…T-49). Kolejność i zależności: `docs/06-TASKS.md`.
>
> **Zakres rozszerzony 2026-08-24 (koncepcja workspace'u).** Do 1.0 wchodzi **oś Klient → Projekt** (§4.0), **pliki i archiwum dokumentów w Storage**, **wersje wycen**, **restrukturyzacja biblioteki** i **pakiety** — specyfikacja w `docs/FEATURES-Z-KONCEPCJI.md`, zadania T-53…T-66. Klienci przenoszą się z fazy 2 do fazy 1.

### 4.0 Oś aplikacji: Studio → Klient → Projekt (faza 1, od 2026-08-24)

Hierarchia: **STUDIO (workspace) → KLIENT → PROJEKT → wyceny / termin / zakres / dokumenty / pliki / notatki.**

**Klient** — nazwa inwestora, telefon, e-mail, adres inwestycji, miasto, notatki, status (aktywny/zarchiwizowany), lista projektów; sumy: liczba projektów, wartość zaakceptowanych wycen. Dane wpisane raz kopiują się (snapshot) do dokumentów projektu.

**Projekt** — nazwa, klient, adres, metraż, typ inwestycji, status (`lead / oferta / w realizacji / zakończony / anulowany`), data startu, notatki; zakładki: **Wyceny | Dokumenty | Pliki | Notatki**. Pomieszczenia żyją w wycenie (tam liczy je cennik); projekt tylko je podpowiada kolejnej wycenie.

**Wyceny w projekcie** — wiele wycen i wersji (v1, v2…); **jedna** może być zaakceptowana. „Nowa wersja" = duplikat w tej samej linii z nowym numerem; poprzedni szkic staje się archiwalny. Status dochodzi: `archived`.

**Dokumenty** — archiwum wygenerowanych PDF (wycena, termin, etapy, cennik, pakiet) per klient/projekt: każdy eksport może zapisać kopię w Storage z numerem i wersją; „Otwórz" pobiera **ten sam plik**, niezależnie od późniejszych zmian biblioteki czy brandingu.

**Pliki** — baza plików klienta/projektu na Supabase Storage: drag&drop, lista, podgląd, pobieranie, usuwanie; limit 2 GB/workspace, 25 MB/plik.

**Pulpit** — aktywni klienci i ostatnio edytowane projekty, „Nowy klient", „Nowa wycena" (pyta o klienta/projekt), dotychczasowe kafle. **Paleta ⌘K**: klienci, projekty, wyceny, usługi.

**Pakiety** — szablon wyceny niesie też harmonogram i dokumenty towarzyszące („Projekt kompleksowy" ustawia zakres, etapy i czasy jednym wyborem).

**Usługi dodatkowe → termin** — wpis cennika dodatkowego może mieć liczbę dni; dodanie do projektu wpływa na koszt i/lub termin (każdy efekt wyłączalny).

**Przykładowy user flow (koncepcja §11):** projektant zakłada klienta „Anna i Michał Kowalscy" → projekt „Dom 164 m²" → wycena z szablonu „Projekt kompleksowy" → zakres, ilości, rabat → PDF, „Wycena v1" → zmiany → „Nowa wersja", v2 zaakceptowana → termin z zakresu i pomieszczeń → w trakcie: usługa dodatkowa aktualizuje koszt i termin → wszystko w jednym projekcie.

**Definicja sukcesu MVP:** projektant konfiguruje bibliotekę usług i szablon, zakłada klienta i projekt, przygotowuje ofertę w kilka minut, aplikacja liczy wartości i rabaty, zapisuje kolejne wersje i generuje estetyczny PDF — **bez Excela i bez przepisywania danych klienta.**

### 4.1 MVP (faza 1) — parytet z `projekt.html` + multi-tenant

**Wycena (Quote)**
- Nagłówek: tytuł, podtytuł, dane inwestora (nazwa, telefon, e-mail), data, ważność oferty (dni), tekst wstępu, opis projektu.
- Struktura: **Sekcje → Grupy (np. pomieszczenia) → Pozycje**. Grupa jest opcjonalna (pozycje mogą leżeć bezpośrednio w sekcji).
- Pozycja: nazwa, opis, cena (grosze), **włączona TAK/NIE**, typ: `item` | `discount` (rabat, wartość ujemna prezentowana na terakotowo), ilość × cena jednostkowa (nowość, domyślnie 1).
- Drag & drop pozycji i grup, przyciski góra/dół, usuwanie, inline-edit.
- Podsumowanie na żywo: suma, rabaty, suma po rabacie. Opcjonalnie VAT (stawka z ustawień, netto/brutto przełącznik).
- Tryb edycji vs tryb podglądu (jak w prototypie).
- Autozapis (debounce 800 ms) do Supabase; wskaźnik „zapisano / zapisywanie / błąd".
- Statusy: `draft` → `sent` → `accepted` | `rejected` | `expired`. Zmiana ręczna (faza 1), automatyczna po akceptacji online (**faza 2**, T-26).
- Duplikuj wycenę. Archiwizuj (soft delete).

**Biblioteka** (od 2026-08-24: zakładki **Usługi | Grupy | Zestawy | Pomieszczenia | Stawki**)
- **Usługi** z **grupą** (uporządkowany słownik działów/etapów, np. „01 · Przygotowanie projektu"), **jednostką** (`ryczałt · szt. · m² · mb · godz. · wizyta · element · kadr · własna`), sposobem wyceny (kwota stała / za m² / wg pomieszczeń / za kadr / za godzinę / za wizytę / za element / **indywidualnie** = bez ceny, nie wchodzi do sumy), ceną „od", flagą **aktywna**, wariantami (3D/360), regułami cenowymi per pomieszczenie.
- **Zestawy** (dawne „grupy biblioteczne"): snapshoty pozycji do wstawienia na raz, np. „Kuchnia".
- Lista usług: pigułki grup, licznik, kolumny *Usługa / Grupa / Sposób wyceny / Cena / Aktywna*, lista–siatka, „Dodaj ▾". **Pełnoekranowy edytor usługi** z podglądem „jak to wygląda w ofercie", sekcją „Jak to działa?" i statystyką użycia.
- **Biblioteka przykładowa** na start konta: 8 grup / 38 usług (`reference/bilbioteka.md`), bez cen, oznaczone „Przykładowa", do usunięcia jednym przyciskiem.
- Wstaw do wyceny jednym kliknięciem (picker z wyszukiwarką — jak popover w prototypie); „Zapisz do biblioteki" z poziomu pozycji; „Zapisz wszystko z tej wyceny".
- Edycja w bibliotece z **opcjonalnym kaskadowaniem** do aktualnej wyceny (jak w prototypie). Macierz cennika, import CSV, słownik pomieszczeń.

**Szablony**
- Cała wycena jako szablon (nazwa, data). Nowa wycena z szablonu. Nadpisz szablon bieżącą wyceną.

**Brand kit (ustawienia firmy)**
- Logo (ciemne i jasne — na białe tło i na ciemny nagłówek PDF), nazwa firmy, dane kontaktowe (kilka osób: imię, tel, mail), adres, NIP, stopka, kolor akcentu, kolor tła PDF, font (lista 4–5 wbudowanych: Lato, Inter, Playfair, DM Sans, Source Serif).
- Domyślne teksty: wstęp, ważność oferty, nazwa waluty, stawka VAT.
- Podgląd PDF na żywo w ustawieniach.

**PDF**
- Generowany lokalnie. Układ wielostronicowy, nagłówek z logo, pozycje wyłączone wyszarzone (albo ukryte — ustawienie), rabaty, podsumowanie, dane kontaktowe, stopka z numerem strony.
- Zapis do pliku (dialog) + „Otwórz po zapisaniu".
- Numer wyceny z konfigurowalnego wzorca: `WYC/{YYYY}/{MM}/{seq}`.

**Konto**
- Rejestracja e-mail + hasło, reset hasła, Google OAuth (deep link).
- Ekran subskrypcji: status, „Wykup", „Zarządzaj" (Customer Portal), data odnowienia.
- Gating: trial / active / past_due / canceled / read-only.

**Dashboard**
- Kafle: wyceny w tym miesiącu, łączna wartość wysłanych, wskaźnik akceptacji, ostatnie wyceny, szybkie akcje.
- Lista wycen: szukaj, filtr po statusie, sort.

### 4.2 Faza 2 — „przyjemne"
- ~~Klienci (CRM-lite)~~ → **faza 1** (§4.0, T-53).
- **Pełna historia wersji wyceny** (porównanie totali między wersjami, diff pozycji) — lekkie wersje v1/v2 są już w fazie 1 (T-57).
- **Kosz na pliki** (odzyskiwanie usuniętych, 30 dni) — w 1.0 usunięcie pliku jest natychmiastowe.
- **Statusy realizacji etapów** w projekcie (koncepcja §7 „w przyszłości").
- **Link klienta („magic link") i akceptacja online** — przeniesione z fazy 3 (2026-08-26), patrz §4.3.
- ~~**Wysyłka e-mail z aplikacji** (Resend przez Edge Function) z PDF w załączniku~~ → **odrzucone 2026-08-26.** Zastępuje ją link klienta: projektant kopiuje go i wysyła **ze swojej poczty** (`mailto:` otwiera jego klienta pocztowego z gotową treścią). Mail z naszej domeny byłby dla odbiorcy obcym nadawcą, wymagałby SPF/DKIM/DMARC, obsługi odbić i uczyniłby nas procesorem cudzych adresów — a i tak dowoziłby **martwy PDF** zamiast wyceny, którą klient może przeklikać. Gdyby e-mail transakcyjny wrócił: najpierw **własny SMTP użytkownika**, dopiero potem provider.
- ~~**Tryb ciemny**~~ → **usunięte z planów** (decyzja właściciela, 2026-08-26). Skróty klawiaturowe (`⌘N`, `⌘S`, `⌘P`) zostają; `⌘K` weszło w T-58.
- **Eksport CSV/XLSX** listy wycen, import biblioteki z CSV.
- **Auto-update** aplikacji (tauri-plugin-updater, podpisane buildy).
- **Wiele walut** i format liczb per workspace.

### 4.3 Faza 3 — „wyróżnik"
> **2026-08-26: wyróżnik awansował do fazy 2.** Link klienta i akceptacja online (T-25, T-26) przestały być „kiedyś" — to one zastępują wysyłkę e-mail i to na nich stoi przewaga produktu. Faza 3 zostaje z jednym punktem.

- **Link klienta** (`app.toolier.pl/q/{token}` — domena do potwierdzenia) → **faza 2, T-25**: lekka apka Vite, klient przełącza TAK/NIE, widzi sumę na żywo, klika „Akceptuję" (imię + timestamp + IP → `quote_acceptances`) albo zostawia uwagi. Właściciel dostaje powiadomienie w aplikacji. Prototyp już tak działał lokalnie.
  - **Bez e-podpisu.** Przyjęcie oferty nie wymaga formy pisemnej; imię, czas i IP to dowód zgody. Canvas do podpisu odręcznego wyglądałby na mocniejszy dowód, niż jest — i tylko tyle by wnosił. ~~Podpis klienta (canvas)~~ → usunięte 2026-08-26.
- ~~**Wielu użytkowników w workspace** (role owner/member)~~ → **usunięte z planów** (2026-08-26). Toolier zostaje narzędziem jednoosobowym.
- ~~**Statystyki**: jakie pozycje klienci najczęściej wyłączają~~ → **usunięte z planów** (2026-08-26).
- **Tryb offline** z lokalnym SQLite i kolejką synchronizacji.

## 5. Wymagania niefunkcjonalne
- Start aplikacji < 2 s, edycja pozycji bez widocznego laga przy 300 pozycjach.
- PDF 10 stron < 3 s.
- Windows 10+ i macOS 12+; Linux best-effort.
- RODO: dane w EU (Supabase region `eu-central-1`), eksport/usuń konto w ustawieniach.
- Dostępność: pełna obsługa klawiaturą w edytorze, kontrast AA.

## 6. Poza zakresem (na teraz)
- Fakturowanie, integracje z KSeF, płatności od klienta końcowego, aplikacja mobilna.
- Z koncepcji §13/§17 (świadomie, żeby Toolier nie stał się kolejnym systemem project-management): CAD / rzuty / 3D, edytor moodboardów, sourcing i katalog produktów, procurement, pełny CRM sprzedażowy, chat z klientem, rozbudowany Gantt z osią czasu, kalendarz i integracja z Google Calendar, pełna księgowość, marketplace, e-podpis (usunięty z planów 2026-08-26 — akceptacja przez link wystarcza), brief jako formularz, automatyczne przypomnienia, AI do notatek/opisów, integracja z chmurami zewnętrznymi (Drive/Dropbox).
- **Wersja web/SaaS w przeglądarce** — koncepcja §15 ją rekomenduje; decyzja D6: **desktop (Tauri) zostaje na 1.0**. Kod pozostaje przeglądarkowy, wersja web to osobny projekt.
