/** Jedyne miejsce z definicją ścieżek — komponenty nie hardkodują stringów URL. */
export const routes = {
  dashboard: '/',
  quotes: '/wyceny',
  quote: (id: string) => `/wyceny/${id}`,
  quoteNew: '/wyceny/nowa',
  clients: '/klienci',
  client: (id: string) => `/klienci/${id}`,
  project: (clientId: string, projectId: string) => `/klienci/${clientId}/projekty/${projectId}`,
  library: '/biblioteka',
  libraryItem: (id: string) => `/biblioteka/uslugi/${id}`,
  libraryItemNew: '/biblioteka/uslugi/nowa',
  templates: '/szablony',
  /** Alias sprzed T-58 — Branding jest teraz sekcja Ustawien. */
  brand: '/branding',
  help: '/pomoc',
  settings: '/ustawienia',
  settingsBranding: '/ustawienia/branding',
  subscription: '/subskrypcja',
  login: '/logowanie',
  register: '/rejestracja',
  resetPassword: '/reset-hasla',
  newPassword: '/nowe-haslo',
} as const;
