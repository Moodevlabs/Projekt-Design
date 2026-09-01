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
    // Powiadomienia e-mail o ruchu inwestora (T-116).
    | 'notifications'
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
    { label: 'Powiadomienia e-mail', target: 'notifications' },
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
            'Klienci → „Nowy klient” → na karcie klienta „Nowy projekt” → w projekcie „Nowa dokumentacja”. Powstaje teczka z czterema zakładkami: Wycena · Termin · Etapy współpracy · Cennik dodatkowy.',
            'W edytorze: lista pomieszczeń w prawej kolumnie, „Dodaj usługi” (albo „Rozpisz na pomieszczenia”, gdy oferta idzie per pomieszczenie), określenie zakresu, a następnie eksport do PDF.',
          ],
        },
        {
          kind: 'p',
          text: 'Nawigacja znajduje się po lewej stronie: Pulpit, Kalendarz, Klienci, Dokumenty, Biblioteka, Szablony — są to obszary pracy. Pod linią oddzielającą umieszczono Kosz, Pomoc i Ustawienia. Pasek rozwija się przyciskiem w dolnej części, co odsłania etykiety pozycji. W wąskim oknie rozwinięty pasek nasuwa się na treść i zamyka po kliknięciu poza nim lub po przejściu do innego ekranu.',
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
            'Karta klienta zawiera nagłówek z danymi kontaktowymi i adresem oraz zakładki: Projekty · Brief · Dokumenty · Pliki · Notatki. Zakładka „Dokumenty” zawiera wyceny, terminy, etapy współpracy i cenniki klienta; „Pliki” — materiały wgrane przez pracownię oraz wygenerowane PDF-y (filtr rodzaju nad listą).',
            'Projekt opisują: nazwa, adres, metraż, typ inwestycji oraz status zmieniany bezpośrednio w nagłówku. Zakładki: Dokumenty · Wizja lokalna · Etapy · Pliki · Notatki.',
            'Dokumenty w projekcie grupowane są według linii wersji: wiersz prezentuje wersję najnowszą, a jego rozwinięcie — wersje wcześniejsze. Przycisk „Nowa dokumentacja” zakłada teczkę z zakładkami Wycena · Termin · Etapy współpracy · Cennik dodatkowy.',
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
      title: 'Dokumenty — dokumentacja projektu',
      lead: 'Pozycja „Dokumenty” w nawigacji (do wersji 1.2 „Wyceny”) prowadzi do rejestru dokumentacji. Jedna dokumentacja to teczka z czterema zakładkami: Wycena · Termin · Etapy współpracy · Cennik dodatkowy — jeden numer, jeden klient, jedna wersja, jeden link dla inwestora i jeden pakiet PDF.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Cztery zakładki są rozdziałami jednej oferty, nie osobnymi dokumentami: termin liczy dni z pomieszczeń wyceny, cennik dosprzedaje pozycje do wyceny i dni do terminu, etapy mówią, co z wyceny wchodzi w zakres. Dlatego zakłada się je razem — przyciskiem „Nowa dokumentacja”.',
            'Najkrótsza droga: Klienci → karta klienta → projekt → „Nowa dokumentacja”. Dokument dostaje dane inwestora i przypisanie do teczki; „Wstecz” w edytorze wraca do projektu, więc kolejną dokumentację tego samego klienta zakłada się bez szukania go w rejestrze. Z rejestru i pulpitu ten sam przycisk pyta o klienta i projekt.',
            'Każda zakładka poza wyceną startuje pusta i buduje się z biblioteki — „Dodaj z biblioteki” otwiera panel z wyszukiwarką, a „Dodaj wszystkie” wstawia cały szablon jednym kliknięciem (w etapach współpracy: wstaw wszystko, potem odznacz to, czego nie robisz). „Etap ręcznie” / „Pozycja ręcznie” dodaje pusty wiersz. Do biblioteki zapisuje się z menu „⋯” → „Zapisz wszystko do biblioteki” albo bezpośrednio w Bibliotece.',
            'Rejestr pokazuje numer, tytuł, klienta, miasto, status, sumę wyceny i datę; filtry statusu, klienta i miasta, wyszukiwarka, sortowanie i eksport rejestru działają jak dotąd. Suma dotyczy wyceny — pozostałe zakładki nie mają czego sumować.',
            'Na karcie klienta i w projekcie zakładka „Dokumenty” listuje dokumentacje (w projekcie zwinięte do linii wersji), a wygenerowane pliki PDF leżą w zakładce „Pliki” pod filtrem „Wygenerowane PDF”.',
          ],
        },
        {
          kind: 'tip',
          title: 'Dokumenty a Pliki',
          text: '„Dokumenty” to rzeczy, nad którymi się pracuje (teczka z wyceną, terminem, etapami i cennikiem). „Pliki” to to, co leży na dysku pracowni i u inwestora — materiały wgrane oraz zapisane pliki PDF w wersji, którą inwestor otrzymał. Archiwum nie generuje pliku ponownie.',
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
            'Opcja „Dodaj usługi” otwiera panel z tabelą biblioteki: usługa · grupa · sposób wyceny · stawka. Przycisk „Dodaj” umieszcza usługę w dokumencie, a panel pozostaje otwarty; miejsce docelowe („Dodaj do: sekcja › grupa”) wybiera się w górnej części panelu. Przycisk „Gotowe” zamyka panel.',
            'Polecenie „Dodaj grupę” na końcu sekcji otwiera menu z trzema drogami: „Pusta grupa” (dotychczasowe zachowanie), „Z biblioteki (grupa)” — wybiera się grupę ze słownika, a następnie zaznacza, które jej usługi wejdą do wyceny (domyślnie wszystkie) — oraz „Z biblioteki (zestaw)”, wstawiający zapisany komplet jednym kliknięciem. Grupa wstawiona ze słownika pamięta swoje pochodzenie: w trybie edycji jej nagłówek nosi kropkę koloru i kod grupy. Dokument dla inwestora i PDF pozostają bez zmian — to oznaczenie robocze.',
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
            'Ikona zakładki przy nagłówku grupy zapisuje ją w bibliotece jako zestaw, razem z ilościami. Bloki pomieszczeń jej nie mają — ich nazwa i skład należą do konkretnej oferty, nie do wzorca. Polecenie „Zapisz wszystko do biblioteki” z menu „⋯” działa inaczej: dopisuje do biblioteki pojedyncze USŁUGI z całej wyceny, nie zestaw.',
            'Kolejność zmienia się przeciągnięciem za uchwyt (pozycje, grupy, sekcje), również pomiędzy sekcjami.',
          ],
        },
        {
          kind: 'p',
          text: 'Przełącznik Podgląd / Edycja w górnym pasku prezentuje ten sam dokument bez elementów sterujących. Zapis automatyczny działa nieprzerwanie — obok numeru wyświetlany jest stan: „Zapisano 12:04”, „Zapisywanie…” albo „Błąd zapisu — ponów”. Skrót Ctrl/⌘ + S wymusza zapis natychmiastowy.',
        },
        {
          kind: 'tip',
          title: 'Rozpisz na pomieszczenia',
          text: 'W sekcji wyceny polecenie „Rozpisz na pomieszczenia” zakłada blok (grupę) dla każdego pomieszczenia z panelu obok, którego jeszcze nie ma — z nazwą pomieszczenia w nagłówku. „Dodaj usługi” w takim bloku celuje w konkretne pomieszczenie. Powtórne kliknięcie dokłada bloki tylko dla pomieszczeń dodanych później.',
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
            'Rejestr (Dokumenty) to jedna lista teczek z filtrami statusów (wersje archiwalne domyślnie ukryte), wyszukiwarką (numer, tytuł, klient, miasto) oraz sortowaniem. Kolumna notatek zawiera notatki wewnętrzne, które nie trafiają do dokumentów PDF ani do szablonów.',
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
        {
          kind: 'p',
          text: 'ODNOŚNIKI DO MATERIAŁÓW (wizualizacje). Do linku dołącza się adresy materiałów przechowywanych poza aplikacją: folderu z wizualizacjami na Dysku Google, spaceru 3D, moodboardu, katalogu dostawcy. Inwestor otwiera je pod ofertą, w bloku „Materiały do obejrzenia”. Pliki pozostają tam, gdzie leżą — do Toolier trafia wyłącznie adres, więc kilkusetmegabajtowe rendery nie zajmują miejsca w przestrzeni pracowni.',
        },
        {
          kind: 'steps',
          items: [
            'Odnośniki dodaje się w dwóch równorzędnych miejscach: w karcie „Odnośniki dla klienta” w prawej kolumnie edytora albo w oknie „Udostępnij”, nad listą linków. Obydwa miejsca obsługują tę samą listę — adres wpisany raz obowiązuje dla wszystkich linków wystawionych do tej wyceny.',
            'Polecenie „Dodaj odnośnik” tworzy wiersz z trzema polami: nazwa widoczna dla inwestora („Wizualizacje — salon i kuchnia”), adres oraz nieobowiązkowy dopisek (przykładowo hasło do folderu).',
            'Adres wystarczy wkleić; brakujący przedrostek „https://” zostaje uzupełniony po opuszczeniu pola. Wpis niebędący adresem strony jest sygnalizowany komunikatem i nie zostaje zapisany.',
            'Polecenie „Sprawdź odnośnik” otwiera adres w przeglądarce systemowej. Zalecane przed przekazaniem linku: najczęstszą przyczyną nieotwierania materiałów są uprawnienia folderu w usłudze zewnętrznej, a nie sam adres.',
            'Usunięcie odnośnika odbywa się ikoną kosza w wierszu. Zmiany zapisują się automatycznie, tak jak pozostała treść wyceny.',
          ],
        },
        {
          kind: 'warn',
          title: 'Uprawnienia do folderu pozostają po stronie usługi zewnętrznej',
          text: 'Toolier przekazuje adres, natomiast o tym, kto zobaczy materiały, decydują ustawienia udostępniania w Dysku Google, Dropboksie lub innym serwisie. Folder udostępniony wyłącznie właścicielowi konta pozostanie dla inwestora niedostępny mimo poprawnego odnośnika.',
        },
        {
          kind: 'tip',
          text: 'Odnośniki należą do konkretnej wyceny, nie do szablonu — szablon zapisany z wyceny zawierającej materiały nie przeniesie ich do kolejnej inwestycji. Zapisywane są natomiast w wersjach wyceny oraz w zapisie akceptacji, dzięki czemu po czasie wiadomo, jakie materiały towarzyszyły przyjętej ofercie.',
        },
      ],
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Powiadomienia e-mail',
      lead: 'Aplikacja informuje pocztą elektroniczną o każdym ruchu inwestora pod przekazanym linkiem. Wiadomości przychodzą niezależnie od tego, czy Toolier pozostaje uruchomiony.',
      blocks: [
        {
          kind: 'p',
          text: 'Powiadomienia kierowane są WYŁĄCZNIE do pracowni — inwestor nie otrzymuje z Toolier żadnej korespondencji. Ofertę przekazuje się nadal własną pocztą (polecenie „Wyślij mailem” w oknie „Udostępnij” otwiera domyślny program pocztowy z gotową treścią), ponieważ wiadomość od znanego adresu ma nieporównanie większą skuteczność niż wiadomość z obcej domeny.',
        },
        {
          kind: 'list',
          items: [
            'Otwarcie oferty — jednorazowo, przy pierwszym otwarciu linku. Kolejne wejścia nie generują wiadomości, ponieważ inwestor wraca do oferty wielokrotnie.',
            'Akceptacja — wraz z podpisem inwestora oraz liczbą pozycji objętych przyjętym zakresem.',
            'Odrzucenie — wraz z uzasadnieniem, o ile zostało podane.',
            'Uwagi — treść uwagi przekazywana jest w całości, co pozwala ocenić pilność odpowiedzi bez uruchamiania aplikacji.',
            'Odesłanie briefu — jednorazowo, przy pierwszym przesłaniu formularza. Brief uzupełniany jest nieraz partiami, stąd wiadomość wysyłana jest raz.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Ustawienia → Aplikacja → „Powiadomienia e-mail”. Wyłącznik główny obejmuje całość wysyłki; poniżej znajdują się przełączniki poszczególnych rodzajów zdarzeń.',
            'Pole „Adres do powiadomień” pozostawione puste oznacza adres, na który następuje logowanie. Adres odmienny od loginu podaje się wtedy, gdy korespondencję pracowni obsługuje inna skrzynka.',
            'Polecenie „Wyślij wiadomość testową” przekazuje jedną wiadomość na ustawiony adres. Zalecane po każdej zmianie adresu — sprawdza całą drogę wysyłki, łącznie z filtrem antyspamowym po stronie odbiorcy.',
          ],
        },
        {
          kind: 'warn',
          title: 'Wiadomość testowa nie dotarła',
          text: 'Należy sprawdzić kolejno: folder wiadomości niechcianych, poprawność adresu w ustawieniach oraz komunikat wyświetlony po naciśnięciu przycisku — treść błędu przekazywana jest wprost, bez zastępowania jej komunikatem ogólnym. Wysyłka wymaga konfiguracji usługi pocztowej po stronie wdrożenia (opis: dokumentacja techniczna, „Powiadomienia e-mail”).',
        },
        {
          kind: 'tip',
          text: 'Powiadomienia nie zastępują paska „Co nowego u klientów” na pulpicie ani osi „Stan procesu ofertowego” w wycenie — stanowią ich uzupełnienie na czas poza aplikacją. Zdarzenie odnotowywane jest w Toolier niezależnie od tego, czy wiadomość została wysłana.',
        },
      ],
    },
    {
      id: 'schedule',
      icon: 'schedule',
      title: 'Termin realizacji',
      lead: 'Zakładka „Termin” w dokumentacji wyznacza datę zakończenia prac na podstawie etapów, listy pomieszczeń wyceny oraz kalendarza dni roboczych uwzględniającego polskie dni ustawowo wolne.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Blok „Założenia” obejmuje datę rozpoczęcia prac, liczbę dni roboczych w tygodniu po stronie pracowni i inwestora oraz sposób traktowania dni ustawowo wolnych. Na podstawie tych czterech wartości wyznaczane są daty w podsumowaniu.',
            'Termin startuje pusty. Etapy dodaje się poleceniem „Dodaj z biblioteki” (Biblioteka → Termin; „Dodaj wszystkie” wstawia cały szablon) albo „Etap ręcznie”. Termin liczy WYŁĄCZNIE etapy zaznaczone polem po lewej stronie wiersza — etap z biblioteki wchodzi zaznaczony. Każdy etap ma dni bazowe („cały projekt”), a etap zależny od pomieszczeń — dodatkowo dni doliczane za każde pomieszczenie.',
            'Dni etapu = dni bazowe + Σ (stawka typu pomieszczenia × ilość) dla pomieszczeń objętych zakresem etapu. Zakres „Wizualne” liczy pomieszczenia z zaznaczoną częścią wizualną, „Techniczne” — z częścią techniczną, „Wszystkie” — każde; „Nie zależy od pomieszczeń” liczy same dni bazowe. Pomieszczenie bez typu oraz typ bez własnej stawki biorą stawkę domyślną etapu; puste pole w macierzy oznacza „domyślna”, a zero — „ten typ nie dokłada dni”. Pozycja „salon ×2” liczy się dwukrotnie — tak samo jak w cenniku parametrycznym.',
            'Lista pomieszczeń jest wspólna z wyceną (pomieszczenia leżą w dokumentacji, nie w projekcie). Zmiana w panelu „Pomieszczenia” na zakładce Wycena od razu zmienia wynik terminu.',
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
      lead: 'Dokumentacja to jedna teczka z czterema zakładkami: Wycena · Termin · Etapy współpracy · Cennik dodatkowy. Ma jeden numer (domyślnie DOK/RRRR/MM/0001 — wzorzec zmienia się w Ustawieniach), jednego klienta, jedną wersję i jedno archiwum PDF.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Zakładki Termin, Etapy i Cennik startują puste — treść dodaje się poleceniem „Dodaj z biblioteki” albo ręcznie. Panel biblioteki ma dwie półki: „Pozycje” (z wyszukiwarką, filtrem grup nad listą i przyciskiem „Dodaj wszystkie”) oraz „Zestawy”, gdzie jedno kliknięcie wnosi cały zapisany komplet. Pusta zakładka nie trafia do PDF, na stronę dla inwestora ani do podsumowania: dokument pokazuje wyłącznie to, co zostało w nim wpisane.',
            'Rozpisany dokument można odłożyć do biblioteki: przycisk „Zapisz jako zestaw” pod listą zapisuje jego pozycje jako komplet pod wskazaną nazwą. Zestaw jest kopią — późniejsze zmiany w dokumencie go nie ruszą. W terminie etap zbiorczy „Usługi dodatkowe” nie wchodzi do zestawu, ponieważ jego skład wynika z cennika tej konkretnej wyceny.',
            'Etapy współpracy: biblioteka podpowiada 19 etapów w 5 częściach, a dokument zawiera tylko te, które zostały do niego dodane. Wskazuje się etapy objęte zakresem; etapy pozostające poza zakresem zachowywane są w dokumencie z odpowiednim oznaczeniem, aby zakres wyłączony z oferty był dla inwestora jednoznaczny. Domyślny okres ważności wynosi 14 dni i podlega zmianie.',
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
            'Po zakończonym eksporcie plik zapisywany jest w Plikach klienta i projektu (filtr „Wygenerowane PDF”). Archiwum udostępnia zapisany plik, a nie generuje go ponownie. Karta „Wygenerowane PDF” w edytorze prezentuje trzy ostatnie pozycje.',
            'Opisy pozycji obsługują pola automatyczne: {rooms} wstawia listę pomieszczeń („kuchnia, salon ×2”), a {frames|kadr|kadry|kadrów} liczbę kadrów z poprawną odmianą. Pole nierozpoznane pozostaje w treści dosłownie, aby błąd zapisu był widoczny. Listę pól udostępnia przycisk „{ }”.',
          ],
        },
      ],
    },
    {
      id: 'library',
      icon: 'library',
      title: 'Biblioteka',
      lead: 'Cennik pracowni. Zakładki: Usługi · Grupy · Zestawy · Pomieszczenia · Stawki · Termin · Etapy współpracy · Cennik dodatkowy. Każda z trzech ostatnich ma własne podzakładki Pozycje · Grupy · Zestawy — te same pojęcia co przy usługach. Ustawienia wprowadzone w tym miejscu obowiązują w nowych dokumentach.',
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
            'Grupa porządkuje bibliotekę: kod („01”), nazwa, kolor z palety oraz kolejność ustalana strzałkami w wierszu. Kolejność grup odpowiada kolejności w panelu „Dodaj usługi”. Licznik usług po prawej stronie wiersza jest przyciskiem — rozwija listę usług grupy, z możliwością dopięcia kolejnych („Dodaj usługę”) i odpięcia. Usługa należy do jednej grupy, więc dopięcie jej tutaj przenosi ją z poprzedniej; odpięcie nie usuwa usługi z biblioteki, lecz przenosi do kategorii „Bez grupy”. Usunięcie grupy również wyłącznie odpina usługi.',
            'Zestaw to gotowy komplet pozycji wraz z ilościami, wstawiany do wyceny jako grupa (przykładowo „Kuchnia”: projekt koncepcyjny ×14 m², meble ×1, wizualizacje ×2). Ilości odróżniają zestaw od grupy — grupa ich nie przechowuje, a jedna usługa może należeć do wielu zestawów naraz. Najkrótsza droga do zestawu prowadzi z pracy już wykonanej: w edytorze wyceny ikona zakładki przy nagłówku grupy („Zapisz jako zestaw”) odkłada ją do biblioteki. Zestaw można też złożyć ręcznie w zakładce Zestawy.',
            'Pomieszczenia obejmują słownik typów (kuchnia, salon, łazienka i pozostałe), na podstawie którego cennik dobiera stawkę. Zmiana nazwy nie modyfikuje klucza technicznego, więc nie wpływa na ceny w zapisanych wycenach. Słownik edytuje się wyłącznie w tym miejscu.',
            'Stawki prezentują pełną macierz usługa × typ pomieszczenia na jednym ekranie, wraz z importem z pliku CSV.',
            'Sekcje Termin, Etapy współpracy i Cennik dodatkowy to biblioteki pozostałych rodzajów dokumentu, każda z podzakładkami Pozycje · Grupy · Zestawy. Podzakładka Pozycje przy pierwszym otwarciu wypełnia się wbudowanym szablonem (oznaczonym jako przykładowy); wpisy edytuje się w miejscu (ikona ołówka) i porządkuje strzałkami. Wpis terminu przechowuje stronę (ARCH./INW.), dni bazowe, zakres pomieszczeń, stawkę domyślną oraz dni według typu pomieszczenia; wpis etapów — opis, nagłówek grupy i domyślne objęcie zakresem; wpis cennika — przedział cen, jednostkę, termin realizacji i dni doliczane do terminu. Z tych list korzysta panel „Dodaj z biblioteki”.',
            'Grupy i zestawy dokumentów działają tak samo jak przy usługach, osobno dla każdego rodzaju: grupa terminu nie miesza się z grupą cennika. Grupa porządkuje listę wpisów (wiersz rozwija się i przyjmuje wpisy), a zestaw przechowuje zapisany komplet — dla terminu jest to zwykle wybór typu „pełny proces” albo „sam nadzór”. Zestaw dokumentu powstaje najprościej z rozpisanego dokumentu: przycisk „Zapisz jako zestaw” w pasku pod listą.',
          ],
        },
        {
          kind: 'tip',
          title: 'Wybór z biblioteki wygląda wszędzie tak samo',
          text: 'Dobieranie usług do wyceny, przypinanie ich do grupy i składanie zestawu otwierają ten sam panel z prawej strony ekranu: wyszukiwarka, lista z przyciskiem „Dodaj” przy każdym wierszu, licznik dodanych pozycji i przycisk „Gotowe”. Kliknięcie dodaje od razu, a panel pozostaje otwarty — dobiera się zwykle kilka pozycji, nie jedną.',
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
      lead: 'Szablon to gotowa dokumentacja-wzorzec — „Projekt kompleksowy”, „Konsultacja” — z wyceną, terminem, etapami i cennikiem. Buduje się go w tym samym edytorze co dokumentację.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Tworzenie: Szablony → „Nowy szablon” otwiera pusty szablon w edytorze — z tymi samymi zakładkami, panelem „Dodaj usługi”, „Rozpisz na pomieszczenia” i „Dodaj z biblioteki”; zmiany zapisują się same. Karta szablonu ma przycisk „Edytuj”. Nazwę zmienia się na karcie. Druga droga zostaje: z gotowej dokumentacji menu „⋯” → „Zapisz jako szablon…” (z wyborem zakresu) albo „Nadpisz szablon…”.',
            'W edytorze szablonu nie ma numeru, statusu, klienta, udostępniania, wersji ani eksportu PDF — szablon to treść, nie dokument dla inwestora.',
            'Użycie: „Nowa wycena” → wybór szablonu jako punktu wyjścia, albo w sekcji Szablony polecenie „Nowa wycena z szablonu”. Dane klienta nie są kopiowane — uzupełnia je projekt.',
            'Karta szablonu prezentuje liczbę pozycji, sumę oraz oznaczenia zawartości (wycena · termin · dokumenty).',
          ],
        },
        {
          kind: 'tip',
          text: 'Szablon obejmuje całą dokumentację: pozycje wyceny oraz — jeśli zostały wypełnione — termin, etapy i cennik. Pusta zakładka nie trafia do szablonu.',
        },
      ],
    },
    {
      id: 'files',
      icon: 'files',
      title: 'Pliki klienta',
      lead: 'Każdy klient i projekt udostępnia zakładkę Pliki: materiały wgrane przez pracownię oraz pliki PDF wygenerowane w aplikacji i przekazane inwestorowi — w jednej liście, z filtrem rodzaju.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Pliki dodaje się przeciągnięciem na zakładkę albo poleceniem „Dodaj pliki”. Lista obejmuje typ, nazwę (edytowaną w miejscu), rozmiar, datę oraz osobę wgrywającą. Dostępne operacje: Pobierz, Podgląd (obrazy i dokumenty PDF), Usuń — z potwierdzeniem.',
            'Limity: 25 MB na pojedynczy plik oraz 2 GB na workspace. Pasek zużycia dostępny jest w Ustawieniach → Pliki, a ostrzeżenie pojawia się po przekroczeniu 90 % limitu. Komunikat o przekroczeniu rozmiaru albo braku miejsca wyświetlany jest przed rozpoczęciem wysyłki.',
            'Filtr nad listą: Wszystkie · Wgrane · Wygenerowane PDF. Kolumna „Typ” wskazuje rodzaj pliku wygenerowanego (Wycena / Termin / Etapy / Cennik / Pakiet) wraz z wersją dokumentu.',
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
        {
          kind: 'tip',
          title: 'Regulamin i polityka prywatności',
          text: 'Oba dokumenty dostępne są pod adresami toolier.pl/regulamin oraz toolier.pl/polityka-prywatnosci i akceptuje się je jednorazowo przy zakładaniu konta — bez zaznaczenia zgody rejestracja nie dochodzi do skutku. Odnośniki w formularzu otwierają dokumenty w przeglądarce systemowej. Dane wprowadzane do Aplikacji (inwestorzy, dokumentacja) pozostają danymi pracowni: to pracownia jest ich administratorem, a Toolier przetwarza je wyłącznie na jej polecenie, na zasadach umowy powierzenia stanowiącej załącznik do regulaminu. O istotnych zmianach dokumentów informujemy z co najmniej 14-dniowym wyprzedzeniem.',
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
              action: 'W edytorze: zmiana kolejności pozycji, grup i sekcji, także pomiędzy sekcjami',
            },
            {
              keys: 'Strzałki ▲ ▼ w wierszu',
              action:
                'W bibliotece: kolejność grup, wpisów terminu, etapów i cennika (te listy ustawia się raz, więc mają przyciski dostępne z klawiatury zamiast przeciągania)',
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
              a: 'Od wersji 1.2 nazywa się „Dokumenty” — to rejestr dokumentacji, czyli teczek z wyceną, terminem, etapami współpracy i cennikiem w zakładkach. Zapisane adresy `/wyceny` przekierowują, a przycisk „Nowa wycena” nazywa się „Nowa dokumentacja”.',
            },
            {
              q: 'Termin nie zmienia się po dodaniu pomieszczenia.',
              a: 'Najczęstsza przyczyna: brak etapów albo etapy odznaczone — termin startuje pusty, a liczy tylko etapy z zaznaczonym polem po lewej stronie wiersza. Dalej: dni za pomieszczenie liczą wyłącznie etapy z zakresem innym niż „Nie zależy od pomieszczeń” — i tylko dla pomieszczeń objętych tym zakresem (część wizualna / techniczna). Należy sprawdzić zakres etapu, zaznaczenia przy pomieszczeniu oraz stawkę: puste pole w macierzy oznacza stawkę domyślną etapu, która może wynosić 0.',
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
