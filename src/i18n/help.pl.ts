/**
 * Poradnik obsługi Toolier (T-73) — treść po polsku, w jednym miejscu.
 *
 * Struktura jest danymi, nie JSX-em: `HelpPage` rysuje ją z tokenów
 * aplikacji, a tekst da się poprawić bez dotykania komponentów. Każda
 * sekcja odpowiada jednemu obszarowi z nawigacji albo jednej zakładce
 * edytora — w tej samej kolejności, w jakiej użytkownik je spotyka.
 */
export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'tip'; title?: string; text: string }
  | { kind: 'warn'; title?: string; text: string }
  | { kind: 'keys'; rows: { keys: string; action: string }[] }
  | { kind: 'faq'; items: { q: string; a: string }[] };

export interface HelpSection {
  id: string;
  icon:
    | 'start'
    | 'clients'
    // Brief i wizja lokalna (poprawki 9 i 10 z 2026-08-27).
    | 'brief'
    | 'visit'
    | 'quote'
    | 'status'
    | 'schedule'
    | 'documents'
    | 'pdf'
    | 'library'
    | 'templates'
    | 'files'
    | 'settings'
    | 'billing'
    | 'keys'
    | 'faq';
  title: string;
  lead: string;
  blocks: HelpBlock[];
}

export const helpPl = {
  title: 'Pomoc',
  eyebrow: 'Poradnik',
  heading: 'Jak pracować w Toolier',
  intro:
    'Toolier to workspace studia projektowania wnętrz: klienci → projekty → wyceny, termin, dokumenty i pliki. Poniżej cała aplikacja krok po kroku — od pierwszego logowania po wysłanie pakietu dokumentów inwestorowi.',
  tocLabel: 'Spis treści',
  quickTitle: 'Najczęściej szukane',
  quick: [
    { label: 'Pierwsza wycena w 5 minut', target: 'start' },
    { label: 'Brief przed projektem', target: 'brief' },
    { label: 'Dodawanie usług do wyceny', target: 'quote' },
    { label: 'Link i decyzja klienta', target: 'status' },
    { label: 'Wizja lokalna i obmiar', target: 'visit' },
    { label: 'Skróty klawiszowe', target: 'keys' },
  ],
  tipLabel: 'Wskazówka',
  warnLabel: 'Uwaga',
  footer:
    'Nie znalazłeś odpowiedzi? Napisz do nas — adres jest w stopce ekranu logowania. Poradnik odpowiada wersji 1.0.',

  sections: [
    {
      id: 'start',
      icon: 'start',
      title: 'Pierwsze kroki',
      lead: 'Trzy rzeczy na start: logo studia, własne ceny w bibliotece i pierwsza wycena. Pulpit prowadzi Cię przez nie sam.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Ustawienia → Branding: wgraj logo, ustaw kolor i dane studia. Trafiają na każdy PDF.',
            'Biblioteka → Usługi: konto startuje z 38 przykładowymi usługami w 8 grupach — bez cen. Rozwiń wiersz i wpisz swoje stawki albo dodaj własne usługi.',
            'Klienci → „Nowy klient” → w karcie klienta „Nowy projekt” → w projekcie „Nowa wycena”.',
            'W edytorze kliknij „Dodaj usługi”, zaznacz zakres, dodaj pomieszczenia w prawej kolumnie, a potem „PDF”.',
          ],
        },
        {
          kind: 'p',
          text: 'Nawigacja po lewej: Pulpit, Klienci, Wyceny, Biblioteka, Szablony — to obszary pracy. Pod kreską Pomoc i Ustawienia. Pasek można rozwinąć przyciskiem na dole, żeby widzieć etykiety. Na wąskim oknie rozwinięty pasek nasuwa się na treść i chowa po kliknięciu obok albo po przejściu do innego ekranu.',
        },
        {
          kind: 'p',
          text: 'Na dole paska stoi Twoje zdjęcie (ustawiasz je w Ustawieniach → Konto) z kropką połączenia: zielona znaczy, że aplikacja ma łączność, czerwona — że pracujesz bez sieci i zmiany czekają w kolejce.',
        },
        {
          kind: 'tip',
          text: 'Ctrl/⌘ + K otwiera paletę: wpisz nazwę klienta, projektu, wyceny albo usługi i wciśnij Enter. Ctrl/⌘ + Enter otwiera wycenę od razu w edycji.',
        },
        {
          kind: 'p',
          text: 'Pulpit zaczyna się od paska „Co nowego u klientów”: akceptacje, odrzucenia, uwagi i otwarte linki, z kropką przy tym, czego jeszcze nie przeczytałeś. Gdy jest cicho, mówi „Jesteś na bieżąco”. Niżej teczki w toku i pięć ostatnich wycen. Checklista startowa znika sama, gdy wszystkie trzy kroki są zrobione. Subskrypcji na pulpicie nie ma — okres próbny zgłasza się sam, raz dziennie, przy starcie; po opłaceniu obsługujesz ją z Ustawień.',
        },
      ],
    },
    {
      id: 'clients',
      icon: 'clients',
      title: 'Klienci i projekty',
      lead: 'Klient to teczka, projekt to konkretna realizacja (mieszkanie, dom, lokal). Wycena zawsze żyje wewnątrz projektu.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Lista klientów: siatka kart — na każdej zdjęcie klienta, kontakt, miasto, liczba wycen, wartość zaakceptowanych i ostatnia aktywność. Nad listą szukajka (nazwa, e-mail, telefon, miasto) i pigułki Aktywni / Zarchiwizowani. Menu „⋯” na karcie daje Nowy projekt, Nową wycenę i Archiwizuj.',
            'Zdjęcie klienta dodajesz w oknie edycji kartoteki. Bez zdjęcia karta pokazuje inicjały — nigdy pustego kółka.',
            'Karta klienta: nagłówek z kontaktem i adresem oraz zakładki Projekty · Brief · Wyceny · Dokumenty · Pliki · Notatki.',
            'Projekt: nazwa, adres, metraż, typ (mieszkanie, dom, lokal…) i status zmieniany wprost z nagłówka. Zakładki Wyceny · Wizja lokalna · Etapy · Dokumenty · Pliki · Notatki.',
            'Wyceny w projekcie są grupowane po linii wersji: wiersz to najnowsza wersja, rozwinięcie pokazuje starsze.',
          ],
        },
        {
          kind: 'tip',
          title: 'Dane klienta w wycenie to kopia',
          text: 'Wycena zapamiętuje dane inwestora z chwili utworzenia. Poprawka telefonu w kartotece nie zmieni wysłanej oferty — w edytorze, w karcie „Klient”, pojawia się przycisk „Odśwież dane”, którym robisz to świadomie.',
        },
        {
          kind: 'p',
          text: 'Archiwizacja klienta chowa go z listy, ale nie kasuje niczego — wyceny, pliki i dokumenty zostają. Zarchiwizowanego klienta dalej da się wybrać w edytorze wyceny.',
        },
      ],
    },
    {
      id: 'brief',
      icon: 'brief',
      title: 'Brief klienta',
      lead: 'Kwestionariusz, który klient wypełnia przed rozpoczęciem projektu. Pierwszy etap współpracy — dopiero z jego odpowiedzi wiadomo, co właściwie wycenić.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Karta klienta → zakładka „Brief” → „Wyślij brief”. Powstaje link ważny 60 dni.',
            'Kopiujesz link albo klikasz „Wyślij mailem” — otwiera się Twoja poczta z gotową treścią. Brief idzie od Ciebie, nie z naszej domeny.',
            'Klient otwiera link w przeglądarce, bez zakładania konta. Formularz jest opatrzony Twoim logo i kolorem z Brandingu.',
            'Odpowiedzi wracają na kartę klienta. Pasek postępu mówi, ile z pytań jest już wypełnione; „Odpowiedzi klienta” rozwija je w układzie dokumentu.',
          ],
        },
        {
          kind: 'list',
          items: [
            'Pięć bloków: obiekt · kto tu będzie mieszkał · zakres prac · estetyka · budżet i termin. Kolejność jest celowa — klient odpowiada najłatwiej na fakty, najtrudniej na pieniądze.',
            'Wymagane są dwa pytania: co projektujemy i metraż. Reszta jest opcjonalna, bo brief wypełnia się wieczorem, na telefonie, na raty.',
            'Klient może zapisywać wielokrotnie — formularz pamięta to, co już wpisane, i wraca do tego przy ponownym otwarciu linku.',
            'Briefów może być kilka: klient wraca z drugim mieszkaniem, a każde ma inne odpowiedzi.',
          ],
        },
        {
          kind: 'tip',
          title: 'Pytania są zamrażane przy wysyłce',
          text: 'Brief zapamiętuje zestaw pytań z chwili wystawienia linku. Dzięki temu brief sprzed pół roku pokazuje pytania, na które klient naprawdę odpowiadał — a nie dzisiejsze.',
        },
        {
          kind: 'warn',
          title: 'Odwołanie linku nie kasuje odpowiedzi',
          text: '„Odwołaj link” zamyka dostęp klientowi natychmiast, ale to, co już przyszło, zostaje. Skasowanie briefu (kosz) usuwa również odpowiedzi i tego nie da się cofnąć.',
        },
      ],
    },
    {
      id: 'visit',
      icon: 'visit',
      title: 'Wizja lokalna',
      lead: 'Notatka ze stanu zastanego: obmiar, instalacje, zdjęcia, ustalenia. Jedyny zapis tego, jak było, zanim ktokolwiek czegokolwiek dotknął.',
      blocks: [
        {
          kind: 'p',
          text: 'Teczka projektu → zakładka „Wizja lokalna” → „Nowa wizja”. Wizji może być kilka: pierwsza przed projektem, druga po wyburzeniach, trzecia przed montażem. Każda opisuje inny stan tego samego wnętrza.',
        },
        {
          kind: 'list',
          items: [
            'Data wizyty i obecni (projektant, inwestor, kierownik budowy) — nagłówek karty pokazuje je razem z podsumowaniem.',
            'Obmiar: nazwa pomieszczenia i trzy wymiary w centymetrach. Powierzchnia liczy się sama — nie da się jej nadpisać, bo rozjechałaby się z wymiarami obok. Pomieszczenie bez kompletu wymiarów nie wchodzi do sumy.',
            'Do sprawdzenia: gotowa lista czternastu rzeczy, od ścian po zgody wspólnoty. Każda ma stan: Jest OK · Do wymiany · Brak · Nie ustalono. Pozycje można dopisać i usunąć.',
            'Zdjęcia trafiają jednocześnie do plików projektu — tutaj są tylko przypięte do tej wizyty.',
            'Notatka z wizji: obserwacje, ustalenia, ryzyka. To, co wymaga decyzji inwestora.',
          ],
        },
        {
          kind: 'tip',
          title: '„Nie ustalono” to prawidłowa odpowiedź',
          text: 'Znaczy „byłem na miejscu i nie dało się tego sprawdzić” — zakryte piony, brak dokumentacji, nieobecny wykonawca. Nagłówek karty liczy takie pozycje, żeby było wiadomo, do czego trzeba wrócić.',
        },
        {
          kind: 'warn',
          title: 'Zapis jest jawny',
          text: 'Obmiar wpisuje się seriami po kilkanaście liczb, więc karta nie zapisuje się sama. Pasek „Zapisz” pojawia się dopiero, gdy coś zmienisz — dopóki go widzisz, zmiany nie są w bazie.',
        },
      ],
    },
    {
      id: 'quote',
      icon: 'quote',
      title: 'Wycena — edytor',
      lead: 'Dokument jest po lewej i wygląda jak przyszły PDF. Po prawej: sposób liczenia, klient, dokumenty, pomieszczenia i podsumowanie.',
      blocks: [
        {
          kind: 'p',
          text: '„Nowa wycena” pyta o klienta i projekt (dane inwestora wypełniają się same) oraz o start: pusta wycena albo szablon. Szablon niesie układ, termin i dokumenty.',
        },
        {
          kind: 'steps',
          items: [
            'Nagłówek: tytuł, podtytuł, data, ważność (dni), tekst wstępu i opis projektu. Klikasz w tekst i piszesz — w edycji pola mają kreskowaną ramkę, w podglądzie znikają.',
            'Sekcja = etap (np. „Koncepcja”, „Projekt techniczny”). Grupa = podzbiór w sekcji, np. pomieszczenie. Pozycja = usługa z ceną.',
            '„Dodaj usługi” otwiera panel z tabelą biblioteki: usługa · grupa · sposób wyceny · stawka. Kliknij „Dodaj” przy każdej potrzebnej — panel zostaje otwarty, cel („Dodaj do: sekcja › grupa”) zmieniasz na górze. „Gotowe” zamyka. To jedyna droga dobierania usług z biblioteki.',
            '„Pozycja ręcznie” dodaje pusty wiersz — do rzeczy spoza biblioteki.',
            'Przełącznik TAK/NIE przy pozycji: wyłączona zostaje w dokumencie jako opcja bez kwoty (jeśli tak ustawisz w Ustawieniach), ale nie wchodzi do sumy. Przełącznik przy grupie włącza lub wyłącza wszystkie jej pozycje.',
            'Ilość i jednostka („× 80 m²”, „× 3 kadry”) — z biblioteki, ale edytowalne w wierszu. Ceny wpisujesz jak w arkuszu: „1 200”, „1200,50”.',
          ],
        },
        {
          kind: 'p',
          text: 'Pomieszczenia (prawa kolumna): nazwa, ilość i typ ze słownika oraz dwie flagi — W (część wizualna, czyli projekt aranżacji) i T (część techniczna, czyli rysunki wykonawcze). Usługi liczone „według pomieszczeń” biorą stąd swoje składniki: stawka z biblioteki × pomieszczenia w zasięgu usługi. Pod listą stoi zdanie „Do części wizualnej liczy się N, do technicznej M” — to dokładnie te liczby, które bierze cennik. Wiersz takiej pozycji pokazuje pod kwotą „od X · N pom.”, żeby było wiadomo, skąd liczba.',
        },
        {
          kind: 'warn',
          title: 'Usługa za pomieszczenie bez pomieszczeń liczy samą bazę',
          text: 'Często 0 zł. Panel „Dodaj usługi” ostrzega o tym nad listą i daje przycisk „Dodaj pomieszczenie”. Dodaj pomieszczenia PRZED usługami — albo zaraz po, kwoty przeliczą się same.',
        },
        {
          kind: 'list',
          items: [
            '„Wycena indywidualna” — pozycja bez ceny. Jest w ofercie, nie wchodzi do sumy; podsumowanie dopisuje „+ N pozycji wycenianych indywidualnie”.',
            'Rabaty stoją na końcu dokumentu: kwotowy albo procentowy, na całą wycenę, sekcję lub wybrane pozycje; opcjonalny warunek „tylko gdy wszystkie pozycje w zakresie są włączone” i zaokrąglenie.',
            'Sposób liczenia (karta u góry prawej kolumny): Kwotowo albo Godzinowo. W trybie godzinowym w wierszu wpisujesz minuty, a kwota wynika ze stawki wyceny. Przełączenie pyta, czy przeliczyć liczby.',
            'Warianty: usługa z wariantami w bibliotece (np. „Wizualizacja” / „Panorama 360”) ma w wierszu listę rozwijaną zamiast nazwy.',
            'Ikona zakładki przy wierszu zapisuje pozycję do biblioteki; przy grupie — cały zestaw.',
            'Kolejność zmieniasz przeciąganiem za uchwyt (pozycje, grupy, sekcje), także między sekcjami.',
          ],
        },
        {
          kind: 'p',
          text: 'Podgląd / Edycja na górnym pasku przełącza ten sam dokument bez kontrolek. Autozapis działa cały czas — obok numeru widać „Zapisano 12:04”, „Zapisywanie…” albo „Błąd — ponów”. Ctrl/⌘ + S wymusza zapis natychmiast.',
        },
        {
          kind: 'tip',
          title: 'Biblioteka z wnętrza edytora',
          text: 'Menu „⋯” → „Biblioteka” otwiera ją w panelu bocznym. Zmiana ceny lub nazwy usługi pyta wtedy: „Zastosować zmiany w otwartej wycenie?” — to jedyna droga, żeby poprawka z biblioteki weszła do już zbudowanej oferty. Wyceny zapisane wcześniej nigdy nie zmieniają się same.',
        },
      ],
    },
    {
      id: 'status',
      icon: 'status',
      title: 'Statusy, wersje i rejestr',
      lead: 'Wycena ma status i numer wersji. Wysłana oferta zostaje taka, jaka poszła — poprawki robisz w nowej wersji.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Statusy: Szkic → Wysłana → Zaakceptowana / Odrzucona / Wygasła. „Archiwalna” to wersja zastąpiona przez nowszą — nie kosz.',
            'Eksport PDF pyta „Oznaczyć jako wysłaną?”. „Wysłana” to jedyny status, który ustawiasz ręcznie — wysłanie oferty jest Twoją czynnością.',
            'Zaakceptowana i Odrzucona zapisuje WYŁĄCZNIE klient, pod linkiem. Dzięki temu data i przyjęty zakres są jego odpowiedzią, a nie naszym domysłem.',
            '„Nowa wersja” (menu „⋯” w edytorze albo w rejestrze) tworzy v2 z tą samą treścią i numerem; v1 zostaje w linii wersji. Numer wersji na dokumencie jest domyślnie ukryty (Ustawienia), w nazwie pliku — zawsze.',
            '„Duplikuj” robi niezależną wycenę z nowym numerem, „Przenieś do projektu” zmienia teczkę.',
            'Rejestr (Wyceny): filtry statusów jako pigułki (archiwalne domyślnie ukryte), filtr klienta i miasta, szukajka, sortowanie. Kolumna notatek to notatki wewnętrzne — nigdy nie trafiają do PDF ani do szablonu.',
            '„Eksportuj rejestr (CSV)” zapisuje to, co widać po filtrach, w układzie otwierającym się w Excelu bez przekodowania.',
          ],
        },
        {
          kind: 'p',
          text: 'LINK DLA KLIENTA. Menu „⋯” w edytorze → „Udostępnij”. Powstaje adres, który klient otwiera w przeglądarce bez konta. Link niesie komplet: wycenę z przełącznikami TAK/NIE, termin i dokumenty towarzyszące — klient widzi dokładnie to, co akceptuje.',
        },
        {
          kind: 'steps',
          items: [
            'Klient przełącza pozycje i widzi, jak zmienia się kwota.',
            'Ma trzy drogi wyjścia: „Akceptuję ofertę”, „Mam uwagi” albo „Nie skorzystam z tej oferty” (z opcjonalnym powodem).',
            'Odpowiedź wraca do wyceny jako oś „Na czym stoimy”: wysłano → otwarto → uwagi → decyzja. Kroki, które jeszcze nie zaszły, zostają na liście wyszarzone — dzięki temu widać, na co się czeka.',
            'Pod osią stoi lista pozycji, które klient ODZNACZYŁ — nazwami, nie liczbą. Od nich zaczyna się telefon do klienta.',
          ],
        },
        {
          kind: 'warn',
          title: 'Odmowa zamyka ofertę',
          text: 'Po odrzuceniu tej samej wyceny nie da się już zaakceptować — trzeba zrobić nową wersję. Klient widzi to zdanie przed potwierdzeniem, razem z podpowiedzią, że przy poprawkach lepszą drogą są uwagi.',
        },
      ],
    },
    {
      id: 'schedule',
      icon: 'schedule',
      title: 'Termin realizacji',
      lead: 'Zakładka „Termin” w edytorze liczy, kiedy projekt się skończy — z etapów, pomieszczeń i kalendarza dni roboczych z polskimi świętami.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Blok „Założenia” na górze: data startu prac, dni robocze w tygodniu po Twojej i po stronie inwestora oraz to, czy liczymy polskie święta. Z tych czterech wartości wychodzą daty w podsumowaniu obok.',
            'Etapy (inwentaryzacja, rzuty, koncepcja, wizualizacje, rysunki techniczne…) mają dni bazowe i — dla etapów zależnych od pomieszczeń — dni na typ pomieszczenia. Lista startuje z szablonu z Ustawień.',
            'Włączona pozycja wyceny z etykietą (np. „wizualizacje”) sama włącza pasujący etap — tylko włącza, nigdy nie wyłącza; komunikat pozwala cofnąć.',
            'Kolumna „Kto” przy etapie: ARCH. to czas pracowni, INW. — czas po stronie inwestora (decyzje, akceptacje, zbieranie inspiracji). Rozdzielamy je, bo to drugie najczęściej rozciąga termin, a najtrudniej je potem wytłumaczyć.',
            'Wynik: termin optymalny (zakłada, że inwestor odpowiada od ręki) i najpóźniejszy (dolicza jego dni w całości). Prawda leży pomiędzy — dlatego widełki, a nie jedna data. Bez daty startu widzisz liczbę dni i zgrubny przelicznik na tygodnie.',
          ],
        },
        {
          kind: 'p',
          text: 'Usługi dodatkowe z „Cennika usług dodatkowych” mogą doliczać dni („Panorama 360, +3 dni”) — wtedy pojawiają się w Terminie jako osobna lista. „Eksportuj termin (PDF)” daje dokument „Szacowany termin realizacji” z tabelą pomieszczenia × etapy i własną, krótszą ważnością (7 dni).',
        },
        {
          kind: 'tip',
          text: 'Pasek etapów pokazuje proporcje czasu, nie kalendarz — nie modelujemy zależności między etapami, więc oś czasu obiecywałaby precyzję, której tu nie ma.',
        },
      ],
    },
    {
      id: 'documents',
      icon: 'documents',
      title: 'Dokumenty dla inwestora',
      lead: 'Zakładka „Dokumenty” w edytorze: Etapy współpracy i Cennik usług dodatkowych. Razem z wyceną i terminem tworzą pakiet.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Etapy współpracy: 19 etapów w 5 częściach. Zaznaczasz, co jest w zakresie; etapy poza zakresem ZOSTAJĄ w dokumencie z krzyżykiem — inwestor ma przeczytać, czego nie zamawia. Ważność 14 dni, do zmiany.',
            'Cennik usług dodatkowych: nazwa, opis, cena jako przedział („300–1200 zł”) lub kwota, jednostka (zł/h, szt., ryczałt), termin i dni doliczane do harmonogramu. Bez sumy — suma widełek nic nie znaczy.',
            '„Dodaj do wyceny” przy pozycji cennika: dwa przełączniki — koszt (pozycja z dolną granicą przedziału wchodzi do ostatniej sekcji) i termin (dni trafiają do harmonogramu).',
            'Menu „⋯” → „Eksportuj pakiet dokumentów…”: wybierasz, co wchodzi (tylko to, co wycena ma), i czy jeden plik z ciągłą numeracją stron, czy osobne pliki do folderu. Nazwy: `{numer}-wycena.pdf`, `-termin`, `-etapy`, `-cennik`.',
          ],
        },
      ],
    },
    {
      id: 'pdf',
      icon: 'pdf',
      title: 'PDF, branding i archiwum',
      lead: 'Każdy PDF powstaje lokalnie, z Twoim brand kitem, i może od razu trafić do archiwum klienta.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Ustawienia → Branding: logo, kolor akcentu, dane studia, osoba kontaktowa, stopka. Podgląd PDF po prawej odświeża się na żywo.',
            'PDF wyceny: nagłówek z logo, dane inwestora, sekcje i pozycje z ilością i jednostką, wyłączone pozycje jako opcje (jeśli włączone w Ustawieniach), rabaty, podsumowanie netto/VAT/brutto, „+ N pozycji indywidualnych”.',
            'Po udanym eksporcie plik ląduje w Dokumentach klienta i projektu (zakładka „Dokumenty”) — to zapisany plik, nie ponowny render. Karta „Dokumenty” w edytorze pokazuje trzy ostatnie.',
            'Opisy pozycji mogą zawierać placeholdery: {rooms} wstawia listę pomieszczeń („kuchnia, salon ×2”), {frames|kadr|kadry|kadrów} liczbę kadrów z polską odmianą. Nieznany placeholder zostaje dosłownie — literówka ma być widoczna. Przycisk „{ }” pokazuje listę.',
          ],
        },
      ],
    },
    {
      id: 'library',
      icon: 'library',
      title: 'Biblioteka',
      lead: 'Twój cennik. Zakładki: Usługi · Grupy · Zestawy · Pomieszczenia · Stawki. Wszystko, co tu ustawisz, wchodzi do nowych wycen.',
      blocks: [
        {
          kind: 'p',
          text: 'Usługi to lista zwiniętych wierszy: nazwa, grupa, sposób wyceny, stawka i przełącznik „Aktywna”. Rozwijasz wiersz kliknięciem w tekst albo w strzałkę po prawej — działa jedno i drugie. Pod spodem otwiera się formularz (nazwa, opis, grupa, cena, wariant, reguła cenowa); ikona ołówka prowadzi do pełnej strony usługi z numerowanymi krokami i podglądem w ofercie. Pigułki grup nad listą zawężają widok, szukajka szuka w nazwie i opisie.',
        },
        {
          kind: 'list',
          items: [
            'Osiem sposobów wyceny (pełna strona usługi, krok 4): Kwota stała · Za m² · Według pomieszczenia · Za kadr · Za godzinę · Za wizytę · Za element · Indywidualnie. Pod spodem to tryb liczenia + jednostka — nie musisz o tym wiedzieć.',
            '„Według pomieszczenia”: baza + stawka na typ pomieszczenia (krok 5: tabela pomieszczenie × stawka netto) i zasięg — wszystkie pomieszczenia, tylko część wizualna albo tylko techniczna. „Za kadr” mnoży przez liczbę kadrów wpisaną w wycenie.',
            'Cena „od” pokazuje się na listach i w panelu „Dodaj usługi”; nie wpływa na obliczenia. Bez ręcznego „od” lista pokazuje najniższą stawkę reguły.',
            'Nieaktywna usługa znika z wyboru w edytorze, ale zostaje w wycenach, które ją mają.',
            'Grupy: kod („01”), nazwa, kolor z palety, kolejność przeciąganiem. Kolejność grup to kolejność w panelu „Dodaj usługi”. Usunięcie grupy przenosi usługi do „Bez grupy”.',
            'Zestawy: komplet pozycji wstawiany do wyceny jako grupa (np. „Kuchnia — pakiet”). Powstają z ikony zakładki przy grupie w edytorze albo w zakładce Zestawy.',
            'Pomieszczenia: słownik typów (kuchnia, salon, łazienka…). To po nich cennik dobiera stawkę. Zmiana nazwy nie zmienia klucza, więc nie psuje cen w zapisanych wycenach. Tu — i tylko tu — go edytujesz.',
            'Stawki: cała macierz usługa × typ pomieszczenia na jednym ekranie, z importem CSV.',
          ],
        },
        {
          kind: 'tip',
          title: 'Biblioteka przykładowa',
          text: 'Nowe konto dostaje 38 usług w 8 grupach z badge „Przykładowa” i bez cen. Edycja dowolnego pola zdejmuje badge — wpis staje się Twój. Ustawienia → Biblioteka → „Usuń pozostałe przykładowe” kasuje te, których nie ruszyłeś.',
        },
        {
          kind: 'warn',
          title: 'Zmiana w bibliotece nie zmienia starych wycen',
          text: 'Pozycja w wycenie jest kopią. Nowe wyceny biorą nowe ceny; otwartą wycenę zaktualizujesz tylko z panelu biblioteki w edytorze (pyta o kaskadę). Pełna strona usługi mówi to wprost.',
        },
      ],
    },
    {
      id: 'templates',
      icon: 'templates',
      title: 'Szablony',
      lead: 'Szablon to gotowy układ wyceny — „Projekt kompleksowy”, „Konsultacja” — razem z terminem i dokumentami.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Zapis: w edytorze menu „⋯” → „Zapisz jako szablon…”. Dialog pyta, co wchodzi: układ wyceny, termin, dokumenty. „Nadpisz szablon…” aktualizuje istniejący.',
            'Użycie: „Nowa wycena” → „Zacznij od: szablon”, albo w Szablonach „Nowa wycena z szablonu”. Dane klienta się nie kopiują — wypełnia je projekt.',
            'Karta szablonu pokazuje liczbę pozycji, sumę i ikony zawartości (wycena · termin · dokumenty).',
          ],
        },
        {
          kind: 'tip',
          text: 'Nie myl szablonu wyceny z szablonem etapów w Ustawieniach — pierwszy to cała oferta, drugi to lista etapów harmonogramu dla nowych wycen.',
        },
      ],
    },
    {
      id: 'files',
      icon: 'files',
      title: 'Pliki i dokumenty klienta',
      lead: 'Każdy klient i projekt ma zakładki Pliki (Twoje wgrane) i Dokumenty (PDF-y wygenerowane przez Toolier).',
      blocks: [
        {
          kind: 'list',
          items: [
            'Pliki: przeciągnij na zakładkę albo „Dodaj pliki”. Lista: typ, nazwa (zmiana nazwy w miejscu), rozmiar, data, kto wgrał. Akcje: Pobierz, Podgląd (obrazy i PDF), Usuń — z potwierdzeniem nazwą.',
            'Limity: 25 MB na plik i 2 GB na workspace. Pasek zużycia jest w Ustawieniach → Pliki, ostrzeżenie od 90 %. Błąd „za duży” albo „brak miejsca” dostaniesz PRZED wysyłką.',
            'Dokumenty: chronologicznie, wiersz = typ (Wycena / Termin / Etapy / Cennik / Pakiet) · numer · wersja · data · „Otwórz”.',
            'Usunięcie pliku jest natychmiastowe — kosza jeszcze nie ma.',
          ],
        },
      ],
    },
    {
      id: 'settings',
      icon: 'settings',
      title: 'Ustawienia',
      lead: 'Konfiguracja, do której wraca się rzadko: Branding i Ogólne.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Domyślne dla wycen: waluta, stawka VAT, ceny netto/brutto, sposób liczenia nowych wycen (kwotowo / godzinowo) i stawka za godzinę, wzorzec numeracji z podglądem następnego numeru (tokeny {YYYY}, {YY}, {MM}, {DD}, {seq}, {seq:6}), numer wersji na dokumencie, wyłączone pozycje w PDF.',
            'Wycena bierze te ustawienia jako kopię w chwili utworzenia — zmiana VAT nie rusza ofert, które już poszły.',
            'Biblioteka: „Usuń pozostałe przykładowe (N)”.',
            'Pliki: pasek zużycia limitu.',
            'Konto: Twoje zdjęcie (widać je w pasku nawigacji), zmiana hasła, „Eksportuj dane” (jeden JSON ze wszystkim: wyceny z treścią, biblioteka, zestawy, szablony, klienci, ustawienia, lista plików) i „Usuń konto” — bezpowrotnie, z potwierdzeniem słowem.',
          ],
        },
        {
          kind: 'p',
          text: 'BRANDING (Ustawienia → Branding) składa się z trzech rzeczy: znaku, kolorów i kroju pisma. Znak wgrywasz w dwóch wersjach — ciemnej (na jasny nagłówek) i jasnej (na ciemny). O tym, który stanie na pasie, decyduje ustawienie „Logo na nagłówku”: „Dobierz sam” patrzy na kolor marki, a „Zawsze znak jasny / ciemny” wyłącza tę regułę — przydaje się przy znakach z własnym białym tłem.',
        },
        {
          kind: 'list',
          items: [
            '„Kolor marki” to pas na górze każdej strony PDF — ten za logo i numerem oferty. Tym samym kolorem drukują się tytuły sekcji i linia nad podpisem. Kolor tekstu na pasie dobiera się sam pod kontrast.',
            '„Tło podsumowania kosztów” wypełnia ramkę z sumą na końcu oferty. Kwoty drukujemy na niej ciemnym atramentem, więc trzymaj się jasnego odcienia.',
            'Podgląd na dole strony to prawdziwy PDF złożony z bieżących ustawień — także tych jeszcze niezapisanych.',
          ],
        },
        {
          kind: 'tip',
          text: 'Typów pomieszczeń nie ma w Ustawieniach — edytujesz je w Bibliotece → Pomieszczenia, obok stawek, które od nich zależą.',
        },
      ],
    },
    {
      id: 'billing',
      icon: 'billing',
      title: 'Subskrypcja i konto',
      lead: '14 dni próbnych bez karty, potem 98,99 zł miesięcznie albo 999,99 zł rocznie.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Płatność przez Stripe: przycisk w Subskrypcji otwiera bezpieczny checkout w przeglądarce; po powrocie do aplikacji status odświeża się sam. Faktury i zmiana karty — w Portalu klienta (link w Subskrypcji).',
            'Kropka przy awatarze na dole paska: biała = dostęp aktywny, przygaszona = trial się kończy lub dostęp wygasł. Pasek nad awatarem pokazuje pozostałe dni.',
            'Po wygaśnięciu aplikacja przechodzi w tryb tylko do odczytu: wyceny da się oglądać i eksportować, dane pobrać — nie da się edytować. Nic nie znika.',
            'Sesja jest trzymana w systemowym pęku kluczy; wylogowanie — menu awatara na dole paska.',
          ],
        },
      ],
    },
    {
      id: 'keys',
      icon: 'keys',
      title: 'Skróty klawiszowe',
      lead: 'Kilka skrótów, które oszczędzają najwięcej klikania.',
      blocks: [
        {
          kind: 'keys',
          rows: [
            { keys: 'Ctrl / ⌘ + K', action: 'Paleta: szukaj klientów, projektów, wycen, usług; akcje „Nowy klient”, „Nowa wycena”, „Nowa usługa”' },
            { keys: 'Ctrl / ⌘ + Enter', action: 'W palecie: otwórz wycenę od razu w edycji' },
            { keys: 'Ctrl / ⌘ + S', action: 'W edytorze: zapisz teraz (autozapis i tak działa)' },
            { keys: 'Enter / Esc', action: 'W polu tekstowym wyceny: zatwierdź / cofnij' },
            { keys: 'Szukajka w panelu', action: 'W „Dodaj usługi”: filtruj bibliotekę po nazwie i grupie' },
            { keys: 'Przeciągnij za uchwyt ⋮⋮', action: 'Zmień kolejność pozycji, grup, sekcji, grup w bibliotece' },
          ],
        },
      ],
    },
    {
      id: 'faq',
      icon: 'faq',
      title: 'Najczęstsze pytania',
      lead: 'Odpowiedzi na to, o co pyta się najczęściej — zanim napiszesz.',
      blocks: [
        {
          kind: 'faq',
          items: [
            {
              q: 'Dodałem usługę „według pomieszczenia” i liczy 0 zł.',
              a: 'Wycena nie ma pomieszczeń albo są odznaczone w części, której usługa dotyczy (flagi W/T). Dodaj pomieszczenia w prawej kolumnie i sprawdź zasięg usługi na jej stronie w Bibliotece.',
            },
            {
              q: 'Zmieniłem cenę w Bibliotece, a wycena się nie zmieniła.',
              a: 'To celowe: pozycja w wycenie jest kopią. Otwórz wycenę, menu „⋯” → „Biblioteka”, popraw cenę tam — pojawi się pytanie o kaskadę do tej wyceny.',
            },
            {
              q: 'Klient chce inną wersję oferty, ale stara ma zostać.',
              a: '„Nowa wersja” w menu „⋯”. Stara dostaje status Archiwalna i zostaje w linii wersji projektu; nowa ma ten sam numer i dopisek v2.',
            },
            {
              q: 'W PDF nie ma numeru wersji.',
              a: 'Domyślnie jest ukryty — Ustawienia → „Numer wersji na dokumencie”. W nazwie pliku wersja jest zawsze.',
            },
            {
              q: 'Wyłączona pozycja nie pokazuje się w PDF.',
              a: 'Ustawienia → „Pokazuj wyłączone pozycje w PDF”. Wtedy trafiają jako opcje bez kwoty — dobre przy wariantach do wyboru.',
            },
            {
              q: 'Suma w wycenie godzinowej różni się o grosze od mojego arkusza.',
              a: 'Toolier zaokrągla każdą pozycję osobno, żeby kwoty wierszy dodawały się do pokazanej sumy — klient sumuje kolumnę. Arkusz nie zaokrągla wcale.',
            },
            {
              q: 'Nie mogę wgrać pliku.',
              a: 'Sprawdź komunikat: „za duży (max 25 MB)”, „typ niedozwolony” albo „brak miejsca: zajęte X z 2 GB”. Pasek zużycia jest w Ustawieniach → Pliki.',
            },
            {
              q: 'Gdzie są moje dane i jak je zabrać?',
              a: 'Ustawienia → Konto → „Eksportuj dane” zapisuje jeden plik JSON ze wszystkim. Działa także po wygaśnięciu subskrypcji.',
            },
            {
              q: 'Nie mogę ręcznie oznaczyć wyceny jako zaakceptowanej.',
              a: 'I nie da się — to celowe. Akceptację i odmowę zapisuje wyłącznie klient, pod linkiem („Udostępnij”). Dzięki temu data i przyjęty zakres są jego odpowiedzią, a nie naszym domysłem. Ręcznie ustawiasz tylko „Wysłana”.',
            },
            {
              q: 'Klient nie chce oferty. Jak to zapisać?',
              a: 'Klient klika „Nie skorzystam z tej oferty” pod linkiem i może dopisać powód. Wycena dostaje status Odrzucona, a powód pojawia się na osi „Na czym stoimy” w edytorze.',
            },
            {
              q: 'Podgląd brandingu nie działa na macOS.',
              a: 'To był błąd zabezpieczeń okna aplikacji (generator PDF potrzebuje WebAssembly). Naprawione — jeśli wersja jest starsza, zaktualizuj aplikację.',
            },
            {
              q: 'Po rozwinięciu paska nawigacji treść ucieka poza ekran.',
              a: 'Na oknach węższych niż 1280 px rozwinięty pasek nasuwa się teraz NA treść zamiast ją odsuwać. Chowa się kliknięciem obok albo po przejściu do innego ekranu.',
            },
          ],
        },
      ],
    },
  ] satisfies HelpSection[],
};
