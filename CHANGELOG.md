# Changelog

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).
Wersje zgodne z [SemVer](https://semver.org/lang/pl/).

## [Nieopublikowane]

### Dodane

**Panel „Dodaj usługi” w edytorze wyceny (T-71).** Zakres wyceny dobiera się
z pełnowymiarowej tabeli (usługa · grupa · sposób wyceny · stawka) z wyborem
sekcji lub grupy docelowej, szukajką, pigułkami grup i zakładką „Zestawy”.
Panel zostaje otwarty, aż klikniesz „Gotowe”; jedno ostrzeżenie nad listą mówi,
że usługi liczone za pomieszczenie potrzebują pomieszczeń, i pozwala je dodać.
W trybie edycji pola mają widoczną kreskowaną ramkę, a nad pozycjami stoi
nagłówek kolumn *Usługa · Ilość · Cena*.

### Zmienione

**Nazwa produktu: Anzorge → Toolier.** Zmiana obejmuje nazwę aplikacji i okna,
identyfikator pakietu (`pl.anzorge.app` → `pl.toolier.app`), schemat deep linku
(`anzorge://` → `toolier://`), ikonę („A" → „T"), konto demo w seedzie
(`demo@anzorge.local` → `demo@toolier.local`) i nazwę pliku zrzutu danych.

> ⚠️ **Trzeba zalogować się ponownie.** Sesja siedzi w keychainie pod nazwą
> usługi, która się zmieniła — po aktualizacji aplikacja zastanie pusty
> keychain i pokaże ekran logowania. Stary wpis `pl.anzorge.app` zostaje
> w systemie; można go skasować ręcznie. Ustawienia panelu bocznego wracają do
> domyślnych z tego samego powodu (klucz w `localStorage`).
>
> **Poza kodem:** w panelu Supabase trzeba dodać adresy `toolier://auth/callback`
> i `toolier://auth/recovery` do „Redirect URLs" — inaczej logowanie Google
> i reset hasła nie wrócą do aplikacji.

Nazwa „AnzorgeDesign" w podpisie aplikacji zostaje — to nazwa studia, które
zamówiło aplikację, a nie dawna nazwa produktu.

**Nowa cena: 98,99 zł/mies. albo 999,99 zł/rok** (wcześniej 19,99 / 199).
Roczna to około dziesięć miesięcy w cenie dwunastu — ekran subskrypcji pokazuje
obok niej przekreśloną kwotę 1 187,88 zł, żeby oszczędność dało się sprawdzić.
Istniejące subskrypcje testowe zostają na starych cenach; nowe zakupy idą po
`lookup_key` `toolier_monthly` / `toolier_yearly`.

### Dodane

**Wycena**

- Pomieszczenia jako wymiar wyceny: lista z ilością i flagami „w projekcie" / „w części technicznej", rozbicie pozycji na bloki per pomieszczenie.
- Cennik parametryczny: usługa = baza + Σ(cena za pomieszczenie × ilość); macierz cen w bibliotece z importem CSV.
- Warianty pozycji (np. wizualizacja 3D / 360°) i wycena per kadr.
- Tryb godzinowy: wartości liczone jako minuty pracy, cena z godzinowej stawki workspace'u; szacowanie pracochłonności.
- Rabaty procentowe i warunkowe (rabat za komplet pozycji etapu).
- Auto-opisy z placeholderami — `{rooms}`, `{frames|kadr|kadry|kadrów}` z polską liczbą mnogą.
- Podsumowania per sekcja obok sumy globalnej.

**Dokumenty dla inwestora**

- „Szacowany termin" — kalkulator dni roboczych z polskimi świętami, macierz pomieszczenia × etapy, PDF.
- „Etapy współpracy" — 19 etapów w 5 częściach; etapy poza zakresem zostają w dokumencie z krzyżykiem.
- „Cennik usług dodatkowych" — ceny w widełkach, jednostka `zł/h`, termin realizacji, przycisk „Dodaj do wyceny jako pozycję".
- Eksport pakietu: wybrane dokumenty do jednego PDF-a z ciągłą numeracją stron albo osobnymi plikami do wskazanego folderu.

**Rejestr**

- Miasto inwestora, notatki wewnętrzne i rodzaj dokumentu na liście wycen; filtr po mieście.
- Eksport rejestru do CSV w układzie arkusza (UTF-8 BOM, separator `;`) — otwiera się w Excelu bez kreatora importu.

**Budowanie wyceny**

- Wybór z biblioteki nie zamyka się po jednej pozycji — dobierasz ile trzeba za jednym otwarciem, z licznikiem przy dodanych.
- Filtr grup nad listą usług i widoczny sposób wyceny przy każdej („Według pomieszczenia · od 250,00 zł"), zanim klikniesz.
- Ostrzeżenie, gdy usługa liczona za pomieszczenie trafia do wyceny bez pomieszczeń — policzyłaby samą bazę.
- „Nowa wycena" pyta, czy zacząć od pustej, czy od szablonu; szablon wnosi też termin i dokumenty.

**Pierwsze uruchomienie**

- Trzy kroki startowe na pulpicie: logo → biblioteka → pierwsza wycena.
- Ekran awaryjny zamiast białej strony przy nieobsłużonym błędzie.

### Naprawione

- Edytor wyceny nie otwierał się ponownie po wyjściu (biały ekran w trybie deweloperskim) — podwójne montowanie w `StrictMode`.
- Dodanie pomieszczenia wywracało zapis: obiekt zdarzenia trafiał do dokumentu.
- Wybór typu pomieszczenia nie nadawał mu nazwy.
- Nieudany autozapis mówi teraz **powód**, a nie tylko fakt.
- Rozwinięcie zestawu rozciągało sąsiednie karty w wierszu.

---

Wpisy powstają przy zadaniach; wersje nadajemy przy wydaniu. Numer stoi
w `package.json`, `src-tauri/tauri.conf.json` i `src-tauri/Cargo.toml` — muszą
się zgadzać, instalator bierze go z `tauri.conf.json`.

Numer podniesiony do `1.0.0`, ale **nagłówek zostaje „Nieopublikowane"** do
chwili, gdy podpisany instalator faktycznie wyjdzie: sekcja z datą znaczy
„to jest u ludzi", a nie „to jest zbudowane u nas". Przy wydaniu zamień
nagłówek na `## [1.0.0] - RRRR-MM-DD`.
