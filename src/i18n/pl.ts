/**
 * Jedyne źródło tekstów UI. Struktura płaska-w-sekcjach, żeby dało się to
 * później podmienić na i18next bez przepisywania komponentów.
 */
export const pl = {
  app: {
    name: 'Toolier',
    // Podpis pod logo na ekranach logowania. Hasło marki — nie tłumaczymy.
    tagline: 'Tools for Atelier',
    /**
     * Podpis wytłoczony w tle aplikacji. Nazwy własne — nie tłumaczymy.
     *
     * „AnzorgeDesign" zostaje po rebrandingu (T-65) **celowo**: to nazwa
     * studia, które zamówiło aplikację, a nie dawna nazwa produktu. Produkt
     * nazywa się Toolier, autorzy nazywają się tak, jak się nazywają.
     */
    credit: 'Developed by AnzorgeDesign & Moodevlabs',
  },
  nav: {
    /** Kosz na pliki — wlasna pozycja w szynie, nad Pomoca (2026-08-27). */
    trash: 'Kosz',
    dashboard: 'Pulpit',
    calendar: 'Kalendarz',
    quotes: 'Dokumenty',
    clients: 'Klienci',
    library: 'Biblioteka',
    templates: 'Szablony',
    brand: 'Branding',
    help: 'Pomoc',
    settings: 'Ustawienia',
    subscription: 'Subskrypcja',
    collapse: 'Zwiń panel',
    expand: 'Rozwiń panel',
  },
  common: {
    add: 'Dodaj',
    save: 'Zapisz',
    cancel: 'Anuluj',
    delete: 'Usuń',
    edit: 'Edytuj',
    change: 'Zmień',
    duplicate: 'Duplikuj',
    archive: 'Archiwizuj',
    search: 'Szukaj',
    close: 'Zamknij',
    back: 'Wstecz',
    confirm: 'Potwierdź',
    loading: 'Ładowanie…',
    retry: 'Ponów',
    all: 'Wszystkie',
    logout: 'Wyloguj',
    soon: 'Wkrótce',
    more: 'Więcej',
    undo: 'Cofnij',
  },
  status: {
    draft: 'Szkic',
    sent: 'Wysłana',
    accepted: 'Zaakceptowana',
    rejected: 'Odrzucona',
    expired: 'Wygasła',
    /** Wersja zastąpiona przez nowszą. NIE to samo co kosz (`deleted_at`). */
    archived: 'Archiwalna',
  },
  quotes: {
    title: 'Dokumenty',
    new: 'Nowa wycena',
    /** Zakladki rejestru „Dokumenty" (T-100) — jedna na rodzaj dokumentu. */
    kindTabs: {
      offer: 'Wyceny',
      schedule: 'Terminy',
      stages: 'Etapy współpracy',
      price_list: 'Cenniki dodatkowe',
    },
    kindTabsLabel: 'Rodzaj dokumentu',
    newOfKind: {
      offer: 'Nowa wycena',
      schedule: 'Nowy termin',
      stages: 'Nowe etapy współpracy',
      price_list: 'Nowy cennik dodatkowy',
    },
    newDocument: 'Nowy dokument',
    kindColumn: 'Rodzaj',
    emptyKindTitle: {
      offer: 'Nie utworzono jeszcze żadnej wyceny',
      schedule: 'Nie utworzono jeszcze żadnego terminu',
      stages: 'Nie utworzono jeszcze etapów współpracy',
      price_list: 'Nie utworzono jeszcze cennika dodatkowego',
    },
    emptyKindDescription: {
      offer:
        'Przygotuj pierwszą ofertę z pozycjami do wyboru TAK/NIE i przekaż ją inwestorowi w formie dokumentu PDF.',
      schedule:
        'Policz szacowany termin z etapów i pomieszczeń — dokument PDF pokaże inwestorowi optymalne i najpóźniejsze zakończenie.',
      stages:
        'Opisz inwestorowi, co wchodzi w zakres współpracy, a co nie — zanim sam się tego domyśli.',
      price_list:
        'Zbierz usługi dodatkowe z widełkami cen i terminami — cennik jest ofertą na rozmowę.',
    },
    newDialogHint: 'Wskaż klienta i projekt — dane inwestora zostaną uzupełnione automatycznie.',
    // Start z szablonu przy zakładaniu wyceny (T-70).
    startFrom: 'Zacznij od',
    startFromEmpty: 'Pustej wyceny',
    startFromPackage:
      'Szablon zawiera również termin i dokumenty — zostaną przeniesione do nowej wyceny.',
    withoutClient: 'Bez klienta',
    number: 'Numer',
    client: 'Klient',
    quoteTitle: 'Tytuł',
    total: 'Suma',
    updated: 'Zaktualizowano',
    emptyTitle: 'Nie utworzono jeszcze żadnej wyceny',
    emptyDescription:
      'Przygotuj pierwszą ofertę z pozycjami do wyboru TAK/NIE i przekaż ją inwestorowi w formie dokumentu PDF.',
    exportPdf: 'Eksportuj PDF',
    noResultsTitle: 'Brak wyników',
    noResultsDescription: 'Zmień filtr albo wyczyść wyszukiwanie.',
    searchPlaceholder: 'Szukaj po numerze, tytule lub kliencie',
    clearSearch: 'Wyczyść wyszukiwanie',
    rowActions: 'Akcje wyceny',
    noNumber: 'bez numeru',
    statusColumn: 'Status',
    filterByStatus: 'Filtruj po statusie',
    noClient: '—',

    // Rejestr ofert (F7.1).
    cityColumn: 'Miasto',
    filterByCity: 'Filtruj po mieście',
    allCities: 'Wszystkie miasta',
    noCity: '—',
    notes: 'Notatki',
    notesFor: (name: string) => `Notatki i rodzaj: ${name}`,
    notesPlaceholder: 'Notatka wewnętrzna — nie trafia do PDF…',
    notesHint:
      'Notatka wewnętrzna. Nie jest umieszczana w PDF ani kopiowana przy duplikowaniu wyceny.',
    notesSaved: 'Zapisano notatkę',
    hasNotes: 'Ma notatkę',
    docKindLabel: 'Rodzaj dokumentu',
    docKind: {
      offer: 'Wycena',
      schedule: 'Termin',
      stages: 'Etapy współpracy',
      price_list: 'Cennik dodatkowy',
    },
    exportRegister: 'Eksportuj rejestr (CSV)',
    registerExported: (count: number) => `Wyeksportowano ${count} pozycji rejestru`,
    /** Warianty eksportu rejestru (T-23). XLSX pierwszy — liczby zostaja liczbami. */
    exportXlsx: 'Excel (.xlsx)',
    exportCsv: 'CSV dla Excela',
    registerEmpty: 'Nie ma czego eksportować — rejestr jest pusty.',
    sort: {
      label: 'Sortuj',
      updated_desc: 'Ostatnio zmienione',
      created_desc: 'Najnowsze',
      total_desc: 'Najwyższa kwota',
      number_asc: 'Numer rosnąco',
    },
    filterByClient: 'Filtruj po kliencie',

    // Wersje wycen (T-57).
    newVersion: 'Nowa wersja',
    newVersionHint: 'Kolejny wariant oferty dla tej samej inwestycji.',
    duplicateHint: 'Ta sama oferta dla innego klienta — nowa linia wersji od v1.',
    versionCreated: (label: string) => `Utworzono ${label}`,
    olderVersions: (count: number) =>
      count === 1 ? '1 starsza wersja' : `${count} starsze wersje`,
    showOlder: 'Pokaż starsze wersje',
    hideOlder: 'Ukryj starsze wersje',
    versionColumn: 'Wersja',

    replaceAcceptedTitle: 'Zastąpić zaakceptowaną wycenę?',
    replaceAcceptedDescription:
      'W projekcie znajduje się już zaakceptowana wycena. Projekt może mieć wyłącznie jedną — dotychczasowa otrzyma status archiwalnej.',
    replaceAcceptedConfirm: 'Zastąp',
    replaceAccepted: 'Zastąpiono zaakceptowaną wycenę',
    moveToProject: 'Przenieś do projektu',
    markAs: 'Oznacz jako',
    statusChanged: 'Status wyceny zmieniony',
    allClients: 'Wszyscy klienci',
    openClient: (name: string) => `Otwórz kartę klienta: ${name}`,
    archived: 'Usunięte',
    /*
     * Dawne „Archiwizuj" z T-07 to w rzeczywistości KOSZ (`deleted_at`).
     * Od T-57 istnieje osobny status `archived` i trzymanie dwóch różnych
     * „archiwów" w jednym interfejsie byłoby pułapką — więc kosz nazywa się
     * teraz wprost „Usuń".
     */
    archiveConfirmTitle: 'Usunąć wycenę?',
    archiveConfirmDescription:
      'Wycena zostanie ukryta na liście, lecz pozostanie w bazie danych — przywrócenie jest możliwe w każdej chwili.',
    duplicated: 'Utworzono kopię wyceny',
    archivedToast: 'Wycena usunięta',
    loadError: 'Nie udało się wczytać wycen.',
  },
  /*
   * KALENDARZ TERMINÓW (T-98).
   *
   * Jeden widok na daty rozproszone po aplikacji — plus notatka dzienna,
   * jedyny byt, który w kalendarzu powstaje. Nie jest to kalendarz spotkań
   * ani system zarządzania pracą (CLAUDE.md, „Czego NIE robić").
   */
  calendar: {
    title: 'Kalendarz',
    intro:
      'Zestawienie terminów prowadzonych inwestycji: rozpoczęcia projektów, wizje lokalne, ważność ofert i terminy wynikające z harmonogramów. Wybór dnia otwiera jego szczegóły pod kalendarzem.',
    today: 'Dziś',
    previousMonth: 'Poprzedni miesiąc',
    nextMonth: 'Następny miesiąc',
    monthLabel: (month: string, year: number) => `${month} ${year}`,
    weekdays: ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'],
    weekdaysFull: ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'],
    months: [
      'styczeń',
      'luty',
      'marzec',
      'kwiecień',
      'maj',
      'czerwiec',
      'lipiec',
      'sierpień',
      'wrzesień',
      'październik',
      'listopad',
      'grudzień',
    ],
    /** Dopełniacz — „12 września 2026", nie „12 wrzesień 2026". */
    monthsGenitive: [
      'stycznia',
      'lutego',
      'marca',
      'kwietnia',
      'maja',
      'czerwca',
      'lipca',
      'sierpnia',
      'września',
      'października',
      'listopada',
      'grudnia',
    ],
    dayLabel: (day: number, month: string, year: number, weekday: string) =>
      `${weekday}, ${day} ${month} ${year}`,
    loadError: 'Nie udało się wczytać kalendarza.',

    legend: 'Oznaczenia',
    kind: {
      note: 'Notatka',
      deadline: 'Termin z harmonogramu',
      project_start: 'Rozpoczęcie projektu',
      site_visit: 'Wizja lokalna',
      quote_validity: 'Upływ ważności oferty',
    },

    // Panel dnia.
    dayEmpty: 'Brak wpisów w tym dniu.',
    dayEmptyHint: 'Notatkę można dodać w polu poniżej.',
    eventsTitle: 'Wpisy dnia',
    open: 'Otwórz',
    monthSummary: (count: number) => {
      if (count === 0) return 'Brak wpisów w tym miesiącu';
      if (count === 1) return '1 wpis w tym miesiącu';
      const ones = count % 10;
      const tens = count % 100;
      const few = ones >= 2 && ones <= 4 && !(tens >= 12 && tens <= 14);
      return `${count} ${few ? 'wpisy' : 'wpisów'} w tym miesiącu`;
    },

    // Notatki.
    noteAdd: 'Dodaj notatkę',
    notePlaceholder: 'Treść notatki, na przykład: montaż zabudowy kuchennej',
    noteTimeLabel: 'Godzina (opcjonalnie)',
    noteTextLabel: 'Treść notatki',
    noteSave: 'Zapisz notatkę',
    noteSaved: 'Notatka zapisana',
    noteFailed: 'Nie udało się zapisać notatki.',
    noteEdit: 'Edytuj notatkę',
    noteEdited: 'Notatka zaktualizowana',
    noteDelete: 'Usuń notatkę',
    noteDeleteConfirm: 'Notatka zostanie usunięta. Operacji nie można cofnąć.',
    noteDone: 'Oznacz jako wykonane',
    noteEmpty: 'Notatka wymaga treści.',
    /** Liczba wpisów dnia — czytana także przez czytnik ekranu w siatce. */
    eventCount: (count: number) => {
      if (count === 1) return '1 wpis';
      const ones = count % 10;
      const tens = count % 100;
      const few = ones >= 2 && ones <= 4 && !(tens >= 12 && tens <= 14);
      return `${count} ${few ? 'wpisy' : 'wpisów'}`;
    },
  },
  search: {
    title: 'Szukaj',
    description: 'Wyszukiwanie klientów, projektów, wycen i usług.',
    placeholder: 'Szukaj klienta, projektu, wyceny…',
    empty: 'Brak wyników.',
    actions: 'Akcje',
    open: 'Otwórz wyszukiwarkę',
  },
  clients: {
    // Import z CSV (T-23).
    importAction: 'Importuj z CSV',
    importTitle: 'Import klientów z pliku CSV',
    importDescription:
      'Wskaż plik wyeksportowany z programu Excel lub arkusza Google. Separator i nagłówki kolumn rozpoznawane są automatycznie.',
    importColumns:
      'Rozpoznawane kolumny: Nazwa, Telefon, E-mail, Miasto, Adres, Notatki. Wymagana jest wyłącznie nazwa — pozostałe pozostają opcjonalne.',
    importPick: 'Wybierz plik',
    importEmpty: 'Ten plik nie zawiera żadnych wierszy z danymi.',
    importFound: (count: number) =>
      count === 1 ? 'Znaleziono 1 klienta do dodania.' : `Znaleziono ${count} klientów do dodania.`,
    importIssues: (count: number) =>
      count === 1 ? '1 wiersz zostanie pominięty:' : `${count} wierszy zostanie pominiętych:`,
    importLine: (line: number) => `wiersz ${line}`,
    importNoName: 'brak nazwy klienta',
    importDuplicate: 'powtórzony w pliku',
    importMore: (count: number) => `…i jeszcze ${count}`,
    importConfirm: (count: number) => `Dodaj ${count}`,
    importing: 'Dodawanie…',
    imported: (inserted: number, skipped: number) =>
      skipped > 0
        ? `Dodano ${inserted}, pominięto ${skipped} (rekordy obecne już w kartotece).`
        : `Dodano ${inserted} klientów.`,

    title: 'Klienci',
    new: 'Nowy klient',
    first: 'Dodaj pierwszego klienta',
    editTitle: 'Edytuj klienta',
    newTitle: 'Nowy klient',
    formHint: 'Wymagana jest wyłącznie nazwa. Pozostałe dane można uzupełnić później.',

    // Zdjęcie klienta (poprawka 5).
    avatar: 'Zdjęcie klienta',
    avatarHint: 'Widoczne na karcie klienta i na liście. Nie jest umieszczane w żadnym dokumencie.',

    name: 'Nazwa',
    namePlaceholder: 'Anna i Piotr Kowalscy',
    phone: 'Telefon',
    email: 'E-mail',
    address: 'Adres inwestycji',
    addressPlaceholder: 'ul. Wiosenna 12/3',
    city: 'Miasto',
    notes: 'Notatki',
    notesPlaceholder: 'Ustalenia, preferencje, historia kontaktu…',
    notesHint: 'Notatki wewnętrzne. Nie są przenoszone do wyceny ani do dokumentów PDF.',

    quotesCount: 'Wyceny',
    acceptedValue: 'Zaakceptowane',
    lastActivity: 'Ostatnia aktywność',
    statusColumn: 'Status',
    contact: 'Kontakt',
    noContact: 'Brak danych kontaktowych',
    noCity: '—',
    noValue: '—',

    // Karta klienta (powiększona 2026-08-27).
    cardProjects: 'Teczki',
    cardQuotes: 'Wyceny',
    cardAccepted: 'Zaakceptowane',
    /** Ostatnia aktywność jako zdanie, nie jako etykieta kolumny. */
    cardActivity: (when: string) => `Ostatnia aktywność: ${when}`,
    cardNoActivity: 'Brak aktywności',
    cardOpen: 'Otwórz teczkę',

    status: {
      active: 'Aktywny',
      archived: 'Zarchiwizowany',
    },
    filters: {
      active: 'Aktywni',
      archived: 'Zarchiwizowani',
      all: 'Wszyscy',
    },
    filterByStatus: 'Filtruj po statusie',
    sort: {
      label: 'Sortuj',
      activity_desc: 'Ostatnia aktywność',
      name_asc: 'Nazwa A–Z',
      value_desc: 'Najwyższa wartość',
      created_desc: 'Najnowsi',
    },

    searchPlaceholder: 'Szukaj po nazwie, e-mailu, telefonie lub mieście',
    clearSearch: 'Wyczyść wyszukiwanie',
    rowActions: 'Akcje klienta',
    newQuote: 'Nowa wycena',

    emptyTitle: 'Kartoteka klientów jest pusta',
    emptyDescription:
      'Karta klienta gromadzi dane kontaktowe, wyceny i notatki w jednym miejscu. Dane inwestora uzupełniają się w wycenie automatycznie.',
    noResultsTitle: 'Brak wyników',
    noResultsDescription: 'Zmień kryteria filtrowania lub wyczyść wyszukiwanie.',
    loadError: 'Nie udało się wczytać klientów.',
    notFoundTitle: 'Nie znaleziono klienta',
    notFoundDescription: 'Rekord został usunięty lub podany adres jest nieprawidłowy.',
    backToList: 'Wszyscy klienci',

    tabQuotes: 'Dokumenty',
    tabNotes: 'Notatki',
    quotesEmptyTitle: 'Brak dokumentów dla tego klienta',
    quotesEmptyDescription:
      'Utwórz pierwszą wycenę, termin, etapy współpracy albo cennik — dane inwestora zostaną uzupełnione automatycznie.',
    notesEmpty: 'Brak notatek.',
    notesSaved: 'Zapisano notatkę',

    created: 'Dodano klienta',
    saved: 'Zapisano zmiany',
    archive: 'Archiwizuj',
    restore: 'Przywróć',
    archived: 'Klient zarchiwizowany',
    restored: 'Klient przywrócony',
    archiveConfirmTitle: 'Zarchiwizować klienta?',
    archiveConfirmDescription:
      'Klient zostanie ukryty na liście aktywnych. Jego wyceny i dane pozostaną nienaruszone, a przywrócenie jest możliwe w każdej chwili.',
    deleteConfirmTitle: 'Usunąć klienta?',
    deleteConfirmDescription: (quotes: number) =>
      quotes > 0
        ? `Klient zostanie przeniesiony do kosza. Jego ${quotes === 1 ? 'wycena pozostaje nienaruszona i nadal wskazuje' : `wyceny (${quotes}) pozostają nienaruszone i nadal wskazują`} na tę kartę.`
        : 'Klient zostanie przeniesiony do kosza. Nie ma przypisanych wycen.',
    deleted: 'Klient usunięty',

    // Zakładka „Projekty" na karcie klienta (T-54).
    tabProjects: 'Projekty',
    projectsEmptyTitle: 'Brak projektów',
    projectsEmptyDescription:
      'Projekt obejmuje jedną inwestycję: adres, metraż, wyceny i notatki w jednym miejscu.',
  },
  projects: {
    title: 'Projekty',
    new: 'Nowy projekt',
    first: 'Dodaj pierwszy projekt',
    editTitle: 'Edytuj projekt',
    newTitle: 'Nowy projekt',
    formHint: 'Adres uzupełniany jest z kartoteki klienta i podlega edycji.',

    name: 'Nazwa projektu',
    namePlaceholder: 'Dom 164 m² — Konstancin',
    address: 'Adres inwestycji',
    city: 'Miasto',
    area: 'Metraż (m²)',
    areaPlaceholder: '164,5',
    kind: 'Typ',
    kindNone: 'Nie określono',
    kinds: {
      apartment: 'Mieszkanie',
      house: 'Dom',
      commercial: 'Lokal użytkowy',
      other: 'Inny',
    },
    statusLabel: 'Status',
    status: {
      lead: 'Zapytanie',
      offer: 'Oferta',
      in_progress: 'W realizacji',
      done: 'Zakończony',
      canceled: 'Anulowany',
    },
    startDate: 'Data startu',
    notes: 'Notatki',
    notesPlaceholder: 'Ustalenia, zakres, terminy…',
    notesHint: 'Notatki wewnętrzne. Nie są przenoszone do wyceny ani do dokumentów PDF.',
    notesSaved: 'Zapisano notatkę',

    client: 'Klient',
    quotesCount: 'Wyceny',
    acceptedValue: 'Zaakceptowane',
    lastActivity: 'Ostatnia aktywność',
    noArea: '—',
    noValue: '—',

    rowActions: 'Akcje projektu',
    newQuote: 'Nowa wycena',
    open: 'Otwórz projekt',

    created: 'Dodano projekt',
    saved: 'Zapisano zmiany',
    deleted: 'Projekt usunięty',
    deleteConfirmTitle: 'Usunąć projekt?',
    deleteConfirmDescription: (quotes: number) =>
      quotes > 0
        ? `Projekt zostanie przeniesiony do kosza. Jego ${quotes === 1 ? 'wycena pozostaje nienaruszona i dostępna' : `wyceny (${quotes}) pozostają nienaruszone i dostępne`} na karcie klienta.`
        : 'Projekt zostanie przeniesiony do kosza. Nie ma przypisanych wycen.',

    notFoundTitle: 'Nie znaleziono projektu',
    notFoundDescription: 'Rekord został usunięty lub podany adres jest nieprawidłowy.',
    loadError: 'Nie udało się wczytać projektów.',

    tabQuotes: 'Dokumenty',
    tabNotes: 'Notatki',
    quotesEmptyTitle: 'Brak dokumentów w tym projekcie',
    quotesEmptyDescription:
      'Utwórz pierwszą wycenę, termin, etapy współpracy albo cennik — dane inwestora zostaną uzupełnione automatycznie.',

    // Przenoszenie wyceny między teczkami.
    moveTitle: 'Przenieś do projektu',
    moveDescription: 'Zmianie ulega wyłącznie przypisanie. Treść oferty pozostaje bez zmian.',
    moveAttachesClient:
      'Wycena nie ma przypisanego klienta — wraz z projektem zostanie przypisana do jego właściciela.',
    moveNone: 'Bez projektu',
    moveEmpty: 'Klient nie ma jeszcze żadnego projektu.',
    moved: (name: string) => `Przeniesiono do projektu: ${name}`,
    movedOut: 'Wycena wyjęta z projektu',

    // Kopiowanie pomieszczeń przy nowej wycenie w projekcie.
    copyRoomsTitle: 'Skopiować pomieszczenia?',
    copyRoomsDescription: (count: number, from: string) =>
      `Ostatnia wycena w tym projekcie („${from}") zawiera ${count === 1 ? '1 pomieszczenie' : `${count} pomieszczeń`}. Przenieść je do nowej wyceny?`,
    copyRoomsConfirm: 'Skopiuj',
    copyRoomsSkip: 'Rozpocznij bez pomieszczeń',

    // Propozycja przestawienia statusu po akceptacji wyceny.
    suggestInProgress: (name: string) =>
      `Wycena została zaakceptowana. Zmienić status projektu „${name}" na „W realizacji"?`,
    suggestInProgressAction: 'Zmień status',
    statusChanged: 'Status projektu zmieniony',
  },
  files: {
    title: 'Pliki',
    tab: 'Pliki',
    add: 'Dodaj pliki',
    dropHere: 'Upuść pliki tutaj',
    dropHint:
      'Przeciągnij pliki lub użyj przycisku „Dodaj pliki". Maksymalny rozmiar pojedynczego pliku: 25 MB.',
    emptyTitle: 'Brak plików',
    emptyDescription:
      'Rzuty, zdjęcia, umowy i pozostała dokumentacja dotycząca klienta — w jednym miejscu.',
    loadError: 'Nie udało się wczytać plików.',

    name: 'Nazwa',
    size: 'Rozmiar',
    added: 'Dodano',
    rowActions: 'Akcje pliku',
    download: 'Pobierz',
    previewAction: 'Podgląd',
    rename: 'Zmień nazwę',
    renameTitle: 'Zmień nazwę pliku',
    renameLabel: 'Nowa nazwa',
    renamed: 'Zmieniono nazwę',
    scope: 'Zakres',
    scopeClient: 'Klient',
    scopeProject: 'Projekt',

    uploading: (done: number, total: number) => `Wysyłanie ${done} z ${total}…`,
    uploaded: (count: number) =>
      count === 1 ? 'Dodano 1 plik' : `Dodano ${count} plik${count < 5 ? 'i' : 'ów'}`,
    uploadFailed: 'Nie udało się wysłać pliku.',
    downloaded: 'Zapisano plik',
    downloadFailed: 'Nie udało się pobrać pliku.',
    openFailed: 'Nie udało się otworzyć pliku.',

    // Odbicia PRZED wysyłką — po polsku i z nazwą pliku, bo Storage odrzuci
    // to samo po angielsku i bez kontekstu (pułapka z T-12).
    rejectedTooLarge: (name: string) => `${name}: plik jest za duży (maksymalnie 25 MB).`,
    rejectedExtension: (name: string) =>
      `${name}: ten typ pliku jest zablokowany ze względów bezpieczeństwa.`,
    rejectedEmpty: (name: string) => `${name}: plik jest pusty.`,

    deleteTitle: 'Usunąć plik?',
    deleteDescription: (name: string) =>
      `Plik „${name}" zostanie przeniesiony do kosza. Zajmowane miejsce zwolni się po jego trwałym usunięciu.`,
    deleted: 'Plik usunięty',

    // Pasek zużycia w Ustawieniach.
    usageTitle: 'Pliki',
    usageDescription: 'Miejsce zajęte przez pliki klientów i wygenerowane dokumenty.',
    usage: (used: string, quota: string) => `Zajęte ${used} z ${quota}`,
    usageWarning: 'Dostępne miejsce jest na wyczerpaniu — zalecane usunięcie zbędnych plików.',
    usageFull: 'Limit wyczerpany. Dodawanie plików będzie możliwe po zwolnieniu miejsca.',

    // Kosz (T-67).
    /** Wlasny ekran kosza (2026-08-27) — pokazuje sie takze pusty. */
    trashNav: 'Kosz',
    trashPageTitle: 'Kosz',
    trashCount: (count: number) => (count === 1 ? '1 usunięty plik' : `${count} usuniętych plików`),
    trashOccupies: (size: string, quota: string) =>
      quota
        ? `Zajmują ${size} z limitu ${quota}. Miejsce zwolni się dopiero po trwałym usunięciu.`
        : `Zajmują ${size}. Miejsce zwolni się dopiero po trwałym usunięciu.`,
    trashEmptyTitle2: 'Kosz jest pusty',
    trashEmptyDescription2: (days: number) =>
      `Usunięte pliki przechowywane są tutaj przez ${days} dni. W tym czasie możliwe jest ich przywrócenie.`,
    trashTitle: 'Kosz',
    trashDescription: (days: number, size: string) =>
      `Usunięte pliki przechowywane są przez ${days} dni, a następnie kasowane trwale. Zajmują ${size} — miejsce zwolni się po trwałym usunięciu.`,
    trashDays: (days: number) =>
      days === 1 ? 'zostanie usunięty jutro' : `zostanie usunięty za ${days} dni`,
    trashDueNow: 'zostanie usunięty przy najbliższym sprzątaniu',
    restore: 'Przywróć',
    restored: 'Plik przywrócony.',
    deletedForever: 'Plik usunięty na stałe.',
    deleteForeverTitle: 'Usunąć plik na stałe?',
    deleteForeverDescription: (name: string) =>
      `Plik „${name}" zostanie usunięty trwale. Operacji nie można cofnąć.`,
    trashEmpty: 'Opróżnij kosz',
    trashEmptyTitle: 'Opróżnić kosz?',
    trashEmptyDescription: (count: number, size: string) =>
      `${count} ${count === 1 ? 'plik zostanie usunięty' : 'plików zostanie usuniętych'} trwale. Zwolnione zostanie ${size}. Operacji nie można cofnąć.`,
    trashEmptied: (count: number) =>
      count === 1 ? 'Usunięto 1 plik.' : `Usunięto ${count} plików.`,
    trashEmptyFailed: (count: number) =>
      count === 1 ? 'Nie udało się usunąć 1 pliku.' : `Nie udało się usunąć ${count} plików.`,
    /** Dopisek pod paskiem zużycia, gdy w koszu coś leży. */
    usageTrashNote: (size: string) =>
      `W tym ${size} zajmują pliki w koszu — miejsce zwolni się po ich trwałym usunięciu.`,
    usageTrashLink: 'Otwórz kosz',
  },
  documents: {
    /**
     * Archiwum wyeksportowanych PDF-ow. Od T-100 „Dokumentacja", bo
     * „Dokumenty" to rejestr wycen, terminow, etapow i cennikow.
     */
    tab: 'Dokumentacja',
    title: 'Dokumentacja',
    emptyTitle: 'Brak dokumentów',
    emptyDescription:
      'Dokumenty PDF wyeksportowane z wycen zapisywane są tutaj automatycznie — w wersji przekazanej inwestorowi.',
    open: 'Otwórz',
    quoteNumber: 'Wycena',
    docType: 'Typ',
    created: 'Data',
    types: {
      quote: 'Wycena',
      schedule: 'Termin',
      stages: 'Etapy',
      price_list: 'Cennik',
      package: 'Pakiet',
    },
    unknownType: 'Dokument',

    // Archiwizacja przy eksporcie.
    saveToClient: 'Zapisz w dokumentach klienta',
    archived: 'Zapisano w dokumentach klienta',
    archiveFailed: 'Nie udało się zapisać w dokumentach klienta.',

    // Karta w prawej kolumnie edytora.
    recent: 'Dokumenty',
    recentEmpty: 'Wyeksportowane dokumenty PDF pojawią się w tym miejscu.',
    seeAll: 'Pokaż wszystkie',
    hint: 'Archiwum udostępnia zapisany plik — dokument nie jest generowany ponownie.',
  },
  /** Link dla klienta i akceptacja online (T-25/T-26). */
  share: {
    title: 'Udostępnij klientowi',
    action: 'Udostępnij',
    description:
      'Inwestor otwiera link w przeglądarce, wybiera pozycje TAK/NIE, a następnie akceptuje ofertę lub przekazuje uwagi. Zakładanie konta nie jest wymagane.',
    newLink: 'Utwórz link',
    creating: 'Tworzenie…',
    validFor: 'Ważny przez',
    copy: 'Kopiuj link',
    copied: 'Link skopiowany',
    copyFailed: 'Nie udało się skopiować linku.',
    sendByMail: 'Wyślij mailem',
    revoke: 'Odwołaj',
    revoked: 'Odwołany',
    expired: 'Wygasł',
    active: 'Aktywny',
    noLinks: 'Nie udostępniono jeszcze tej wyceny.',
    createFailed: 'Nie udało się utworzyć linku.',
    revokeFailed: 'Nie udało się odwołać linku.',
    revokeConfirm:
      'Odwołany link przestaje działać natychmiast. Inwestor zobaczy komunikat z prośbą o kontakt w sprawie nowego adresu.',
    expiresAt: 'Wygasa',
    neverExpires: 'Bezterminowy',
    created: 'Utworzony',
    views: 'Otwarcia',
    neverOpened: 'Jeszcze nieotwarty',
    openedTimes: (count: number) => (count === 1 ? 'Otwarty raz' : `Otwarty ${count} razy`),
    lastOpened: 'Ostatnio',
    /** Treść maila — projektant wysyła go ze swojej poczty (patrz IDEAS.md). */
    mailSubject: (number: string) => `Oferta ${number}`,
    mailBody: (url: string) =>
      `Dzień dobry,

w załączonym odnośniku przekazuję ofertę do wglądu:
${url}

Pod wskazanym adresem można wybrać zakres prac i potwierdzić wybór lub przekazać uwagi.

Z wyrazami szacunku`,
    baseUrlMissing:
      'Nie skonfigurowano adresu strony ofert (VITE_SHARE_BASE_URL). Link zostanie utworzony, lecz jego adres wymaga ręcznego złożenia.',

    // Akceptacja i uwagi (T-26).
    acceptedTitle: 'Oferta zaakceptowana',
    /** Oczko wersalikowe nad imieniem — mowi CO to jest, nie kto. */
    acceptedEyebrow: 'Zakres zaakceptowany przez inwestora',
    acceptedOn: (date: string, time: string) => `${date} o ${time}`,
    commentsWithUnread: (total: number, unread: number) =>
      `Uwagi klienta (${total}) · ${unread} nieprzeczytane`,
    acceptedBy: (name: string) => `Zaakceptował(a): ${name}`,
    acceptedAnonymously: 'Klient (bez podpisu)',
    unreadComments: (count: number) =>
      count === 1 ? '1 nieprzeczytana uwaga' : `${count} nieprzeczytanych uwag`,
    openQuote: 'Otwórz wycenę',
    linkLabel: 'Adres oferty dla klienta',
    acceptedScope: 'Zakres przyjęty przez klienta',
    turnedOff: (count: number) =>
      count === 1 ? 'Klient wyłączył 1 pozycję' : `Klient wyłączył ${count} pozycji`,
    turnedOn: (count: number) =>
      count === 1 ? 'Klient dobrał 1 pozycję' : `Klient dobrał ${count} pozycji`,
    noChanges: 'Klient przyjął ofertę bez zmian w zakresie.',
    comments: 'Uwagi klienta',
    commentsEmpty: 'Klient nie zostawił jeszcze uwag.',
    markRead: 'Oznacz jako przeczytane',
    unread: 'Nowe',
    anonymous: 'Klient',

    // Powiadomienia Realtime (T-26).
    acceptedToast: 'Klient zaakceptował ofertę.',
    commentToast: 'Klient zostawił uwagi do oferty.',

    /*
     * ŚCIEŻKA DECYZJI (poprawka 7a, 2026-08-27).
     *
     * Do tej pory o tym, co się dzieje z ofertą, mówiły trzy rozsypane
     * elementy: pigułka statusu, wiersz „otwarty 4 razy" w oknie udostępniania
     * i osobna karta akceptacji. Każdy z nich był prawdziwy i żaden nie
     * odpowiadał na pytanie „na czym stoimy". Oś odpowiada.
     */
    pathTitle: 'Stan procesu ofertowego',
    pathSent: 'Oferta przekazana',
    pathSentPending: 'Oferta nieprzekazana',
    pathSentHint: 'Utwórz link do oferty lub oznacz wycenę jako wysłaną.',
    pathOpened: 'Inwestor otworzył link',
    pathOpenedPending: 'Link nieotwarty',
    pathOpenedHint: 'Do czasu otwarcia linku dalsze kroki pozostają wstrzymane.',
    pathComments: (count: number) =>
      count === 1 ? '1 uwaga inwestora' : `${count} uwagi/uwag inwestora`,
    pathCommentsNone: 'Brak uwag',
    pathDecisionPending: 'Oczekiwanie na decyzję',
    pathDecisionPendingHint: 'Inwestor może zaakceptować ofertę, odrzucić ją lub przekazać uwagi.',
    pathAccepted: 'Oferta zaakceptowana',
    pathRejected: 'Oferta odrzucona',
    pathRejectedReason: (reason: string) => `Uzasadnienie: ${reason}`,
    pathNoReason: 'Inwestor nie podał uzasadnienia.',
    /** Ręczna zmiana statusu zniknęła — mówimy o tym wprost, raz. */
    pathManualNote:
      'Akceptacja i odmowa rejestrowane są wyłącznie przez inwestora, pod przekazanym linkiem. Data i zakres stanowią zatem jego oświadczenie, a nie zapis wprowadzony po stronie pracowni.',

    // Które pozycje klient odznaczył — nazwami, nie liczbą.
    turnedOffTitle: 'Klient odznaczył',
    turnedOnTitle: 'Klient dobrał',
  },
  editor: {
    preview: 'Podgląd',
    edit: 'Edycja',
    section: 'Sekcja',
    group: 'Grupa',
    item: 'Pozycja',
    addSection: 'Dodaj sekcję',
    addGroup: 'Dodaj grupę',
    addItem: 'Dodaj pozycję',
    fromLibrary: 'Z biblioteki',
    fromLibraryGroup: 'Grupa z biblioteki',
    saveToLibrary: 'Zapisz do biblioteki',
    savedToLibrary: 'Zapisano w bibliotece',
    saveAllToLibrary: 'Zapisz wszystko do biblioteki',
    saveAllToLibraryDone: (count: number) =>
      count === 1 ? 'Zapisano 1 pozycję w bibliotece' : `Zapisano ${count} pozycji w bibliotece`,
    saveAllToLibraryEmpty: 'Brak pozycji do zapisania — pozycje wymagają wcześniejszego nazwania.',
    saveGroupToLibrary: 'Zapisz zestaw do biblioteki',
    savedGroupToLibrary: 'Zapisano zestaw w bibliotece',
    saveGroupToLibraryDone: (name: string) => `Zestaw „${name}” zapisano w bibliotece`,
    saveGroupToLibraryEmpty: 'Zestaw jest pusty — dodaj pozycje przed zapisaniem.',
    saveGroupToLibraryUnnamed:
      'Grupa wymaga nazwy — zestaw bez nazwy nie będzie możliwy do odnalezienia.',
    pickerSearch: 'Szukaj w bibliotece',
    pickerEmpty: 'Brak dopasowań',
    pickerLibraryEmpty: 'Biblioteka jest pusta',
    pickerItemsTab: 'Pozycje',
    pickerGroupsTab: 'Grupy',
    pickerGroupItems: (count: number) => `${count} poz.`,

    // Picker zostaje otwarty po dodaniu (T-70).
    pickerAllCategories: 'Wszystkie',
    pickerAdded: (count: number) => (count === 1 ? 'Dodano' : `Dodano ×${count}`),
    pickerAddedSummary: (count: number) => {
      if (count === 1) return 'Dodano 1 pozycję';
      const rest = count % 10;
      const tens = count % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return `Dodano ${count} pozycje`;
      return `Dodano ${count} pozycji`;
    },
    pickerDone: 'Gotowe',
    priceFrom: (amount: string) => `od ${amount}`,
    pickerNoRooms:
      'Wycena nie zawiera pomieszczeń — usługa zostanie policzona wyłącznie od stawki bazowej.',
    pickerNoRoomsAction: 'Dodaj pomieszczenia',

    // Panel „Dodaj usługi” — zakres wyceny jako tabela z biblioteki (T-71, inspiracja 1).
    scopeOpen: 'Dodaj usługi',
    scopeTitle: 'Dodaj usługi do wyceny',
    scopeHint:
      'Przycisk „Dodaj” przy usłudze umieszcza ją bezpośrednio w wycenie. Panel pozostaje otwarty do momentu wybrania opcji „Gotowe”.',
    scopeTarget: 'Dodaj do',
    scopeTargetLabel: (section: string, group: string | null) =>
      group ? `${section} › ${group}` : section,
    scopeSearch: 'Szukaj usługi…',
    scopeCount: (count: number) => {
      if (count === 1) return '1 usługa';
      const rest = count % 10;
      const tens = count % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return `${count} usługi`;
      return `${count} usług`;
    },
    scopeTabItems: 'Usługi',
    scopeTabSets: 'Zestawy',
    scopeColService: 'Usługa',
    scopeColGroup: 'Grupa',
    scopeColMode: 'Sposób wyceny',
    scopeColPrice: 'Cena / stawka',
    scopeAdd: 'Dodaj',
    scopeAddLabel: (name: string) => `Dodaj do wyceny: ${name}`,
    scopeNoGroup: 'Bez grupy',
    scopeEmpty: 'Brak pozycji spełniających kryteria filtrowania.',
    scopeLibraryEmpty: 'Biblioteka jest pusta — usługi dodaje się w sekcji Biblioteka.',
    scopeSetsEmpty:
      'Nie utworzono jeszcze żadnego zestawu. Grupę pozycji wyceny można zapisać jako zestaw ikoną zakładki.',
    scopeSetItems: (count: number) => (count === 1 ? '1 pozycja' : `${count} poz.`),
    scopeNoRoomsTitle: 'Wycena nie zawiera pomieszczeń',
    scopeNoRoomsBody:
      'Usługi rozliczane według pomieszczeń pobierają stawki z biblioteki dla każdego pomieszczenia ujętego w wycenie. Przy braku pomieszczeń uwzględniana jest wyłącznie stawka bazowa — najczęściej 0 zł.',
    scopeNoRoomsAction: 'Dodaj pomieszczenie',
    scopeRoomsOk: (count: number) =>
      count === 1
        ? 'Usługi według pomieszczeń policzą się dla 1 pomieszczenia wyceny.'
        : `Usługi według pomieszczeń policzą się dla ${count} pomieszczeń wyceny.`,
    addItemManual: 'Pozycja ręcznie',
    // Nagłówek kolumn nad pozycjami w trybie edycji.
    itemsColName: 'Usługa',
    itemsColQty: 'Ilość',
    itemsColPrice: 'Cena',
    // Pomieszczenia wyceny (cennik parametryczny).
    rooms: 'Pomieszczenia',
    roomsHint: 'Usługi rozliczane za pomieszczenie pobierają z tej listy swoje składniki.',

    /*
     * PANEL POMIESZCZEŃ MÓWI, PO CO JEST (poprawka 7, 2026-08-27).
     *
     * Wcześniej lista zaczynała się od pustego pola i dwóch kwadracików
     * podpisanych „W" i „T". Legenda stała pod spodem, więc czytało się ją
     * dopiero po tym, jak coś już się kliknęło.
     */
    roomsPurpose:
      'Wykaz pomieszczeń objętych projektem. Usługi wyceniane „za pomieszczenie" mnożą przez niego swoją stawkę; pozostałe pozycje z niego nie korzystają.',
    roomsCount: (count: number) => (count === 1 ? '1 pomieszczenie' : `${count} pomieszczeń`),
    roomsColumnName: 'Pomieszczenie',
    roomsColumnQty: 'Ile',
    roomsSplit: (visual: number, technical: number) =>
      `Do części wizualnej liczy się ${visual}, do technicznej ${technical}.`,
    roomsEmpty:
      'Brak pomieszczeń. Lista ma znaczenie wyłącznie wtedy, gdy któraś z usług rozliczana jest za pomieszczenie.',
    addRoom: 'Dodaj pomieszczenie',
    newRoomName: 'Nowe pomieszczenie',
    roomNameLabel: (room: string) => `Nazwa pomieszczenia: ${room}`,
    roomQtyLabel: (room: string) => `Ilość: ${room}`,
    roomTypeLabel: (room: string) => `Typ pomieszczenia: ${room}`,
    roomTypeCustom: 'Własne',
    removeRoom: (room: string) => `Usuń pomieszczenie: ${room}`,
    removeRoomTitle: 'Usunąć pomieszczenie?',
    removeRoomDescription: (room: string) =>
      `Pomieszczenie „${room}” zostanie usunięte z wyceny, a usługi rozliczane za pomieszczenie zostaną przeliczone bez niego. Pozycje przypisane do tego pomieszczenia pozostaną w wycenie i utracą jedynie przypisanie.`,
    /** Kolumna M z arkusza — „w projekcie”. */
    roomVisual: (room: string) => `Część wizualna: ${room}`,
    /** Kolumna A z arkusza — „w części technicznej”. */
    roomTechnical: (room: string) => `Część techniczna: ${room}`,
    roomVisualShort: 'W',
    roomTechnicalShort: 'T',
    roomFlagsHint:
      'W — część wizualna (projekt aranżacji), T — część techniczna (rysunki wykonawcze). Usługa rozliczana za pomieszczenie uwzględnia wyłącznie pomieszczenia oznaczone w danym zakresie.',
    /** Podpowiedź pod kursorem na kwadraciku — legenda nie zawsze jest widoczna. */
    roomVisualTitle: 'Wlicza się do części wizualnej',
    roomTechnicalTitle: 'Wlicza się do części technicznej',
    /*
     * Teksty „Rozpisz na pomieszczenia" i „Do wszystkich pomieszczeń" usunięte
     * 2026-08-27 razem z przyciskami (poprawka 7) — obie akcje budowały
     * strukturę dokumentu za autora. Same bloki pomieszczeń zostają.
     */
    roomBlockLabel: (room: string, qty: number) => (qty > 1 ? `${room} ×${qty}` : room),
    roomBlockOff: 'pominięte',

    // Zakladki edytora i harmonogram (F5.2).
    tabQuote: 'Wycena',
    tabSchedule: 'Termin',
    tabDocuments: 'Dokumenty',

    // Dokument „Etapy wspolpracy" (F6.1).
    stagesDocTitle: 'Etapy współpracy',
    stagesDocIntro: (objete: number, wszystkie: number) =>
      `Zakres oferty obejmuje ${objete} z ${wszystkie} etapów. Pozostałe pozostają na liście, aby zakres wyłączony z oferty był jednoznaczny.`,
    stagesDocEmpty: 'Dokument zostanie utworzony po przejściu w tryb edycji.',
    stagesDocValidDays: 'Ważny (dni)',
    stagesDocFootnote: 'Przypis',
    stagesDocFootnotePlaceholder: 'Uwagi do zakresu, zastrzeżenia…',
    addStageEntry: 'Dodaj etap',
    newStageEntryName: 'Nowy etap',
    stageEntryIncluded: (name: string) => `Zawarte w ofercie: ${name}`,
    stageEntryNameLabel: (name: string) => `Nazwa etapu: ${name}`,
    stageEntryDescriptionLabel: (name: string) => `Opis etapu: ${name}`,
    stageEntryDescriptionPlaceholder: 'Co obejmuje ten etap…',
    removeStageEntry: (name: string) => `Usuń etap: ${name}`,

    // Dokument „Cennik uslug dodatkowych” (F6.2).
    docTabStages: 'Etapy współpracy',
    docTabPriceList: 'Cennik dodatkowy',
    priceListTitle: 'Cennik usług dodatkowych',
    priceListIntro:
      'Usługi wykraczające poza zakres niniejszej oferty. Ceny podano w widełkach — ostateczna kwota ustalana jest po określeniu szczegółowego zakresu.',
    priceListEmpty: 'Cennik zostanie utworzony po przejściu w tryb edycji.',
    priceListValidDays: 'Ważny (dni)',
    priceListFootnote: 'Przypis',
    priceListFootnotePlaceholder: 'Uwagi do cennika, zastrzeżenia…',
    addPriceListItem: 'Dodaj pozycję cennika',
    newPriceListItemName: 'Nowa usługa',
    priceListNameLabel: (name: string) => `Nazwa usługi: ${name}`,
    priceListDescriptionLabel: (name: string) => `Opis usługi: ${name}`,
    priceListDescriptionPlaceholder: 'Co obejmuje ta usługa…',
    priceListMinLabel: (name: string) => `Cena od: ${name}`,
    priceListMaxLabel: (name: string) => `Cena do: ${name}`,
    priceListUnitLabel: (name: string) => `Jednostka: ${name}`,
    priceListUnitPlaceholder: 'h',
    priceListLeadTimeLabel: (name: string) => `Termin realizacji: ${name}`,
    priceListLeadTimePlaceholder: 'termin realizacji',
    removePriceListItem: (name: string) => `Usuń pozycję cennika: ${name}`,
    addPriceListItemToQuote: 'Dodaj do wyceny jako pozycję',
    addPriceListItemToQuoteLabel: (name: string) => `Dodaj do wyceny jako pozycję: ${name}`,
    priceListAddedToQuote: (name: string) => `Dodano do wyceny: ${name}`,
    priceListAddedToQuoteHint: (section: string) =>
      `Trafiło do sekcji „${section}” z dolną granicą przedziału — sprawdź kwotę.`,

    // Most z dwoma efektami: koszt i termin (T-64).
    priceListAddedDays: '+dni',
    priceListAddedDaysLabel: (name: string) => `Dni doliczane do terminu: ${name}`,
    priceListAddedDaysPlaceholder: 'dni',
    priceListAddedDaysHint: 'Dni robocze wykonawcy doliczane po dodaniu usługi do wyceny.',
    addToQuoteTitle: 'Zakres zmiany',
    addToQuoteCost: 'Wycena — pozycja z kwotą',
    addToQuoteSchedule: (days: number) =>
      days === 1 ? 'Termin — +1 dzień roboczy' : `Termin — +${days} dni roboczych`,
    addToQuoteScheduleNew: 'Wycena nie zawiera jeszcze terminu — zostanie on utworzony.',
    addToQuoteConfirm: 'Dodaj',
    priceListAddedToSchedule: (name: string, days: number) =>
      days === 1 ? `Termin dłuższy o 1 dzień: ${name}` : `Termin dłuższy o ${days} dni: ${name}`,
    priceListNothingSelected: 'Wskaż co najmniej jeden zakres zmiany.',

    // Etap zbiorczy „Usługi dodatkowe" w zakładce Termin.
    extrasStageName: 'Usługi dodatkowe',
    extrasStageHint: 'Dni wynikające z cennika dodatkowego. Suma składników poniżej.',
    extrasEntryDaysLabel: (name: string) => `Dni usługi: ${name}`,
    removeExtrasEntry: (name: string) => `Usuń z terminu: ${name}`,
    scheduleTitle: 'Szacowany termin',
    /*
     * ZAKŁADKA MÓWI, JAK LICZY (poprawka 7b, 2026-08-27).
     *
     * Wcześniej zaczynała się od paska czterech pól z etykietami w rodzaju
     * „Dni rob./tydz. — wykonawca" i listy etapów bez główki. Wszystko było
     * prawdziwe i nic nie tłumaczyło, skąd bierze się data na dole.
     */
    scheduleIntro:
      'Termin stanowi sumę etapów. Każdy etap ma przypisaną liczbę dni oraz stronę, która je wykorzystuje: pracownię albo inwestora. Etapy zależne od pomieszczeń korzystają z tej samej listy co wycena.',
    scheduleAssumptions: 'Założenia',
    scheduleAssumptionsHint:
      'Na podstawie tych czterech wartości wyznaczane są daty w podsumowaniu obok. Bez daty rozpoczęcia obliczana jest wyłącznie liczba dni.',
    scheduleStart: 'Start prac',
    scheduleProviderWeek: 'Dni robocze / tydzień — pracownia',
    scheduleClientWeek: 'Dni robocze / tydzień — inwestor',
    scheduleHolidays: 'Dni wolne',
    scheduleHolidaysPl: 'z polskimi świętami',
    scheduleHolidaysNone: 'tylko weekendy',
    /** Główka nad listą etapów — te same wersaliki co nad tabelami. */
    scheduleColumnStage: 'Etap',
    scheduleColumnOwner: 'Kto',
    scheduleColumnDays: 'Dni',
    scheduleOwnerLegend:
      'ARCH. — czas pracy pracowni, INW. — czas po stronie inwestora (decyzje, akceptacje, dobór materiałów). Rozdzielenie tych wartości jest istotne: to czas inwestora najczęściej wydłuża termin realizacji.',
    scheduleEmpty: 'Harmonogram zostanie utworzony po przejściu w tryb edycji.',
    scheduleNoRooms:
      'Wycena nie zawiera pomieszczeń — etapy zależne od pomieszczeń uwzględniają wyłącznie dni bazowe.',
    scheduleResult: 'Wynik',
    scheduleProviderDays: 'Dni robocze — pracownia',
    scheduleClientDays: 'Dni robocze — inwestor',
    scheduleEndOptimal: 'Optymalne zakończenie',
    scheduleEndLatest: 'Najpóźniejsze',
    /** Dlaczego widełki, a nie jedna data — pytanie pada za każdym razem. */
    scheduleRangeHint:
      'Termin optymalny zakłada niezwłoczne decyzje inwestora. Termin najpóźniejszy uwzględnia jego dni w pełnym wymiarze. Rzeczywisty termin mieści się pomiędzy tymi wartościami — stąd widełki zamiast jednej daty.',
    scheduleNoStart: 'Podanie daty rozpoczęcia umożliwi wyznaczenie terminów.',
    scheduleCalendarHint: (optimal: number, latest: number) =>
      `W przeliczeniu na dni kalendarzowe: ${optimal}–${latest}.`,
    addStage: 'Dodaj etap',
    newStageName: 'Nowy etap',
    stageEnabled: (name: string) => `Uwzględnij etap: ${name}`,
    stageNameLabel: (name: string) => `Nazwa etapu: ${name}`,
    stageOwnerLabel: (name: string) => `Kto zużywa czas: ${name}`,
    stageOwnerProvider: 'ARCH.',
    stageOwnerClient: 'INW.',
    stageOwnerProviderFull: 'Wykonawca',
    stageOwnerClientFull: 'Inwestor',
    stageDays: (days: number) => (days === 1 ? '1 dzień' : `${days} dni`),
    stageBaseDays: 'Dni bazowe',
    stageBaseDaysLabel: (name: string) => `Dni bazowe: ${name}`,
    stageScope: 'Zakres',
    stageScopeLabel: (name: string) => `Zakres pomieszczeń: ${name}`,
    stageScopeNone: 'bez pomieszczeń',
    stageScopeAll: 'wszystkie',
    stageScopeVisual: 'część wizualna',
    stageScopeTechnical: 'część techniczna',
    stagePerRoom: 'Dni za pomieszczenie',
    stageDefaultPerRoom: 'Pozostałe',
    stageDefaultPerRoomLabel: (name: string) => `Dni za pozostałe pomieszczenia: ${name}`,
    stageRoomDaysLabel: (name: string, room: string) => `Dni za ${room}: ${name}`,
    stageNoRoomTypes: 'Brak typów pomieszczeń — słownik uzupełnia się w Bibliotece.',
    removeStage: (name: string) => `Usuń etap: ${name}`,
    stageAutoEnabled: (name: string) =>
      `Etap „${name}" został włączony — obejmuje go zakres wyceny.`,
    stageEntryAutoIncluded: (name: string) =>
      `Etap „${name}” został dodany do zakresu — obejmuje go wycena.`,
    roomBlockNameHint:
      'Nazwa pochodzi z panelu „Pomieszczenia" obok i tam podlega edycji. Tutaj jest wyłącznie prezentowana.',
    itemFramesLabel: 'Liczba kadrów',
    pricingBasis: 'Sposób liczenia',
    basisAmount: 'Kwotowo',
    basisTime: 'Godzinowo',
    hourlyRate: 'Stawka za godzinę',
    hourlyRateMissing: 'Brak stawki godzinowej powoduje, że wszystkie kwoty wynoszą zero.',
    workload: 'Pracochłonność',
    workloadEstimate: 'Szacowana pracochłonność',
    workloadEstimateHint:
      'Wartość szacunkowa wyliczona z kwot według stawki z ustawień, a nie z wprowadzonego czasu pracy.',
    workloadNoRate: 'Oszacowanie czasu wymaga ustawienia stawki godzinowej w Ustawieniach.',
    workloadCommunication: 'Komunikacja projektowa',
    workloadCommunicationHint: 'Wartość ujęta w sumie poniżej.',
    workloadTotal: 'Razem',
    // `itemTagCommunication` / `itemTagsLabel` zdjęte 2026-08-27 razem
    // z przełącznikiem przy pozycji (poprawka 7). Wiersz „w tym komunikacja"
    // w pracochłonności zostaje — dla wycen, w których etykietę już nadano.
    itemMinutesLabel: 'Minuty pracy',
    convertTitle: 'Przeliczyć wartości?',
    convertDescription: (rate: string) =>
      `Wycena zawiera już pozycje. Przeliczyć ich wartości według stawki ${rate}, czy pozostawić bez zmian?`,
    convertDescriptionNoRate:
      'Wycena zawiera pozycje, lecz nie ustalono stawki godzinowej — przeliczenie nie jest możliwe. Wartości pozostaną bez zmian i będą interpretowane jako minuty.',
    convertYes: 'Przelicz',
    convertNo: 'Pozostaw bez zmian',
    convertedToTime: 'Kwoty przeliczone na minuty.',
    convertedToAmount: 'Minuty przeliczone na kwoty.',
    libraryBasisMismatch:
      'Pozycja rozliczana jest w innych jednostkach. Przeliczenie wymaga ustawienia stawki godzinowej.',
    libraryConvertedToTime: 'Przeliczono z kwoty na minuty według stawki wyceny.',
    libraryConvertedToAmount: 'Przeliczono z minut na kwotę według stawki wyceny.',
    insertPlaceholder: 'Wstaw pole automatyczne',
    placeholdersTitle: 'Pola podstawiane przy podglądzie',
    itemVariantLabel: 'Wariant pozycji',
    itemVariantPlaceholder: 'Wybierz wariant',
    /** Skąd wzięła się cena pozycji parametrycznej — np. „baza 200,00 zł + 7 pom.”. */
    pricingFromRooms: (base: string, rooms: number) =>
      rooms === 1 ? `baza ${base} + 1 pom.` : `baza ${base} + ${rooms} pom.`,
    pricingFromFrames: (frames: number) =>
      frames === 1 ? 'pomieszczenie + 1 kadr' : `pomieszczenie + ${frames} kadry/ów`,

    // Rabaty jako osobna lista (T-36).
    discountsTitle: 'Rabaty',
    addDiscountEntry: 'Dodaj rabat',
    newDiscountName: 'Rabat',
    discountNameLabel: (name: string) => `Nazwa rabatu: ${name}`,
    discountToggle: (name: string) => `Uwzględnij rabat: ${name}`,
    removeDiscount: (name: string) => `Usuń rabat: ${name}`,
    discountTypeLabel: (name: string) => `Rodzaj rabatu: ${name}`,
    discountTypeFixed: 'zł',
    discountTypePercent: '%',
    discountValueLabel: (name: string) => `Wartość rabatu: ${name}`,
    discountScopeLabel: (name: string) => `Zakres rabatu: ${name}`,
    discountScopeQuote: 'Cała wycena',
    discountScopeSection: 'Sekcja',
    discountScopeItems: 'Wybrane pozycje',
    discountConditionLabel: (name: string) => `Tylko przy komplecie: ${name}`,
    discountConditionShort: 'Tylko przy komplecie',
    discountConditionHint:
      'Rabat przysługuje wyłącznie w przypadku wyboru wszystkich pozycji objętych zakresem.',
    /** Dlaczego rabat wynosi 0 zł — bez tego wygląda jak błąd. */
    discountUnmet: (enabled: number, total: number) =>
      `Warunek niespełniony (${enabled}/${total} pozycji)`,
    discountRoundLabel: (name: string) => `Zaokrąglenie: ${name}`,
    discountRoundNone: 'bez zaokrąglania',
    discountRoundTo: (zl: number) => `do ${zl} zł`,
    discountsEmpty: 'Brak rabatów.',
    discountSectionMissing: 'Wskaż sekcję',

    perSection: 'Per etap',
    perSectionShow: 'Pokaż podział na etapy',
    perSectionHide: 'Ukryj podział na etapy',
    perSectionUnnamed: 'Bez nazwy',

    exportPdf: 'Eksportuj PDF',
    pdfSaved: 'Zapisano PDF',
    pdfOpen: 'Otwórz',
    pdfFailed: 'Nie udało się wygenerować PDF.',
    markAsSentTitle: 'Oznaczyć wycenę jako wysłaną?',
    markAsSentDescription:
      'Dokument PDF został zapisany. Jeżeli jest przekazywany inwestorowi, status wyceny zmieni się ze szkicu na „Wysłana" i zostanie ona ujęta w zestawieniach.',
    markAsSentConfirm: 'Oznacz jako wysłaną',
    markAsSentDismiss: 'Pozostaw szkic',
    markedAsSent: 'Wycena oznaczona jako wysłana.',

    summary: 'Podsumowanie',
    itemsTotal: 'Suma pozycji',
    discounts: 'Rabaty',
    net: 'Razem netto',
    vat: 'VAT',
    gross: 'Razem brutto',
    validUntil: 'Ważna do',
    saved: 'Zapisano',
    saving: 'Zapisywanie…',
    saveError: 'Błąd zapisu — ponów',
    conflict: 'Wycena została zmieniona w innej sesji — wymagane ponowne wczytanie.',
    reload: 'Przeładuj',

    eyebrow: 'Oferta projektowa',

    // Karta „Klient" w prawej kolumnie (T-53).
    clientCard: 'Klient',
    clientPick: 'Wybierz klienta',
    clientSearch: 'Szukaj klienta…',
    clientEmpty: 'Nie znaleziono klienta',
    clientNone: 'Bez klienta',
    clientNew: 'Nowy klient',
    clientOpen: 'Otwórz kartę klienta',
    clientRefresh: 'Odśwież dane klienta',
    clientRefreshed: 'Przepisano dane z kartoteki',
    clientOutdated: 'Dane w dokumencie różnią się od danych w kartotece.',
    clientSnapshotHint:
      'Wycena przechowuje kopię danych z chwili jej utworzenia — edycja kartoteki nie zmienia treści przekazanej oferty.',
    clientAttached: (name: string) => `Wycena przypięta do klienta: ${name}`,
    clientDetached: 'Wycena odpięta od klienta',
    projectLabel: 'Projekt',
    projectPick: 'Wybierz projekt',
    projectNone: 'Bez projektu',
    projectNew: 'Nowy projekt',
    projectNeedsClient: 'Wybór projektu wymaga wcześniejszego wskazania klienta.',
    projectOpen: 'Otwórz projekt',

    individualPrice: 'wycena indywidualna',
    individualNote: (count: number) =>
      count === 1
        ? '+ 1 pozycja wyceniana indywidualnie'
        : count >= 2 && count <= 4
          ? `+ ${count} pozycje wyceniane indywidualnie`
          : `+ ${count} pozycji wycenianych indywidualnie`,
    investor: 'Inwestor',
    date: 'Data',
    phone: 'Telefon',
    email: 'E-mail',
    city: 'Miasto',
    validity: 'Ważność oferty',
    projectDescription: 'Opis projektu',
    projectDescriptionPlaceholder: 'Opis projektu — kliknij, aby uzupełnić…',
    preparedBy: 'Ofertę przygotował/a',
    titlePlaceholder: 'Tytuł wyceny',
    subtitlePlaceholder: 'Podtytuł (opcjonalnie)',
    introPlaceholder: 'Tekst wprowadzenia widoczny dla inwestora…',
    /** 1 dzień / 2 dni / 22 dni — w polskim tylko liczba pojedyncza jest inna. */
    days: (count: number) => (count === 1 ? '1 dzień' : `${count} dni`),

    newSectionName: 'Nowa sekcja',
    newGroupName: 'Nowe pomieszczenie',
    newItemName: 'Nowa pozycja',
    newItemDescription: 'Opis pozycji.',
    sectionTitleLabel: 'Tytuł sekcji',
    groupNameLabel: 'Nazwa grupy',
    itemNameLabel: 'Nazwa pozycji',
    itemDescriptionLabel: 'Opis pozycji',
    itemPriceLabel: 'Cena pozycji',
    itemQtyLabel: 'Ilość',
    makeDiscount: 'Zamień na rabat',
    makeItem: 'Zamień na pozycję',

    dragItem: 'Przenieś pozycję',
    dragGroup: 'Przenieś grupę',
    dragSection: 'Przenieś sekcję',
    moveUp: 'Przesuń wyżej',
    moveDown: 'Przesuń niżej',
    dnd: {
      start: (name: string) =>
        `Podniesiono: ${name}. Strzałkami wybierz miejsce, spacją upuść, Escape anuluje.`,
      over: (name: string, target: string) => `${name} nad: ${target}.`,
      dropped: (name: string) => `Upuszczono: ${name}.`,
      cancelled: (name: string) => `Anulowano przenoszenie: ${name}.`,
    },

    toggleItem: 'Włącz lub wyłącz pozycję',
    toggleGroup: 'Włącz lub wyłącz całą grupę',
    removeItem: 'Usuń pozycję',
    removeGroup: 'Usuń grupę',
    removeSection: 'Usuń sekcję',
    removeGroupConfirmTitle: 'Usunąć grupę razem z pozycjami?',
    removeSectionConfirmTitle: 'Usunąć sekcję razem z zawartością?',
    removeConfirmDescription: 'Operacji nie można cofnąć.',

    corruptedTitle: 'Wycena uszkodzona',
    corruptedDescription:
      'Odczytanie treści wyceny nie powiodło się. Dane pozostają bezpieczne, lecz edytor nie jest w stanie ich otworzyć — prosimy o kontakt z pomocą techniczną.',
    backToList: 'Dokumenty',
    itemsCount: (count: number) => `${count} poz.`,
  },
  /*
   * BRIEF KLIENTA (T-93, poprawka 9 z 2026-08-27).
   *
   * Pierwszy etap współpracy — wcześniejszy niż wycena, bo dopiero z briefu
   * wiadomo, co właściwie wycenić.
   */
  brief: {
    tab: 'Brief',
    title: 'Brief klienta',
    intro:
      'Kwestionariusz wypełniany przez inwestora przed rozpoczęciem prac projektowych. Udostępniany linkiem — bez zakładania konta, z możliwością uzupełniania etapami.',
    create: 'Wystaw brief',
    creating: 'Tworzenie…',
    createFailed: 'Nie udało się utworzyć briefu.',
    empty: 'Dla tego klienta nie wystawiono jeszcze briefu.',

    // Wybór szablonu i terminu ważności przy wystawianiu linku (T-96).
    newTitle: 'Wystawienie briefu',
    newDescription:
      'Zestaw pytań zostanie skopiowany do briefu w chwili wystawienia. Późniejsze zmiany szablonu nie wpłyną na ten dokument.',
    templateLabel: 'Szablon pytań',
    templateBuiltIn: 'Zestaw wbudowany',
    templateDefaultSuffix: ' (domyślny)',
    templateManage: 'Szablony briefu można edytować w Ustawieniach.',
    expiryLabel: 'Ważność linku',
    expiryDays: (days: number) => `${days} dni`,
    expiryNever: 'Bezterminowo',
    submit: 'Wystaw i skopiuj link',
    linkLabel: 'Adres briefu dla klienta',
    copy: 'Kopiuj link',
    copied: 'Link skopiowany',
    copyFailed: 'Nie udało się skopiować linku.',
    sendByMail: 'Wyślij mailem',
    revoke: 'Odwołaj link',
    revokeConfirm:
      'Odwołany link przestaje działać natychmiast. Odpowiedzi już przesłane pozostają zachowane.',
    revoked: 'Odwołany',
    expired: 'Wygasł',
    waiting: 'Oczekuje na odpowiedzi',
    open: 'Otwarty',
    validFor: 'Ważny przez',
    neverOpened: 'Nieotwarty przez klienta',
    openedTimes: (count: number) => (count === 1 ? 'Otwarty raz' : `Otwarty ${count} razy`),
    submittedOn: (date: string) => `Przesłany ${date}`,
    progress: (answered: number, total: number) => `Uzupełnione ${answered} z ${total}`,
    noAnswerYet: 'Brak odpowiedzi',
    answersTitle: 'Odpowiedzi klienta',
    delete: 'Usuń brief',
    deleteConfirm:
      'Brief zostanie usunięty wraz z odpowiedziami klienta. Operacji nie można cofnąć.',

    /** Treść maila — projektant wysyła go ze swojej poczty, jak przy ofercie. */
    mailSubject: 'Brief przed rozpoczęciem prac projektowych',
    mailBody: (url: string) =>
      `Dzień dobry,

przed rozpoczęciem prac projektowych uprzejmie prosimy o wypełnienie briefu:
${url}

Formularz nie wymaga zakładania konta, a wprowadzone odpowiedzi są zapisywane na bieżąco — można go uzupełniać etapami.

Z wyrazami szacunku`,
  },

  /*
   * SZABLONY BRIEFU (T-96).
   *
   * Zestaw pytań przestaje być stałą w kodzie i staje się konfiguracją
   * pracowni. Teksty mówią o formularzu, nie o dokumencie — dokumentem jest
   * brief z odpowiedziami i on ma własny, niezmienny snapshot pytań.
   */
  briefTemplates: {
    tab: 'Brief',
    title: 'Szablony briefu',
    intro:
      'Zestawy pytań kierowanych do inwestora. Szablonów może być kilka — osobny dla mieszkania, lokalu usługowego czy pojedynczego pomieszczenia. Zmiany obowiązują od kolejnego wystawionego briefu; dokumenty już przekazane klientom pozostają bez zmian.',
    listTitle: 'Szablony',
    add: 'Nowy szablon',
    addFromDefault: 'Nowy na bazie wbudowanego',
    duplicate: 'Duplikuj',
    setDefault: 'Ustaw jako domyślny',
    isDefault: 'Domyślny',
    defaultHint: 'Szablon podpowiadany przy wystawianiu briefu.',
    nameLabel: 'Nazwa szablonu',
    namePlaceholder: 'Brief — mieszkanie',
    nameHint: 'Widoczna wyłącznie w aplikacji. Klient otrzymuje pytania, nie nazwę formularza.',
    empty: 'Nie utworzono jeszcze żadnego szablonu.',
    emptyHint:
      'Do czasu utworzenia własnego szablonu briefy wystawiane są na podstawie zestawu wbudowanego.',
    defaultName: 'Brief klienta',
    copySuffix: ' (kopia)',
    remove: 'Usuń szablon',
    removeConfirm:
      'Szablon zostanie usunięty. Briefy wystawione na jego podstawie zachowują własną kopię pytań i pozostają nienaruszone.',

    // Edytor
    editorTitle: 'Treść formularza',
    sections: 'Sekcje',
    addSection: 'Dodaj sekcję',
    sectionTitleLabel: 'Tytuł sekcji',
    sectionHintLabel: 'Opis sekcji',
    sectionHintPlaceholder: 'Zdanie wyjaśniające, czemu służy ten blok pytań.',
    removeSection: 'Usuń sekcję',
    removeSectionConfirm: 'Sekcja zostanie usunięta wraz ze wszystkimi zawartymi w niej pytaniami.',
    moveUp: 'Przenieś wyżej',
    moveDown: 'Przenieś niżej',
    questions: 'Pytania',
    addQuestion: 'Dodaj pytanie',
    removeQuestion: 'Usuń pytanie',
    questionLabel: 'Treść pytania',
    questionLabelPlaceholder: 'O co pytamy inwestora?',
    questionHint: 'Podpowiedź pod pytaniem',
    questionHintPlaceholder: 'Wyjaśnienie, w jakim celu zadajemy to pytanie.',
    questionPlaceholder: 'Przykładowa odpowiedź',
    questionRequired: 'Odpowiedź wymagana',
    questionRequiredHint:
      'Pytań wymaganych powinno być jak najmniej — formularz uzupełniany etapami musi dać się zapisać w każdym momencie.',
    questionOptions: 'Opcje odpowiedzi',
    questionOptionsHint: 'Po jednej w wierszu. Wymagane są co najmniej dwie.',
    /** Odmiana jak w polszczyźnie: 1 pytanie, 2–4 pytania, 5–21 pytań, 22 pytania. */
    questionCount: (count: number) => {
      if (count === 1) return '1 pytanie';
      const ones = count % 10;
      const tens = count % 100;
      const few = ones >= 2 && ones <= 4 && !(tens >= 12 && tens <= 14);
      return `${count} ${few ? 'pytania' : 'pytań'}`;
    },
    emptySection: 'Sekcja nie zawiera jeszcze pytań.',
    kind: {
      label: 'Rodzaj pola',
      text: 'Krótka odpowiedź',
      longtext: 'Odpowiedź opisowa',
      choice: 'Wybór jednej opcji',
      multi: 'Wybór wielu opcji',
      number: 'Liczba',
    },

    // Zapis
    save: 'Zapisz szablon',
    saved: 'Szablon zapisany',
    saveFailed: 'Nie udało się zapisać szablonu.',
    unsaved: 'Zmiany niezapisane',
    revert: 'Odrzuć zmiany',
    restoreDefaults: 'Przywróć zestaw wbudowany',
    restoreDefaultsConfirm:
      'Treść szablonu zostanie zastąpiona zestawem wbudowanym. Zmiana wymaga zapisania.',
    problemsTitle: 'Formularz wymaga uzupełnienia',
    problemsHint: 'Zapis jest możliwy dopiero po usunięciu poniższych usterek.',
  },

  /*
   * WIZJA LOKALNA (T-94, poprawka 10 z 2026-08-27).
   *
   * Pierwsza wizyta na miejscu: obmiar, spis instalacji, zdjęcia stanu
   * zastanego. Jedyny zapis tego, jak było, zanim ktokolwiek czegokolwiek
   * dotknął — i dlatego wraca się do niej przez cały projekt.
   */
  siteVisit: {
    tab: 'Wizja lokalna',
    title: 'Wizja lokalna',
    intro:
      'Dokumentacja stanu zastanego: obmiar, instalacje, zdjęcia i ustalenia. Wizji może być kilka — kolejno po pracach wyburzeniowych oraz przed montażem.',
    add: 'Nowa wizja',
    empty: 'Nie zarejestrowano jeszcze żadnej wizji lokalnej.',
    emptyHint: 'Obmiar i stan zastany warto udokumentować przed rozpoczęciem prac przez wykonawcę.',
    date: 'Data wizyty',
    attendees: 'Obecni',
    attendeesPlaceholder: 'projektant, inwestor, kierownik budowy',
    notes: 'Notatka z wizji',
    notesPlaceholder: 'Obserwacje, ustalenia, ryzyka. Co wymaga decyzji inwestora.',
    delete: 'Usuń wizję',
    deleteConfirm:
      'Wizja zostanie usunięta wraz z obmiarem i notatką. Zdjęcia pozostaną w plikach projektu.',

    // Obmiar.
    rooms: 'Obmiar',
    roomsHint:
      'Wymiary podawane są w centymetrach, powierzchnia wyliczana jest automatycznie. Pomieszczenie bez kompletu wymiarów nie jest wliczane do sumy.',
    roomsEmpty: 'Brak obmiaru.',
    addRoom: 'Dodaj pomieszczenie',
    roomName: 'Pomieszczenie',
    roomNamePlaceholder: 'Salon',
    roomLength: 'Dł. (cm)',
    roomWidth: 'Szer. (cm)',
    roomHeight: 'Wys. (cm)',
    roomArea: 'Pow.',
    roomNote: 'Uwagi',
    roomNoteLabel: (room: string) => `Uwagi: ${room}`,
    removeRoom: (room: string) => `Usuń z obmiaru: ${room}`,
    areaTotal: (m2: number) => `Zmierzona powierzchnia: ${m2} m²`,
    noArea: 'brak',

    // Spis instalacji.
    checks: 'Do sprawdzenia',
    checksHint:
      'Lista stanowi punkt wyjścia — pozycje można dodawać i usuwać. „Nie ustalono" jest prawidłową odpowiedzią i oznacza, że danego elementu nie dało się sprawdzić podczas wizyty.',
    addCheck: 'Dodaj pozycję',
    checkNote: 'Uwaga',
    checkNoteLabel: (label: string) => `Uwaga: ${label}`,
    removeCheck: (label: string) => `Usuń pozycję: ${label}`,
    unresolved: (count: number) =>
      count === 1 ? '1 pozycja nieustalona' : `${count} pozycji nieustalonych`,
    allResolved: 'Wszystko ustalone',
    state: {
      ok: 'Jest, OK',
      replace: 'Do wymiany',
      missing: 'Brak',
      unknown: 'Nie ustalono',
    },

    // Zdjęcia.
    photos: 'Zdjęcia',
    photosHint:
      'Zdjęcia zapisywane są również w plikach projektu; w tym miejscu pozostają powiązane z konkretną wizytą.',
    addPhotos: 'Dodaj zdjęcia',
    photosEmpty: 'Brak zdjęć z tej wizyty.',
    uploading: 'Wysyłanie…',
    uploadFailed: 'Nie udało się wysłać pliku.',
    saved: 'Zapisano wizję lokalną',
  },

  dashboard: {
    activeProjects: 'Aktywni klienci i projekty',
    activeProjectsEmpty: 'Brak projektów w toku. Pracę rozpoczyna się od dodania klienta.',
    title: 'Pulpit',
    recentQuotes: 'Ostatnie wyceny',

    /*
     * PASEK AKTYWNOŚCI (poprawka 6, 2026-08-27; rejestr przepisany w T-97).
     *
     * Wpis nazywa klienta i zdarzenie: „Anna Kowalska — akceptacja oferty".
     * Forma rzeczownikowa, a nie relacjonująca („przyjęła ofertę"), bo pasek
     * jest rejestrem zdarzeń, a nie strumieniem wiadomości.
     */
    activityTitle: 'Aktywność klientów',
    activityUpToDate: 'Brak nowych zdarzeń',
    activityUnread: (count: number) => (count === 1 ? '1 nowa uwaga' : `${count} nowych uwag`),
    activityUnreadMark: 'nieprzeczytane',
    activityEmpty:
      'Brak zarejestrowanych zdarzeń — pierwszy przekazany link pojawi się w tym miejscu.',

    /*
     * CZYSZCZENIE PASKA (2026-08-27).
     *
     * „Oznacz jako przejrzane", a nie „Wyczyść": zdarzenia nie są usuwane,
     * a jedynie przestają być wyświetlane. Akceptacja oferty jest faktem
     * i nie może zniknąć wskutek kliknięcia — stąd możliwość ponownego
     * odsłonięcia listy.
     */
    activityClear: 'Oznacz wszystkie jako przejrzane',
    activityCleared: 'Zdarzenia oznaczone jako przejrzane. Nowe pojawią się w tym miejscu.',
    activityShowOlder: (count: number) =>
      count === 1 ? 'Pokaż 1 przejrzane' : `Pokaż ${count} przejrzanych`,
    activityHideOlder: 'Ukryj przejrzane',
    activitySomeone: 'Klient',
    activityAccepted: (who: string) => `${who} — akceptacja oferty`,
    activityRejected: (who: string) => `${who} — odrzucenie oferty`,
    activityComment: (who: string) => `${who} — uwagi do oferty`,
    activityViewed: (who: string) => `${who} — otwarcie linku z ofertą`,

    // Pusty pulpit — zapowiedź działania narzędzia, nie komunikat o braku.
    emptyTitle: 'Pierwsza wycena',
    emptyLead:
      'Pozycje oferty wprowadza pracownia, inwestor wybiera zakres przełącznikami TAK/NIE, a suma przeliczana jest automatycznie. Gotowy dokument przekazywany jest w formie PDF z identyfikacją wizualną pracowni.',
    demoYes: 'TAK',
    demoNo: 'NIE',
    demoItemConcept: 'Projekt koncepcyjny',
    demoItemViz: 'Wizualizacje 3D',
    demoItemSupervision: 'Nadzór autorski',
    demoTotal: 'Razem netto',

    // Karta subskrypcji na pulpicie.
    trialDaysLeft: (days: number) =>
      days === 1 ? 'Został 1 dzień okresu próbnego' : `Zostało ${days} dni okresu próbnego`,
    renewalOn: (date: string) => `Odnowienie ${date}`,
    noSubscription: 'Brak aktywnej subskrypcji',
  },
  library: {
    // Grupy (slownik) — T-59. „Zestawy" to dawne grupy snapshotow.
    categories: 'Grupy',
    sets: 'Zestawy',
    rooms: 'Pomieszczenia',
    rates: 'Stawki',
    // Biblioteka przykladowa (T-62).
    sampleBadge: 'Przykładowa',
    sampleSectionHint:
      'Biblioteka przykładowa udostępniana jest każdemu nowemu kontu. Pozycje poddane edycji tracą status przykładowych i pozostają w bibliotece.',
    deleteSample: (count: number) => `Usuń pozostałe przykładowe (${count})`,
    deleteSampleTitle: 'Usunąć pozycje przykładowe?',
    deleteSampleDescription: (count: number) =>
      `Usuniętych zostanie ${count} niezmodyfikowanych pozycji oraz puste grupy przykładowe. Pozycje poddane edycji pozostaną w bibliotece.`,
    sampleDeleted: (count: number) => `Usunięto ${count} pozycji przykładowych`,

    // Pelnoekranowy edytor uslugi (T-61).
    pricingChoice: 'Sposób wyceny',
    pricingChoices: {
      flat_lump: 'Kwota stała',
      flat_m2: 'Za m²',
      per_room: 'Według pomieszczenia',
      per_frame: 'Za kadr',
      flat_hour: 'Za godzinę',
      flat_visit: 'Za wizytę',
      flat_element: 'Za element',
      individual: 'Indywidualnie',
    },
    ratesSection: 'Stawki według pomieszczeń',
    ratesHint: 'Stawki edytowane są w zakładce „Stawki", gdzie widoczna jest cała macierz.',
    goToRates: 'Przejdź do stawek',
    extraSettings: 'Ustawienia dodatkowe',
    minPriceLabel: 'Cena „od"',
    minPriceHint: 'Wartość prezentowana na liście. Nie wpływa na obliczenia.',
    customUnitLabel: 'Własna jednostka',
    activeLabel: 'Aktywna w bibliotece',
    activeHint:
      'Usługa nieaktywna nie jest dostępna w edytorze, lecz pozostaje w wycenach, które już ją zawierają.',
    // Lista usług jako zwijane wiersze (T-72, inspiracja 1).
    rowExpand: (name: string) => `Rozwiń: ${name}`,
    rowCollapse: (name: string) => `Zwiń: ${name}`,
    rowToggleActive: (name: string) => `Aktywna: ${name}`,
    colService: 'Usługa',
    colGroup: 'Grupa',
    colMode: 'Sposób wyceny',
    colPrice: 'Cena / stawka',
    colActive: 'Aktywna',
    inactiveBadge: 'nieaktywna',
    saveChanges: 'Zapisz zmiany',
    nameRequired: 'Usługa musi mieć nazwę.',
    itemSaved: 'Zapisano usługę',
    cascadeHint:
      'Zmiany obowiązują w nowych wycenach. Otwartą wycenę aktualizuje się z panelu biblioteki w edytorze.',
    preview: 'Podgląd w ofercie',
    howItWorks: 'Zasada naliczania',
    howItWorksText: {
      flat: 'Cena stała, mnożona w wycenie przez ilość — przykładowo 4 godziny po 150 zł dają 600 zł.',
      per_room:
        'Cena wynika ze stawek za pomieszczenia zdefiniowanych w zakładce „Stawki". Wyliczana jest na podstawie listy pomieszczeń danej oferty, dlatego ta sama usługa daje inną kwotę przy innym zakresie.',
      per_frame:
        'Cena stanowi sumę stawki za pomieszczenie oraz stawki bazowej pomnożonej przez liczbę kadrów. Sposób stosowany przy wizualizacjach.',
      individual:
        'Pozycja ujęta jest w ofercie, lecz nie ma ceny i nie wchodzi do sumy. Inwestor widzi adnotację „wycena indywidualna", a podsumowanie wskazuje liczbę takich pozycji.',
    },
    usageTitle: 'Statystyki użycia',
    usageNever: 'Usługa nie została dotąd użyta w żadnej wycenie.',
    usageCount: (count: number) =>
      count === 1
        ? 'Użyta w 1 wycenie'
        : count >= 2 && count <= 4
          ? `Użyta w ${count} wycenach`
          : `Użyta w ${count} wycenach`,
    usageLast: (when: string) => `Ostatnio: ${when}`,
    itemNotFoundTitle: 'Nie znaleziono usługi',
    itemNotFoundDescription: 'Rekord został usunięty lub podany adres jest nieprawidłowy.',
    editItem: 'Edytuj usługę',

    categoryNew: 'Nowa grupa',
    categoryName: 'Nazwa grupy',
    categoryNamePlaceholder: 'Przygotowanie projektu',
    categoryCode: 'Kod',
    categoryColor: 'Kolor grupy',
    categoryNoColor: 'Bez koloru',
    categoryAdded: 'Dodano grupę',
    categoryDeleted: 'Usunięto grupę',
    categoryHint: 'Grupy porządkują usługi w procesie projektowym. Kod („01") jest opcjonalny.',
    categoriesEmptyTitle: 'Brak grup',
    categoriesEmptyDescription:
      'Grupa odpowiada działowi lub etapowi prac: „Przygotowanie", „Projekt", „Nadzór". Usługi nieprzypisane do grupy pozostają w pełni funkcjonalne.',
    categoryDeleteTitle: 'Usunąć grupę?',
    categoryDeleteDescription: (items: number) =>
      items > 0
        ? `Grupa zostanie usunięta z listy. ${items === 1 ? 'Przypisana do niej usługa zostanie przeniesiona' : `Przypisane do niej usługi (${items}) zostaną przeniesione`} do kategorii „Bez grupy" — żadne dane nie zostaną skasowane.`
        : 'Grupa zostanie usunięta z listy. Nie zawiera żadnych usług.',
    withoutCategory: 'Bez grupy',
    withoutCategoryCount: (count: number) => `Bez grupy: ${count}`,
    itemCount: (count: number) =>
      count === 1 ? '1 usługa' : count >= 2 && count <= 4 ? `${count} usługi` : `${count} usług`,
    moveUp: 'Przenieś wyżej',
    moveDown: 'Przenieś niżej',

    title: 'Biblioteka',
    sheetHint: 'Zmiany cen i nazw można od razu przenieść na otwartą wycenę.',
    items: 'Pozycje',
    /*
     * Klucz zostaje `groups` (tak nazywa się tabela `library_groups`, §9.3),
     * ale ETYKIETA to od T-59 „Zestawy": grupa porządkuje usługi, zestaw je
     * wstawia. Dwa pojęcia, jedno słowo — to była pułapka.
     */
    groups: 'Zestawy',
    category: 'Kategoria',
    emptyTitle: 'Biblioteka jest pusta',
    emptyDescription:
      'Dodaj najczęściej stosowane pozycje — ich wstawienie do wyceny wymaga wówczas jednego kliknięcia.',

    // Zakładki i filtry.
    tabsLabel: 'Sekcje biblioteki',
    searchPlaceholder: 'Szukaj po nazwie lub opisie',
    clearSearch: 'Wyczyść wyszukiwanie',
    filterByCategory: 'Filtruj po kategorii',
    clearFilters: 'Wyczyść filtry',
    loadError: 'Nie udało się wczytać biblioteki.',
    saveError: 'Nie udało się zapisać zmian w bibliotece.',

    // Pozycje.
    addItem: 'Dodaj pozycję',
    newItemName: 'Nowa pozycja',
    itemNameLabel: 'Nazwa pozycji',
    itemDescriptionLabel: 'Opis pozycji',
    itemDescriptionPlaceholder: 'Opis (opcjonalny)',
    itemCategoryLabel: 'Kategoria pozycji',
    itemPriceLabel: 'Cena pozycji',
    itemKindLabel: 'Rodzaj pozycji',
    kindItem: 'Pozycja',
    kindDiscount: 'Rabat',
    saveItem: (name: string) => `Zapisz pozycję: ${name}`,
    cancelItem: (name: string) => `Odrzuć zmiany w pozycji: ${name}`,
    deleteItem: (name: string) => `Usuń pozycję: ${name}`,
    deleteItemTitle: 'Usunąć pozycję z biblioteki?',
    deleteItemDescription: (name: string) =>
      `Pozycja „${name}” zostanie usunięta z biblioteki. Wyceny, w których już jej użyto, pozostają nienaruszone.`,
    itemsEmptyTitle: 'Biblioteka pozycji jest pusta',
    itemsEmptyDescription:
      'Dodaj pierwszą pozycję — nazwa, opis i cena będą następnie wstawiane do wyceny jednym kliknięciem.',
    itemsNoResultsTitle: 'Brak pozycji spełniających kryteria',
    itemsNoResultsDescription: 'Zmień kategorię lub wyczyść wyszukiwanie.',

    // Reguły cenowe (cennik parametryczny).
    pricingLabel: 'Sposób wyceny',
    pricingFlat: 'Stała',
    pricingPerRoom: 'Za pomieszczenie',
    pricingPerFrame: 'Za kadr',

    variantOf: 'Wariant pozycji',
    variantOfLabel: 'Wariant pozycji',
    variantNone: 'Osobna pozycja',
    variantLeaderNote: (count: number) =>
      count === 1
        ? 'Pozycja jest nadrzędna dla 1 wariantu, wobec czego sama nie może być wariantem innej pozycji.'
        : `Pozycja jest nadrzędna dla ${count} wariantów, wobec czego sama nie może być wariantem innej pozycji.`,
    pricingFlatHint: 'Cena pomnożona przez ilość.',
    pricingPerRoomHint:
      'Stawka bazowa powiększona o stawkę za każde wskazane pomieszczenie wyceny.',
    pricingPerFrameHint: 'Stawka pomieszczenia plus baza za każdy kadr.',
    pricingBase: 'Baza',
    pricingBaseFor: (name: string) => `Baza dla pozycji: ${name}`,
    pricingPerFrameBase: 'Za kadr',
    pricingScope: 'Liczone pomieszczenia',
    pricingScopeAll: 'Wszystkie',
    pricingScopeVisual: 'Wizualne',
    pricingScopeTechnical: 'Techniczne',
    pricingScopeHint: 'Zakres pomieszczeń uwzględnianych przy naliczaniu tej usługi.',
    pricingRooms: 'Stawki za pomieszczenie',
    pricingRoomPrice: (room: string) => `Stawka: ${room}`,
    pricingDefaultRoom: 'Pozostałe',
    pricingDefaultRoomHint: 'Dla pomieszczeń spoza słownika i typów bez własnej stawki.',
    pricingNoRoomTypes: 'Wymagane jest wcześniejsze zdefiniowanie typów pomieszczeń.',
    pricingExample: (cents: string, rooms: number) =>
      rooms === 1 ? `Przy 1 pomieszczeniu: ${cents}` : `Przy ${rooms} pomieszczeniach: ${cents}`,

    // Macierz cennika (widok zbiorczy).
    matrix: 'Macierz cennika',
    matrixHint: 'Stawki wszystkich pozycji naraz. Puste pole znaczy „stawka domyślna”.',
    matrixEmpty: 'Brak pozycji liczonych za pomieszczenie.',
    matrixNoRoomTypes: 'Wymagane jest wcześniejsze zdefiniowanie typów pomieszczeń.',
    matrixColumnItem: 'Pozycja',
    matrixColumnBase: 'Baza',
    matrixColumnDefault: 'Pozostałe',
    matrixOnlyParametric: 'Tylko liczone za pomieszczenie',
    matrixCell: (item: string, room: string) => `${item} — ${room}`,
    matrixBaseCell: (item: string) => `${item} — baza`,
    matrixDefaultCell: (item: string) => `${item} — pozostałe`,

    // Import CSV.
    importCsv: 'Importuj CSV',
    importCsvTitle: 'Import macierzy z pliku',
    importCsvHint:
      'Pierwszy wiersz to nagłówek: „nazwa”, opcjonalnie „baza” i „pozostałe”, a dalej slugi typów pomieszczeń.',
    importCsvFile: 'Plik CSV',
    importCsvApply: 'Wgraj stawki',
    importCsvMatched: (count: number) =>
      count === 1 ? 'Dopasowano 1 pozycję' : `Dopasowano ${count} pozycji`,
    importCsvUnmatched: (names: string[]) => `Nie znaleziono w bibliotece: ${names.join(', ')}`,
    importCsvUnknownColumns: (slugs: string[]) =>
      `Kolumny spoza słownika (pominięte): ${slugs.join(', ')}`,
    importCsvProblem: (line: number, message: string) => `Wiersz ${line}: ${message}`,
    importCsvDone: (count: number) =>
      count === 1 ? 'Zapisano stawki 1 pozycji' : `Zapisano stawki ${count} pozycji`,

    // Grupy.
    addGroup: 'Dodaj grupę',
    newGroupName: 'Nowa grupa',
    groupNameLabel: 'Nazwa grupy',
    saveGroup: (name: string) => `Zapisz grupę: ${name}`,
    cancelGroup: (name: string) => `Odrzuć zmiany w grupie: ${name}`,
    deleteGroup: (name: string) => `Usuń grupę: ${name}`,
    deleteGroupTitle: 'Usunąć grupę z biblioteki?',
    deleteGroupDescription: (name: string) =>
      `Grupa „${name}” zostanie usunięta z biblioteki. Wyceny zbudowane na jej podstawie pozostają nienaruszone.`,
    groupTotal: 'Suma netto',
    groupItemsEmpty: 'Zestaw nie zawiera jeszcze pozycji.',

    // Zawartość zestawu — dodawanie i usuwanie pozycji na karcie grupy.
    groupAddItem: 'Dodaj pozycję',
    groupAddItemFor: (name: string) => `Dodaj pozycję do zestawu: ${name}`,
    groupPickerSearch: 'Szukaj w bibliotece',
    groupPickerEmpty: 'Brak dopasowań',
    groupPickerNoItems: 'Wymagane jest wcześniejsze dodanie pozycji w zakładce „Pozycje”.',
    groupRemoveItem: (name: string) => `Usuń z zestawu: ${name}`,
    groupItemQty: (name: string) => `Ilość: ${name}`,
    groupItemsHint: 'Zmiany zawartości zapisywane są automatycznie.',
    showGroupItems: (name: string) => `Pokaż pozycje grupy: ${name}`,
    hideGroupItems: (name: string) => `Ukryj pozycje grupy: ${name}`,
    groupsEmptyTitle: 'Nie utworzono jeszcze żadnego zestawu',
    groupsEmptyDescription:
      'Zestaw stanowi gotowy komplet pozycji, który pozwala wprowadzić do wyceny cały etap prac jednocześnie.',
    /** Mianownik liczby mnogiej: 1 pozycja / 2 pozycje / 5 pozycji. */
    itemsCount: (count: number) => {
      if (count === 1) return '1 pozycja';
      const mod10 = count % 10;
      const mod100 = count % 100;
      const few = mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14);
      return `${count} ${few ? 'pozycje' : 'pozycji'}`;
    },

    // Kaskada zmian do otwartej wyceny (T-10).
    cascadeTitle: 'Zaktualizować otwartą wycenę?',
    /** Biernik liczby mnogiej: 1 pozycję / 2 pozycje / 5 pozycji. */
    cascadeDescription: (count: number, name: string) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      const few = mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14);
      const phrase = count === 1 ? '1 pozycję' : `${count} ${few ? 'pozycje' : 'pozycji'}`;
      return `W otwartej wycenie ${phrase} pochodzi z pozycji „${name}”. Zaktualizowane zostaną nazwa, opis i cena; ilości oraz ustawienia TAK/NIE pozostaną bez zmian.`;
    },
    cascadeConfirm: 'Zaktualizuj wycenę',
    cascadeDismiss: 'Pozostaw bez zmian',
  },
  templates: {
    title: 'Szablony',
    emptyTitle: 'Brak szablonów',
    emptyDescription:
      'Gotową wycenę można zapisać jako szablon, aby kolejne oferty przygotowywać na podstawie sprawdzonego układu.',
    newFromTemplate: 'Nowa wycena z szablonu',

    // Lista szablonów.
    nameLabel: (name: string) => `Nazwa szablonu: ${name}`,
    save: (name: string) => `Zapisz nazwę szablonu: ${name}`,
    cancel: (name: string) => `Odrzuć zmianę nazwy: ${name}`,
    use: (name: string) => `Nowa wycena z szablonu: ${name}`,
    remove: (name: string) => `Usuń szablon: ${name}`,
    removeTitle: 'Usunąć szablon?',
    removeDescription: (name: string) =>
      `Szablon „${name}” zostanie usunięty z listy. Wyceny utworzone na jego podstawie pozostają nienaruszone.`,
    itemsCount: (count: number) => {
      if (count === 1) return '1 pozycja';
      const rest = count % 10;
      const tens = count % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return `${count} pozycje`;
      return `${count} pozycji`;
    },
    corrupted: 'Szablon uszkodzony — utworzenie wyceny na jego podstawie nie jest możliwe.',
    loadError: 'Nie udało się wczytać szablonów.',
    createdFrom: (name: string) => `Nowa wycena z szablonu „${name}”`,

    // Zapis szablonu z edytora.
    saveAsTemplate: 'Zapisz jako szablon',
    saveAsTemplateTitle: 'Nowy szablon z tej wyceny',
    saveAsTemplateDescription:
      'Szablon zachowuje układ dokumentu i pozycje. Nie obejmuje danych klienta ani numeru wyceny.',
    saveAsTemplateName: 'Nazwa szablonu',
    saveAsTemplateConfirm: 'Zapisz szablon',
    saveAsTemplateDone: (name: string) => `Zapisano szablon „${name}”`,
    overwrite: 'Nadpisz szablon',
    overwriteTitle: 'Nadpisać szablon?',
    overwriteDescription: (name: string) =>
      `Zawartość szablonu „${name}” zostanie zastąpiona bieżącą wyceną. Operacji nie można cofnąć.`,
    overwriteDone: (name: string) => `Nadpisano szablon „${name}”`,
    overwriteEmpty: 'Brak szablonów możliwych do nadpisania.',

    // Pakiet: szablon niesie też termin i dokumenty (T-63).
    contents: 'Zapisz razem z wyceną',
    contentSchedule: 'Etapy i termin realizacji',
    contentDocuments: 'Dokumenty towarzyszące',
    packageSchedule: 'z terminem',
    packageDocuments: 'z dokumentami',
  },
  brand: {
    title: 'Branding',
    companyName: 'Nazwa firmy',
    logo: 'Logo',
    /*
     * NAZWY MÓWIĄCE, GDZIE TO WIDAĆ (poprawka 3, 2026-08-27).
     *
     * „Kolor akcentu" i „Kolor tła PDF" nie odpowiadały na jedyne pytanie,
     * jakie się przy nich zadaje: co się zmieni na dokumencie. Etykieta nazywa
     * teraz miejsce, a podpowiedź wylicza wszystkie miejsca, bo kolor marki
     * pracuje w trzech.
     */
    accentColor: 'Kolor marki',
    accentColorHint:
      'Kolor pasa w górnej części każdej strony PDF, na którym umieszczane są logo i numer oferty. W tym samym kolorze drukowane są tytuły sekcji oraz linia nad podpisem. Tym samym kolorem wypełniony jest pas nagłówka na stronie oferty i briefu przekazywanych inwestorowi.',
    bgColor: 'Tło podsumowania kosztów',
    bgColorHint:
      'Wypełnienie ramki podsumowania na końcu oferty, zawierającej kwotę netto, VAT i brutto. Kwoty drukowane są ciemnym kolorem, dlatego zalecany jest jasny odcień tła.',
    font: 'Font',
    fontHint: 'Krój całego dokumentu: tytuły, pozycje i stopka.',
    contacts: 'Kontakt',
    footer: 'Stopka',

    // Sekcje formularza.
    sectionIdentity: 'Firma',
    sectionLook: 'Wygląd PDF',
    sectionLookHint:
      'Trzy elementy identyfikacji dokumentu: znak w nagłówku, kolorystyka i krój pisma. Efekt wprowadzonych zmian można sprawdzić przyciskiem podglądu w dolnej części strony — także przed zapisaniem.',
    sectionContact: 'Kontakt i stopka',
    sectionDefaults: 'Domyślne w wycenie',

    // Logo.
    logoDark: 'Znak ciemny',
    logoDarkHint: 'Wersja do położenia na JASNYM nagłówku.',
    logoLight: 'Znak jasny',
    logoLightHint: 'Wersja do położenia na CIEMNYM nagłówku.',
    logoHint: 'PNG, JPG, WEBP lub SVG, do 5 MB.',

    // Wybór wariantu na nagłówku (poprawka 3; dobór automatyczny wycofany).
    headerLogo: 'Znak na nagłówku dokumentu',
    headerLogoHint:
      'Proszę wskazać wersję znaku umieszczaną na pasie nagłówka — w dokumencie PDF oraz na stronie oferty i briefu przekazywanych inwestorowi. Wybór zależy od koloru marki: na pasie ciemnym czytelny pozostaje znak jasny, na pasie jasnym — znak ciemny. Rezultat można sprawdzić przyciskiem podglądu w dolnej części strony.',
    headerLogoLight: 'Znak jasny',
    headerLogoDark: 'Znak ciemny',
    headerLogoResolved: (variant: 'light' | 'dark') =>
      variant === 'light'
        ? 'Na nagłówku stosowany jest obecnie znak jasny.'
        : 'Na nagłówku stosowany jest obecnie znak ciemny.',
    headerLogoMissing:
      'Wybrany wariant nie został jeszcze wgrany — na pasie nagłówka pojawi się wyłącznie nazwa firmy.',
    logoUpload: (variant: string) => `Wgraj: ${variant}`,
    logoRemove: (variant: string) => `Usuń: ${variant}`,
    logoEmpty: 'Brak logo',
    logoTooBig: 'Plik jest większy niż 5 MB.',
    logoWrongType: 'Dozwolone formaty: PNG, JPG, WEBP, SVG.',
    logoUploaded: 'Zapisano logo',
    logoRemoved: 'Usunięto logo',

    // Pola.
    address: 'Adres',
    taxId: 'NIP',
    footerText: 'Tekst stopki',
    defaultIntro: 'Domyślny wstęp wyceny',
    defaultValidDays: 'Domyślna ważność (dni)',
    contactName: (index: number) => `Osoba ${index + 1} — imię i nazwisko`,
    contactPhone: (index: number) => `Osoba ${index + 1} — telefon`,
    contactEmail: (index: number) => `Osoba ${index + 1} — e-mail`,
    addContact: 'Dodaj osobę',
    removeContact: (index: number) => `Usuń osobę ${index + 1}`,

    // F7.2 — godziny otwarcia i wystawiający.
    openingHours: 'Godziny otwarcia',
    openingHoursHint:
      'Blok „CZYNNE" w stopce dokumentu PDF. Przy braku wierszy nie jest drukowany.',
    openingHoursLabel: (index: number) => `Wiersz ${index + 1} — dni`,
    openingHoursValue: (index: number) => `Wiersz ${index + 1} — godziny`,
    openingHoursLabelPlaceholder: 'poniedziałek – piątek',
    openingHoursValuePlaceholder: '8.00 – 16.00',
    addOpeningHours: 'Dodaj wiersz',
    removeOpeningHours: (index: number) => `Usuń wiersz ${index + 1}`,
    openingHoursFull: 'Stopka mieści maksymalnie cztery wiersze.',
    signer: 'Wystawiający',
    signerName: 'Imię i nazwisko',
    signerTitle: 'Tytuł zawodowy',
    signerTitlePlaceholder: 'projektant wnętrz',

    saved: 'Zapisano branding',
    invalidColor: 'Kolor musi być w formacie #RRGGBB',

    previewTitle: 'Podgląd oferty',
    previewHint:
      'Przykładowa wycena wygenerowana na podstawie bieżących ustawień, w tym niezapisanych. Dokument powstaje na tym komputerze i otwiera się w systemowej przeglądarce PDF. Dane mają charakter poglądowy.',
    previewRendering: 'Generowanie podglądu…',
    previewOpen: 'Otwórz podgląd oferty (PDF)',
  },
  /** Teksty widoczne wyłącznie w wygenerowanych dokumentach. */
  pdf: {
    individualPrice: 'wycena indywidualna',
    validUntil: 'Ważny do',
    scheduleStart: 'Start',
    scheduleNoStart: 'Termin zostanie wyznaczony po ustaleniu daty rozpoczęcia prac.',
    scheduleRoomsTable: 'Zakres per pomieszczenie',
    scheduleWholeProject: 'Etapy dla całego projektu',
    scheduleStageDays: 'Dni robocze',
    exportSchedule: 'Eksportuj termin (PDF)',
    scheduleMissing:
      'Wycena nie zawiera jeszcze harmonogramu — należy go określić w zakładce „Termin".',
    scheduleSaved: 'Zapisano dokument „Szacowany termin"',
    stagesIncluded: 'w zakresie',
    stagesExcluded: 'poza zakresem',
    stagesCount: (objete: number, wszystkie: number) =>
      `${objete} z ${wszystkie} etapów w zakresie`,
    exportStages: 'Eksportuj etapy współpracy (PDF)',
    stagesMissing:
      'Wycena nie zawiera jeszcze dokumentu etapów — przygotowuje się go w zakładce „Dokumenty”.',
    stagesSaved: 'Zapisano dokument „Etapy współpracy”',
    priceListRangeNote:
      'Ceny podano w widełkach — ostateczna kwota zależy od zakresu i ustalana jest indywidualnie.',
    exportPriceList: 'Eksportuj cennik dodatkowy (PDF)',
    priceListMissing:
      'Wycena nie zawiera jeszcze cennika dodatkowego — przygotowuje się go w zakładce „Dokumenty”.',
    priceListSaved: 'Zapisano dokument „Cennik usług dodatkowych”',

    // Pakiet dokumentów (F6.3).
    exportPackage: 'Eksportuj pakiet dokumentów…',
    packageTitle: 'Eksport pakietu',
    packageIntro:
      'Wskaż dokumenty przeznaczone dla inwestora. Każdy z nich zawiera numer niniejszej wyceny.',
    packageSingle: 'Jeden plik PDF',
    packageSingleHint: 'Dokumenty w jednym pliku, ze wspólną numeracją stron.',
    packageSeparateHint: 'Osobne pliki do wybranego folderu.',
    packageDoc: {
      quote: 'Wycena',
      schedule: 'Szacowany termin',
      stages: 'Etapy współpracy',
      priceList: 'Cennik usług dodatkowych',
    },
    packageNothingSelected: 'Nie wybrano żadnego dokumentu.',
    packageExport: 'Eksportuj',
    packagePageLabel: (page: number, total: number) => `${page} / ${total}`,
    packageSaved: 'Zapisano pakiet dokumentów',
    packageSavedMany: (count: number) => `Zapisano ${count} dokumentów w wybranym folderze`,
  },

  /** Praca bez sieci i kolejka wysylki (T-29). */
  offline: {
    offline: 'Brak połączenia z siecią. Zmiany zapisywane są lokalnie.',
    waitingOffline: (count: number) =>
      count === 1
        ? 'Brak połączenia. 1 zmiana oczekuje na wysłanie — żadne dane nie zostały utracone.'
        : `Brak połączenia. ${count} zmian oczekuje na wysłanie — żadne dane nie zostały utracone.`,
    waitingOnline: (count: number) =>
      count === 1 ? 'Wysyłanie 1 zmiany…' : `Wysyłanie ${count} zmian…`,
    blocked: (count: number) =>
      count === 1
        ? 'Jedna zmiana oczekuje na decyzję — wycena została zmodyfikowana w innej sesji.'
        : `${count} zmian oczekuje na decyzję — wyceny zostały zmodyfikowane w innej sesji.`,
    retry: 'Wyślij teraz',
    sent: (count: number) =>
      count === 1 ? 'Wysłano zaległą zmianę.' : `Wysłano ${count} zaległych zmian.`,
    conflicts: (count: number) =>
      count === 1
        ? 'Jedna zmiana nie została zapisana: wycenę zmodyfikowano w innej sesji.'
        : `${count} zmian nie zostało zapisanych: wyceny zmodyfikowano w innej sesji.`,
  },

  /** Statusy realizacji etapow w projekcie (T-68). */
  stages: {
    tab: 'Etapy',
    progress: 'Postęp realizacji',
    doneOf: (done: number, total: number) => `${done} z ${total}`,
    next: (name: string) => `Następny etap: ${name}`,
    status: {
      pending: 'Nierozpoczęty',
      in_progress: 'W toku',
      done: 'Zakończony',
    },
    notStarted: 'jeszcze nierozpoczęty',
    startedAt: (date: string) => `rozpoczęty ${date}`,
    completedAt: (date: string) => `zakończony ${date}`,
    clientSide: 'Etap po stronie inwestora',
    orphaned: 'etap spoza obecnego harmonogramu',
    emptyTitle: 'Brak etapów do śledzenia',
    emptyNoAccepted:
      'Etapy pochodzą z harmonogramu zaakceptowanej wyceny i pojawią się po przyjęciu oferty przez inwestora.',
    emptyNoSchedule:
      'Zaakceptowana wycena nie zawiera harmonogramu. Etapy definiuje się w zakładce „Termin" w edytorze wyceny.',
  },

  /** Historia wersji z porownaniem (T-22). */
  versions: {
    title: 'Historia wersji',
    description: 'Zestawienie różnic zakresu i kwot pomiędzy wersjami oferty.',
    onlyOne: 'Oferta ma obecnie jedną wersję — porównanie nie jest możliwe.',
    compareWith: 'Porównaj z',
    totalsBefore: 'Poprzednia wersja',
    totalsAfter: 'Ta wersja',
    delta: 'Różnica',
    noChanges: 'Wersje mają identyczny zakres oraz identyczne kwoty.',
    added: (count: number) => (count === 1 ? 'Dodano 1 pozycję' : `Dodano ${count} pozycji`),
    removed: (count: number) => (count === 1 ? 'Usunięto 1 pozycję' : `Usunięto ${count} pozycji`),
    changed: (count: number) =>
      count === 1 ? 'Zmieniono 1 pozycję' : `Zmieniono ${count} pozycji`,
    unchangedCount: (count: number) => `${count} pozycji bez zmian`,
    unchanged: (count: number) =>
      count === 1 ? '1 pozycja bez zmian' : `${count} pozycji bez zmian`,
    changeName: 'zmieniona nazwa',
    changePrice: (before: string, after: string) => `kwota: ${before} → ${after}`,
    changeQty: (before: number, after: number) => `ilość: ${before} → ${after}`,
    changePath: (before: string, after: string) => `przeniesiona: ${before} → ${after}`,
    turnedOn: 'włączona w tej wersji',
    turnedOff: 'wyłączona w tej wersji',
    /** Pozycja w menu edytora. */
    open: 'Historia wersji',
  },

  /** Auto-update aplikacji (T-19). */
  update: {
    title: 'Aktualizacje',
    idle: 'Sprawdzenie dostępności nowej wersji aplikacji Toolier.',
    check: 'Sprawdź aktualizacje',
    checking: 'Sprawdzanie…',
    current: 'Zainstalowana jest najnowsza wersja.',
    available: (version: string) => `Dostępna jest wersja ${version}.`,
    install: 'Pobierz i zainstaluj',
    downloading: 'Pobieranie…',
    downloadingPercent: (percent: number) => `Pobieranie… ${percent}%`,
    ready: 'Aktualizacja gotowa do instalacji — wymagane ponowne uruchomienie aplikacji.',
    relaunch: 'Uruchom ponownie',
    relaunchFailed:
      'Ponowne uruchomienie nie powiodło się. Prosimy zamknąć i otworzyć aplikację ręcznie.',
    /** Powiadomienie z cichego sprawdzenia przy starcie. */
    foundOnStart: (version: string) => `Dostępna jest nowa wersja Toolier (${version}).`,
    goToSettings: 'Ustawienia',
  },
  settings: {
    // Podzial na trzy karty (2026-08-27): konto · branding · aplikacja.
    tabAccount: 'Konto',
    tabApp: 'Aplikacja',
    accountIntro: 'Dostęp do aplikacji, subskrypcja i dane konta.',
    appIntro: 'Domyślne wartości nowych wycen, miejsce na pliki oraz aktualizacje.',
    access: 'Dostęp',
    // Zdjęcie użytkownika (poprawka 4).
    avatar: 'Zdjęcie profilowe',
    avatarHint:
      'Widoczne w pasku nawigacji. Zalecany kadr kwadratowy — obraz przycinany jest do koła. Formaty PNG, JPG lub WEBP, do 5 MB.',
    avatarSaved: 'Zapisano zdjęcie',
    avatarRemoved: 'Usunięto zdjęcie',
    /** Kropka przy avatarze w szynie. */
    connectionOnline: 'Połączenie z siecią aktywne',
    connectionOffline: 'Brak połączenia — zmiany oczekują w kolejce',
    yourData: 'Dane konta',
    dangerZone: 'Operacje nieodwracalne',
    manageSubscription: 'Zarządzaj',
    subscriptionHint: 'Plan, płatności i faktury dostępne są na osobnym ekranie.',
    general: 'Ogólne',
    title: 'Ustawienia',
    sectionQuotes: 'Domyślne dla wycen',
    currency: 'Waluta',
    vatRate: 'Stawka VAT',
    pricesInclude: 'Ceny w wycenie podawane są jako',
    pricesNet: 'netto (VAT doliczany)',
    pricesGross: 'brutto (VAT w cenie)',
    pricesIncludeHint:
      'Dotyczy nowych wycen. Wyceny już zapisane zachowują ustawienie sprzed zmiany.',
    defaultPricingBasis: 'Sposób naliczania w nowych wycenach',
    hourlyRate: 'Stawka za godzinę (zł)',
    hourlyRateEmpty: 'nie podano',
    hourlyRateHint:
      'Wycena zapisuje kopię stawki w chwili utworzenia — późniejsza zmiana nie wpływa na oferty już przekazane inwestorom.',
    numberPattern: 'Wzorzec numeracji',
    numberPatternPreview: 'Następna wycena dostanie numer',
    numberPatternHint: 'Tokeny: {YYYY}, {YY}, {MM}, {DD}, {seq}, {seq:6}.',
    numberPatternReset: 'Przywróć domyślny wzorzec',
    showVersionOnPdf: 'Numer wersji na dokumencie',
    showVersionOnPdfHint:
      'Opcja domyślnie wyłączona. Numer wersji pozostaje zawsze widoczny w nazwie pliku.',
    showDisabledItems: 'Pokazuj wyłączone pozycje w PDF',
    showDisabledItemsHint:
      'Wyłączone pozycje umieszczane są w dokumencie jako opcje bez kwoty — rozwiązanie przydatne przy wariantach do wyboru.',
    unsaved: 'Niezapisane zmiany',
    saved: 'Ustawienia zapisane.',
    readOnly:
      'Dostęp wygasł — zmiana ustawień nie jest możliwa. Eksport danych pozostaje dostępny.',

    roomTypes: 'Typy pomieszczeń',
    roomTypesHint:
      'Na ich podstawie cennik parametryczny dobiera stawkę. Zmiana nazwy nie modyfikuje klucza technicznego, więc nie wpływa na ceny w zapisanych wycenach.',
    roomTypesEmpty: 'Nie zdefiniowano jeszcze żadnych typów pomieszczeń.',
    roomTypeNamePlaceholder: 'np. Kuchnia',
    roomTypeName: (name: string) => `Nazwa typu pomieszczenia: ${name}`,
    roomTypeRemove: (name: string) => `Usuń typ pomieszczenia ${name}`,
    roomTypeRemoveTitle: 'Usunąć typ pomieszczenia?',
    roomTypeRemoveDescription: (name: string) =>
      `Typ „${name}" zostanie usunięty z listy. Wyceny i reguły cenowe, które już go stosują, pozostaną nienaruszone.`,
    roomTypeDuplicate: 'Taki typ pomieszczenia już istnieje.',

    account: 'Konto',
    changePassword: 'Zmień hasło',
    newPassword: 'Nowe hasło',
    repeatPassword: 'Powtórz hasło',
    passwordChanged: 'Hasło zmienione.',
    exportData: 'Eksportuj dane',
    exportDataHint:
      'Pojedynczy plik JSON zawierający komplet danych: wyceny wraz z treścią, bibliotekę, zestawy, szablony, kartotekę klientów i ustawienia.',
    exportRunning: 'Przygotowywanie pliku…',
    exportDone: 'Dane zapisane do pliku.',
    exportOpen: 'Otwórz',
    exportFailed: 'Nie udało się wyeksportować danych.',
    deleteAccount: 'Usuń konto',
    deleteAccountHint:
      'Trwale usuwa konto wraz ze wszystkimi danymi. Przed wykonaniem operacji zalecany jest eksport wycen — odzyskanie danych nie będzie możliwe.',
    deleteAccountConfirmLabel: (word: string) => `Wpisz ${word}, aby potwierdzić`,
    deleteAccountTitle: 'Trwale usunąć konto?',
    deleteAccountDescription:
      'Usunięte zostaną wszystkie wyceny, biblioteka, szablony i ustawienia. Operacji nie można cofnąć.',
    accountDeleted: 'Konto usunięte.',
    deleteAccountFailed: 'Nie udało się usunąć konta.',
  },
  billing: {
    title: 'Subskrypcja',
    trial: 'Okres próbny',
    trialEndsIn: (days: number) => `Okres próbny kończy się za ${days} dni`,
    active: 'Aktywna',
    pastDue: 'Zaległa płatność',
    canceled: 'Anulowana',
    /*
     * Nagłówki stanu na ekranie subskrypcji. Osobne od `noSubscription`
     * i `expiredNotice`, bo tamte są ZDANIAMI (wyjaśnieniem, co robić),
     * a tu potrzebna jest krótka nazwa stanu do nagłówka.
     */
    expired: 'Dostęp wygasł',
    inactive: 'Brak aktywnej subskrypcji',
    /** „Stan dostępu" — nie „Status", bo mówimy o prawie do pracy, nie o rekordzie. */
    accessLabel: 'Stan dostępu',
    /** Nagłówek sekcji wyboru częstotliwości płatności. */
    periodLabel: 'Okres rozliczeniowy',
    buy: 'Aktywuj dostęp',
    manage: 'Zarządzaj płatnością',

    // Okno okresu próbnego przy starcie (poprawka 6). Po opłaceniu
    // subskrypcję obsługuje się wyłącznie z ustawień.
    trialDialogHint:
      'Aplikacja działa bez ograniczeń funkcjonalnych. Po opłaceniu subskrypcji jej obsługa dostępna jest w Ustawieniach, a niniejsze okno przestaje być wyświetlane.',
    trialDialogLater: 'Później',
    readOnlyBanner:
      'Tryb tylko do odczytu — dostęp wygasł. Przeglądanie i eksport wycen pozostają dostępne.',

    /**
     * Aplikacja jest płatna w całości — nie ma wersji darmowej ani pakietów.
     * Wybór dotyczy wyłącznie częstotliwości płatności.
     */
    intro: 'Toolier jest aplikacją płatną. Wskaż preferowany okres rozliczeniowy.',
    monthly: 'Miesięcznie',
    yearly: 'Rocznie',
    /**
     * **Jedyne miejsce z kwotami w aplikacji** (T-66).
     *
     * Cena stoi w trzech miejscach naraz: tutaj, w Stripe i w materiałach
     * marketingowych. Dwóch pierwszych nie da się połączyć automatycznie —
     * Stripe zna kwotę dopiero po utworzeniu sesji Checkout, a ekran wyboru
     * musi ją pokazać wcześniej. Skoro i tak przepisujemy ręcznie, niech
     * będzie jedno miejsce do poprawienia, a nie kilka stringów po JSX-ie.
     *
     * `1099,88` przy rocznej to 12 × 98,99 — kwota, której klient NIE płaci.
     * Pokazujemy ją przekreśloną, żeby „dwa miesiące taniej" dało się
     * sprawdzić, a nie tylko przeczytać.
     */
    prices: {
      monthly: '98,99 zł / mies.',
      yearly: '999,99 zł / rok',
      /** 12 × cena miesięczna — odniesienie dla oszczędności. */
      yearlyBefore: '1 187,88 zł',
      yearlySaving: 'prawie dwa miesiące taniej',
    },
    perPeriod: (period: string) => (period === 'yearly' ? 'rocznie' : 'miesięcznie'),

    statusLabel: 'Status',
    trialDaysLeft: (days: number) => {
      if (days === 1) return 'Został 1 dzień okresu próbnego';
      const rest = days % 10;
      const tens = days % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14))
        return `Zostały ${days} dni okresu próbnego`;
      return `Zostało ${days} dni okresu próbnego`;
    },
    trialExplainer:
      'Okres próbny umożliwia zapoznanie się z aplikacją i nie wymaga podania danych karty płatniczej.',
    renewsAt: (date: string) => `Odnowienie: ${date}`,
    endsAt: (date: string) => `Dostęp do: ${date}`,
    /*
     * Wyjaśnienia stanu. Nie powtarzają nazwy stanu, bo stoją bezpośrednio pod
     * nagłówkiem, który ją już podaje — mają mówić, CO Z TYM ZROBIĆ.
     */
    canceledNotice: 'Dostęp pozostaje aktywny do końca opłaconego okresu.',
    pastDueNotice:
      'Płatność nie powiodła się. Aktualizacja danych karty pozwoli zachować ciągłość dostępu.',
    expiredNotice: 'Dane pozostają zabezpieczone i będą dostępne po opłaceniu subskrypcji.',
    graceNotice: 'Trwa ponowna próba obciążenia karty. Praca w aplikacji przebiega bez zmian.',
    noSubscription: 'Brak informacji o płatności.',

    dataSafe:
      'Dane pozostają zachowane — po wygaśnięciu dostępu nadal możliwe jest ich przeglądanie i eksport.',
    failed: 'Nie udało się nawiązać połączenia z operatorem płatności.',
    noUrl: 'Operator płatności nie zwrócił adresu transakcji.',
    returned: 'Weryfikacja statusu płatności…',
    activated: 'Dostęp został aktywowany. Dziękujemy.',
    checkoutCanceled: 'Płatność przerwana — żadne środki nie zostały pobrane.',
    readOnlyEditHint: 'Edycja wymaga aktywnego dostępu. Podgląd i eksport pozostają dostępne.',
  },
  auth: {
    login: 'Zaloguj się',
    register: 'Załóż konto',
    resetPassword: 'Resetuj hasło',
    email: 'E-mail',
    password: 'Hasło',
    company: 'Nazwa firmy',
    fullName: 'Imię i nazwisko',
    google: 'Kontynuuj z Google',
    noAccount: 'Nie posiadasz konta?',
    hasAccount: 'Posiadasz już konto?',
  },
  onboarding: {
    title: 'Konfiguracja początkowa',
    lead: 'Trzy kroki, które przygotowują aplikację do przygotowania pierwszej oferty.',
    progress: (done: number, total: number) => `${done} z ${total}`,
    done: 'gotowe',
    steps: {
      brand: {
        title: 'Wgraj logo pracowni',
        hint: 'Znak umieszczany jest w każdym dokumencie PDF. Wystarczy wgrać go jednokrotnie.',
      },
      /*
       * Od T-62 nowe konto dostaje 38 usług przykładowych, więc „Dodaj
       * pozycje do biblioteki" prosiłoby o coś, co już tam jest. Krok liczy
       * pozycje BEZ flagi „przykładowa" — a tę flagę zdejmuje pierwsza
       * poprawiona cena. Napis ma mówić dokładnie to.
       */
      library: {
        title: 'Ustal własne ceny w bibliotece',
        hint: 'Konto zawiera gotowy zestaw usług — wystarczy uzupełnić stawki lub dodać własne pozycje.',
      },
      quote: {
        title: 'Przygotuj pierwszą wycenę',
        hint: 'Pozycje z wyborem TAK/NIE, sumy przeliczane na bieżąco, dokument PDF na zakończenie.',
      },
    },
  },

  errors: {
    generic: 'Wystąpił nieoczekiwany błąd.',
    notFound: 'Nie znaleziono strony.',
    notConfigured: 'Brak konfiguracji Supabase — należy uzupełnić plik .env.',
    workspaceTitle: 'Nie udało się wczytać danych firmy',
    workspaceHint:
      'Połączenie z bazą danych zostało nawiązane, lecz nie odnaleziono workspace przypisanego do konta. Najczęstszą przyczyną jest brak zaaplikowanych migracji albo wskazanie innego projektu Supabase.',
    connectedTo: (url: string) => `Adres bazy: ${url}`,

    // Ekran awaryjny (T-17).
    crashTitle: 'Aplikacja napotkała błąd',
    crashLead:
      'Dane pozostają bezpieczne — wyceny zapisywane są w chmurze na bieżąco. W przypadku powtórzenia się błędu prosimy o przekazanie poniższego komunikatu.',
    crashReload: 'Uruchom aplikację ponownie',
    crashBack: 'Kontynuuj pracę',
  },
} as const;

export type Dictionary = typeof pl;
