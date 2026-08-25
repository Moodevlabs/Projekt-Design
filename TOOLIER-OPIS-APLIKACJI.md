# Toolier — aplikacja dla studia projektowania wnętrz

**Wersja dokumentu:** 1.0 · sierpień 2026 · dotyczy aplikacji Toolier 1.0
**Dla kogo ten dokument:** studia projektowania wnętrz i projektanci, którzy otrzymali wersję demonstracyjną.

---

## 1. W jednym akapicie

Toolier to aplikacja desktopowa (Windows i macOS), która porządkuje **administracyjną
część pracy projektanta wnętrz**: klientów, projekty, oferty, terminy, dokumenty
i pliki. Sercem jest **interaktywna wycena** — dokument zbudowany z Twoich własnych
usług i cen, w którym każdą pozycję można włączyć lub wyłączyć, a suma przelicza się
na żywo. Z tego samego dokumentu powstaje brandowany PDF, szacowany termin realizacji
oraz komplet materiałów dla inwestora. Zamiast pliku Excel, szablonu Worda i folderu
na dysku — jedno miejsce, w którym wszystko dla danego klienta trzyma się razem.

**Obietnica:** ustawiasz studio raz (usługi, ceny, pakiety, czasy realizacji, branding);
przy kolejnym kliencie wybierasz zakres, a aplikacja wykonuje powtarzalną pracę za Ciebie.

---

## 2. Problem, który rozwiązuje

Większość studiów wycenia w arkuszu kalkulacyjnym, przepisuje wynik do szablonu
tekstowego, eksportuje PDF i odkłada plik do folderu z nazwiskiem klienta. Ten
sposób działa, dopóki nie pojawi się:

| Sytuacja | Koszt w dotychczasowym trybie pracy | Jak działa Toolier |
|---|---|---|
| Klient prosi o wersję bez wizualizacji | Ręczna edycja arkusza i ponowne złożenie PDF | Przełącznik TAK/NIE przy pozycji, suma przelicza się sama |
| Zmiana cennika w studiu | Poprawka w kilkunastu plikach, ryzyko rozjazdu | Jedno miejsce — Biblioteka; stare oferty celowo zostają nietknięte |
| „Ile to potrwa?" na spotkaniu | Szacowanie z głowy | Kalkulator terminu z etapów i pomieszczeń, z polskimi świętami |
| Druga wersja oferty, pierwsza ma zostać | Kopiowanie pliku i ręczne nazywanie | „Nowa wersja" — v1 zostaje jako archiwalna w tej samej linii |
| „Gdzie był rzut od klienta?" | Poczta, dysk, komunikator | Zakładka Pliki w projekcie |
| „Którą wersję wysłałem w marcu?" | Odtwarzanie z pamięci | Archiwum dokumentów — otwiera **ten sam plik**, nie nowy render |

Toolier nie zmienia sposobu, w jaki wyceniasz. Przenosi Twój sposób do narzędzia,
które pilnuje spójności i powtarzalności.

---

## 3. Dla kogo

- **Samodzielny projektant wnętrz** — główny odbiorca. Pracuje na własnym cenniku,
  chce skrócić czas przygotowania oferty i przestać pilnować wersji plików.
- **Studio 2–10 osób** — jeden wspólny cennik i jeden standard dokumentów.
  (Wielu użytkowników w jednym koncie to kolejny etap rozwoju — patrz §13.)
- **Wtórnie:** firmy remontowo-wykończeniowe, freelancerzy i agencje pracujące
  ofertowo z pozycjami do wyboru.

**Inwestor / klient końcowy nie loguje się do aplikacji** — dostaje PDF.
(Link online, w którym sam przełącza pozycje i akceptuje ofertę, jest w planie rozwoju.)

---

## 4. Jak zbudowana jest aplikacja

Cała praca układa się w jedną hierarchię:

