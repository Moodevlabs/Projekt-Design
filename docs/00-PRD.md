# 00 — PRD: Projekt Anzorge

## 1. Czym jest produkt

Desktopowa aplikacja dla małych firm usługowych (projektanci wnętrz, remontówki, studia, freelancerzy, agencje), która pozwala w kilka minut zbudować **interaktywną wycenę z pozycjami TAK/NIE**, zapisać ją, wysłać klientowi jako brandowany PDF (a w fazie 3 — jako link online, gdzie klient sam przełącza pozycje i akceptuje).

Punkt wyjścia: istniejący prototyp HTML (`projekt.html`) używany dla studia projektowego. Anzorge to jego produktowa, wieloużytkownikowa wersja.

## 2. Dla kogo

- **Właściciel/pracownik firmy** (użytkownik płacący): tworzy wyceny, zarządza biblioteką pozycji, brandingiem, klientami.
- **Klient końcowy** (nie loguje się): dostaje PDF / link.

Jedno konto = jedna firma (workspace). Wielu użytkowników w jednym workspace — **faza 3**, ale schemat bazy ma to od razu przewidywać (`workspaces`, `workspace_members`).

## 3. Model biznesowy

- Subskrypcja **19,99 zł / mies.** (plan „Pro"), roboczo też plan roczny **199 zł / rok**.
- **Trial 14 dni** bez karty. Po trialu: aplikacja w trybie read-only (można oglądać i eksportować istniejące wyceny, nie można tworzyć nowych / edytować). To ważne — nie blokujemy człowiekowi dostępu do jego danych.
- Płatność przez Stripe Checkout w przeglądarce systemowej, powrót do aplikacji deep linkiem.

## 4. Funkcje

### 4.1 MVP (faza 1) — parytet z `projekt.html` + multi-tenant

**Wycena (Quote)**
- Nagłówek: tytuł, podtytuł, dane inwestora (nazwa, telefon, e-mail), data, ważność oferty (dni), tekst wstępu, opis projektu.
- Struktura: **Sekcje → Grupy (np. pomieszczenia) → Pozycje**. Grupa jest opcjonalna (pozycje mogą leżeć bezpośrednio w sekcji).
- Pozycja: nazwa, opis, cena (grosze), **włączona TAK/NIE**, typ: `item` | `discount` (rabat, wartość ujemna prezentowana na terakotowo), ilość × cena jednostkowa (nowość, domyślnie 1).
- Drag & drop pozycji i grup, przyciski góra/dół, usuwanie, inline-edit.
- Podsumowanie na żywo: suma, rabaty, suma po rabacie. Opcjonalnie VAT (stawka z ustawień, netto/brutto przełącznik).
- Tryb edycji vs tryb podglądu (jak w prototypie).
- Autozapis (debounce 800 ms) do Supabase; wskaźnik „zapisano / zapisywanie / błąd".
- Statusy: `draft` → `sent` → `accepted` | `rejected` | `expired`. Zmiana ręczna (faza 1), automatyczna po akceptacji online (faza 3).
- Duplikuj wycenę. Archiwizuj (soft delete).

**Biblioteka**
- Pozycje biblioteczne z kategorią; grupy biblioteczne (zestawy pozycji, np. „Kuchnia"). Wstaw do wyceny jednym kliknięciem (picker z wyszukiwarką — jak popover w prototypie).
- „Zapisz do biblioteki" z poziomu pozycji w wycenie; „Zapisz wszystko z tej wyceny do biblioteki".
- Edycja w bibliotece z **opcjonalnym kaskadowaniem** do aktualnej wyceny (jak w prototypie).

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
- **Klienci (CRM-lite)**: lista klientów, wycena przypięta do klienta, historia.
- **Wersjonowanie wyceny**: „Zapisz jako wersję 2", porównanie totali.
- **Wysyłka e-mail z aplikacji** (Resend przez Edge Function) z PDF w załączniku i szablonem wiadomości.
- **Tryb ciemny**, skróty klawiaturowe (`⌘N` nowa wycena, `⌘S`, `⌘P` PDF, `⌘K` paleta komend).
- **Eksport CSV/XLSX** listy wycen, import biblioteki z CSV.
- **Auto-update** aplikacji (tauri-plugin-updater, podpisane buildy).
- **Wiele walut** i format liczb per workspace.

### 4.3 Faza 3 — „wyróżnik"
- **Link online dla klienta** (`app.anzorge.pl/q/{token}`): lekka strona Next.js/Vite, klient przełącza TAK/NIE, widzi sumę, klika „Akceptuję" (z imieniem + timestamp + IP → zapis w `quote_acceptances`). Właściciel dostaje powiadomienie w aplikacji. To jest mocny argument sprzedażowy — prototyp już tak działał lokalnie.
- **Wielu użytkowników w workspace** (role owner/member).
- **Podpis klienta** (canvas) na stronie online i na PDF.
- **Statystyki**: jakie pozycje klienci najczęściej wyłączają (sygnał cenowy).
- **Tryb offline** z lokalnym SQLite i kolejką synchronizacji.

## 5. Wymagania niefunkcjonalne
- Start aplikacji < 2 s, edycja pozycji bez widocznego laga przy 300 pozycjach.
- PDF 10 stron < 3 s.
- Windows 10+ i macOS 12+; Linux best-effort.
- RODO: dane w EU (Supabase region `eu-central-1`), eksport/usuń konto w ustawieniach.
- Dostępność: pełna obsługa klawiaturą w edytorze, kontrast AA.

## 6. Poza zakresem (na teraz)
- Fakturowanie, integracje z KSeF, płatności od klienta końcowego, aplikacja mobilna.
