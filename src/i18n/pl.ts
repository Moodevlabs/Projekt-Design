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
    quotes: 'Wyceny',
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
    title: 'Wyceny',
    new: 'Nowa wycena',
    newDialogHint: 'Wybierz klienta i projekt — dane inwestora wypełnią się same.',
    // Start z szablonu przy zakładaniu wyceny (T-70).
    startFrom: 'Zacznij od',
    startFromEmpty: 'Pustej wyceny',
    startFromPackage: 'Szablon niesie też termin i dokumenty — trafią do nowej wyceny.',
    withoutClient: 'Bez klienta',
    number: 'Numer',
    client: 'Klient',
    quoteTitle: 'Tytuł',
    total: 'Suma',
    updated: 'Zaktualizowano',
    emptyTitle: 'Nie masz jeszcze żadnej wyceny',
    emptyDescription: 'Zbuduj pierwszą ofertę z pozycjami TAK/NIE i wyślij ją klientowi jako PDF.',
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
    notesHint: 'Widoczne tylko dla Ciebie. Nie idą do PDF ani do duplikatu wyceny.',
    notesSaved: 'Zapisano notatkę',
    hasNotes: 'Ma notatkę',
    docKindLabel: 'Rodzaj dokumentu',
    docKind: {
      offer: 'Oferta',
      schedule_only: 'Sam termin',
      price_list_only: 'Sam cennik',
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
    newVersionHint: 'Kolejna propozycja dla tej samej inwestycji.',
    duplicateHint: 'Ta sama oferta dla innego klienta — nowa linia od v1.',
    versionCreated: (label: string) => `Utworzono ${label}`,
    olderVersions: (count: number) =>
      count === 1 ? '1 starsza wersja' : `${count} starsze wersje`,
    showOlder: 'Pokaż starsze wersje',
    hideOlder: 'Ukryj starsze wersje',
    versionColumn: 'Wersja',

    replaceAcceptedTitle: 'Zastąpić zaakceptowaną wycenę?',
    replaceAcceptedDescription:
      'W tym projekcie zaakceptowana jest już inna wycena. Projekt może mieć tylko jedną — poprzednia stanie się archiwalna.',
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
      'Wycena zniknie z listy, ale zostanie w bazie — będzie można ją przywrócić.',
    duplicated: 'Utworzono kopię wyceny',
    archivedToast: 'Wycena usunięta',
    loadError: 'Nie udało się wczytać wycen.',
  },
  search: {
    title: 'Szukaj',
    description: 'Znajdź klienta, projekt, wycenę albo usługę.',
    placeholder: 'Szukaj klienta, projektu, wyceny…',
    empty: 'Nic nie znaleziono.',
    actions: 'Akcje',
    open: 'Otwórz wyszukiwarkę',
  },
  clients: {
    // Import z CSV (T-23).
    importAction: 'Importuj z CSV',
    importTitle: 'Import klientów z pliku CSV',
    importDescription:
      'Wskaż plik wyeksportowany z Excela albo arkusza Google. Rozpoznajemy separator i nagłówki kolumn.',
    importColumns:
      'Rozpoznawane kolumny: Nazwa, Telefon, E-mail, Miasto, Adres, Notatki. Wystarczy sama nazwa — reszta jest opcjonalna.',
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
        ? `Dodano ${inserted}, pominięto ${skipped} (już byli w kartotece).`
        : `Dodano ${inserted} klientów.`,

    title: 'Klienci',
    new: 'Nowy klient',
    first: 'Dodaj pierwszego klienta',
    editTitle: 'Edytuj klienta',
    newTitle: 'Nowy klient',
    formHint: 'Wystarczy nazwa. Resztę uzupełnisz w każdej chwili.',

    // Zdjęcie klienta (poprawka 5).
    avatar: 'Zdjęcie klienta',
    avatarHint: 'Widać je na karcie klienta i na liście. Nie trafia do żadnego dokumentu.',

    name: 'Nazwa',
    namePlaceholder: 'Anna i Piotr Kowalscy',
    phone: 'Telefon',
    email: 'E-mail',
    address: 'Adres inwestycji',
    addressPlaceholder: 'ul. Wiosenna 12/3',
    city: 'Miasto',
    notes: 'Notatki',
    notesPlaceholder: 'Ustalenia, preferencje, historia kontaktu…',
    notesHint: 'Widoczne tylko dla Ciebie. Nie trafiają do wyceny ani do PDF.',

    quotesCount: 'Wyceny',
    acceptedValue: 'Zaakceptowane',
    lastActivity: 'Ostatnia aktywność',
    statusColumn: 'Status',
    contact: 'Kontakt',
    noContact: 'Brak danych kontaktowych',
    noCity: '—',
    noValue: '—',

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

    emptyTitle: 'Nie masz jeszcze żadnego klienta',
    emptyDescription:
      'Klient to teczka: dane kontaktowe, wyceny i notatki w jednym miejscu. Wycena wypełni się jego danymi.',
    noResultsTitle: 'Brak wyników',
    noResultsDescription: 'Zmień filtr albo wyczyść wyszukiwanie.',
    loadError: 'Nie udało się wczytać klientów.',
    notFoundTitle: 'Nie znaleziono klienta',
    notFoundDescription: 'Klient mógł zostać usunięty albo nigdy nie istniał.',
    backToList: 'Wszyscy klienci',

    tabQuotes: 'Wyceny',
    tabNotes: 'Notatki',
    quotesEmptyTitle: 'Brak wycen dla tego klienta',
    quotesEmptyDescription: 'Załóż pierwszą — dane inwestora wypełnią się same.',
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
      'Zniknie z listy aktywnych, ale jego wyceny i dane zostają nietknięte. Możesz go przywrócić.',
    deleteConfirmTitle: 'Usunąć klienta?',
    deleteConfirmDescription: (quotes: number) =>
      quotes > 0
        ? `Klient trafi do kosza. Jego ${quotes === 1 ? 'wycena zostaje' : `wyceny (${quotes}) zostają`} nietknięte i dalej wskazują na tę kartę.`
        : 'Klient trafi do kosza. Nie ma przypisanych wycen.',
    deleted: 'Klient usunięty',

    // Zakładka „Projekty" na karcie klienta (T-54).
    tabProjects: 'Projekty',
    projectsEmptyTitle: 'Brak projektów',
    projectsEmptyDescription:
      'Projekt to teczka jednej inwestycji: adres, metraż, wyceny i notatki w jednym miejscu.',
  },
  projects: {
    title: 'Projekty',
    new: 'Nowy projekt',
    first: 'Dodaj pierwszy projekt',
    editTitle: 'Edytuj projekt',
    newTitle: 'Nowy projekt',
    formHint: 'Adres podpowiadamy z kartoteki klienta — możesz go nadpisać.',

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
    notesHint: 'Widoczne tylko dla Ciebie. Nie trafiają do wyceny ani do PDF.',
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
        ? `Projekt trafi do kosza. Jego ${quotes === 1 ? 'wycena zostaje' : `wyceny (${quotes}) zostają`} nietknięte — dalej znajdziesz je u klienta.`
        : 'Projekt trafi do kosza. Nie ma przypisanych wycen.',

    notFoundTitle: 'Nie znaleziono projektu',
    notFoundDescription: 'Projekt mógł zostać usunięty albo nigdy nie istniał.',
    loadError: 'Nie udało się wczytać projektów.',

    tabQuotes: 'Wyceny',
    tabNotes: 'Notatki',
    quotesEmptyTitle: 'Brak wycen w tym projekcie',
    quotesEmptyDescription: 'Załóż pierwszą — dane inwestora wypełnią się same.',

    // Przenoszenie wyceny między teczkami.
    moveTitle: 'Przenieś do projektu',
    moveDescription: 'Zmieni się wyłącznie przypisanie. Treść oferty zostaje bez zmian.',
    moveAttachesClient:
      'Ta wycena nie ma jeszcze klienta — razem z projektem zostanie przypisana do jego właściciela.',
    moveNone: 'Bez projektu',
    moveEmpty: 'Ten klient nie ma jeszcze żadnego projektu.',
    moved: (name: string) => `Przeniesiono do projektu: ${name}`,
    movedOut: 'Wycena wyjęta z projektu',

    // Kopiowanie pomieszczeń przy nowej wycenie w projekcie.
    copyRoomsTitle: 'Skopiować pomieszczenia?',
    copyRoomsDescription: (count: number, from: string) =>
      `Ostatnia wycena w tym projekcie („${from}") ma ${count === 1 ? '1 pomieszczenie' : `${count} pomieszczeń`}. Przenieść je do nowej?`,
    copyRoomsConfirm: 'Skopiuj',
    copyRoomsSkip: 'Zacznij pusto',

    // Propozycja przestawienia statusu po akceptacji wyceny.
    suggestInProgress: (name: string) =>
      `Wycena zaakceptowana. Przestawić „${name}" na realizację?`,
    suggestInProgressAction: 'Przestaw',
    statusChanged: 'Status projektu zmieniony',
  },
  files: {
    title: 'Pliki',
    tab: 'Pliki',
    add: 'Dodaj pliki',
    dropHere: 'Upuść pliki tutaj',
    dropHint: 'Przeciągnij pliki z pulpitu albo kliknij „Dodaj pliki". Do 25 MB na plik.',
    emptyTitle: 'Brak plików',
    emptyDescription:
      'Rzuty, zdjęcia, umowy — wszystko, co dotyczy tego klienta, w jednym miejscu.',
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

    // Odbicia PRZED wysyłką — po polsku i z nazwą pliku, bo Storage odrzuci
    // to samo po angielsku i bez kontekstu (pułapka z T-12).
    rejectedTooLarge: (name: string) => `${name}: plik jest za duży (maksymalnie 25 MB).`,
    rejectedExtension: (name: string) =>
      `${name}: ten typ pliku jest zablokowany ze względów bezpieczeństwa.`,
    rejectedEmpty: (name: string) => `${name}: plik jest pusty.`,

    deleteTitle: 'Usunąć plik?',
    deleteDescription: (name: string) =>
      `„${name}" zniknie bezpowrotnie — kosza na pliki nie ma. Zwolnione miejsce wróci do limitu.`,
    deleted: 'Plik usunięty',

    // Pasek zużycia w Ustawieniach.
    usageTitle: 'Pliki',
    usageDescription: 'Miejsce zajęte przez pliki klientów i wygenerowane dokumenty.',
    usage: (used: string, quota: string) => `Zajęte ${used} z ${quota}`,
    usageWarning: 'Zostało mało miejsca — usuń niepotrzebne pliki.',
    usageFull: 'Limit wyczerpany. Nie dodasz nowych plików, dopóki czegoś nie usuniesz.',

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
      `Usunięte pliki trafiają tutaj i czekają ${days} dni, zanim znikną na dobre. Do tego czasu można je przywrócić.`,
    trashTitle: 'Kosz',
    trashDescription: (days: number, size: string) =>
      `Usunięte pliki czekają tu ${days} dni, potem znikają na dobre. Zajmują ${size} — miejsce zwolni się dopiero po trwałym usunięciu.`,
    trashDays: (days: number) =>
      days === 1 ? 'zostanie usunięty jutro' : `zostanie usunięty za ${days} dni`,
    trashDueNow: 'zostanie usunięty przy najbliższym sprzątaniu',
    restore: 'Przywróć',
    restored: 'Plik przywrócony.',
    deletedForever: 'Plik usunięty na stałe.',
    deleteForeverTitle: 'Usunąć plik na stałe?',
    deleteForeverDescription: (name: string) =>
      `„${name}" zniknie bezpowrotnie. Tego nie da się cofnąć.`,
    trashEmpty: 'Opróżnij kosz',
    trashEmptyTitle: 'Opróżnić kosz?',
    trashEmptyDescription: (count: number, size: string) =>
      `${count} ${count === 1 ? 'plik zniknie' : 'plików zniknie'} bezpowrotnie. Zwolni się ${size}. Tego nie da się cofnąć.`,
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
    tab: 'Dokumenty',
    title: 'Dokumenty',
    emptyTitle: 'Brak dokumentów',
    emptyDescription:
      'PDF-y wyeksportowane z wycen trafiają tutaj automatycznie. Zobaczysz dokładnie to, co poszło do inwestora.',
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
    recentEmpty: 'Wyeksportowane PDF-y pojawią się tutaj.',
    seeAll: 'Zobacz wszystkie',
    hint: 'Archiwum pokazuje zapisany plik — nie renderuje go ponownie.',
  },
  /** Link dla klienta i akceptacja online (T-25/T-26). */
  share: {
    title: 'Udostępnij klientowi',
    action: 'Udostępnij',
    description:
      'Klient otwiera link w przeglądarce, przełącza pozycje TAK/NIE i akceptuje albo zostawia uwagi. Nie musi zakładać konta.',
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
      'Odwołany link przestaje działać natychmiast. Klient zobaczy komunikat, żeby poprosić o nowy.',
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

przesyłam ofertę do wglądu:
${url}

Pod linkiem można zaznaczyć zakres i potwierdzić wybór albo zostawić uwagi.

Pozdrawiam`,
    baseUrlMissing:
      'Nie ustawiono adresu strony ofert (VITE_SHARE_BASE_URL). Link powstanie, ale trzeba go złożyć ręcznie.',

    // Akceptacja i uwagi (T-26).
    acceptedTitle: 'Oferta zaakceptowana',
    /** Oczko wersalikowe nad imieniem — mowi CO to jest, nie kto. */
    acceptedEyebrow: 'Przyjęte przez klienta',
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
    pathTitle: 'Na czym stoimy',
    pathSent: 'Oferta wysłana',
    pathSentPending: 'Jeszcze nie wysłana',
    pathSentHint: 'Utwórz link albo oznacz wycenę jako wysłaną.',
    pathOpened: 'Klient otworzył link',
    pathOpenedPending: 'Klient jeszcze nie otworzył',
    pathOpenedHint: 'Dopóki link nie zostanie otwarty, nie ma na co czekać.',
    pathComments: (count: number) =>
      count === 1 ? '1 uwaga od klienta' : `${count} uwagi/uwag od klienta`,
    pathCommentsNone: 'Bez uwag',
    pathDecisionPending: 'Czekamy na decyzję',
    pathDecisionPendingHint: 'Klient może zaakceptować ofertę, odrzucić ją albo zgłosić uwagi.',
    pathAccepted: 'Klient przyjął ofertę',
    pathRejected: 'Klient odrzucił ofertę',
    pathRejectedReason: (reason: string) => `Powód: ${reason}`,
    pathNoReason: 'Klient nie podał powodu.',
    /** Ręczna zmiana statusu zniknęła — mówimy o tym wprost, raz. */
    pathManualNote:
      'Akceptację i odmowę zapisuje wyłącznie klient, pod linkiem. Dzięki temu data i zakres są jego odpowiedzią, a nie naszym domysłem.',

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
    saveAllToLibraryEmpty: 'Nie ma czego zapisać — nazwij najpierw pozycje.',
    saveGroupToLibrary: 'Zapisz zestaw do biblioteki',
    savedGroupToLibrary: 'Zapisano zestaw w bibliotece',
    saveGroupToLibraryDone: (name: string) => `Zestaw „${name}” jest w bibliotece`,
    saveGroupToLibraryEmpty: 'Pusty zestaw nie ma czego zapisać — dodaj najpierw pozycje.',
    saveGroupToLibraryUnnamed: 'Nazwij najpierw grupę — zestaw bez nazwy nie da się odnaleźć.',
    pickerSearch: 'Szukaj w bibliotece',
    pickerEmpty: 'Nic nie pasuje',
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
    pickerNoRooms: 'Wycena nie ma pomieszczeń — ta usługa policzy samą bazę.',
    pickerNoRoomsAction: 'Dodaj pomieszczenia',

    // Panel „Dodaj usługi” — zakres wyceny jako tabela z biblioteki (T-71, inspiracja 1).
    scopeOpen: 'Dodaj usługi',
    scopeTitle: 'Dodaj usługi do wyceny',
    scopeHint:
      'Kliknij „Dodaj” przy usłudze — trafia od razu do wyceny. Panel zostaje otwarty, aż klikniesz „Gotowe”.',
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
    scopeEmpty: 'Nic nie pasuje do filtrów.',
    scopeLibraryEmpty: 'Biblioteka jest pusta — dodaj usługi w Bibliotece.',
    scopeSetsEmpty: 'Nie masz jeszcze zestawów. Zapisz grupę wyceny jako zestaw ikoną zakładki.',
    scopeSetItems: (count: number) => (count === 1 ? '1 pozycja' : `${count} poz.`),
    scopeNoRoomsTitle: 'Wycena nie ma jeszcze pomieszczeń',
    scopeNoRoomsBody:
      'Usługi liczone według pomieszczeń biorą stawki z biblioteki dla każdego pomieszczenia wyceny. Bez pomieszczeń policzą samą bazę — często 0 zł.',
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
    roomsHint: 'Usługi liczone za pomieszczenie biorą stąd swoje składniki.',

    /*
     * PANEL POMIESZCZEŃ MÓWI, PO CO JEST (poprawka 7, 2026-08-27).
     *
     * Wcześniej lista zaczynała się od pustego pola i dwóch kwadracików
     * podpisanych „W" i „T". Legenda stała pod spodem, więc czytało się ją
     * dopiero po tym, jak coś już się kliknęło.
     */
    roomsPurpose:
      'Lista pomieszczeń objętych projektem. Usługi wyceniane „za pomieszczenie" mnożą przez nią swoją stawkę — reszta pozycji jej nie używa.',
    roomsCount: (count: number) =>
      count === 1 ? '1 pomieszczenie' : `${count} pomieszczeń`,
    roomsColumnName: 'Pomieszczenie',
    roomsColumnQty: 'Ile',
    roomsSplit: (visual: number, technical: number) =>
      `Do części wizualnej liczy się ${visual}, do technicznej ${technical}.`,
    roomsEmpty:
      'Brak pomieszczeń. Dodaj je tylko wtedy, gdy któraś usługa liczy się za pomieszczenie — inaczej lista nic nie zmienia.',
    addRoom: 'Dodaj pomieszczenie',
    newRoomName: 'Nowe pomieszczenie',
    roomNameLabel: (room: string) => `Nazwa pomieszczenia: ${room}`,
    roomQtyLabel: (room: string) => `Ilość: ${room}`,
    roomTypeLabel: (room: string) => `Typ pomieszczenia: ${room}`,
    roomTypeCustom: 'Własne',
    removeRoom: (room: string) => `Usuń pomieszczenie: ${room}`,
    removeRoomTitle: 'Usunąć pomieszczenie?',
    removeRoomDescription: (room: string) =>
      `„${room}” zniknie z wyceny, a usługi liczone za pomieszczenie przeliczą się bez niego. Pozycje przypisane do tego pomieszczenia zostają — tracą tylko przypisanie.`,
    /** Kolumna M z arkusza — „w projekcie”. */
    roomVisual: (room: string) => `Część wizualna: ${room}`,
    /** Kolumna A z arkusza — „w części technicznej”. */
    roomTechnical: (room: string) => `Część techniczna: ${room}`,
    roomVisualShort: 'W',
    roomTechnicalShort: 'T',
    roomFlagsHint:
      'W — część wizualna (projekt aranżacji), T — techniczna (rysunki wykonawcze). Usługa liczona za pomieszczenie bierze tylko te pomieszczenia, które ma zaznaczone.',
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
      `Zakres tej oferty obejmuje ${objete} z ${wszystkie} etapów. Pozostałe zostają na liście, żeby było jasne, czego nie zawiera.`,
    stagesDocEmpty: 'Dokument powstanie po wejściu w tryb edycji.',
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
      'Usługi spoza zakresu tej oferty. Ceny podane widłekami — dokładna kwota zależy od zakresu i wychodzi po rozmowie.',
    priceListEmpty: 'Cennik powstanie po wejściu w tryb edycji.',
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
    addToQuoteTitle: 'Co ma się zmienić?',
    addToQuoteCost: 'Wycena — pozycja z kwotą',
    addToQuoteSchedule: (days: number) =>
      days === 1 ? 'Termin — +1 dzień roboczy' : `Termin — +${days} dni roboczych`,
    addToQuoteScheduleNew: 'Wycena nie ma jeszcze terminu — założymy go.',
    addToQuoteConfirm: 'Dodaj',
    priceListAddedToSchedule: (name: string, days: number) =>
      days === 1 ? `Termin dłuższy o 1 dzień: ${name}` : `Termin dłuższy o ${days} dni: ${name}`,
    priceListNothingSelected: 'Zaznacz przynajmniej jeden efekt.',

    // Etap zbiorczy „Usługi dodatkowe" w zakładce Termin.
    extrasStageName: 'Usługi dodatkowe',
    extrasStageHint: 'Dni z cennika dodatkowego. Suma składników poniżej.',
    extrasEntryDaysLabel: (name: string) => `Dni usługi: ${name}`,
    removeExtrasEntry: (name: string) => `Usuń z terminu: ${name}`,
    scheduleTitle: 'Szacowany termin',
    scheduleIntro:
      'Etapy z dniami po stronie wykonawcy i inwestora. Etapy zależne od pomieszczeń liczą się z tych samych pomieszczeń co wycena.',
    scheduleStart: 'Start',
    scheduleProviderWeek: 'Dni rob./tydz. — wykonawca',
    scheduleClientWeek: 'Dni rob./tydz. — inwestor',
    scheduleHolidays: 'Święta',
    scheduleHolidaysPl: 'polskie',
    scheduleHolidaysNone: 'pomijaj',
    scheduleEmpty: 'Harmonogram powstanie po wejściu w tryb edycji.',
    scheduleNoRooms:
      'Brak pomieszczeń w wycenie — etapy zależne od pomieszczeń liczą teraz tylko dni bazowe.',
    scheduleResult: 'Wynik',
    scheduleProviderDays: 'Dni robocze — wykonawca',
    scheduleClientDays: 'Dni robocze — inwestor',
    scheduleEndOptimal: 'Optymalne zakończenie',
    scheduleEndLatest: 'Najpóźniejsze',
    scheduleNoStart: 'Podaj datę startu, żeby zobaczyć terminy.',
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
    stageNoRoomTypes: 'Brak typów pomieszczeń — dodaj je w ustawieniach.',
    removeStage: (name: string) => `Usuń etap: ${name}`,
    stageAutoEnabled: (name: string) => `Włączono etap „${name}" — wycena go obejmuje.`,
    stageEntryAutoIncluded: (name: string) =>
      `Etap „${name}” wszedł do zakresu — wycena go obejmuje.`,
    roomBlockNameHint: 'Nazwę zmienisz w panelu „Pomieszczenia" obok — tutaj jest tylko pokazana.',
    itemFramesLabel: 'Liczba kadrów',
    pricingBasis: 'Sposób liczenia',
    basisAmount: 'Kwotowo',
    basisTime: 'Godzinowo',
    hourlyRate: 'Stawka za godzinę',
    hourlyRateMissing: 'Bez stawki wszystkie kwoty wychodzą zerowe.',
    workload: 'Pracochłonność',
    workloadEstimate: 'Szacowana pracochłonność',
    workloadEstimateHint:
      'Szacunek wyliczony z cen według stawki z ustawień — nie z wpisanego czasu.',
    workloadNoRate: 'Ustaw stawkę godzinową w ustawieniach, żeby dało się oszacować czas.',
    workloadCommunication: 'Komunikacja projektowa',
    workloadCommunicationHint: 'Liczba zawarta w sumie poniżej.',
    workloadTotal: 'Razem',
    // `itemTagCommunication` / `itemTagsLabel` zdjęte 2026-08-27 razem
    // z przełącznikiem przy pozycji (poprawka 7). Wiersz „w tym komunikacja"
    // w pracochłonności zostaje — dla wycen, w których etykietę już nadano.
    itemMinutesLabel: 'Minuty pracy',
    convertTitle: 'Przeliczyć wartości?',
    convertDescription: (rate: string) =>
      `Wycena ma już pozycje. Przeliczyć ich liczby według stawki ${rate}, czy zostawić je bez zmian?`,
    convertDescriptionNoRate:
      'Wycena ma już pozycje, ale nie ma stawki godzinowej — nie ma po czym przeliczać. Liczby zostaną bez zmian i będą znaczyć minuty.',
    convertYes: 'Przelicz',
    convertNo: 'Zostaw liczby',
    convertedToTime: 'Kwoty przeliczone na minuty.',
    convertedToAmount: 'Minuty przeliczone na kwoty.',
    libraryBasisMismatch:
      'Ta pozycja jest liczona w innych jednostkach. Ustaw stawkę godzinową, żeby dało się ją przeliczyć.',
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
      'Rabat należy się dopiero, gdy klient bierze wszystkie pozycje z zakresu.',
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
      'PDF jest zapisany. Jeśli właśnie wysyłasz go klientowi, wycena zmieni status ze szkicu na „wysłana" i trafi do zestawień.',
    markAsSentConfirm: 'Tak, wysłana',
    markAsSentDismiss: 'Zostaw szkic',
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
    conflict: 'Wycena zmieniona w innym miejscu — przeładuj.',
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
    clientOutdated: 'Dane w dokumencie różnią się od kartoteki.',
    clientSnapshotHint:
      'Wycena trzyma kopię danych z chwili utworzenia — edycja kartoteki nie zmienia wysłanej oferty.',
    clientAttached: (name: string) => `Wycena przypięta do klienta: ${name}`,
    clientDetached: 'Wycena odpięta od klienta',
    projectLabel: 'Projekt',
    projectPick: 'Wybierz projekt',
    projectNone: 'Bez projektu',
    projectNew: 'Nowy projekt',
    projectNeedsClient: 'Najpierw wybierz klienta — projekty należą do niego.',
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
    projectDescriptionPlaceholder: 'Kliknij, aby dodać opis projektu…',
    preparedBy: 'Ofertę przygotował/a',
    titlePlaceholder: 'Tytuł wyceny',
    subtitlePlaceholder: 'Podtytuł (opcjonalnie)',
    introPlaceholder: 'Tekst wstępu widoczny dla klienta…',
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
    removeConfirmDescription: 'Tej operacji nie da się cofnąć.',

    corruptedTitle: 'Wycena uszkodzona',
    corruptedDescription:
      'Nie udało się odczytać treści tej wyceny. Skontaktuj się z pomocą — dane są bezpieczne, ale edytor ich nie otworzy.',
    backToList: 'Wyceny',
    itemsCount: (count: number) => `${count} poz.`,
  },
  dashboard: {
    activeProjects: 'Aktywni klienci i projekty',
    activeProjectsEmpty: 'Brak projektów w toku. Zacznij od dodania klienta.',
    title: 'Pulpit',
    recentQuotes: 'Ostatnie wyceny',

    /*
     * PASEK „NA BIEŻĄCO" (poprawka 6, 2026-08-27).
     *
     * Podmiotem zdania jest zawsze klient, bo to on coś zrobił. „Wycena
     * została zaakceptowana" brzmi jak zdarzenie systemowe; „Anna Kowalska
     * przyjęła ofertę" jest wiadomością od człowieka.
     */
    activityTitle: 'Co nowego u klientów',
    activityUpToDate: 'Jesteś na bieżąco',
    activityUnread: (count: number) =>
      count === 1 ? '1 nowa uwaga' : `${count} nowych uwag`,
    activityUnreadMark: 'nieprzeczytane',
    activityEmpty: 'Nic się jeszcze nie wydarzyło — pierwszy wysłany link pojawi się tutaj.',
    activitySomeone: 'Klient',
    activityAccepted: (who: string) => `${who} przyjął ofertę`,
    activityRejected: (who: string) => `${who} odrzucił ofertę`,
    activityComment: (who: string) => `${who} zostawił uwagę`,
    activityViewed: (who: string) => `${who} otworzył link z ofertą`,

    // Pusty pulpit — zaproszenie, nie komunikat o braku.
    emptyTitle: 'Zbuduj pierwszą wycenę',
    emptyLead:
      'Dodajesz pozycje, klient przełącza TAK/NIE, a suma przelicza się sama. Gotową ofertę wysyłasz jako brandowany PDF.',
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
      'Biblioteka przykładowa dostaje każde nowe konto. Edytowane pozycje przestają być przykładowe i zostaną.',
    deleteSample: (count: number) => `Usuń pozostałe przykładowe (${count})`,
    deleteSampleTitle: 'Usunąć pozycje przykładowe?',
    deleteSampleDescription: (count: number) =>
      `Zniknie ${count} nietkniętych pozycji i puste grupy przykładowe. To, co edytowałeś, zostaje.`,
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
    ratesHint: 'Stawki edytujesz w zakładce „Stawki" — tam widać całą macierz naraz.',
    goToRates: 'Przejdź do stawek',
    extraSettings: 'Ustawienia dodatkowe',
    minPriceLabel: 'Cena „od"',
    minPriceHint: 'Pokazywana na liście. Nie wpływa na obliczenia.',
    customUnitLabel: 'Własna jednostka',
    activeLabel: 'Aktywna w bibliotece',
    activeHint: 'Nieaktywna znika z wyboru w edytorze, ale zostaje w wycenach, które ją mają.',
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
      'Zmiany trafią do nowych wycen. Otwartą wycenę zaktualizujesz z panelu biblioteki w edytorze.',
    preview: 'Podgląd w ofercie',
    howItWorks: 'Jak to działa?',
    howItWorksText: {
      flat: 'Cena jest stała. W wycenie mnożymy ją przez ilość — na przykład 4 godziny po 150 zł to 600 zł.',
      per_room:
        'Cena wynika ze stawek za pomieszczenia z zakładki „Stawki". Wycena liczy je z listy pomieszczeń danej oferty, więc ta sama usługa da inną kwotę przy innym metrażu.',
      per_frame:
        'Cena to stawka za pomieszczenie plus baza pomnożona przez liczbę kadrów. Używane przy wizualizacjach.',
      individual:
        'Pozycja jest w ofercie, ale nie ma ceny i nie wchodzi do sumy. Klient widzi „wycena indywidualna", a podsumowanie mówi, ile takich pozycji zawiera oferta.',
    },
    usageTitle: 'Statystyki użycia',
    usageNever: 'Jeszcze nieużywana w żadnej wycenie.',
    usageCount: (count: number) =>
      count === 1
        ? 'Użyta w 1 wycenie'
        : count >= 2 && count <= 4
          ? `Użyta w ${count} wycenach`
          : `Użyta w ${count} wycenach`,
    usageLast: (when: string) => `Ostatnio: ${when}`,
    itemNotFoundTitle: 'Nie znaleziono usługi',
    itemNotFoundDescription: 'Usługa mogła zostać usunięta albo nigdy nie istniała.',
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
      'Grupa to dział albo etap: „Przygotowanie", „Projekt", „Nadzór". Usługi bez grupy dalej działają.',
    categoryDeleteTitle: 'Usunąć grupę?',
    categoryDeleteDescription: (items: number) =>
      items > 0
        ? `Grupa zniknie z listy. ${items === 1 ? 'Jej usługa trafi' : `Jej usługi (${items}) trafią`} do „Bez grupy" — nic nie zostanie skasowane.`
        : 'Grupa zniknie z listy. Nie ma w niej żadnych usług.',
    withoutCategory: 'Bez grupy',
    withoutCategoryCount: (count: number) => `Bez grupy: ${count}`,
    itemCount: (count: number) =>
      count === 1 ? '1 usługa' : count >= 2 && count <= 4 ? `${count} usługi` : `${count} usług`,
    moveUp: 'Przenieś wyżej',
    moveDown: 'Przenieś niżej',

    title: 'Biblioteka',
    sheetHint: 'Zmiany cen i nazw możesz od razu przenieść na otwartą wycenę.',
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
      'Dodaj pozycje, których używasz najczęściej — wstawisz je do wyceny jednym kliknięciem.',

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
      `„${name}” zniknie z biblioteki. Wyceny, w których już jej użyto, zostają nietknięte.`,
    itemsEmptyTitle: 'Biblioteka pozycji jest pusta',
    itemsEmptyDescription:
      'Dodaj pierwszą pozycję — nazwę, opis i cenę wstawisz potem do wyceny jednym kliknięciem.',
    itemsNoResultsTitle: 'Brak pozycji dla tych filtrów',
    itemsNoResultsDescription: 'Zmień kategorię albo wyczyść wyszukiwanie.',

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
        ? 'Ta pozycja jest główna dla 1 wariantu — dlatego sama nie może być czyimś wariantem.'
        : `Ta pozycja jest główna dla ${count} wariantów — dlatego sama nie może być czyimś wariantem.`,
    pricingFlatHint: 'Cena × ilość — jak dotąd.',
    pricingPerRoomHint: 'Baza plus stawka za każde zaznaczone pomieszczenie wyceny.',
    pricingPerFrameHint: 'Stawka pomieszczenia plus baza za każdy kadr.',
    pricingBase: 'Baza',
    pricingBaseFor: (name: string) => `Baza dla pozycji: ${name}`,
    pricingPerFrameBase: 'Za kadr',
    pricingScope: 'Liczone pomieszczenia',
    pricingScopeAll: 'Wszystkie',
    pricingScopeVisual: 'Wizualne',
    pricingScopeTechnical: 'Techniczne',
    pricingScopeHint: 'Które pomieszczenia wliczają się do tej usługi.',
    pricingRooms: 'Stawki za pomieszczenie',
    pricingRoomPrice: (room: string) => `Stawka: ${room}`,
    pricingDefaultRoom: 'Pozostałe',
    pricingDefaultRoomHint: 'Dla pomieszczeń spoza słownika i typów bez własnej stawki.',
    pricingNoRoomTypes: 'Najpierw dodaj typy pomieszczeń w ustawieniach.',
    pricingExample: (cents: string, rooms: number) =>
      rooms === 1 ? `Przy 1 pomieszczeniu: ${cents}` : `Przy ${rooms} pomieszczeniach: ${cents}`,

    // Macierz cennika (widok zbiorczy).
    matrix: 'Macierz cennika',
    matrixHint: 'Stawki wszystkich pozycji naraz. Puste pole znaczy „stawka domyślna”.',
    matrixEmpty: 'Brak pozycji liczonych za pomieszczenie.',
    matrixNoRoomTypes: 'Najpierw dodaj typy pomieszczeń w ustawieniach.',
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
      `„${name}” zniknie z biblioteki. Wyceny zbudowane z tej grupy zostają nietknięte.`,
    groupTotal: 'Suma netto',
    groupItemsEmpty: 'Ten zestaw nie ma jeszcze pozycji.',

    // Zawartość zestawu — dodawanie i usuwanie pozycji na karcie grupy.
    groupAddItem: 'Dodaj pozycję',
    groupAddItemFor: (name: string) => `Dodaj pozycję do zestawu: ${name}`,
    groupPickerSearch: 'Szukaj w bibliotece',
    groupPickerEmpty: 'Nic nie pasuje',
    groupPickerNoItems: 'Najpierw dodaj pozycje w zakładce „Pozycje”.',
    groupRemoveItem: (name: string) => `Usuń z zestawu: ${name}`,
    groupItemQty: (name: string) => `Ilość: ${name}`,
    groupItemsHint: 'Zmiany zawartości zapisują się od razu.',
    showGroupItems: (name: string) => `Pokaż pozycje grupy: ${name}`,
    hideGroupItems: (name: string) => `Ukryj pozycje grupy: ${name}`,
    groupsEmptyTitle: 'Nie masz jeszcze żadnego zestawu',
    groupsEmptyDescription:
      'Grupa to gotowy zestaw pozycji — wstawisz nim do wyceny cały etap prac naraz.',
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
      return `W otwartej wycenie ${phrase} pochodzi z „${name}”. Przepiszemy tam nazwę, opis i cenę — ilości i przełączniki TAK/NIE zostaną nietknięte.`;
    },
    cascadeConfirm: 'Zaktualizuj wycenę',
    cascadeDismiss: 'Zostaw wycenę bez zmian',
  },
  templates: {
    title: 'Szablony',
    emptyTitle: 'Brak szablonów',
    emptyDescription: 'Zapisz gotową wycenę jako szablon, żeby następną zacząć od 80% roboty.',
    newFromTemplate: 'Nowa wycena z szablonu',

    // Lista szablonów.
    nameLabel: (name: string) => `Nazwa szablonu: ${name}`,
    save: (name: string) => `Zapisz nazwę szablonu: ${name}`,
    cancel: (name: string) => `Odrzuć zmianę nazwy: ${name}`,
    use: (name: string) => `Nowa wycena z szablonu: ${name}`,
    remove: (name: string) => `Usuń szablon: ${name}`,
    removeTitle: 'Usunąć szablon?',
    removeDescription: (name: string) =>
      `„${name}” zniknie z listy. Wyceny utworzone z tego szablonu zostają nietknięte.`,
    itemsCount: (count: number) => {
      if (count === 1) return '1 pozycja';
      const rest = count % 10;
      const tens = count % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return `${count} pozycje`;
      return `${count} pozycji`;
    },
    corrupted: 'Szablon uszkodzony — nie da się z niego utworzyć wyceny.',
    loadError: 'Nie udało się wczytać szablonów.',
    createdFrom: (name: string) => `Nowa wycena z szablonu „${name}”`,

    // Zapis szablonu z edytora.
    saveAsTemplate: 'Zapisz jako szablon',
    saveAsTemplateTitle: 'Nowy szablon z tej wyceny',
    saveAsTemplateDescription:
      'Szablon zapamiętuje układ i pozycje, ale nie dane klienta ani numeru wyceny.',
    saveAsTemplateName: 'Nazwa szablonu',
    saveAsTemplateConfirm: 'Zapisz szablon',
    saveAsTemplateDone: (name: string) => `Zapisano szablon „${name}”`,
    overwrite: 'Nadpisz szablon',
    overwriteTitle: 'Nadpisać szablon?',
    overwriteDescription: (name: string) =>
      `Zawartość „${name}” zostanie zastąpiona bieżącą wyceną. Tej zmiany nie da się cofnąć.`,
    overwriteDone: (name: string) => `Nadpisano szablon „${name}”`,
    overwriteEmpty: 'Nie masz jeszcze żadnego szablonu do nadpisania.',

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
      'Pas na górze każdej strony PDF — ten za logo i numerem oferty. Tym samym kolorem drukują się tytuły sekcji i linia nad podpisem. Tekst na pasie dobiera się sam: jasny na ciemnym kolorze, ciemny na jasnym.',
    bgColor: 'Tło podsumowania kosztów',
    bgColorHint:
      'Wypełnienie ramki z sumą na końcu oferty — tej z kwotą netto, VAT-em i brutto. Kwoty drukujemy na niej ciemnym atramentem, więc trzymaj się jasnego odcienia.',
    font: 'Font',
    fontHint: 'Krój całego dokumentu: tytuły, pozycje i stopka.',
    contacts: 'Kontakt',
    footer: 'Stopka',

    // Sekcje formularza.
    sectionIdentity: 'Firma',
    sectionLook: 'Wygląd PDF',
    sectionLookHint:
      'Trzy rzeczy, z których składa się dokument: znak na nagłówku, kolory i krój pisma. Zmiany widać od razu w podglądzie na dole strony.',
    sectionContact: 'Kontakt i stopka',
    sectionDefaults: 'Domyślne w wycenie',

    // Logo.
    logoDark: 'Znak ciemny',
    logoDarkHint: 'Wersja do położenia na JASNYM nagłówku.',
    logoLight: 'Znak jasny',
    logoLightHint: 'Wersja do położenia na CIEMNYM nagłówku.',
    logoHint: 'PNG, JPG, WEBP lub SVG, do 5 MB.',

    // Wybór wariantu na nagłówku (poprawka 3).
    headerLogo: 'Logo na nagłówku',
    headerLogoHint:
      'Który z dwóch znaków ma stanąć na pasie nagłówka. „Dobierz sam" patrzy na kolor marki: na ciemnym pasie kładzie znak jasny, na jasnym — ciemny.',
    headerLogoAuto: 'Dobierz sam',
    headerLogoLight: 'Zawsze znak jasny',
    headerLogoDark: 'Zawsze znak ciemny',
    headerLogoResolved: (variant: 'light' | 'dark') =>
      variant === 'light'
        ? 'Teraz na nagłówku stoi znak jasny.'
        : 'Teraz na nagłówku stoi znak ciemny.',
    headerLogoMissing: 'Ten wariant nie jest jeszcze wgrany — na pasie stanie sama nazwa firmy.',
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
    openingHoursHint: 'Blok „CZYNNE" w stopce PDF. Bez wierszy nie drukuje się wcale.',
    openingHoursLabel: (index: number) => `Wiersz ${index + 1} — dni`,
    openingHoursValue: (index: number) => `Wiersz ${index + 1} — godziny`,
    openingHoursLabelPlaceholder: 'poniedziałek – piątek',
    openingHoursValuePlaceholder: '8.00 – 16.00',
    addOpeningHours: 'Dodaj wiersz',
    removeOpeningHours: (index: number) => `Usuń wiersz ${index + 1}`,
    openingHoursFull: 'Więcej niż cztery wiersze nie zmieszczą się w stopce.',
    signer: 'Wystawiający',
    signerName: 'Imię i nazwisko',
    signerTitle: 'Tytuł zawodowy',
    signerTitlePlaceholder: 'projektant wnętrz',

    saved: 'Zapisano branding',
    invalidColor: 'Kolor musi być w formacie #RRGGBB',

    previewTitle: 'Podgląd oferty',
    previewHint:
      'Przykładowa wycena złożona z tych ustawień — także tych jeszcze niezapisanych. Dane są zmyślone.',
    previewRendering: 'Przeliczam…',
    previewOpen: 'Otwórz podgląd w nowym oknie',
  },
  /** Teksty widoczne wyłącznie w wygenerowanych dokumentach. */
  pdf: {
    individualPrice: 'wycena indywidualna',
    validUntil: 'Ważny do',
    scheduleStart: 'Start',
    scheduleNoStart: 'Termin policzymy po ustaleniu daty rozpoczęcia.',
    scheduleRoomsTable: 'Zakres per pomieszczenie',
    scheduleWholeProject: 'Etapy dla całego projektu',
    scheduleStageDays: 'Dni robocze',
    exportSchedule: 'Eksportuj termin (PDF)',
    scheduleMissing: 'Ta wycena nie ma jeszcze harmonogramu — ustaw go w zakładce „Termin".',
    scheduleSaved: 'Zapisano dokument „Szacowany termin"',
    stagesIncluded: 'w zakresie',
    stagesExcluded: 'poza zakresem',
    stagesCount: (objete: number, wszystkie: number) =>
      `${objete} z ${wszystkie} etapów w zakresie`,
    exportStages: 'Eksportuj etapy współpracy (PDF)',
    stagesMissing: 'Ta wycena nie ma jeszcze dokumentu etapów — złóż go w zakładce „Dokumenty”.',
    stagesSaved: 'Zapisano dokument „Etapy współpracy”',
    priceListRangeNote:
      'Ceny podane widłekami — dokładna kwota zależy od zakresu i powstaje po rozmowie.',
    exportPriceList: 'Eksportuj cennik dodatkowy (PDF)',
    priceListMissing:
      'Ta wycena nie ma jeszcze cennika dodatkowego — złóż go w zakładce „Dokumenty”.',
    priceListSaved: 'Zapisano dokument „Cennik usług dodatkowych”',

    // Pakiet dokumentów (F6.3).
    exportPackage: 'Eksportuj pakiet dokumentów…',
    packageTitle: 'Eksport pakietu',
    packageIntro: 'Wybierz dokumenty dla inwestora. Wszystkie niosą numer tej wyceny.',
    packageSingle: 'Jeden plik PDF',
    packageSingleHint: 'Dokumenty jeden po drugim, ze wspólną numeracją stron.',
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
    offline: 'Pracujesz bez połączenia. Zmiany zapisują się lokalnie.',
    waitingOffline: (count: number) =>
      count === 1
        ? 'Brak połączenia. 1 zmiana czeka na wysłanie — nic nie przepadło.'
        : `Brak połączenia. ${count} zmian czeka na wysłanie — nic nie przepadło.`,
    waitingOnline: (count: number) =>
      count === 1 ? 'Wysyłanie 1 zmiany…' : `Wysyłanie ${count} zmian…`,
    blocked: (count: number) =>
      count === 1
        ? 'Jedna zmiana czeka na Twoją decyzję — wycena została zmieniona w innym miejscu.'
        : `${count} zmian czeka na Twoją decyzję — wyceny zostały zmienione w innym miejscu.`,
    retry: 'Wyślij teraz',
    sent: (count: number) =>
      count === 1 ? 'Wysłano zaległą zmianę.' : `Wysłano ${count} zaległych zmian.`,
    conflicts: (count: number) =>
      count === 1
        ? 'Jedna zmiana nie weszła: wycena została zmieniona w innym miejscu.'
        : `${count} zmian nie weszło: wyceny zostały zmienione w innym miejscu.`,
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
      'Etapy pochodzą z harmonogramu zaakceptowanej wyceny. Gdy klient przyjmie ofertę, pojawią się tutaj.',
    emptyNoSchedule:
      'Zaakceptowana wycena nie ma harmonogramu. Dodaj etapy w zakładce „Termin" w edytorze wyceny.',
  },

  /** Historia wersji z porownaniem (T-22). */
  versions: {
    title: 'Historia wersji',
    description: 'Co zmieniło się między wersjami tej oferty i o ile.',
    onlyOne: 'Ta oferta ma na razie jedną wersję — nie ma czego porównywać.',
    compareWith: 'Porównaj z',
    totalsBefore: 'Poprzednia wersja',
    totalsAfter: 'Ta wersja',
    delta: 'Różnica',
    noChanges: 'Wersje mają identyczny zakres i kwoty.',
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
    idle: 'Sprawdź, czy jest nowa wersja Toolier.',
    check: 'Sprawdź aktualizacje',
    checking: 'Sprawdzanie…',
    current: 'Masz najnowszą wersję.',
    available: (version: string) => `Dostępna wersja ${version}.`,
    install: 'Pobierz i zainstaluj',
    downloading: 'Pobieranie…',
    downloadingPercent: (percent: number) => `Pobieranie… ${percent}%`,
    ready: 'Aktualizacja gotowa — uruchom ponownie, żeby ją włączyć.',
    relaunch: 'Uruchom ponownie',
    relaunchFailed: 'Nie udało się uruchomić ponownie. Zamknij i otwórz aplikację ręcznie.',
    /** Powiadomienie z cichego sprawdzenia przy starcie. */
    foundOnStart: (version: string) => `Jest nowa wersja Toolier (${version}).`,
    goToSettings: 'Ustawienia',
  },
  settings: {
    // Podzial na trzy karty (2026-08-27): konto · branding · aplikacja.
    tabAccount: 'Konto',
    tabApp: 'Aplikacja',
    accountIntro: 'Twój dostęp do aplikacji, subskrypcja i dane konta.',
    appIntro: 'Domyślne wartości nowych wycen, miejsce na pliki i aktualizacje.',
    access: 'Dostęp',
    // Zdjęcie użytkownika (poprawka 4).
    avatar: 'Twoje zdjęcie',
    avatarHint:
      'Widać je w pasku nawigacji. Kwadratowy kadr wygląda najlepiej — obrazek przycinamy do kółka. PNG, JPG lub WEBP, do 5 MB.',
    avatarSaved: 'Zapisano zdjęcie',
    avatarRemoved: 'Usunięto zdjęcie',
    /** Kropka przy avatarze w szynie. */
    connectionOnline: 'Połączono z internetem',
    connectionOffline: 'Brak połączenia — zmiany czekają w kolejce',
    yourData: 'Twoje dane',
    dangerZone: 'Strefa nieodwracalna',
    manageSubscription: 'Zarządzaj',
    subscriptionHint: 'Plan, płatności i faktury otwierają się na osobnym ekranie.',
    general: 'Ogólne',
    title: 'Ustawienia',
    sectionQuotes: 'Domyślne dla wycen',
    currency: 'Waluta',
    vatRate: 'Stawka VAT',
    pricesInclude: 'Ceny w wycenie podaję',
    pricesNet: 'netto (VAT doliczany)',
    pricesGross: 'brutto (VAT w cenie)',
    pricesIncludeHint:
      'Dotyczy nowych wycen. Wyceny już zapisane zachowują ustawienie sprzed zmiany.',
    defaultPricingBasis: 'Nowe wyceny liczę',
    hourlyRate: 'Stawka za godzinę (zł)',
    hourlyRateEmpty: 'nie podano',
    hourlyRateHint:
      'Wycena bierze stawkę jako kopię w chwili utworzenia — późniejsza zmiana tutaj nie rusza ofert, które już poszły.',
    numberPattern: 'Wzorzec numeracji',
    numberPatternPreview: 'Następna wycena dostanie numer',
    numberPatternHint: 'Tokeny: {YYYY}, {YY}, {MM}, {DD}, {seq}, {seq:6}.',
    numberPatternReset: 'Przywróć domyślny wzorzec',
    showVersionOnPdf: 'Numer wersji na dokumencie',
    showVersionOnPdfHint:
      'Domyślnie wyłączone — inwestor nie musi wiedzieć, że to kolejne podejście. W nazwie pliku wersja jest zawsze.',
    showDisabledItems: 'Pokazuj wyłączone pozycje w PDF',
    showDisabledItemsHint:
      'Wyłączone pozycje trafiają do PDF jako opcje bez kwoty — przydatne przy wariantach do wyboru.',
    unsaved: 'Niezapisane zmiany',
    saved: 'Ustawienia zapisane.',
    readOnly: 'Dostęp wygasł — ustawień nie da się zmienić. Eksport danych działa dalej.',

    roomTypes: 'Typy pomieszczeń',
    roomTypesHint:
      'Po nich cennik parametryczny dobiera stawkę. Zmiana nazwy nie rusza klucza, więc nie psuje cen w zapisanych wycenach.',
    roomTypesEmpty: 'Nie masz jeszcze żadnych typów pomieszczeń.',
    roomTypeNamePlaceholder: 'np. Kuchnia',
    roomTypeName: (name: string) => `Nazwa typu pomieszczenia: ${name}`,
    roomTypeRemove: (name: string) => `Usuń typ pomieszczenia ${name}`,
    roomTypeRemoveTitle: 'Usunąć typ pomieszczenia?',
    roomTypeRemoveDescription: (name: string) =>
      `„${name}" zniknie z listy, ale wyceny i reguły cenowe, które już go używają, zostaną nietknięte.`,
    roomTypeDuplicate: 'Taki typ pomieszczenia już istnieje.',

    account: 'Konto',
    changePassword: 'Zmień hasło',
    newPassword: 'Nowe hasło',
    repeatPassword: 'Powtórz hasło',
    passwordChanged: 'Hasło zmienione.',
    exportData: 'Eksportuj dane',
    exportDataHint:
      'Jeden plik JSON ze wszystkim: wyceny wraz z treścią, biblioteka, zestawy, szablony, klienci i ustawienia.',
    exportRunning: 'Przygotowuję plik…',
    exportDone: 'Dane zapisane do pliku.',
    exportOpen: 'Otwórz',
    exportFailed: 'Nie udało się wyeksportować danych.',
    deleteAccount: 'Usuń konto',
    deleteAccountHint:
      'Kasuje konto i wszystkie dane bezpowrotnie. Zanim to zrobisz, wyeksportuj wyceny — nie da się ich odzyskać.',
    deleteAccountConfirmLabel: (word: string) => `Wpisz ${word}, aby potwierdzić`,
    deleteAccountTitle: 'Usunąć konto na zawsze?',
    deleteAccountDescription:
      'Znikną wszystkie wyceny, biblioteka, szablony i ustawienia. Tej operacji nie da się cofnąć.',
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
    periodLabel: 'Jak chcesz płacić',
    buy: 'Aktywuj dostęp',
    manage: 'Zarządzaj płatnością',

    // Okno okresu próbnego przy starcie (poprawka 6). Po opłaceniu
    // subskrypcję obsługuje się wyłącznie z ustawień.
    trialDialogHint:
      'Wszystko działa bez ograniczeń. Po opłaceniu subskrypcję znajdziesz w Ustawieniach — to okno przestanie się pokazywać.',
    trialDialogLater: 'Później',
    readOnlyBanner:
      'Tryb tylko do odczytu — dostęp wygasł. Wyceny możesz dalej przeglądać i eksportować.',

    /**
     * Aplikacja jest płatna w całości — nie ma wersji darmowej ani pakietów.
     * Wybór dotyczy wyłącznie tego, jak często płacisz.
     */
    intro: 'Toolier jest aplikacją płatną. Wybierz, jak chcesz płacić.',
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
    trialExplainer: 'Okres próbny to czas na sprawdzenie aplikacji — nie wymaga karty.',
    renewsAt: (date: string) => `Odnowienie: ${date}`,
    endsAt: (date: string) => `Dostęp do: ${date}`,
    /*
     * Wyjaśnienia stanu. Nie powtarzają nazwy stanu, bo stoją bezpośrednio pod
     * nagłówkiem, który ją już podaje — mają mówić, CO Z TYM ZROBIĆ.
     */
    canceledNotice: 'Dostęp działa do końca opłaconego okresu.',
    pastDueNotice: 'Płatność się nie powiodła. Popraw dane karty, żeby nie stracić dostępu.',
    expiredNotice: 'Twoje wyceny są bezpieczne — wróć do nich po opłaceniu.',
    graceNotice: 'Ponawiamy płatność. Możesz pracować normalnie.',
    noSubscription: 'Brak informacji o płatności.',

    dataSafe: 'Twoje dane zostają na miejscu — po wygaśnięciu dalej je otworzysz i wyeksportujesz.',
    failed: 'Nie udało się połączyć ze Stripe.',
    noUrl: 'Stripe nie zwrócił adresu płatności.',
    returned: 'Sprawdzam status płatności…',
    activated: 'Dostęp aktywny. Dziękujemy!',
    checkoutCanceled: 'Płatność przerwana — nic nie pobraliśmy.',
    readOnlyEditHint: 'Edycja wymaga aktywnego dostępu. Podgląd i eksport działają dalej.',
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
    noAccount: 'Nie masz konta?',
    hasAccount: 'Masz już konto?',
  },
  onboarding: {
    title: 'Zacznij od trzech rzeczy',
    lead: 'Każdy krok zajmuje chwilę i oszczędza pracy przy pierwszej ofercie.',
    progress: (done: number, total: number) => `${done} z ${total}`,
    done: 'gotowe',
    steps: {
      brand: {
        title: 'Wgraj logo',
        hint: 'Trafia do każdego PDF-a — wgrane raz oszczędza poprawianie ofert później.',
      },
      /*
       * Od T-62 nowe konto dostaje 38 usług przykładowych, więc „Dodaj
       * pozycje do biblioteki" prosiłoby o coś, co już tam jest. Krok liczy
       * pozycje BEZ flagi „przykładowa" — a tę flagę zdejmuje pierwsza
       * poprawiona cena. Napis ma mówić dokładnie to.
       */
      library: {
        title: 'Ustaw swoje ceny w bibliotece',
        hint: 'Konto startuje z gotowymi usługami — popraw ceny na swoje albo dodaj własne.',
      },
      quote: {
        title: 'Zrób pierwszą wycenę',
        hint: 'Pozycje TAK/NIE, sumy na żywo, PDF na końcu.',
      },
    },
  },

  errors: {
    generic: 'Coś poszło nie tak.',
    notFound: 'Nie znaleziono strony.',
    notConfigured: 'Brak konfiguracji Supabase — uzupełnij plik .env.',
    workspaceTitle: 'Nie udało się wczytać danych firmy',
    workspaceHint:
      'Aplikacja połączyła się z bazą, ale nie znalazła Twojego workspace. Najczęściej znaczy to, że baza nie ma zaaplikowanych migracji albo aplikacja wskazuje na inny projekt Supabase niż myślisz.',
    connectedTo: (url: string) => `Adres bazy: ${url}`,

    // Ekran awaryjny (T-17).
    crashTitle: 'Aplikacja napotkała błąd',
    crashLead:
      'Twoje dane są bezpieczne — wyceny zapisują się w chmurze na bieżąco. Przekaż poniższy komunikat, jeśli błąd się powtórzy.',
    crashReload: 'Przeładuj aplikację',
    crashBack: 'Spróbuj dalej',
  },
} as const;

export type Dictionary = typeof pl;
