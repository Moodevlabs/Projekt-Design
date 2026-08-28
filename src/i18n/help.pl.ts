/**
 * Podręcznik obsługi Toolier (T-73, rejestr przepisany w T-97).
 *
 * Struktura jest danymi, nie JSX-em: `HelpPage` rysuje ją z tokenów
 * aplikacji, a tekst da się poprawić bez dotykania komponentów. Każda
 * sekcja odpowiada jednemu obszarowi z nawigacji albo jednej zakładce
 * edytora — w tej samej kolejności, w jakiej użytkownik je spotyka.
 *
 * ## Rejestr (T-97)
 *
 * Dokumentacja zawodowa, nie poradnik dla znajomego: forma bezosobowa
 * („dokument powstaje", „wystarczy wskazać"), tryb rozkazujący wyłącznie
 * w opisach kroków, terminologia branżowa (inwestor, pracownia, opracowanie,
 * zakres prac). Bez zwrotów w drugiej osobie liczby pojedynczej i bez
 * poufałości — narzędzie kierowane jest do osób prowadzących pracownię.
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
    // Brief i wizja lokalna (poprawki 9 i 10).
    | 'brief'
    | 'visit'
    // Kalendarz terminów (T-98).
    | 'calendar'
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
  eyebrow: 'Podręcznik',
  heading: 'Obsługa aplikacji Toolier',
  intro:
    'Toolier jest środowiskiem pracy pracowni projektowania wnętrz: klienci → projekty → wyceny, termin, dokumenty i pliki. Poniżej opis wszystkich obszarów aplikacji — od pierwszego logowania po przekazanie inwestorowi kompletu dokumentów.',
  tocLabel: 'Spis treści',
  quickTitle: 'Najczęściej wyszukiwane',
  quick: [
    { label: 'Pierwsza wycena', target: 'start' },
    { label: 'Brief przed projektem', target: 'brief' },
    { label: 'Kalendarz terminów', target: 'calendar' },
    { label: 'Dobór usług do wyceny', target: 'quote' },
    { label: 'Link i decyzja inwestora', target: 'status' },
    { label: 'Skróty klawiszowe', target: 'keys' },
  ],
  tipLabel: 'Wskazówka',
  warnLabel: 'Uwaga',
  footer:
    'W razie pytań nieujętych w podręczniku prosimy o kontakt — adres znajduje się w stopce ekranu logowania. Treść odpowiada wersji 1.0 aplikacji.',

  sections: [
    {
      id: 'start',
      icon: 'start',
      title: 'Pierwsze kroki',
      lead: 'Konfiguracja początkowa obejmuje trzy elementy: znak graficzny pracowni, własne stawki w bibliotece oraz pierwszą wycenę. Pulpit prowadzi przez nie listą kontrolną.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Ustawienia → Branding: wgranie logo, ustalenie koloru marki i danych pracowni. Elementy te trafiają do każdego dokumentu PDF.',
            'Biblioteka → Usługi: nowe konto zawiera 38 usług przykładowych w 8 grupach, bez stawek. Po rozwinięciu wiersza należy wprowadzić własne ceny lub dodać usługi zdefiniowane samodzielnie.',
            'Klienci → „Nowy klient” → na karcie klienta „Nowy projekt” → w projekcie „Nowy dokument ▾” → „Nowa wycena”. Tym samym przyciskiem zakłada się termin, etapy współpracy albo cennik dodatkowy jako osobne dokumenty.',
            'W edytorze: „Dodaj usługi”, określenie zakresu, uzupełnienie listy pomieszczeń w prawej kolumnie, a następnie eksport do PDF.',
          ],
        },
        {
          kind: 'p',
          text: 'Nawigacja znajduje się po lewej stronie: Pulpit, Klienci, Kalendarz, Dokumenty, Biblioteka, Szablony — są to obszary pracy. Pod linią oddzielającą umieszczono Kosz, Pomoc i Ustawienia. Pasek rozwija się przyciskiem w dolnej części, co odsłania etykiety pozycji. W wąskim oknie rozwinięty pasek nasuwa się na treść i zamyka po kliknięciu poza nim lub po przejściu do innego ekranu.',
        },
        {
          kind: 'p',
          text: 'W dolnej części paska znajduje się zdjęcie profilowe (ustawiane w Ustawieniach → Konto) wraz ze wskaźnikiem połączenia: kolor zielony oznacza aktywne połączenie z siecią, czerwony — pracę w trybie offline, w którym zmiany oczekują w kolejce.',
        },
        {
          kind: 'tip',
          text: 'Skrót Ctrl/⌘ + K otwiera paletę wyszukiwania: po wpisaniu nazwy klienta, projektu, wyceny lub usługi i zatwierdzeniu klawiszem Enter następuje przejście do wskazanego rekordu. Ctrl/⌘ + Enter otwiera wycenę bezpośrednio w trybie edycji.',
        },
        {
          kind: 'p',
          text: 'Pulpit rozpoczyna się paskiem „Aktywność klientów”, obejmującym akceptacje, odrzucenia, uwagi i otwarcia linków, z oznaczeniem pozycji nieprzejrzanych. Przy braku nowych zdarzeń wyświetlany jest komunikat „Brak nowych zdarzeń”. Poniżej znajdują się projekty w toku oraz pięć ostatnich wycen. Lista kontrolna konfiguracji znika po wykonaniu wszystkich trzech kroków. Informacja o subskrypcji nie jest prezentowana na pulpicie — okres próbny zgłaszany jest raz dziennie przy uruchomieniu aplikacji, a po opłaceniu subskrypcja obsługiwana jest z poziomu Ustawień.',
        },
      ],
    },
    {
      id: 'clients',
      icon: 'clients',
      title: 'Klienci i projekty',
      lead: 'Klient stanowi kartotekę, projekt — konkretną inwestycję (mieszkanie, dom, lokal). Wycena zawsze przypisana jest do projektu.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Lista klientów prezentowana jest w formie kart zawierających zdjęcie, dane kontaktowe, miasto, liczbę wycen, wartość zaakceptowanych ofert oraz datę ostatniej aktywności. Nad listą znajdują się wyszukiwarka (nazwa, e-mail, telefon, miasto) oraz filtry Aktywni / Zarchiwizowani. Menu „⋯” na karcie udostępnia opcje: Nowy projekt, Nowa wycena, Archiwizuj.',
            'Zdjęcie klienta dodaje się w oknie edycji kartoteki. Przy jego braku karta prezentuje inicjały.',
            'Karta klienta zawiera nagłówek z danymi kontaktowymi i adresem oraz zakładki: Projekty · Brief · Dokumenty · Dokumentacja · Pliki · Notatki. Zakładka „Dokumenty” zawiera wyceny, terminy, etapy współpracy i cenniki klienta; „Dokumentacja” — pliki PDF przekazane inwestorowi.',
            'Projekt opisują: nazwa, adres, metraż, typ inwestycji oraz status zmieniany bezpośrednio w nagłówku. Zakładki: Dokumenty · Wizja lokalna · Etapy · Dokumentacja · Pliki · Notatki.',
            'Dokumenty w projekcie grupowane są według linii wersji: wiersz prezentuje wersję najnowszą, a jego rozwinięcie — wersje wcześniejsze. Przycisk „Nowy dokument ▾” zakłada wycenę, termin, etapy współpracy albo cennik dodatkowy.',
          ],
        },
        {
          kind: 'tip',
          title: 'Dane inwestora w wycenie stanowią kopię',
          text: 'Wycena zapisuje dane inwestora z chwili jej utworzenia. Korekta numeru telefonu w kartotece nie zmienia treści przekazanej oferty — w edytorze, w karcie „Klient”, dostępny jest przycisk „Odśwież dane”, który pozwala przenieść zmiany świadomie.',
        },
        {
          kind: 'p',
          text: 'Archiwizacja klienta ukrywa go na liście aktywnych, nie usuwając żadnych danych — wyceny, pliki i dokumenty pozostają nienaruszone. Klienta zarchiwizowanego nadal można wskazać w edytorze wyceny.',
        },
      ],
    },
    {
      id: 'brief',
      icon: 'brief',
      title: 'Brief klienta',
      lead: 'Kwestionariusz wypełniany przez inwestora przed rozpoczęciem prac projektowych. Pierwszy etap współpracy — dopiero na podstawie odpowiedzi możliwe jest określenie zakresu wyceny.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Karta klienta → zakładka „Brief” → „Wystaw brief”. Okno pozwala wskazać zestaw pytań oraz termin ważności linku (domyślnie 60 dni).',
            'Po wystawieniu adres kopiowany jest automatycznie do schowka. Opcja „Wyślij mailem” otwiera program pocztowy z przygotowaną treścią — korespondencja wychodzi z adresu pracowni, nie z domeny aplikacji.',
            'Inwestor otwiera link w przeglądarce, bez zakładania konta. Formularz opatrzony jest znakiem graficznym i kolorem pracowni z sekcji Branding.',
            'Odpowiedzi trafiają na kartę klienta. Wskaźnik postępu informuje o liczbie uzupełnionych pytań, a opcja „Odpowiedzi klienta” prezentuje je w układzie dokumentu.',
          ],
        },
        {
          kind: 'p',
          text: 'TREŚĆ FORMULARZA JEST EDYTOWALNA (Ustawienia → Brief). Zestaw wbudowany obejmuje pięć bloków: obiekt · użytkownicy wnętrza · zakres prac · estetyka · budżet i termin. Kolejność nie jest przypadkowa: odpowiedzi na pytania o fakty przychodzą inwestorowi najłatwiej, a pytania o budżet — najtrudniej.',
        },
        {
          kind: 'list',
          items: [
            'Szablonów może być kilka: osobny dla mieszkania, lokalu usługowego czy pojedynczego pomieszczenia. Jeden z nich oznaczany jest jako domyślny i podpowiadany przy wystawianiu briefu.',
            'W edytorze dodaje się i usuwa sekcje oraz pytania, zmienia ich kolejność, treść, podpowiedzi i rodzaj pola: krótka odpowiedź, odpowiedź opisowa, wybór jednej opcji, wybór wielu opcji, liczba.',
            'Pytań wymaganych powinno być jak najmniej. Brief bywa uzupełniany etapami, a formularz uniemożliwiający zapisanie części odpowiedzi pozostaje niewypełniony w całości.',
            'Opcja „Przywróć zestaw wbudowany” zastępuje treść szablonu zestawem fabrycznym. Zmiana wymaga zapisania.',
            'Zapis jest możliwy dopiero po usunięciu usterek uniemożliwiających wypełnienie formularza — pytania bez treści albo pytania wyboru z jedną opcją.',
            'Briefów wystawionych jednemu klientowi może być kilka: kolejna inwestycja oznacza inny zestaw odpowiedzi.',
          ],
        },
        {
          kind: 'tip',
          title: 'Zestaw pytań zapisywany jest w chwili wystawienia',
          text: 'Brief przechowuje własną kopię pytań z momentu utworzenia linku. Dzięki temu dokument sprzed pół roku prezentuje pytania, na które inwestor rzeczywiście odpowiadał, a późniejsza edycja szablonu nie zmienia briefów już przekazanych.',
        },
        {
          kind: 'warn',
          title: 'Odwołanie linku nie usuwa odpowiedzi',
          text: 'Opcja „Odwołaj link” zamyka dostęp inwestorowi ze skutkiem natychmiastowym, jednak odpowiedzi już przesłane pozostają zachowane. Usunięcie briefu kasuje również odpowiedzi i operacji tej nie można cofnąć.',
        },
      ],
    },
    {
      id: 'visit',
      icon: 'visit',
      title: 'Wizja lokalna',
      lead: 'Dokumentacja stanu zastanego: obmiar, instalacje, zdjęcia i ustalenia. Jedyny zapis stanu wnętrza sprzed rozpoczęcia jakichkolwiek prac.',
      blocks: [
        {
          kind: 'p',
          text: 'Teczka projektu → zakładka „Wizja lokalna” → „Nowa wizja”. Wizji może być kilka: pierwsza przed rozpoczęciem projektu, kolejna po pracach wyburzeniowych, następna przed montażem. Każda dokumentuje inny stan tego samego wnętrza.',
        },
        {
          kind: 'list',
          items: [
            'Data wizyty oraz osoby obecne (projektant, inwestor, kierownik budowy) prezentowane są w nagłówku karty wraz z podsumowaniem.',
            'Obmiar: nazwa pomieszczenia i trzy wymiary podawane w centymetrach. Powierzchnia wyliczana jest automatycznie i nie podlega edycji, aby nie rozmijała się z wymiarami. Pomieszczenie bez kompletu wymiarów nie jest wliczane do sumy.',
            'Lista kontrolna obejmuje czternaście pozycji, od stanu ścian po wymogi wspólnoty. Każda przyjmuje jeden ze stanów: Jest, OK · Do wymiany · Brak · Nie ustalono. Pozycje można dodawać i usuwać.',
            'Zdjęcia zapisywane są równocześnie w plikach projektu; w tym miejscu pozostają powiązane z konkretną wizytą.',
            'Notatka z wizji obejmuje obserwacje, ustalenia i ryzyka, w tym kwestie wymagające decyzji inwestora.',
          ],
        },
        {
          kind: 'tip',
          title: '„Nie ustalono” jest prawidłową odpowiedzią',
          text: 'Oznacza, że danego elementu nie dało się sprawdzić podczas wizyty — z uwagi na zakryte piony, brak dokumentacji czy nieobecność wykonawcy. Nagłówek karty zlicza takie pozycje, wskazując zagadnienia wymagające powrotu.',
        },
        {
          kind: 'warn',
          title: 'Zapis wymaga potwierdzenia',
          text: 'Obmiar wprowadzany jest seriami wartości liczbowych, dlatego karta nie zapisuje się automatycznie. Pasek „Zapisz” pojawia się po wprowadzeniu zmian — dopóki pozostaje widoczny, dane nie zostały jeszcze zapisane.',
        },
      ],
    },
    {
      id: 'calendar',
      icon: 'calendar',
      title: 'Kalendarz terminów',
      lead: 'Zestawienie wszystkich dat prowadzonych inwestycji w jednym widoku miesięcznym, wraz z notatkami dziennymi.',
      blocks: [
        {
          kind: 'p',
          text: 'Terminy istnieją w aplikacji od dawna, jednak każdy w swoim miejscu: data rozpoczęcia w teczce projektu, wizja lokalna w projekcie, ważność na wycenie, termin oddania w harmonogramie. Kalendarz zestawia je w jednym widoku i nie wprowadza dla nich osobnego bytu — prezentuje stan aplikacji.',
        },
        {
          kind: 'list',
          items: [
            'Kalendarz gromadzi cztery rodzaje terminów: rozpoczęcie projektu, wizję lokalną, upływ ważności oferty oraz termin wynikający z harmonogramu wyceny. Piąty rodzaj wpisu — notatka dzienna — powstaje bezpośrednio w kalendarzu.',
            'Kratka dnia niesie po jednym oznaczeniu na rodzaj zdarzenia, a nie na pojedynczy wpis. Trzy terminy tego samego rodzaju nie niosą większej informacji niż jeden, a zajmują trzykrotnie więcej miejsca w siatce.',
            'Wybór dnia otwiera jego szczegóły w panelu pod kalendarzem, z pełną treścią wpisów i odnośnikami do właściwych ekranów. Panel nie zasłania siatki, dzięki czemu kolejne dni można przeglądać bez zamykania okna.',
            'Notatka dzienna przyjmuje treść oraz opcjonalną godzinę. Wpisy można edytować, oznaczać jako wykonane oraz usuwać.',
            'Termin z harmonogramu prezentowany jest w wariancie najpóźniejszym, czyli uwzględniającym pełny czas po stronie inwestora. Jest to data, której pracownia dotrzymuje wobec inwestora.',
          ],
        },
        {
          kind: 'tip',
          text: 'Wybór dnia należącego do sąsiedniego miesiąca, widocznego w dopełnieniu siatki, przestawia widok na ten miesiąc — dzięki temu zaznaczony dzień pozostaje w polu widzenia.',
        },
        {
          kind: 'warn',
          title: 'Kalendarz nie jest terminarzem spotkań',
          text: 'Nie obsługuje zaproszeń, uczestników, zdarzeń cyklicznych ani powiadomień, nie zawiera także wykresu Gantta. Prezentuje terminy wynikające z dokumentów prowadzonych w aplikacji oraz notatki własne.',
        },
      ],
    },
    {
      id: 'registry',
      icon: 'documents',
      title: 'Dokumenty — rejestr i rodzaje',
      lead: 'Pozycja „Dokumenty” w nawigacji (do wersji 1.2 „Wyceny”) prowadzi do rejestru wszystkich dokumentów pracowni. Dokument ma jeden z czterech rodzajów: Wycena, Termin, Etapy współpracy, Cennik dodatkowy.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Rejestr ma cztery zakładki — po jednej na rodzaj — a w ich obrębie filtry statusu, klienta i miasta, wyszukiwarkę i sortowanie. Kolumna „Suma” występuje wyłącznie w zakładce Wyceny: termin, etapy i cennik nie mają czego sumować.',
            'Przycisk „Nowa wycena” / „Nowy termin” / „Nowe etapy współpracy” / „Nowy cennik dodatkowy” zależy od aktywnej zakładki. Ten sam wybór dostępny jest na karcie klienta i w teczce projektu pod „Nowy dokument ▾” — dokument założony tam otrzymuje dane inwestora i przypisanie do teczki.',
            'Numer nadawany jest przy utworzeniu według wzorca rodzaju: WYC/ dla wyceny (wzorzec z Ustawień), TER/ dla terminu, ETP/ dla etapów, CEN/ dla cennika. Licznik jest wspólny, więc numery czterech rejestrów nigdy się nie powtarzają.',
            'Rodzaj dokumentu ustala się przy utworzeniu i nie podlega zmianie — decyduje o tym, co pokazuje edytor i który dokument PDF powstaje.',
            'Dokument samodzielny (inny niż wycena) otwiera się od razu na swojej treści: bez zakładek wyceny, bez pozycji i sum. W prawej kolumnie znajduje się karta klienta oraz archiwum, a w terminie także lista pomieszczeń. Tytuł widoczny w rejestrze edytuje się w górnym pasku, obok numeru.',
            'Dla dokumentów samodzielnych nie ma polecenia „Udostępnij”, „Nowa wersja” ani zapisu jako szablon — strona przekazywana inwestorowi obsługuje wyłącznie wycenę. Menu eksportu zawiera tylko dokument PDF danego rodzaju.',
            'Wycena nadal może zawierać pozostałe dokumenty jako zakładki (Wycena · Termin · Etapy współpracy · Cennik dodatkowy) i eksportować je pakietem. Zakładka otwarta po raz pierwszy w trybie edycji wypełnia się szablonem z Ustawień; dokument samodzielny startuje pusty i buduje się z biblioteki.',
            'Na karcie klienta i w projekcie zakładka „Dokumenty” obejmuje wszystkie rodzaje (kolumna „Rodzaj”), natomiast „Dokumentacja” to archiwum plików PDF przekazanych inwestorowi.',
          ],
        },
        {
          kind: 'tip',
          title: 'Dokumenty a Dokumentacja',
          text: '„Dokumenty” to rzeczy, nad którymi się pracuje (wycena, termin, etapy, cennik). „Dokumentacja” to to, co już poszło do inwestora — zapisany plik PDF w wersji, którą otrzymał. Archiwum nie generuje pliku ponownie.',
        },
      ],
    },
    {
      id: 'quote',
      icon: 'quote',
      title: 'Wycena — edytor',
      lead: 'Dokument prezentowany jest po lewej stronie w układzie odpowiadającym docelowemu PDF. Po prawej: sposób naliczania, dane klienta, dokumenty, pomieszczenia i podsumowanie.',
      blocks: [
        {
          kind: 'p',
          text: 'Polecenie „Nowa wycena” wymaga wskazania klienta i projektu (dane inwestora uzupełniane są automatycznie) oraz punktu wyjścia: pustej wyceny albo szablonu. Szablon zawiera układ dokumentu, termin i dokumenty towarzyszące.',
        },
        {
          kind: 'steps',
          items: [
            'Nagłówek obejmuje tytuł, podtytuł, datę, okres ważności, tekst wprowadzenia i opis projektu. Pola edytuje się bezpośrednio w dokumencie; w trybie edycji oznaczone są przerywaną ramką, w podglądzie pozostają niewidoczne.',
            'Sekcja odpowiada etapowi prac (przykładowo „Koncepcja”, „Projekt techniczny”). Grupa stanowi podzbiór sekcji, najczęściej pomieszczenie. Pozycja to pojedyncza usługa z ceną.',
            'Opcja „Dodaj usługi” otwiera panel z tabelą biblioteki: usługa · grupa · sposób wyceny · stawka. Przycisk „Dodaj” umieszcza usługę w dokumencie, a panel pozostaje otwarty; miejsce docelowe („Dodaj do: sekcja › grupa”) wybiera się w górnej części panelu. Przycisk „Gotowe” zamyka panel. Jest to jedyna droga doboru usług z biblioteki.',
            'Opcja „Pozycja ręcznie” dodaje pusty wiersz przeznaczony na pozycje spoza biblioteki.',
            'Przełącznik TAK/NIE przy pozycji: pozycja wyłączona pozostaje w dokumencie jako opcja bez kwoty (o ile ustawienie to jest włączone), lecz nie wchodzi do sumy. Przełącznik przy grupie obejmuje wszystkie jej pozycje.',
            'Ilość i jednostka („× 80 m²”, „× 3 kadry”) pochodzą z biblioteki i podlegają edycji w wierszu. Ceny wprowadza się jak w arkuszu kalkulacyjnym: „1 200”, „1200,50”.',
          ],
        },
        {
          kind: 'p',
          text: 'Pomieszczenia (prawa kolumna) opisują: nazwa, ilość, typ ze słownika oraz dwie flagi — W (część wizualna, czyli projekt aranżacji) i T (część techniczna, czyli rysunki wykonawcze). Usługi rozliczane według pomieszczeń pobierają z tej listy swoje składniki: stawka z biblioteki mnożona jest przez pomieszczenia objęte zakresem usługi. Pod listą prezentowane jest zdanie „Do części wizualnej liczy się N, do technicznej M” — są to dokładnie te wartości, którymi posługuje się cennik. Wiersz takiej pozycji zawiera pod kwotą adnotację „od X · N pom.”, wskazującą źródło wyliczenia.',
        },
        {
          kind: 'warn',
          title:
            'Usługa rozliczana za pomieszczenie przy braku pomieszczeń nalicza wyłącznie stawkę bazową',
          text: 'Wynik wynosi wówczas najczęściej 0 zł. Panel „Dodaj usługi” sygnalizuje tę sytuację nad listą i udostępnia przycisk „Dodaj pomieszczenie”. Zalecane jest uzupełnienie listy pomieszczeń przed doborem usług; przy uzupełnieniu późniejszym kwoty przeliczane są automatycznie.',
        },
        {
          kind: 'list',
          items: [
            '„Wycena indywidualna” oznacza pozycję bez ceny. Pozostaje ona w ofercie, lecz nie wchodzi do sumy; podsumowanie zawiera adnotację „+ N pozycji wycenianych indywidualnie”.',
            'Rabaty umieszczane są na końcu dokumentu: kwotowe albo procentowe, obejmujące całą wycenę, sekcję lub wybrane pozycje, z opcjonalnym warunkiem wyboru wszystkich pozycji z zakresu oraz zaokrągleniem.',
            'Sposób naliczania (karta w górnej części prawej kolumny): kwotowo albo godzinowo. W trybie godzinowym w wierszu wprowadza się minuty, a kwota wynika ze stawki przypisanej do wyceny. Przełączenie trybu wymaga decyzji o przeliczeniu wartości.',
            'Warianty: usługa posiadająca warianty w bibliotece (przykładowo „Wizualizacja” / „Panorama 360”) prezentuje w wierszu listę rozwijaną zamiast samej nazwy.',
            'Ikona zakładki przy wierszu zapisuje pozycję w bibliotece, a przy grupie — cały zestaw.',
            'Kolejność zmienia się przeciągnięciem za uchwyt (pozycje, grupy, sekcje), również pomiędzy sekcjami.',
          ],
        },
        {
          kind: 'p',
          text: 'Przełącznik Podgląd / Edycja w górnym pasku prezentuje ten sam dokument bez elementów sterujących. Zapis automatyczny działa nieprzerwanie — obok numeru wyświetlany jest stan: „Zapisano 12:04”, „Zapisywanie…” albo „Błąd zapisu — ponów”. Skrót Ctrl/⌘ + S wymusza zapis natychmiastowy.',
        },
        {
          kind: 'tip',
          title: 'Biblioteka dostępna z poziomu edytora',
          text: 'Menu „⋯” → „Biblioteka” otwiera ją w panelu bocznym. Zmiana ceny lub nazwy usługi powoduje wówczas pytanie o zastosowanie zmian w otwartej wycenie. Jest to jedyna droga przeniesienia korekty z biblioteki do już przygotowanej oferty; wyceny zapisane wcześniej nie zmieniają się samoczynnie.',
        },
      ],
    },
    {
      id: 'status',
      icon: 'status',
      title: 'Statusy, wersje i rejestr',
      lead: 'Wycena posiada status i numer wersji. Oferta przekazana inwestorowi pozostaje niezmieniona — korekty wprowadza się w nowej wersji.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Statusy: Szkic → Wysłana → Zaakceptowana / Odrzucona / Wygasła. Status „Archiwalna” oznacza wersję zastąpioną przez nowszą i nie jest tożsamy z koszem.',
            'Eksport PDF kończy się pytaniem o oznaczenie wyceny jako wysłanej. Status „Wysłana” jest jedynym ustawianym ręcznie, ponieważ przekazanie oferty stanowi czynność po stronie pracowni.',
            'Statusy „Zaakceptowana” i „Odrzucona” rejestrowane są wyłącznie przez inwestora, pod przekazanym linkiem. Dzięki temu data i przyjęty zakres stanowią jego oświadczenie, a nie zapis wprowadzony po stronie pracowni.',
            'Polecenie „Nowa wersja” (menu „⋯” w edytorze albo w rejestrze) tworzy wersję v2 o tej samej treści i numerze; wersja v1 pozostaje w linii wersji. Numer wersji w dokumencie jest domyślnie ukryty (Ustawienia), natomiast w nazwie pliku występuje zawsze.',
            'Polecenie „Duplikuj” tworzy niezależną wycenę z nowym numerem, a „Przenieś do projektu” zmienia przypisanie do teczki.',
            'Rejestr (Dokumenty) dzieli się na zakładki Wyceny · Terminy · Etapy współpracy · Cenniki dodatkowe i udostępnia filtry statusów (wersje archiwalne domyślnie ukryte), filtr klienta i miasta, wyszukiwarkę oraz sortowanie. Kolumna notatek zawiera notatki wewnętrzne, które nie trafiają do dokumentów PDF ani do szablonów.',
            'Polecenie „Eksportuj rejestr” zapisuje bieżący widok po filtrach w formacie otwieranym w arkuszu kalkulacyjnym bez konieczności konwersji kodowania.',
          ],
        },
        {
          kind: 'p',
          text: 'LINK DLA INWESTORA. Menu „⋯” w edytorze → „Udostępnij”. Powstaje adres otwierany w przeglądarce bez zakładania konta. Link zawiera komplet dokumentów: wycenę z przełącznikami TAK/NIE, termin oraz dokumenty towarzyszące — inwestor zapoznaje się dokładnie z tym, co akceptuje.',
        },
        {
          kind: 'steps',
          items: [
            'Inwestor wybiera pozycje i obserwuje zmianę kwoty podsumowania.',
            'Dostępne są trzy decyzje: akceptacja oferty, przekazanie uwag albo rezygnacja z oferty wraz z opcjonalnym uzasadnieniem.',
            'Odpowiedź trafia do wyceny jako oś „Stan procesu ofertowego”: przekazanie → otwarcie → uwagi → decyzja. Kroki, które jeszcze nie nastąpiły, pozostają na liście w formie wygaszonej, co pozwala określić, na co oczekuje pracownia.',
            'Pod osią prezentowana jest lista pozycji odznaczonych przez inwestora — wymienionych nazwami, nie liczbą. Stanowi ona punkt wyjścia do rozmowy z inwestorem.',
          ],
        },
        {
          kind: 'warn',
          title: 'Odmowa zamyka postępowanie ofertowe',
          text: 'Po odrzuceniu tej samej wyceny nie można już zaakceptować — konieczne jest przygotowanie nowej wersji. Informacja ta prezentowana jest inwestorowi przed potwierdzeniem decyzji, wraz ze wskazaniem, że w przypadku oczekiwanych korekt właściwą ścieżką jest przekazanie uwag.',
        },
      ],
    },
    {
      id: 'schedule',
      icon: 'schedule',
      title: 'Termin realizacji',
      lead: 'Termin — jako zakładka wyceny albo samodzielny dokument — wyznacza datę zakończenia prac na podstawie etapów, listy pomieszczeń oraz kalendarza dni roboczych uwzględniającego polskie dni ustawowo wolne.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Blok „Założenia” obejmuje datę rozpoczęcia prac, liczbę dni roboczych w tygodniu po stronie pracowni i inwestora oraz sposób traktowania dni ustawowo wolnych. Na podstawie tych czterech wartości wyznaczane są daty w podsumowaniu.',
            'Etapy dodaje się poleceniem „Dodaj z biblioteki” (Biblioteka → Termin) albo „Etap ręcznie”. Każdy etap ma dni bazowe („cały projekt”), a etap zależny od pomieszczeń — dodatkowo dni doliczane za każde pomieszczenie.',
            'Dni etapu = dni bazowe + Σ (stawka typu pomieszczenia × ilość) dla pomieszczeń objętych zakresem etapu. Zakres „Wizualne” liczy pomieszczenia z zaznaczoną częścią wizualną, „Techniczne” — z częścią techniczną, „Wszystkie” — każde; „Nie zależy od pomieszczeń” liczy same dni bazowe. Pomieszczenie bez typu oraz typ bez własnej stawki biorą stawkę domyślną etapu; puste pole w macierzy oznacza „domyślna”, a zero — „ten typ nie dokłada dni”. Pozycja „salon ×2” liczy się dwukrotnie — tak samo jak w cenniku parametrycznym.',
            'Lista pomieszczeń jest wspólna z wyceną (pomieszczenia leżą w dokumencie, nie w projekcie). Zmiana w panelu „Pomieszczenia” od razu zmienia wynik terminu; termin samodzielny ma własny panel pomieszczeń w prawej kolumnie, a nowy termin w projekcie proponuje skopiowanie pomieszczeń z ostatniego dokumentu, który je miał.',
            'Włączona pozycja wyceny opatrzona etykietą (przykładowo „wizualizacje”) włącza odpowiadający jej etap. Mechanizm wyłącznie włącza etapy, nigdy ich nie wyłącza, a komunikat umożliwia cofnięcie zmiany.',
            'Kolumna „Kto” określa stronę wykorzystującą czas: ARCH. oznacza pracę pracowni, INW. — czas po stronie inwestora (decyzje, akceptacje, dobór materiałów). Rozdzielenie tych wartości jest istotne, ponieważ to czas inwestora najczęściej wydłuża termin realizacji.',
            'W liście etapów każdy wiersz pokazuje własną liczbę dni już po uwzględnieniu pomieszczeń, a karta wyniku — sumy po stronie pracowni i inwestora. Bez pomieszczeń etapy zależne od nich liczą wyłącznie dni bazowe, o czym informuje komunikat pod listą.',
            'Wynik obejmuje termin optymalny (zakładający niezwłoczne decyzje inwestora) oraz najpóźniejszy (uwzględniający jego dni w pełnym wymiarze). Rzeczywisty termin mieści się pomiędzy tymi wartościami, stąd widełki zamiast jednej daty. Bez podanej daty rozpoczęcia prezentowana jest wyłącznie liczba dni wraz z przelicznikiem orientacyjnym.',
          ],
        },
        {
          kind: 'p',
          text: 'Usługi ujęte w „Cenniku usług dodatkowych” mogą powiększać termin o określoną liczbę dni („Panorama 360, +3 dni”); prezentowane są wówczas w zakładce Termin jako odrębna lista. Polecenie „Eksportuj termin (PDF)” tworzy dokument „Szacowany termin realizacji” zawierający tabelę pomieszczenia × etapy, o skróconym okresie ważności wynoszącym 7 dni.',
        },
        {
          kind: 'tip',
          text: 'Pasek etapów prezentuje proporcje czasu, a nie kalendarz. Zależności między etapami nie są modelowane, dlatego oś czasu sugerowałaby precyzję, której to narzędzie nie zapewnia.',
        },
      ],
    },
    {
      id: 'documents',
      icon: 'documents',
      title: 'Dokumenty dla inwestora',
      lead: 'Wycena, termin, etapy współpracy i cennik dodatkowy to cztery rodzaje dokumentu. Wycena może nieść pozostałe jako zakładki (pakiet), a każdy z nich może też istnieć samodzielnie — z własnym numerem (WYC/, TER/, ETP/, CEN/), klientem i archiwum.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Dokument samodzielny (np. „Nowy termin” z rejestru albo z teczki projektu) otwiera się od razu na swojej treści, bez zakładek wyceny, i startuje pusty — pozycje dodaje się poleceniem „Dodaj z biblioteki” (panel z wyszukiwarką i „Dodaj wszystkie”) albo ręcznie. Ikona zakładki przy wierszu zapisuje go do biblioteki.',
            'Etapy współpracy: 19 etapów w 5 częściach. Wskazuje się etapy objęte zakresem; etapy pozostające poza zakresem zachowywane są w dokumencie z odpowiednim oznaczeniem, aby zakres wyłączony z oferty był dla inwestora jednoznaczny. Domyślny okres ważności wynosi 14 dni i podlega zmianie.',
            'Cennik usług dodatkowych obejmuje nazwę, opis, cenę podaną jako przedział („300–1200 zł”) lub kwotę, jednostkę (zł/h, szt., ryczałt), termin realizacji oraz liczbę dni doliczanych do harmonogramu. Dokument nie zawiera sumy — suma widełek nie niosłaby informacji.',
            'Polecenie „Dodaj do wyceny” przy pozycji cennika udostępnia dwa zakresy zmiany: koszt (pozycja z dolną granicą przedziału trafia do ostatniej sekcji) oraz termin (dni doliczane są do harmonogramu).',
            'Menu „⋯” → „Eksportuj pakiet dokumentów…” pozwala wskazać dokumenty wchodzące w skład pakietu (wyłącznie te, które wycena zawiera) oraz wybrać jeden plik z ciągłą numeracją stron albo osobne pliki zapisywane do wskazanego folderu. Nazwy plików: `{numer}-wycena.pdf`, `-termin`, `-etapy`, `-cennik`.',
          ],
        },
      ],
    },
    {
      id: 'pdf',
      icon: 'pdf',
      title: 'PDF, branding i archiwum',
      lead: 'Każdy dokument PDF generowany jest lokalnie, z identyfikacją wizualną pracowni, i może zostać zapisany w archiwum klienta.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Ustawienia → Branding: logo, kolor marki, dane pracowni, osoba kontaktowa, stopka. Podgląd oferty generuje się przyciskiem — „Otwórz podgląd” otwiera go w systemowej przeglądarce PDF, „Zapisz podgląd” zapisuje plik we wskazanym miejscu.',
            'Dokument wyceny zawiera nagłówek ze znakiem graficznym, dane inwestora, sekcje i pozycje wraz z ilością i jednostką, pozycje wyłączone prezentowane jako opcje (o ile ustawienie to jest włączone), rabaty, podsumowanie netto/VAT/brutto oraz adnotację o pozycjach wycenianych indywidualnie.',
            'Po zakończonym eksporcie plik zapisywany jest w Dokumentacji klienta i projektu (zakładka „Dokumentacja”). Archiwum udostępnia zapisany plik, a nie generuje go ponownie. Karta w edytorze prezentuje trzy ostatnie pozycje.',
            'Opisy pozycji obsługują pola automatyczne: {rooms} wstawia listę pomieszczeń („kuchnia, salon ×2”), a {frames|kadr|kadry|kadrów} liczbę kadrów z poprawną odmianą. Pole nierozpoznane pozostaje w treści dosłownie, aby błąd zapisu był widoczny. Listę pól udostępnia przycisk „{ }”.',
          ],
        },
      ],
    },
    {
      id: 'library',
      icon: 'library',
      title: 'Biblioteka',
      lead: 'Cennik pracowni. Zakładki: Usługi · Grupy · Zestawy · Pomieszczenia · Stawki · Termin · Etapy współpracy · Cennik dodatkowy. Ustawienia wprowadzone w tym miejscu obowiązują w nowych dokumentach.',
      blocks: [
        {
          kind: 'p',
          text: 'Usługi prezentowane są jako lista zwiniętych wierszy zawierających nazwę, grupę, sposób wyceny, stawkę oraz przełącznik „Aktywna”. Wiersz rozwija się kliknięciem w treść albo w strzałkę po prawej stronie. Poniżej otwiera się formularz (nazwa, opis, grupa, cena, wariant, reguła cenowa), a ikona ołówka prowadzi do pełnej strony usługi z numerowanymi krokami i podglądem prezentacji w ofercie. Filtry grup nad listą zawężają widok, a wyszukiwarka obejmuje nazwę i opis.',
        },
        {
          kind: 'list',
          items: [
            'Osiem sposobów wyceny (pełna strona usługi, krok 4): Kwota stała · Za m² · Według pomieszczenia · Za kadr · Za godzinę · Za wizytę · Za element · Indywidualnie.',
            'Sposób „Według pomieszczenia” obejmuje stawkę bazową powiększoną o stawkę przypisaną do typu pomieszczenia (krok 5: tabela pomieszczenie × stawka netto) oraz zakres: wszystkie pomieszczenia, wyłącznie część wizualna albo wyłącznie techniczna. Sposób „Za kadr” uwzględnia liczbę kadrów wprowadzoną w wycenie.',
            'Cena „od” prezentowana jest na listach oraz w panelu „Dodaj usługi” i nie wpływa na obliczenia. Przy braku wartości wprowadzonej ręcznie lista prezentuje najniższą stawkę wynikającą z reguły.',
            'Usługa nieaktywna nie jest dostępna w edytorze, lecz pozostaje w wycenach, które już ją zawierają.',
            'Grupy opisują: kod („01”), nazwa, kolor z palety oraz kolejność ustalana przeciągnięciem. Kolejność grup odpowiada kolejności w panelu „Dodaj usługi”. Usunięcie grupy przenosi przypisane do niej usługi do kategorii „Bez grupy”.',
            'Zestawy stanowią komplet pozycji wstawiany do wyceny jako grupa (przykładowo „Kuchnia — pakiet”). Tworzone są ikoną zakładki przy grupie w edytorze albo w zakładce Zestawy.',
            'Pomieszczenia obejmują słownik typów (kuchnia, salon, łazienka i pozostałe), na podstawie którego cennik dobiera stawkę. Zmiana nazwy nie modyfikuje klucza technicznego, więc nie wpływa na ceny w zapisanych wycenach. Słownik edytuje się wyłącznie w tym miejscu.',
            'Stawki prezentują pełną macierz usługa × typ pomieszczenia na jednym ekranie, wraz z importem z pliku CSV.',
            'Sekcje Termin, Etapy współpracy i Cennik dodatkowy to biblioteki pozostałych rodzajów dokumentu: przy pierwszym otwarciu wypełniają się wbudowanym szablonem (oznaczonym jako przykładowy), a wpisy edytuje się w miejscu (ikona ołówka) i porządkuje strzałkami. Wpis terminu przechowuje stronę (ARCH./INW.), dni bazowe, zakres pomieszczeń, stawkę domyślną oraz dni według typu pomieszczenia; wpis etapów — opis, nagłówek grupy i domyślne objęcie zakresem; wpis cennika — przedział cen, jednostkę, termin realizacji i dni doliczane do terminu. Z tych list korzysta panel „Dodaj z biblioteki”; ikona zakładki przy wierszu dokumentu działa w drugą stronę.',
          ],
        },
        {
          kind: 'tip',
          title: 'Biblioteka przykładowa',
          text: 'Nowe konto otrzymuje 38 usług w 8 grupach, oznaczonych jako przykładowe i pozbawionych stawek. Edycja dowolnego pola usuwa to oznaczenie i włącza pozycję do biblioteki pracowni. Opcja Ustawienia → Biblioteka → „Usuń pozostałe przykładowe” kasuje pozycje niepoddane edycji.',
        },
        {
          kind: 'warn',
          title: 'Zmiana w bibliotece nie modyfikuje wcześniejszych wycen',
          text: 'Pozycja w wycenie stanowi kopię. Nowe wyceny korzystają z aktualnych stawek; otwartą wycenę aktualizuje się wyłącznie z panelu biblioteki w edytorze, po potwierdzeniu przeniesienia zmian.',
        },
      ],
    },
    {
      id: 'templates',
      icon: 'templates',
      title: 'Szablony',
      lead: 'Szablon stanowi gotowy układ wyceny — „Projekt kompleksowy”, „Konsultacja” — wraz z terminem i dokumentami towarzyszącymi.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Zapis: w edytorze menu „⋯” → „Zapisz jako szablon…”. Okno pozwala wskazać zakres: układ wyceny, termin, dokumenty. Opcja „Nadpisz szablon…” aktualizuje szablon istniejący.',
            'Użycie: „Nowa wycena” → wybór szablonu jako punktu wyjścia, albo w sekcji Szablony polecenie „Nowa wycena z szablonu”. Dane klienta nie są kopiowane — uzupełnia je projekt.',
            'Karta szablonu prezentuje liczbę pozycji, sumę oraz oznaczenia zawartości (wycena · termin · dokumenty).',
          ],
        },
        {
          kind: 'tip',
          text: 'Szablonu wyceny nie należy mylić z szablonem etapów w Ustawieniach: pierwszy obejmuje całą ofertę, drugi wyłącznie listę etapów harmonogramu dla nowych wycen.',
        },
      ],
    },
    {
      id: 'files',
      icon: 'files',
      title: 'Pliki i dokumentacja klienta',
      lead: 'Każdy klient i projekt udostępnia zakładki Pliki (materiały wgrane przez pracownię) oraz Dokumentacja (pliki PDF wygenerowane w aplikacji i przekazane inwestorowi).',
      blocks: [
        {
          kind: 'list',
          items: [
            'Pliki dodaje się przeciągnięciem na zakładkę albo poleceniem „Dodaj pliki”. Lista obejmuje typ, nazwę (edytowaną w miejscu), rozmiar, datę oraz osobę wgrywającą. Dostępne operacje: Pobierz, Podgląd (obrazy i dokumenty PDF), Usuń — z potwierdzeniem.',
            'Limity: 25 MB na pojedynczy plik oraz 2 GB na workspace. Pasek zużycia dostępny jest w Ustawieniach → Pliki, a ostrzeżenie pojawia się po przekroczeniu 90 % limitu. Komunikat o przekroczeniu rozmiaru albo braku miejsca wyświetlany jest przed rozpoczęciem wysyłki.',
            'Dokumentacja prezentowana jest chronologicznie; wiersz obejmuje typ (Wycena / Termin / Etapy / Cennik / Pakiet), numer, wersję, datę oraz polecenie otwarcia.',
            'Usunięty plik trafia do Kosza, dostępnego jako osobna pozycja nawigacji, i przechowywany jest tam przez 30 dni. W tym czasie możliwe jest jego przywrócenie; zajmowane miejsce zwalniane jest dopiero po trwałym usunięciu.',
          ],
        },
      ],
    },
    {
      id: 'settings',
      icon: 'settings',
      title: 'Ustawienia',
      lead: 'Konfiguracja aplikacji w czterech kartach: Aplikacja, Branding, Brief i Konto.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Domyślne wartości wycen: waluta, stawka VAT, ceny netto lub brutto, sposób naliczania w nowych wycenach (kwotowo lub godzinowo) wraz ze stawką godzinową, wzorzec numeracji z podglądem kolejnego numeru (pola {YYYY}, {YY}, {MM}, {DD}, {seq}, {seq:6}), numer wersji w dokumencie oraz sposób prezentacji pozycji wyłączonych w PDF.',
            'Wycena zapisuje kopię tych ustawień w chwili utworzenia — zmiana stawki VAT nie wpływa na oferty już przekazane inwestorom.',
            'Biblioteka: „Usuń pozostałe przykładowe (N)”.',
            'Pliki: pasek zużycia limitu.',
            'Brief: edytor zestawów pytań kierowanych do inwestora, opisany w sekcji „Brief klienta”.',
            'Konto: zdjęcie profilowe (prezentowane w pasku nawigacji), zmiana hasła, „Eksportuj dane” (pojedynczy plik JSON obejmujący wyceny wraz z treścią, bibliotekę, zestawy, szablony, kartotekę klientów, ustawienia i wykaz plików) oraz „Usuń konto” — operacja nieodwracalna, wymagająca potwierdzenia słownego.',
          ],
        },
        {
          kind: 'p',
          text: 'BRANDING (Ustawienia → Branding) obejmuje trzy elementy: znak graficzny, kolorystykę i krój pisma. Znak wgrywa się w dwóch wersjach — ciemnej (przeznaczonej na jasny nagłówek) i jasnej (na ciemny). Który z nich trafi na pas nagłówka, wskazuje ustawienie „Znak na nagłówku dokumentu”. Wyboru dokonuje użytkownik: program nie wylicza go z koloru marki, ponieważ przy znakach z własnym tłem lub wielobarwnych taka reguła prowadziła do błędnych rozstrzygnięć. Rezultat można sprawdzić przyciskiem podglądu w dolnej części strony.',
        },
        {
          kind: 'list',
          items: [
            '„Kolor marki” określa pas w górnej części każdej strony dokumentu PDF, na którym umieszczane są logo i numer oferty. W tym samym kolorze drukowane są tytuły sekcji oraz linia nad podpisem, a także pas nagłówka na stronie oferty i briefu przekazywanych inwestorowi.',
            '„Tło podsumowania kosztów” wypełnia ramkę z sumą na końcu oferty. Kwoty drukowane są ciemnym kolorem, dlatego zalecany jest jasny odcień tła.',
            'Przycisk podglądu w dolnej części strony generuje rzeczywisty dokument PDF na podstawie bieżących ustawień, w tym niezapisanych, i otwiera go w systemowej przeglądarce PDF. Dokument powstaje na komputerze użytkownika.',
          ],
        },
        {
          kind: 'tip',
          text: 'Typów pomieszczeń nie edytuje się w Ustawieniach — słownik znajduje się w Bibliotece → Pomieszczenia, obok stawek, które od niego zależą.',
        },
      ],
    },
    {
      id: 'billing',
      icon: 'billing',
      title: 'Subskrypcja i konto',
      lead: '14 dni okresu próbnego bez podawania danych karty, następnie 98,99 zł miesięcznie albo 999,99 zł rocznie.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Płatności obsługiwane są przez operatora Stripe: przycisk w sekcji Subskrypcja otwiera zabezpieczoną stronę płatności w przeglądarce, a po powrocie do aplikacji status aktualizowany jest automatycznie. Faktury i zmiana danych karty dostępne są w Portalu klienta, do którego odnośnik znajduje się w sekcji Subskrypcja.',
            'Wskaźnik przy zdjęciu profilowym w dolnej części paska: kolor pełny oznacza aktywny dostęp, przygaszony — zbliżający się koniec okresu próbnego albo wygaśnięcie dostępu. Pasek nad zdjęciem prezentuje liczbę pozostałych dni.',
            'Po wygaśnięciu dostępu aplikacja przechodzi w tryb tylko do odczytu: wyceny pozostają dostępne do przeglądania i eksportu, a dane do pobrania; edycja nie jest możliwa. Żadne dane nie są usuwane.',
            'Sesja przechowywana jest w systemowym magazynie kluczy. Wylogowanie dostępne jest w menu zdjęcia profilowego w dolnej części paska.',
          ],
        },
      ],
    },
    {
      id: 'keys',
      icon: 'keys',
      title: 'Skróty klawiszowe',
      lead: 'Skróty ograniczające liczbę operacji wykonywanych myszą.',
      blocks: [
        {
          kind: 'keys',
          rows: [
            {
              keys: 'Ctrl / ⌘ + K',
              action:
                'Paleta wyszukiwania: klienci, projekty, wyceny, usługi oraz polecenia „Nowy klient”, „Nowa wycena”, „Nowa usługa”',
            },
            {
              keys: 'Ctrl / ⌘ + Enter',
              action: 'W palecie: otwarcie wyceny bezpośrednio w edycji',
            },
            {
              keys: 'Ctrl / ⌘ + S',
              action: 'W edytorze: zapis natychmiastowy (zapis automatyczny działa niezależnie)',
            },
            { keys: 'Enter / Esc', action: 'W polu tekstowym wyceny: zatwierdzenie / anulowanie' },
            {
              keys: 'Wyszukiwarka w panelu',
              action: 'W panelu „Dodaj usługi”: filtrowanie biblioteki po nazwie i grupie',
            },
            {
              keys: 'Przeciągnięcie za uchwyt ⋮⋮',
              action: 'Zmiana kolejności pozycji, grup i sekcji, także grup w bibliotece',
            },
          ],
        },
      ],
    },
    {
      id: 'faq',
      icon: 'faq',
      title: 'Najczęstsze pytania',
      lead: 'Odpowiedzi na zagadnienia zgłaszane najczęściej.',
      blocks: [
        {
          kind: 'faq',
          items: [
            {
              q: 'Gdzie jest pozycja „Wyceny”?',
              a: 'Od wersji 1.2 nazywa się „Dokumenty” i zawiera cztery zakładki: Wyceny, Terminy, Etapy współpracy, Cenniki dodatkowe. Zapisane adresy `/wyceny` przekierowują. Wycena jest jednym z rodzajów dokumentu; pozostałe można zakładać także samodzielnie.',
            },
            {
              q: 'Termin nie zmienia się po dodaniu pomieszczenia.',
              a: 'Dni za pomieszczenie liczą wyłącznie etapy z zakresem innym niż „Nie zależy od pomieszczeń” — i tylko dla pomieszczeń objętych tym zakresem (część wizualna / techniczna). Należy sprawdzić zakres etapu, zaznaczenia przy pomieszczeniu oraz stawkę: puste pole w macierzy oznacza stawkę domyślną etapu, która może wynosić 0.',
            },
            {
              q: 'Usługa rozliczana według pomieszczenia nalicza 0 zł.',
              a: 'Wycena nie zawiera pomieszczeń albo pomieszczenia nie są oznaczone w części, której usługa dotyczy (flagi W/T). Należy uzupełnić listę pomieszczeń w prawej kolumnie oraz zweryfikować zakres usługi na jej stronie w Bibliotece.',
            },
            {
              q: 'Zmiana ceny w Bibliotece nie została przeniesiona do wyceny.',
              a: 'Jest to działanie zamierzone: pozycja w wycenie stanowi kopię. Po otwarciu wyceny należy skorzystać z menu „⋯” → „Biblioteka” i wprowadzić korektę w tym panelu — pojawi się wówczas pytanie o przeniesienie zmian do bieżącej wyceny.',
            },
            {
              q: 'Inwestor oczekuje innego wariantu oferty, przy zachowaniu poprzedniego.',
              a: 'Należy użyć polecenia „Nowa wersja” w menu „⋯”. Poprzednia wersja otrzymuje status archiwalnej i pozostaje w linii wersji projektu; nowa zachowuje ten sam numer z oznaczeniem v2.',
            },
            {
              q: 'Dokument PDF nie zawiera numeru wersji.',
              a: 'Numer wersji jest domyślnie ukryty; opcję udostępnia sekcja Ustawienia → „Numer wersji na dokumencie”. W nazwie pliku wersja występuje zawsze.',
            },
            {
              q: 'Pozycja wyłączona nie jest widoczna w dokumencie PDF.',
              a: 'Prezentację pozycji wyłączonych włącza ustawienie „Pokazuj wyłączone pozycje w PDF”. Trafiają one wówczas do dokumentu jako opcje bez kwoty, co bywa przydatne przy wariantach przedstawianych do wyboru.',
            },
            {
              q: 'Suma wyceny godzinowej różni się o grosze od wartości z arkusza kalkulacyjnego.',
              a: 'Aplikacja zaokrągla każdą pozycję osobno, aby kwoty wierszy sumowały się do wartości prezentowanej w podsumowaniu — inwestor weryfikuje sumę kolumny. Arkusz kalkulacyjny nie stosuje zaokrągleń pośrednich.',
            },
            {
              q: 'Wgranie pliku kończy się niepowodzeniem.',
              a: 'Należy zweryfikować treść komunikatu: przekroczenie rozmiaru 25 MB, niedozwolony typ pliku albo brak wolnego miejsca w ramach limitu 2 GB. Pasek zużycia dostępny jest w Ustawieniach → Pliki.',
            },
            {
              q: 'Gdzie przechowywane są dane i w jaki sposób można je pobrać?',
              a: 'Sekcja Ustawienia → Konto → „Eksportuj dane” zapisuje komplet danych w pojedynczym pliku JSON. Funkcja pozostaje dostępna również po wygaśnięciu subskrypcji.',
            },
            {
              q: 'Nie można ręcznie oznaczyć wyceny jako zaakceptowanej.',
              a: 'Jest to rozwiązanie zamierzone. Akceptacja i odmowa rejestrowane są wyłącznie przez inwestora, pod przekazanym linkiem, dzięki czemu data i przyjęty zakres stanowią jego oświadczenie. Ręcznie ustawiany jest wyłącznie status „Wysłana”.',
            },
            {
              q: 'W jaki sposób odnotować rezygnację inwestora z oferty?',
              a: 'Inwestor wybiera pod przekazanym linkiem opcję rezygnacji i może dołączyć uzasadnienie. Wycena otrzymuje status „Odrzucona”, a uzasadnienie prezentowane jest na osi „Stan procesu ofertowego” w edytorze.',
            },
            {
              q: 'W jaki sposób zmienić treść pytań briefu?',
              a: 'Sekcja Ustawienia → Brief udostępnia edytor szablonów: sekcje, pytania, ich kolejność, podpowiedzi i rodzaje pól. Szablonów może być kilka, a jeden z nich oznaczany jest jako domyślny. Zmiany obowiązują od kolejnego wystawionego briefu — dokumenty już przekazane inwestorom pozostają bez zmian.',
            },
            {
              q: 'Skąd pochodzą terminy prezentowane w Kalendarzu?',
              a: 'Z dokumentów prowadzonych w aplikacji: dat rozpoczęcia projektów, wizji lokalnych, terminów ważności ofert oraz harmonogramów wycen. Kalendarz prezentuje stan aplikacji; samodzielnie tworzy się w nim wyłącznie notatki dzienne.',
            },
            {
              q: 'Podgląd brandingu nie działa w systemie macOS.',
              a: 'Jeśli przycisk „Otwórz podgląd” nie otwiera dokumentu, należy użyć „Zapisz podgląd (PDF)” — plik zapisany we wskazanym miejscu otwiera się z dysku jak każdy inny. Wcześniejszą przyczyną była konfiguracja zabezpieczeń okna aplikacji (generator PDF wymaga technologii WebAssembly); w starszej wersji zalecana jest aktualizacja.',
            },
            {
              q: 'Po rozwinięciu paska nawigacji treść wykracza poza obszar okna.',
              a: 'W oknach węższych niż 1280 px rozwinięty pasek nasuwa się na treść zamiast ją przesuwać. Zamyka się po kliknięciu poza nim albo po przejściu do innego ekranu.',
            },
          ],
        },
      ],
    },
  ] satisfies HelpSection[],
};
