# Changelog

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).
Wersje zgodne z [SemVer](https://semver.org/lang/pl/).

## [1.3.0] – 2026-08-31

### Dodane

**Odnośniki do materiałów w linku dla inwestora.** Do oferty dołącza się adresy
tego, co leży poza Toolier: folderu z wizualizacjami na Dysku Google, spaceru 3D,
moodboardu. Inwestor widzi je pod ofertą, w bloku „Materiały do obejrzenia” —
razem z zakresem, na który się zgadza, a nie w osobnym mailu obok. Pliki zostają
tam, gdzie leżą; do Toolier trafia sam adres, więc rendery nie zajmują miejsca
w przestrzeni pracowni. Odnośniki dodaje się w karcie „Odnośniki dla klienta”
w edytorze albo w oknie „Udostępnij” — obydwa miejsca prowadzą tę samą listę,
więc drugi link do tej samej wyceny nie każe przepisywać adresów. Adres bez
„https://” zostaje uzupełniony, a wpis niebędący adresem nie zapisze się wcale.
Odnośniki należą do wyceny (wchodzą do jej wersji i do zapisu akceptacji), ale
nie przenoszą się przez szablon do kolejnej inwestycji.

**Powiadomienia e-mail o ruchu inwestora.** Toolier pisze do pracowni, gdy
inwestor pierwszy raz otworzy link, zaakceptuje ofertę, odrzuci ją, zostawi
uwagi albo odeśle brief. Treść uwagi przychodzi w całości — widać, czy odpisać
dziś, czy w poniedziałek. Wiadomości idą wyłącznie do właściciela konta, na
adres logowania albo inny wskazany w Ustawieniach → Aplikacja → Powiadomienia
e-mail; inwestor nie dostaje z Toolier żadnej korespondencji, ofertę nadal
wysyła projektant swoją pocztą. Każdy rodzaj zdarzenia da się wyłączyć osobno,
a przycisk „Wyślij wiadomość testową” sprawdza całą drogę wysyłki. Powiadomienie
o otwarciu przychodzi raz — inwestor wraca do oferty wielokrotnie.

> Wymaga konfiguracji po stronie wdrożenia (klucz Resend, zweryfikowana domena
> nadawcy, zadanie cron opróżniające kolejkę) — opis w `dokumentacja/09-EMAIL.md`.
> Bez niej zdarzenia poprawnie się kolejkują, ale wiadomości nie wychodzą.

## [1.2.2] – 2026-08-28

### Zmienione

**Numer dokumentacji zaczyna się od „DOK/”** (domyślnie `DOK/RRRR/MM/0001`).
Dotąd „WYC/” — nazwa jednej zakładki, nie całej teczki. Własny wzorzec
z Ustawień zostaje; numery już nadane nie zmieniają się.

**Cenę wpisuje się w wycenie — także przy pozycji z biblioteki lub szablonu.**
Pozycja bez ceny („wycena indywidualna”) ma w edycji puste pole: wpisanie kwoty
nadaje cenę, wyczyszczenie wraca do „ustalimy osobno”. Pozycja liczona za
pomieszczenie ma pole bazy, a składniki za pomieszczenia dochodzą z cennika.
Dotąd trzeba było iść do biblioteki, żeby wycenić jedną ofertę.

**Pusta zakładka jest naprawdę pusta.** Podsumowanie wyceny podpisywało podział
po sekcjach jako „etapy” — teraz „sekcje”. „Dodaj do terminu” z cennika zakładało
harmonogram z pełnym szablonem studia — teraz sam etap zbiorczy. Zakładka, na
którą tylko wejrzano, nie trafia do PDF, pakietu ani szablonu. Teksty Pomocy
opisujące osobne dokumenty (WYC/TER/ETP/CEN) poprawione.

## [1.2.1] – 2026-08-28

### Dodane

**Pięć szablonów startowych na nowym koncie.** Zamiast pustej listy: Mieszkanie
od dewelopera · Dom jednorodzinny · Remont mieszkania · Kuchnia lub łazienka ·
Lokal komercyjny. Każdy to gotowa oferta w etapach (przygotowanie → układ →
koncepcja i wizualizacje → dokumentacja wykonawcza → realizacja) z usługami
z biblioteki przykładowej — te same nazwy, więc cena wpisana w bibliotece
kaskaduje do szablonu. Ceny są puste (wycena indywidualna), pozycje opcjonalne
startują wyłączone. Konta założone wcześniej nic nie dostają — „Nowy szablon”
i „Zapisz jako szablon” działają jak dotąd.

**Link do toolier.pl** na ekranie logowania; podpis w tle aplikacji brzmi
„Developed by Toolier” i po kliknięciu otwiera stronę produktu.

### Zmienione

**Rejestr Dokumentów bez list „miasto” i „klient”.** Zostają: statusy,
wyszukiwarka (numer, tytuł, klient — i od teraz także miasto) oraz sortowanie.

## [1.2.0] – 2026-08-28

### Zmienione

**„Dokumenty” zamiast „Wyceny”, przycisk „Nowa dokumentacja”.** Pozycja
nawigacji nazywa się teraz „Dokumenty” i prowadzi do rejestru dokumentacji.
Jedna dokumentacja to teczka z czterema zakładkami — Wycena · Termin · Etapy
współpracy · Cennik dodatkowy — z jednym numerem, klientem, wersją, linkiem
dla inwestora i pakietem PDF. Zakładki edytora są płaskie (koniec drugiego
poziomu „Dokumenty → Etapy | Cennik”). Stary adres rejestru (`/wyceny`)
przekierowuje.

**Termin, etapy i cennik startują puste i buduje się je z biblioteki.**
Do tej pory każda zakładka wypełniała się szablonem z ustawień — listą, której
nikt nie czytał, bo wyglądała na wynik, a nie na propozycję. Teraz działa
dokładnie jak wycena: „Dodaj z biblioteki” otwiera panel z wyszukiwarką
i „Dodaj wszystkie”; „Etap ręcznie” / „Pozycja ręcznie” dodaje pusty wiersz;
ikona zakładki przy wierszu zapisuje go do biblioteki. Etap z biblioteki wchodzi
zaznaczony / objęty zakresem.

**Szablony buduje się w edytorze.** Szablony → „Nowy szablon” otwiera pusty
szablon w tym samym edytorze co dokumentację (zakładki, „Dodaj usługi”,
„Rozpisz na pomieszczenia”, „Dodaj z biblioteki”, autozapis); karta szablonu
ma „Edytuj”. Dotąd szablon powstawał wyłącznie z gotowej oferty — ta droga
(„Zapisz jako szablon…”) zostaje.

**Zniknął przycisk „zakładki” przy wierszach.** Przy pozycjach wyceny, grupach,
etapach terminu, etapach współpracy i pozycjach cennika stał przycisk zapisu do
biblioteki, który w części miejsc robił coś, a w części nie — i mylił. Do
biblioteki zapisuje się z menu „⋯” → „Zapisz wszystko do biblioteki” albo
w samej Bibliotece.

**„Rozpisz na pomieszczenia” wróciło** do sekcji wyceny: zakłada blok dla
każdego pomieszczenia z panelu, którego jeszcze nie ma. Powtórne kliknięcie
niczego nie dubluje.

**Biblioteka ma sekcje dla każdego rodzaju dokumentu.** Obok usług doszły
zakładki Termin · Etapy współpracy · Cennik dodatkowy. Przy pierwszym otwarciu
sekcja wypełnia się wbudowanym szablonem (dotąd ukrytym w ustawieniach
i nieedytowalnym z aplikacji), oznaczonym jako przykładowy; wpisy edytuje się
w miejscu, a kolejność ustawia strzałkami. W dokumencie „Dodaj z biblioteki”
otwiera panel z wyszukiwarką i „Dodaj wszystkie” — dokładnie tak, jak wycena
ma „Dodaj usługi”; „Etap ręcznie” / „Pozycja ręcznie” zostają jako drugie
wejście, a ikona zakładki przy wierszu zapisuje go do biblioteki.

**Jedna zakładka „Pliki” zamiast „Pliki” + „Dokumentacja”.** Wygenerowany PDF
pojawiał się w obu listach naraz, więc nie było wiadomo, gdzie go szukać.
Zakładka „Dokumentacja” zniknęła z karty klienta i z projektu; „Pliki” mają
filtr Wszystkie · Wgrane · Wygenerowane PDF oraz kolumnę „Typ” (Wycena /
Termin / Etapy / Cennik / Pakiet z wersją dokumentu).

**„Wstecz” w edytorze wraca tam, skąd się przyszło** — do teczki projektu
albo karty klienta, nie do rejestru. Kolejny dokument tego samego klienta
zakłada się bez ponownego szukania go na liście.

**Kalendarz stoi drugi w nawigacji, zaraz pod Pulpitem.**

**Podgląd brandingu można zapisać jako plik.** Obok „Otwórz podgląd” stoi
„Zapisz podgląd (PDF)”, który idzie przez systemowy dialog zapisu — tą samą
drogą co eksport prawdziwej oferty. Na macOS otwieranie z katalogu
podręcznego po raz kolejny nie zadziałało; zapisany plik otwiera się z dysku
jak każdy inny.

**Ekran logowania: zdjęcie bez efektów, biały logotyp i biały tekst pod
kartą.** Matowe szkło rozciągnięte na całą fotografię zostało zdjęte; szklana
zostaje tylko karta formularza.

### Baza danych

Migracje `0042`–`0044`. `0043` dodaje tabelę `library_doc_entries` (biblioteka
etapów terminu, etapów współpracy i pozycji cennika) z RLS i funkcją
`seed_doc_library`. `0042` i `0044` to ślad po jednodniowej próbie
rozdzielenia terminu / etapów / cennika na osobne dokumenty — cofniętej tego
samego dnia: `0044` sprowadza wszystkie wiersze do jednego rodzaju (teczka),
a treść założonych w międzyczasie „samodzielnych” dokumentów zostaje w swojej
zakładce.

## [1.1.6] – 2026-08-28

### Zmienione

**Strona klienta przeniesiona na własną subdomenę.** Oferty i briefy stoją od
tego wydania pod `klient.toolier.pl`, a adres główny `toolier.pl` zostaje
zwolniony pod stronę produktu. Rozdzielenie jest celowe i nie jest kosmetyką:
strona klienta wysyła nagłówki `noindex, nofollow`, `X-Frame-Options: DENY`
i `Referrer-Policy: no-referrer` dla **całej** domeny, bez wyjątków. Gdyby
dzieliła adres ze stroną produktu, te reguły trzeba by zawęzić do wybranych
ścieżek, czyli otworzyć drogę do przypadkowego zaindeksowania cudzej oferty.
Osobny adres oznacza też, że publikacja strony produktu nie ma jak ruszyć
strony, na której inwestor akceptuje ofertę.

Adres pochodzi ze zmiennej `VITE_SHARE_BASE_URL` i jest **wkompilowywany
w aplikację** przy budowaniu wydania — linki utworzone w starszych wersjach
wskazują na poprzedni adres i pozostają ważne tak długo, jak długo prowadzi
z niego przekierowanie.

**Podgląd oferty w ustawieniach brandingu zamiast osadzonego — otwierany
przyciskiem.** Dokument był dotąd odświeżany po każdej zmianie i wyświetlany
wewnątrz strony: najpierw ramką PDF, potem stronami rysowanymi na kanwie.
Na macOS żadne z tych rozwiązań nie pokazywało dokumentu i — co gorsza — nie
zgłaszało błędu, więc zostawało białe pole bez wskazówki, co poszło nie tak.
Zamiast trzeciego podejścia do osadzania aplikacja generuje teraz prawdziwy
plik na tym komputerze i otwiera go w systemowej przeglądarce PDF, która na
pewno umie go wyświetlić, powiększyć i wydrukować próbnie. Przy okazji zniknęło
przerysowywanie dokumentu przy każdym naciśnięciu klawisza w polu koloru.

**Pas z logo pracowni na stronie oferty i briefu.** Dokument PDF otwiera pas
wypełniony kolorem marki ze znakiem po lewej stronie; strona przekazywana
inwestorowi pokazywała dotąd nagi obrazek na tle strony, czyli to samo pismo
w dwóch różnych papeteriach. Teraz obie strony zaczynają się tym samym pasem.
Wariant znaku pochodzi z ustawienia „Znak na nagłówku dokumentu", a gdy
wskazanego wariantu nie wgrano, stosowany jest ten drugi — pracownia mająca
jeden plik zobaczy go zamiast samej nazwy firmy. Migracja `0041`.

**Podpis w stopce prowadzi na stronę produktu.** Słowo „Toolier" w stopce
oferty i briefu jest odnośnikiem do `toolier.pl`, otwieranym w nowej karcie,
żeby nie zabierać inwestorowi formularza w połowie wypełniania.

**Opisy w ustawieniach brandingu zgodne ze stanem faktycznym.** Usunięto
zdanie o automatycznym doborze koloru oraz wzmianki o podglądzie odświeżanym
na żywo. Opis znaku na nagłówku mówi też wprost, że wybór dotyczy nie tylko
dokumentu PDF, ale i strony przekazywanej inwestorowi.

### Naprawione

**Wydanie ze złym adresem strony klienta nie zbuduje się.** Brak albo literówka
w `VITE_SHARE_BASE_URL` nie objawiały się niczym widocznym: aplikacja
budowała się poprawnie, a dopiero przy wysyłce oferty pokazywała projektantowi
sam token zamiast adresu. Ponieważ wartość wchodzi do paczki na stałe, naprawa
oznaczała nowe wydanie. Build produkcyjny sprawdza teraz tę zmienną, zanim
cokolwiek skompiluje, i przerywa się z komunikatem mówiącym, co poprawić —
tak samo jak przy niezgodności numeru wersji z tagiem.

## [1.1.5] – 2026-08-28

### Naprawione

**Podgląd oferty w ustawieniach brandingu.** Na macOS wyświetlało się białe
pole. Dokument powstawał poprawnie, ale osadzano go jako
`<object type="application/pdf">`, a WKWebView — silnik, na którym aplikacja
działa na tym systemie — plików PDF w ramkach nie renderuje i nie zgłasza przy
tym błędu. Strony rysowane są teraz na kanwie i pokazywane jako obrazki, więc
podgląd wygląda tak samo niezależnie od systemu. Obok stanął przycisk
otwierający prawdziwy plik w czytniku systemowym — do obejrzenia w pełnej
skali i wydruku próbnego.

**Przycisk „Otwórz" w zakładce Dokumenty.** Zamiast otwierać dokument,
pokazywał systemowe okno zapisu i nie otwierał niczego: wołał tę samą ścieżkę
co „Pobierz". Teraz plik trafia do katalogu podręcznego aplikacji i od razu do
systemowego czytnika PDF, bez pytania o miejsce zapisu. Zapisywanie u siebie
pozostaje pod „Pobierz" w menu wiersza.

**Logo pracowni na stronie briefu.** Brief otwarty z magic linka pokazywał samą
nazwę firmy. Polityka odczytu logo dla gości powstała, zanim briefy istniały,
i wpuszczała wyłącznie posiadaczy żywego linku do oferty — więc inwestor na
pierwszym etapie współpracy, przed jakąkolwiek wyceną, znaku nie widział.
Migracja `0040`.

**Napis „wycena indywidualna" w wygenerowanym PDF.** Nie mieścił się w kolumnie
kwoty i łamał się przez dywiz w środku wyrazu („wycena indywidual-na"). Dostał
własny, mniejszy rozmiar; test mierzy jego szerokość metrykami wszystkich
krojów dostępnych w ustawieniach marki.

**Tytuł karty przeglądarki przy briefie.** Strona klienta obsługuje dwa adresy
jednym plikiem HTML, więc brief podpisywał się w karcie i historii jako
„Oferta".

### Zmienione

**Wybór znaku na nagłówku dokumentu.** Opcja „Dobór automatyczny" została
wycofana. Wyliczała wariant z kontrastu koloru marki, przez co przy znakach
z własnym tłem albo wielobarwnych wybierała źle, a rezultat było widać dopiero
w wygenerowanym PDF-ie. Pozostał wybór między znakiem jasnym a ciemnym, wraz
z instrukcją, który do którego nagłówka pasuje. Ustawienia zapisane wcześniej
jako automatyczne przeliczono dotychczasową regułą, więc dokumenty wyglądają
tak jak przed aktualizacją. Migracja `0039`.

**Notatki w kalendarzu można edytować.** Dotąd dawały się wyłącznie dodać
i usunąć, więc literówka albo przesunięty montaż oznaczały skasowanie wpisu
razem z oznaczeniem „wykonane".

**Pola koloru marki w ustawieniach.** Próbniki stały na różnych wysokościach,
bo opisy nad nimi mają różną długość. Wiersze sterujące wyrównano do dołu
kolumn.

## [1.1.3] – 2026-08-27

### Dodane

**Treść briefu jest edytowalna.** Zestaw pytań przestał być stałą wpisaną
w aplikację. Ustawienia → Brief udostępniają edytor: sekcje, pytania, ich
kolejność, podpowiedzi i rodzaje pól (krótka odpowiedź, opis, wybór jednej
albo wielu opcji, liczba). Szablonów może być kilka — osobny dla mieszkania,
lokalu usługowego czy pojedynczego pomieszczenia — a jeden z nich oznacza się
jako domyślny.

Wystawienie briefu pozwala wskazać szablon i termin ważności linku, po czym
kopiuje adres do schowka. Reguła snapshotu pozostaje bez zmian: brief zapisuje
własną kopię pytań w chwili wystawienia, więc późniejsza edycja szablonu nie
zmienia dokumentów już przekazanych inwestorom. Migracja `0037`.

**Kalendarz terminów.** Nowa pozycja nawigacji z widokiem miesięcznym, który
zestawia daty rozproszone dotąd po czterech ekranach: rozpoczęcia projektów,
wizje lokalne, upływ ważności ofert i terminy wynikające z harmonogramów wycen.
Kratka dnia niesie po jednym oznaczeniu na rodzaj zdarzenia; wybór dnia otwiera
panel pod kalendarzem z pełną treścią wpisów i odnośnikami do właściwych
ekranów. W panelu dodaje się notatki dzienne — z opcjonalną godziną, do
oznaczenia jako wykonane. Migracja `0038`.

Kalendarz nie jest terminarzem spotkań: bez zaproszeń, uczestników, zdarzeń
cyklicznych, powiadomień i wykresu Gantta.

### Zmienione

**Język aplikacji.** Wszystkie opisy funkcji, komunikaty i podręcznik pomocy
przepisano z rejestru potocznego na profesjonalny: forma bezosobowa zamiast
zwrotów w drugiej osobie, terminologia branżowa (inwestor, pracownia,
opracowanie, zakres prac) i zwrot grzecznościowy „Państwo" w treściach
kierowanych do klienta — na stronie oferty, w briefie i w korespondencji.
Zmieniono również domyślne pytania briefu.

Przy okazji poprawiono dwa zdania, które przestały być prawdą: podręcznik nadal
twierdził, że usunięty plik znika bezpowrotnie, choć kosz istnieje od wersji
z lipca, i nie wspominał o czterech kartach Ustawień.

## [1.1.1] – 2026-08-27

### Naprawione

**Aktualizacje znów się zgłaszają.** Wydanie oznaczone jako v1.1.1 zawierało
aplikację przedstawiającą się jako 1.1.0 — numer wersji siedzi
w `tauri.conf.json`, a nie w nazwie tagu, i nie został podbity. Updater
porównuje właśnie te numery, więc widział „1.1.0 wobec 1.1.0" i meldował, że
wszystko jest aktualne. Wersja podbita w komplecie (`package.json`,
`tauri.conf.json`, `Cargo.toml`), a build wydania od teraz **przerywa się**,
gdy tag nie zgadza się z wersją w plikach.

Poza tym wydanie niesie zmiany opisane niżej pod 1.1.0 — u nikogo się
nie zainstalowały, bo aktualizacja ich nie zobaczyła.

## [1.1.0] – 2026-08-27

### Dodane

**Link dla klienta — oferta, którą inwestor przekliknie sam.**
Zamiast wysyłać martwy PDF, wysyłasz adres. Klient otwiera ofertę
w przeglądarce, przełącza pozycje TAK/NIE, widzi kwotę na żywo i albo
akceptuje (imię + data), albo zostawia uwagi. Ty dostajesz powiadomienie
w aplikacji, a status wyceny zmienia się sam.

Link ma termin ważności, licznik otwarć i da się go odwołać. Wysyłasz go
**ze swojej poczty** — przycisk otwiera Twój program pocztowy z gotową
treścią. Świadomie bez wysyłki z naszego serwera: mail od znanego nadawcy
dochodzi lepiej niż z obcej domeny.

Bez podpisu elektronicznego. Imię, znacznik czasu i adres IP to dowód zgody
na zakres — przyjęcie oferty nie wymaga formy pisemnej.

**Automatyczna aktualizacja aplikacji.** Toolier sprawdza po cichu przy
starcie, czy jest nowsza wersja, i pokazuje ją w Ustawieniach. Nic nie
instaluje się samo: restart w środku przygotowywania oferty byłby gorszy niż
dzień zwłoki z poprawką.

**Kosz na pliki.** Usunięty plik trafia do kosza na 30 dni, zamiast znikać
od razu. Kosz ma własny ekran w pasku bocznym i pokazuje, ile miejsca trzymają
usunięte pliki — bo limit zwalnia się dopiero po trwałym usunięciu.

**Porównanie wersji wyceny.** Widać, co zmieniło się między v1 a v2: które
pozycje doszły, zniknęły, podrożały albo zostały wyłączone, i o ile różni się
kwota. Pozycje dopasowują się po tożsamości, nie po identyfikatorze, więc
porównanie działa też po przebudowie dokumentu.

**Etapy realizacji w projekcie.** Trzy stany na etap (nierozpoczęty · w toku ·
zakończony) z datami i paskiem postępu. Etapy pochodzą z harmonogramu
zaakceptowanej wyceny — nie ma drugiego miejsca, w którym trzeba je utrzymywać.

**Eksport rejestru do Excela (.xlsx).** W odróżnieniu od CSV liczby zostają
liczbami — Excel przestaje zamieniać numer oferty na datę.

**Import klientów z pliku CSV.** Rozpoznaje separator i nagłówki z arkusza
klienta, pokazuje podgląd przed zapisem i pomija duplikaty. Wiersz bez nazwy
nie przerywa importu pozostałych.

**Wiele walut.** Wybór waluty workspace'u wchodzi teraz do nowych wycen,
edytora i wszystkich PDF-ów. Format liczb zostaje polski niezależnie od waluty.

**Praca bez sieci.** Nieudany autozapis nie przepada — trafia do lokalnej
kolejki i idzie, gdy połączenie wróci. Pasek u góry mówi, ile zmian czeka.
Gdy w międzyczasie ktoś zmienił dokument, zapis się zatrzymuje i pyta,
zamiast po cichu nadpisywać.

### Zmienione

**Ustawienia podzielone na trzy karty:** Aplikacja, Branding, Konto. Wcześniej
wszystko stało w jednej kolumnie — ustawienia wycen, kosz, aktualizacje, hasło
i kasowanie konta jedno pod drugim.

**Grupy w bibliotece mają jedno źródło.** Nazwa grupy przy usłudze jest
rozwiązywana ze słownika, a nie kopiowana do wiersza — zmiana nazwy dociera
teraz do wszystkich usług, także zapisanych wcześniej.

### Zmienione

**Nowy wygląd aplikacji — brąz i beż Toolier (T-74…T-82).** Cała powłoka
przeszła z chłodnej, rozmytej szarości na ciepłą i płaską paletę marki:
brązowa szyna nawigacji `#33251e`, beżowy pas u góry `#efece8`, jasna kanwa
i białe karty. Wycena zostaje białą kartką — po zmianie to **jasność**, a nie
temperatura, odróżnia dokument od reszty aplikacji.

Typografia: **Faculty Glyphic** w tytułach, **Inter** w interfejsie i we
wszystkich liczbach. Przy okazji naprawiony błąd, przez który żaden z krojów
nie był w ogóle ładowany — aplikacja renderowała się dotąd w systemowym
Segoe UI.

Logotypy Toolier zastąpiły zastępcze litery „A" w pasku bocznym i na ekranie
logowania; sygnet trafił do ikony aplikacji, instalatora i favicona.

Zniknęło rozmycie tła (`backdrop-filter`) — na ciepłym podłożu dawało mulistą
szarość, a kosztowało dwa pełnoekranowe przemalowania przy każdym przewinięciu.

Nowe konta dostają brand kit w barwach Toolier. **Istniejące zachowują swoje
kolory na PDF bez zmian** — kolor oferty jest własnością studia, nie nasz.

**Ekran subskrypcji przebudowany.** Stan dostępu przestał być kolorową
odznaką — jest zdaniem, a przy okresie próbnym dokłada 14 tyknięć-dni, czyli
ten sam znak co na pulpicie. Wybór częstotliwości płatności to teraz jeden
cennik w dwóch kolumnach zamiast dwóch osobnych kart; korzystniejszą roczną
znaczy waga przycisku i tło, a nie wstążka „najpopularniejsze".

### Naprawione

**Ostrzeżenia bez tła.** Pasek „tryb tylko do odczytu", bloki „Uwaga" w Pomocy
i ramka kasowania konta w Ustawieniach sięgały po barwy zdefiniowane wyłącznie
wewnątrz dokumentu wyceny, więc poza nim renderowały się bez tła, a ikony
ostrzegawcze traciły kolor.

**Kontrast.** Terakota rabatów, ochra ostrzeżeń, placeholdery i tor
przełącznika nie spełniały progów WCAG AA. Wartości poprawione, a próg pilnuje
teraz test liczący kontrast wprost z pliku palety.

### Dodane

**Panel „Dodaj usługi” w edytorze wyceny (T-71).** Zakres wyceny dobiera się
z pełnowymiarowej tabeli (usługa · grupa · sposób wyceny · stawka) z wyborem
sekcji lub grupy docelowej, szukajką, pigułkami grup i zakładką „Zestawy”.
Panel zostaje otwarty, aż klikniesz „Gotowe”; jedno ostrzeżenie nad listą mówi,
że usługi liczone za pomieszczenie potrzebują pomieszczeń, i pozwala je dodać.
W trybie edycji pola mają widoczną kreskowaną ramkę, a nad pozycjami stoi
nagłówek kolumn _Usługa · Ilość · Cena_.

**Biblioteka → Usługi jako zwijane wiersze (T-72).** Zamiast siatki rozłożonych
kart: jeden wiersz na usługę (nazwa · grupa · sposób wyceny · stawka ·
przełącznik „Aktywna”), klik rozwija formularz edycji, drugi klik zwija.
Nowo dodana usługa rozwija się sama.

**Pomoc w aplikacji (T-73).** Nowa pozycja „Pomoc” w pasku bocznym otwiera
kompletny poradnik: pierwsze kroki, klienci i projekty, edytor wyceny, statusy
i wersje, termin, dokumenty, PDF i branding, biblioteka, szablony, pliki,
ustawienia, subskrypcja, skróty klawiszowe i FAQ. Pasek boczny dzieli się
kreską na obszary pracy i — niżej — Pomoc z Ustawieniami.

### Usunięte

**Typy pomieszczeń z Ustawień (T-73).** Edytujesz je wyłącznie w Bibliotece →
Pomieszczenia — jedno miejsce zamiast dwóch.

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