```
STUDIO (Twoje konto)
└── KLIENT — teczka inwestora (kontakt, adres, notatki, status)
    └── PROJEKT — konkretna realizacja (mieszkanie, dom, lokal)
        ├── Wyceny        — v1, v2… jedna zaakceptowana
        ├── Dokumenty     — archiwum wygenerowanych PDF-ów
        ├── Pliki         — rzuty, zdjęcia, umowy, inspiracje
        └── Notatki       — wewnętrzne, nigdy nie trafiają do oferty
```

Obok tego stoją zasoby wspólne dla całego studia: **Biblioteka** (Twój cennik),
**Szablony** (gotowe układy ofert) i **Branding** (logo, kolory, dane na PDF).

Nawigacja po lewej stronie: Pulpit · Klienci · Wyceny · Biblioteka · Szablony,
a pod kreską Pomoc i Ustawienia.

---

## 5. Moduły — co dokładnie potrafi aplikacja

### 5.1 Pulpit

Ekran startowy: aktywni klienci i ostatnio edytowane projekty, cztery liczby
z bieżącego miesiąca (liczba wycen, wartość wysłanych ofert, wskaźnik akceptacji,
średnia wartość), pięć ostatnich wycen i stan subskrypcji. Nowe konto dostaje
**checklistę startową** (logo → biblioteka → pierwsza wycena), która znika sama
po wykonaniu kroków.

**Paleta poleceń `Ctrl/⌘ + K`** — jedno pole do wszystkiego: wpisujesz nazwisko
klienta, nazwę projektu, numer wyceny albo nazwę usługi i przechodzisz wprost tam.
Zawiera też akcje „Nowy klient", „Nowa wycena", „Nowa usługa".

### 5.2 Klienci i projekty

**Lista klientów** — wyszukiwarka po nazwie, e-mailu, telefonie i mieście; filtry
Aktywni / Zarchiwizowani; w wierszu liczba projektów i **łączna wartość
zaakceptowanych wycen**. Archiwizacja chowa klienta z listy, ale nie kasuje niczego.

**Karta klienta** — kontakt i adres w nagłówku, zakładki *Projekty · Wyceny ·
Dokumenty · Pliki · Notatki*.

**Projekt** — nazwa, adres, metraż, typ inwestycji i status (`lead / oferta /
w realizacji / zakończony / anulowany`) zmieniany wprost z nagłówka. Wyceny
w projekcie grupują się po linii wersji: widać najnowszą, rozwinięcie pokazuje starsze.

> **Ważna zasada:** dane inwestora w wycenie to **kopia** z chwili jej utworzenia.
> Poprawka telefonu w kartotece nie zmienia wysłanej oferty. Odświeżenie danych
> jest osobnym, świadomym przyciskiem.

### 5.3 Edytor wyceny — moduł kluczowy

Po lewej dokument, który wygląda jak przyszły PDF; po prawej panel sterowania
(sposób liczenia, klient, dokumenty, pomieszczenia, podsumowanie).

**Struktura dokumentu:** Sekcje (etapy, np. „Koncepcja", „Projekt techniczny")
→ Grupy (opcjonalnie, np. pomieszczenia) → Pozycje (usługi z ceną).

Co daje edytor:

- **Przełącznik TAK/NIE przy każdej pozycji.** Wyłączona zostaje w dokumencie jako
  opcja bez kwoty (jeśli tak ustawisz) i nie wchodzi do sumy. Przełącznik przy grupie
  steruje całą grupą naraz.
