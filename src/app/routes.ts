/** Jedyne miejsce z definicją ścieżek — komponenty nie hardkodują stringów URL. */
export const routes = {
  dashboard: '/',
  /** Kalendarz terminów (T-98). */
  calendar: '/kalendarz',
  /**
   * Rejestr dokumentacji (T-100/T-111): teczki wycena + termin + etapy +
   * cennik. Do Fazy 5 `/wyceny` — stary adres przekierowuje.
   */
  quotes: '/dokumenty',
  quotesLegacy: '/wyceny',
  /** Edytor dokumentu. Adres zostal przy `/wyceny/:id` — wiersz w bazie to dalej `quotes`. */
  quote: (id: string) => `/wyceny/${id}`,
  quoteNew: '/wyceny/nowa',
  clients: '/klienci',
  client: (id: string) => `/klienci/${id}`,
  project: (clientId: string, projectId: string) => `/klienci/${clientId}/projekty/${projectId}`,
  library: '/biblioteka',
  libraryItem: (id: string) => `/biblioteka/uslugi/${id}`,
  libraryItemNew: '/biblioteka/uslugi/nowa',
  templates: '/szablony',
  /** Edytor szablonu (T-113) — ten sam edytor co dokumentacja, inne zrodlo danych. */
  template: (id: string) => `/szablony/${id}`,
  /** Alias sprzed T-58 — Branding jest teraz sekcja Ustawien. */
  brand: '/branding',
  /** Kosz na pliki — wlasny ekran, nie sekcja Ustawien (2026-08-27). */
  trash: '/kosz',
  help: '/pomoc',
  settings: '/ustawienia',
  settingsBranding: '/ustawienia/branding',
  /** Szablony briefu (T-96) — edytor formularza, nie sekcja „Aplikacji”. */
  settingsBrief: '/ustawienia/brief',
  settingsAccount: '/ustawienia/konto',
  subscription: '/subskrypcja',
  login: '/logowanie',
  register: '/rejestracja',
  resetPassword: '/reset-hasla',
  newPassword: '/nowe-haslo',
} as const;
