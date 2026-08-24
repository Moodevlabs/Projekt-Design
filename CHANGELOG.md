# Changelog

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).
Wersje zgodne z [SemVer](https://semver.org/lang/pl/).

## [Nieopublikowane]

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

Wpisy powstają przy zadaniach; wersje nadajemy przy wydaniu (`package.json`
i `src-tauri/tauri.conf.json` muszą się zgadzać — instalator bierze numer stamtąd).