- **Panel „Dodaj usługi"** — pełnowymiarowa tabela biblioteki (usługa · grupa ·
  sposób wyceny · stawka), z wyszukiwarką, pigułkami grup i wyborem miejsca docelowego
  („Dodaj do: sekcja › grupa"). Panel zostaje otwarty, dopóki nie klikniesz „Gotowe" —
  zakres kompletujesz za jednym podejściem.
- **Ilość i jednostka** przy pozycji: `× 80 m²`, `× 3 kadry`, `× 2 wizyty`.
  Ceny wpisuje się jak w arkuszu („1 200", „1200,50").
- **Pomieszczenia jako wymiar wyceny.** W prawej kolumnie budujesz listę pomieszczeń
  (nazwa, ilość, typ ze słownika, flagi *W* — część wizualna i *T* — techniczna).
  Usługi liczone „według pomieszczeń" biorą stąd składniki: baza + Σ (stawka za typ
  pomieszczenia × ilość). Pod kwotą widać, skąd wynik („od 250 zł · 6 pom.").
  Przycisk **„Rozpisz na pomieszczenia"** tworzy grupę dla każdego pomieszczenia.
- **Rabaty** — kwotowe i procentowe, na całą wycenę, sekcję albo wybrane pozycje;
  opcjonalny warunek „tylko gdy wszystkie pozycje w zakresie są włączone"
  (rabat za komplet) i zaokrąglenie.
- **Wycena indywidualna** — pozycja bez ceny („do ustalenia"). Jest w ofercie,
  nie wchodzi do sumy, a podsumowanie dopisuje „+ N pozycji wycenianych indywidualnie".
- **Tryb godzinowy** — zamiast kwot wpisujesz minuty pracy, a wartość wynika ze stawki
  godzinowej studia. Przełączenie trybu pyta, czy przeliczyć istniejące liczby.
- **Warianty pozycji** — usługa może mieć warianty (np. „Wizualizacja" / „Panorama 360"),
  wybierane listą rozwijaną wprost w wierszu.
- **Auto-opisy z placeholderami** — `{rooms}` wstawia listę pomieszczeń („kuchnia,
  salon ×2"), `{frames|kadr|kadry|kadrów}` liczbę kadrów z poprawną polską odmianą.
- **Kolejność przeciąganiem** — pozycje, grupy i sekcje, także między sekcjami.
- **Podsumowania per sekcja** obok sumy globalnej; netto / VAT / brutto.
- **Podgląd / Edycja** — ten sam dokument bez kontrolek, dokładnie tak, jak zobaczy go
  inwestor.
- **Autozapis** z widocznym stanem („Zapisano 12:04", „Zapisywanie…", „Błąd — ponów").
  Nieudany zapis podaje powód. `Ctrl/⌘ + S` wymusza zapis natychmiast.
- **Biblioteka w panelu bocznym** — poprawiając cenę usługi bez wychodzenia z oferty,
  dostajesz pytanie „Zastosować zmiany w otwartej wycenie?".

### 5.4 Statusy, wersje i rejestr ofert

- **Statusy:** Szkic → Wysłana → Zaakceptowana / Odrzucona / Wygasła. Eksport PDF pyta
  „Oznaczyć jako wysłaną?".
- **Wersje:** „Nowa wersja" tworzy v2 z tą samą treścią i numerem; v1 dostaje status
  *Archiwalna* i zostaje w linii wersji projektu. Wysłana oferta nigdy nie zmienia się
  pod ręką. Numer wersji na dokumencie jest opcjonalny, w nazwie pliku — zawsze.
- **Duplikuj** tworzy niezależną ofertę z nowym numerem; **Przenieś do projektu**
  zmienia teczkę.
- **Rejestr wycen** — filtry statusów, klienta i miasta, wyszukiwarka, sortowanie,
  notatki wewnętrzne (nigdy nie trafiają do PDF).
- **Eksport rejestru do CSV** w układzie, który otwiera się w Excelu bez kreatora
  importu (UTF-8 BOM, separator `;`).
- **Numeracja** z konfigurowalnego wzorca: `WYC/{YYYY}/{MM}/{seq}` — z podglądem
  następnego numeru.

### 5.5 Termin realizacji

Zakładka „Termin" liczy, kiedy projekt się skończy:

- data startu, dni robocze u Ciebie i u inwestora, uwzględnianie **polskich świąt**;
- **etapy** (inwentaryzacja, rzuty, koncepcja, wizualizacje, rysunki techniczne…)
  z dniami bazowymi oraz — dla etapów zależnych od pomieszczeń — dniami na typ
  pomieszczenia; lista startuje z Twojego szablonu;
- włączona pozycja wyceny sama włącza pasujący etap (tylko włącza, nigdy nie wyłącza,
  z możliwością cofnięcia);
- wynik: **termin optymalny** (sama Twoja praca) i **najpóźniejszy** (z dniami inwestora
  na decyzje);
- osobny PDF **„Szacowany termin realizacji"** z tabelą pomieszczenia × etapy.

### 5.6 Dokumenty dla inwestora

Oprócz samej wyceny aplikacja generuje:

- **Etapy współpracy** — 19 etapów w 5 częściach. Zaznaczasz, co jest w zakresie;
  etapy poza zakresem **zostają w dokumencie z krzyżykiem**, żeby inwestor wiedział,
  czego nie zamawia.
- **Cennik usług dodatkowych** — ceny w widełkach („300–1200 zł") lub kwotowo,
  jednostka (`zł/h`, szt., ryczałt), termin realizacji i liczba dni doliczanych
  do harmonogramu. Przy każdej pozycji przycisk **„Dodaj do wyceny"** z dwoma
  przełącznikami: czy wpływa na koszt i czy na termin.
- **Eksport pakietu** — wybierasz, co wchodzi, i czy ma powstać jeden PDF z ciągłą
  numeracją stron, czy osobne pliki do wskazanego folderu
  (`{numer}-wycena.pdf`, `-termin`, `-etapy`, `-cennik`).

### 5.7 PDF, branding i archiwum

- **Brand kit:** logo (jasne i ciemne), kolor akcentu, kolor tła, font do wyboru,
  dane studia, osoby kontaktowe, NIP, adres, stopka. **Podgląd PDF odświeża się na żywo**
  podczas ustawiania.
- **PDF wyceny:** nagłówek z logo, dane inwestora, sekcje i pozycje z ilością
  i jednostką, wyłączone pozycje jako opcje bez kwoty (opcjonalnie), rabaty,
  podsumowanie netto / VAT / brutto, stopka z numeracją stron.
- **PDF powstaje lokalnie na Twoim komputerze** — nie wysyłamy treści oferty na serwer
  po to, żeby ją złożyć.
- **Archiwum dokumentów:** po eksporcie plik trafia do zakładki „Dokumenty" klienta
  i projektu. „Otwórz" pobiera **ten sam plik**, niezależnie od późniejszych zmian
  w cenniku czy brandingu — to jest dowód na to, co poszło do inwestora.

### 5.8 Biblioteka — Twój cennik

Zakładki: **Usługi · Grupy · Zestawy · Pomieszczenia · Stawki**.

- **Usługi** jako zwijane wiersze (nazwa · grupa · sposób wyceny · stawka · przełącznik
  „Aktywna"). Klik rozwija formularz, ikona ołówka otwiera pełną stronę usługi
  z numerowanymi krokami, sekcją „Jak to działa?", podglądem „jak to wygląda w ofercie"
  i statystyką użycia.
- **Osiem sposobów wyceny:** kwota stała · za m² · według pomieszczenia · za kadr ·
  za godzinę · za wizytę · za element · indywidualnie.
- **Cennik parametryczny:** dla „według pomieszczenia" ustawiasz bazę, tabelę
  *pomieszczenie × stawka* i zasięg (wszystkie pomieszczenia / tylko wizualne /
  tylko techniczne).
- **Cena „od"** pokazywana na listach i przy wyborze usług (nie wpływa na obliczenia).
- **Grupy** — uporządkowany słownik działów („01 · Przygotowanie projektu"), kolor,
  kolejność przeciąganiem.
- **Zestawy** — komplet pozycji wstawiany do oferty jednym kliknięciem („Kuchnia — pakiet").
- **Pomieszczenia** — słownik typów, po których cennik dobiera stawkę. Zmiana nazwy nie
  psuje cen w zapisanych wycenach.
- **Stawki** — cała macierz *usługa × typ pomieszczenia* na jednym ekranie,
  z **importem CSV** (przeniesienie cennika z arkusza).
- **Biblioteka przykładowa:** nowe konto startuje z **38 usługami w 8 grupach**,
  bez cen, oznaczonymi „Przykładowa". Edycja dowolnego pola zdejmuje oznaczenie,
  a jeden przycisk kasuje resztę. Nie zaczynasz od pustego ekranu.

> **Zasada, która chroni wysłane oferty:** pozycja w wycenie jest kopią wpisu
> z biblioteki. Zmiana ceny w cenniku wpływa na **nowe** wyceny; istniejące zmienisz
> tylko świadomie, z panelu biblioteki w edytorze.

### 5.9 Szablony i pakiety

Szablon to gotowy układ oferty („Projekt kompleksowy", „Konsultacja"), który niesie
**także harmonogram i dokumenty towarzyszące**. „Nowa wycena" pyta, czy zacząć od pustej,
czy od szablonu. Dane klienta się nie kopiują — wnosi je projekt. Karta szablonu pokazuje
liczbę pozycji, sumę i ikony zawartości.

### 5.10 Pliki

Każdy klient i projekt ma zakładkę **Pliki**: przeciągnij i upuść albo „Dodaj pliki".
Lista z typem, nazwą (zmiana w miejscu), rozmiarem, datą i autorem; podgląd obrazów
i PDF-ów, pobieranie, usuwanie z potwierdzeniem nazwą. Limity: **25 MB na plik**
i **2 GB na konto** (w cenie subskrypcji), z paskiem zużycia i ostrzeżeniem od 90 %.

### 5.11 Ustawienia

Domyślne dla wycen (waluta, VAT, ceny netto/brutto, tryb kwotowy albo godzinowy,
stawka za godzinę, wzorzec numeracji, widoczność numeru wersji, wyłączone pozycje
w PDF), branding, limit plików, konto (zmiana hasła, **eksport wszystkich danych
do jednego pliku JSON**, usunięcie konta).

### 5.12 Pomoc w aplikacji

Wbudowany poradnik — 14 sekcji od pierwszych kroków po FAQ, ze spisem treści,
skrótami klawiszowymi i odpowiedziami na typowe pytania („Dlaczego usługa liczy 0 zł?",
„Zmieniłem cenę w bibliotece, a wycena się nie zmieniła"). Nie trzeba szukać
dokumentacji poza aplikacją.

---

## 6. Typowy przebieg pracy

1. **Raz na starcie:** wgrywasz logo, ustawiasz kolor i dane studia, wpisujesz własne
   ceny do biblioteki (albo importujesz macierz stawek z CSV).
2. **Nowy inwestor:** Klienci → „Nowy klient" (Anna i Michał Kowalscy) → „Nowy projekt"
   (Dom 164 m²).
3. **Oferta:** w projekcie „Nowa wycena" → start z szablonu „Projekt kompleksowy".
   Szablon wnosi układ, etapy i dokumenty.
4. **Zakres:** dodajesz pomieszczenia (kuchnia, salon, 2 łazienki…), a potem usługi
   z panelu „Dodaj usługi". Pozycje liczone za pomieszczenie wyliczają się same.
5. **Dopięcie:** ilości, rabat za komplet, pozycje opcjonalne przełączone na NIE.
6. **Termin:** zakładka „Termin" — data startu, etapy podpowiedziane z zakresu, wynik
   optymalny i najpóźniejszy.
7. **Wysyłka:** eksport pakietu (wycena + termin + etapy + cennik dodatkowy) jako jeden
   PDF. Aplikacja pyta, czy oznaczyć wycenę jako wysłaną; kopia trafia do archiwum
   dokumentów klienta.
8. **Negocjacje:** inwestor prosi o zmiany → „Nowa wersja" → v2. v1 zostaje jako
   archiwalna, do wglądu.
9. **W trakcie realizacji:** dochodzi panorama 360 → „Dodaj do wyceny" z cennika
   dodatkowego aktualizuje i koszt, i termin.
10. **Wszystko w jednym miejscu:** rzuty od klienta, umowa i wysłane PDF-y siedzą
    w tym samym projekcie.

Realnie: **pierwsza oferta w kilka minut zamiast godziny**, a kolejne wersje
w kilkadziesiąt sekund.

---

## 7. Co dostajesz — w skrócie

- Oferty **spójne wizualnie** i zawsze z tym samym standardem, niezależnie od pośpiechu.
- **Jeden cennik** dla całego studia, z realnym sposobem liczenia (m², pomieszczenia,
  kadry, godziny), a nie „kwotą z głowy".
- **Wersjonowanie ofert**, które chroni przed nieporozumieniem „ale Pan pisał inaczej".
- **Termin liczony**, a nie obiecywany na spotkaniu.
- **Archiwum**, w którym znajdziesz dokładnie ten plik, który wysłałeś.
- **Pliki klienta** przy projekcie, nie w skrzynce pocztowej.
- **Twoje dane pozostają Twoje** — pełny eksport do jednego pliku, w każdej chwili.

---

## 8. Czym Toolier świadomie NIE jest

Żeby narzędzie zostało szybkie i zrozumiałe, poza zakresem są:

- CAD, rzuty, modelowanie 3D i wizualizacje,
- moodboardy, katalog produktów, sourcing i zamawianie,
- pełny CRM sprzedażowy, chat z klientem, kalendarz,
- fakturowanie, księgowość, KSeF, płatności od inwestora,
- rozbudowany harmonogram Gantta z zależnościami między etapami,
- aplikacja mobilna.

Toolier jest **back office studia**, nie kolejnym systemem do zarządzania projektami.

---

## 9. Wersja demonstracyjna — jak z niej korzystać

**Co dostajesz w demo:** kompletną aplikację ze wszystkimi funkcjami opisanymi wyżej,
wypełnioną danymi przykładowymi (klienci, projekty, wyceny, biblioteka usług), żeby
było co klikać od pierwszej minuty.

**Sugerowana ścieżka na 15 minut:**

1. Pulpit — zobacz ogólny widok i checklistę startową.
2. Klienci → wejdź w dowolnego klienta → w projekt → otwórz wycenę.
3. W edytorze **poprzełączaj pozycje TAK/NIE** i patrz na podsumowanie po prawej.
4. Dodaj pomieszczenie i zobacz, jak przeliczają się usługi liczone za pomieszczenie.
5. Kliknij **Podgląd**, potem **PDF** — sprawdź, jak wygląda gotowy dokument.
6. Wejdź w **Ustawienia → Branding**, podmień kolor i zobacz podgląd PDF na żywo.
7. Zajrzyj do **Biblioteki** i wpisz własną stawkę przy jednej usłudze.
8. Otwórz **Pomoc** — to ten sam poradnik, który dostaje każdy użytkownik.

**Na co zwrócić uwagę przy pierwszym uruchomieniu:**

- Windows może pokazać ekran „Windows chronił Twój komputer" (SmartScreen), a macOS
  ostrzeżenie Gatekeepera — dotyczy wersji przedpremierowych, zanim instalator zostanie
  podpisany certyfikatem. Aby uruchomić: Windows — „Więcej informacji" → „Uruchom mimo to";
  macOS — prawy przycisk na aplikacji → „Otwórz".
- Dane demo są przykładowe — możesz w nich zmieniać co chcesz.
- Jeżeli demo działa na koncie testowym, kwoty i limity zachowują się jak w wersji
  produkcyjnej.

> **Dane dostępowe do wersji demo:** ______________________________
> (podaje je studio przekazujące aplikację).

**Czego oczekujemy od Ciebie po demo:** informacji, które ekrany były niejasne, jakich
usług i sposobów wyceny zabrakło w Twojej pracy, i czy dokumenty PDF nadają się do
wysłania do Twojego inwestora bez poprawek.

---

## 10. Bezpieczeństwo i Twoje dane

- Konto i dane trzymamy w **Supabase w regionie Unii Europejskiej** (`eu-central-1`) —
  zgodnie z RODO.
- Każda tabela ma **RLS (Row Level Security)** — dane jednego studia są niedostępne
  dla innych na poziomie bazy, nie tylko interfejsu.
- **PDF-y powstają lokalnie** na Twoim komputerze.
- Sesja logowania jest trzymana w **systemowym pęku kluczy** (Keychain / Menedżer
  poświadczeń), nie w pliku tekstowym.
- **Eksport danych** (Ustawienia → Konto) daje jeden plik JSON ze wszystkim: wycenami
  z treścią, biblioteką, zestawami, szablonami, klientami, ustawieniami i listą plików.
  Działa również po wygaśnięciu subskrypcji.
- **Usunięcie konta** jest dostępne z aplikacji, z potwierdzeniem.
- Logowanie: e-mail i hasło albo konto Google; reset hasła z aplikacji.

---

## 11. Wymagania techniczne

| | |
|---|---|
| System | Windows 10 lub nowszy, macOS 12 lub nowszy (Linux — best effort) |
| Instalacja | Instalator `.msi` / `.exe` (Windows), `.dmg` (macOS) |
| Internet | Wymagany — dane synchronizują się z chmurą (tryb offline w planach) |
| Wydajność | Start aplikacji poniżej 2 s; płynna edycja przy 300 pozycjach; PDF na 10 stron poniżej 3 s |
| Miejsce na pliki | 2 GB na konto, 25 MB na pojedynczy plik |

---

## 12. Model licencji i cena

- **98,99 zł miesięcznie** albo **999,99 zł rocznie** (rocznie ≈ dziesięć miesięcy
  w cenie dwunastu).
- **Nie ma wersji darmowej ani planów o różnym zakresie** — wszystkie funkcje są
  w jednej cenie; wybór dotyczy wyłącznie częstotliwości płatności.
- **14 dni okresu próbnego bez podawania karty.**
- W cenie: pełna funkcjonalność i **2 GB przestrzeni na pliki**.
- Płatność przez **Stripe** (bezpieczny checkout w przeglądarce). Faktury i zmiana
  karty w Portalu klienta.
- **Po wygaśnięciu dostęp nie znika**: aplikacja przechodzi w tryb tylko do odczytu —
  wyceny można oglądać, eksportować do PDF i pobrać wszystkie dane. Nic nie jest kasowane.

---

## 13. Plan rozwoju

**Najbliższe kroki**

- Wysyłka oferty e-mailem prosto z aplikacji, z PDF-em w załączniku.
- Automatyczna aktualizacja aplikacji.
- Tryb ciemny i rozszerzone skróty klawiszowe.
- Pełna historia wersji z porównaniem pozycji i kwot.
- Kosz na pliki (odzyskiwanie przez 30 dni).
- Eksport XLSX i import klientów z CSV.

**Dalej — wyróżnik produktu**

- **Link online dla inwestora:** klient otwiera ofertę w przeglądarce, sam przełącza
  pozycje TAK/NIE, widzi sumę i klika „Akceptuję" (z podpisem i znacznikiem czasu);
  projektant dostaje powiadomienie w aplikacji.
- Wielu użytkowników w jednym koncie studia (role właściciel / członek).
- Statystyki: które pozycje inwestorzy najczęściej wyłączają — sygnał cenowy.
- Tryb offline z lokalną bazą i synchronizacją.

Kolejność może się zmienić — uwagi z demo mają na nią realny wpływ.

---

## 14. Kontakt

Pytania, uwagi i zgłoszenia z wersji demonstracyjnej prosimy kierować na adres podany
przy przekazaniu aplikacji (jest też w stopce ekranu logowania).

*Toolier — developed by AnzorgeDesign & Moodevlabs.*
