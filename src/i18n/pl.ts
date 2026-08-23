/**
 * Jedyne źródło tekstów UI. Struktura płaska-w-sekcjach, żeby dało się to
 * później podmienić na i18next bez przepisywania komponentów.
 */
export const pl = {
  app: {
    name: 'Anzorge',
    tagline: 'Interaktywne wyceny',
    /** Podpis wytłoczony w tle aplikacji. Nazwy własne — nie tłumaczymy. */
    credit: 'Developed by AnzorgeDesign & Moodevlabs',
  },
  nav: {
    dashboard: 'Pulpit',
    quotes: 'Wyceny',
    clients: 'Klienci',
    library: 'Biblioteka',
    templates: 'Szablony',
    brand: 'Branding',
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
  },
  quotes: {
    title: 'Wyceny',
    new: 'Nowa wycena',
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
    sort: {
      label: 'Sortuj',
      updated_desc: 'Ostatnio zmienione',
      created_desc: 'Najnowsze',
      total_desc: 'Najwyższa kwota',
      number_asc: 'Numer rosnąco',
    },
    archived: 'Zarchiwizowane',
    archiveConfirmTitle: 'Zarchiwizować wycenę?',
    archiveConfirmDescription:
      'Wycena zniknie z listy, ale zostanie w bazie — będzie można ją przywrócić.',
    duplicated: 'Utworzono kopię wyceny',
    archivedToast: 'Wycena zarchiwizowana',
    loadError: 'Nie udało się wczytać wycen.',
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
    // Pomieszczenia wyceny (cennik parametryczny).
    rooms: 'Pomieszczenia',
    roomsHint: 'Usługi liczone za pomieszczenie biorą stąd swoje składniki.',
    roomsEmpty: 'Brak pomieszczeń. Dodaj je, jeśli wyceniasz za pomieszczenie.',
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
    roomFlagsHint: 'W — część wizualna, T — techniczna. Decydują, co wchodzi do której usługi.',
    /** Bloki per pomieszczenie w sekcji. */
    addRoomBlocks: 'Rozpisz na pomieszczenia',
    addRoomBlocksDone: (count: number) =>
      count === 1 ? 'Dodano blok 1 pomieszczenia' : `Dodano bloki ${count} pomieszczeń`,
    addRoomBlocksNothing: 'Wszystkie pomieszczenia mają już swoje bloki.',
    addRoomBlocksNoRooms: 'Najpierw dodaj pomieszczenia w panelu obok.',
    addItemToAllRooms: 'Do wszystkich pomieszczeń',
    addItemToAllRoomsDone: (count: number) =>
      count === 1 ? 'Dodano do 1 pomieszczenia' : `Dodano do ${count} pomieszczeń`,
    roomBlockLabel: (room: string, qty: number) => (qty > 1 ? `${room} ×${qty}` : room),
    roomBlockOff: 'pominięte',

    // Zakladki edytora i harmonogram (F5.2).
    tabQuote: 'Wycena',
    tabSchedule: 'Termin',
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
    roomBlockNameHint: 'Nazwę zmienisz w panelu „Pomieszczenia" obok — tutaj jest tylko pokazana.',
    itemFramesLabel: 'Liczba kadrów',
    pricingBasis: 'Sposób liczenia',
    basisAmount: 'Kwotowo',
    basisTime: 'Godzinowo',
    hourlyRate: 'Stawka za godzinę',
    hourlyRateMissing: 'Bez stawki wszystkie kwoty wychodzą zerowe.',
    workload: 'Pracochłonność',
    workloadEstimate: 'Szacowana pracochłonność',
    workloadEstimateHint: 'Szacunek wyliczony z cen według stawki z ustawień — nie z wpisanego czasu.',
    workloadNoRate: 'Ustaw stawkę godzinową w ustawieniach, żeby dało się oszacować czas.',
    workloadCommunication: 'Komunikacja projektowa',
    workloadCommunicationHint: 'Liczba zawarta w sumie poniżej.',
    workloadTotal: 'Razem',
    itemTagCommunication: 'Komunikacja projektowa',
    itemTagsLabel: (name: string) => `Etykiety pozycji: ${name}`,
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
    investor: 'Inwestor',
    date: 'Data',
    phone: 'Telefon',
    email: 'E-mail',
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
      start: (name: string) => `Podniesiono: ${name}. Strzałkami wybierz miejsce, spacją upuść, Escape anuluje.`,
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
    title: 'Pulpit',
    quotesThisMonth: 'Wyceny w tym miesiącu',
    sentValue: 'Wartość wysłanych',
    acceptanceRate: 'Wskaźnik akceptacji',
    averageValue: 'Średnia wartość',
    recentQuotes: 'Ostatnie wyceny',
    quickActions: 'Szybkie akcje',
    thisMonth: 'w tym miesiącu',
    noAcceptanceData: 'brak rozstrzygniętych',

    // Bilans miesiąca — prawa szyna pulpitu czyta liczby jak podsumowanie wyceny.
    created: 'Wyceny utworzone',
    sentToClients: 'Wysłane do klientów',
    responses: 'Odpowiedzi klientów',
    settledOnYes: (accepted: number, settled: number) => `${accepted} z ${settled} na TAK`,
    noResponses: 'Klienci jeszcze nie odpowiedzieli',
    monthEmptyHint: 'Ten miesiąc zaczyna się od pierwszej wyceny.',

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
    title: 'Biblioteka',
    sheetHint: 'Zmiany cen i nazw możesz od razu przenieść na otwartą wycenę.',
    items: 'Pozycje',
    groups: 'Grupy',
    category: 'Kategoria',
    emptyTitle: 'Biblioteka jest pusta',
    emptyDescription: 'Dodaj pozycje, których używasz najczęściej — wstawisz je do wyceny jednym kliknięciem.',

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
    importCsvUnmatched: (names: string[]) =>
      `Nie znaleziono w bibliotece: ${names.join(', ')}`,
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
    groupItemsEmpty: 'Ta grupa nie ma jeszcze pozycji.',

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
    groupsEmptyTitle: 'Nie masz jeszcze żadnej grupy',
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
  },
  brand: {
    title: 'Branding',
    companyName: 'Nazwa firmy',
    logo: 'Logo',
    accentColor: 'Kolor akcentu',
    bgColor: 'Kolor tła PDF',
    font: 'Font',
    contacts: 'Kontakt',
    footer: 'Stopka',

    // Sekcje formularza.
    sectionIdentity: 'Firma',
    sectionLook: 'Wygląd PDF',
    sectionContact: 'Kontakt i stopka',
    sectionDefaults: 'Domyślne w wycenie',

    // Logo.
    logoDark: 'Logo na jasne tło',
    logoLight: 'Logo na ciemny nagłówek',
    logoHint: 'PNG, JPG, WEBP lub SVG, do 5 MB.',
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
  settings: {
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
    buy: 'Aktywuj dostęp',
    manage: 'Zarządzaj płatnością',
    readOnlyBanner:
      'Tryb tylko do odczytu — dostęp wygasł. Wyceny możesz dalej przeglądać i eksportować.',

    /**
     * Aplikacja jest płatna w całości — nie ma wersji darmowej ani pakietów.
     * Wybór dotyczy wyłącznie tego, jak często płacisz.
     */
    intro: 'Anzorge jest aplikacją płatną. Wybierz, jak chcesz płacić.',
    monthly: 'Miesięcznie',
    yearly: 'Rocznie',
    monthlyPrice: '19,99 zł / mies.',
    yearlyPrice: '199 zł / rok',
    yearlySaving: 'dwa miesiące taniej',
    perPeriod: (period: string) => (period === 'yearly' ? 'rocznie' : 'miesięcznie'),

    statusLabel: 'Status',
    trialDaysLeft: (days: number) => {
      if (days === 1) return 'Został 1 dzień okresu próbnego';
      const rest = days % 10;
      const tens = days % 100;
      if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return `Zostały ${days} dni okresu próbnego`;
      return `Zostało ${days} dni okresu próbnego`;
    },
    trialExplainer: 'Okres próbny to czas na sprawdzenie aplikacji — nie wymaga karty.',
    renewsAt: (date: string) => `Odnowienie: ${date}`,
    endsAt: (date: string) => `Dostęp do: ${date}`,
    canceledNotice: 'Płatność anulowana — dostęp działa do końca opłaconego okresu.',
    pastDueNotice: 'Płatność się nie powiodła. Popraw dane karty, żeby nie stracić dostępu.',
    expiredNotice: 'Dostęp wygasł. Twoje wyceny są bezpieczne — wróć do nich po opłaceniu.',
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
  errors: {
    generic: 'Coś poszło nie tak.',
    notFound: 'Nie znaleziono strony.',
    notConfigured: 'Brak konfiguracji Supabase — uzupełnij plik .env.',
    workspaceTitle: 'Nie udało się wczytać danych firmy',
    workspaceHint:
      'Aplikacja połączyła się z bazą, ale nie znalazła Twojego workspace. Najczęściej znaczy to, że baza nie ma zaaplikowanych migracji albo aplikacja wskazuje na inny projekt Supabase niż myślisz.',
    connectedTo: (url: string) => `Adres bazy: ${url}`,
  },
} as const;

export type Dictionary = typeof pl;
