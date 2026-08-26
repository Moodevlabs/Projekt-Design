/**
 * Klucze cache TanStack Query w jednym miejscu — inaczej unieważnianie
 * rozjeżdża się z pobieraniem.
 *
 * Klucze bez parametru nie zawierają `workspaceId`, bo w fazach 1–2 konto ma
 * dokładnie jeden workspace, a RLS i tak przycina wyniki. Klucze z filtrami
 * dostają cały obiekt filtrów (razem z `workspaceId`) — dzięki temu prefiks
 * `['quotes']` / `['library','items']` unieważnia wszystkie warianty naraz.
 */
export const queryKeys = {
  workspace: ['workspace'] as const,
  workspaceSettings: ['workspace', 'settings'] as const,
  subscription: ['subscription'] as const,
  brandKit: ['brand-kit'] as const,
  quotes: (filters?: unknown) => (filters ? (['quotes', filters] as const) : (['quotes'] as const)),
  quote: (id: string) => ['quotes', 'detail', id] as const,
  clients: (filters?: unknown) =>
    filters ? (['clients', filters] as const) : (['clients'] as const),
  client: (id: string) => ['clients', 'detail', id] as const,
  /**
   * Osobno od `client`, bo to inne dane: rekord vs rekord z sumami z wycen.
   * Wspólny klucz znaczyłby, że combobox w edytorze (któremu wystarczy nazwa
   * i telefon) nadpisuje w cache to, co nagłówek karty właśnie policzył.
   */
  clientOverview: (id: string) => ['clients', 'detail', id, 'overview'] as const,
  projects: (filters?: unknown) =>
    filters ? (['projects', filters] as const) : (['projects'] as const),
  project: (id: string) => ['projects', 'detail', id] as const,
  projectOverview: (id: string) => ['projects', 'detail', id, 'overview'] as const,
  files: (filters?: unknown) => (filters ? (['files', filters] as const) : (['files'] as const)),
  trash: (workspaceId?: string) =>
    workspaceId ? (['trash', workspaceId] as const) : (['trash'] as const),
  storageUsage: (workspaceId?: string) =>
    workspaceId ? (['storage-usage', workspaceId] as const) : (['storage-usage'] as const),
  roomTypes: (workspaceId?: string) =>
    workspaceId ? (['room-types', workspaceId] as const) : (['room-types'] as const),
  libraryItems: (filters?: unknown) =>
    filters ? (['library', 'items', filters] as const) : (['library', 'items'] as const),
  libraryCategories: (workspaceId?: string) =>
    workspaceId
      ? (['library', 'categories', workspaceId] as const)
      : (['library', 'categories'] as const),
  libraryUsage: (workspaceId?: string) =>
    workspaceId ? (['library', 'usage', workspaceId] as const) : (['library', 'usage'] as const),
  librarySample: (workspaceId?: string) =>
    workspaceId ? (['library', 'sample', workspaceId] as const) : (['library', 'sample'] as const),
  libraryGroups: (workspaceId?: string) =>
    workspaceId ? (['library', 'groups', workspaceId] as const) : (['library', 'groups'] as const),
  /** Linki klienta, uwagi i akceptacja — wszystko per wycena (T-25/T-26). */
  shares: (quoteId: string) => ['quotes', 'detail', quoteId, 'shares'] as const,
  quoteComments: (quoteId: string) => ['quotes', 'detail', quoteId, 'comments'] as const,
  quoteAcceptance: (quoteId: string) => ['quotes', 'detail', quoteId, 'acceptance'] as const,
  templates: (workspaceId?: string) =>
    workspaceId ? (['templates', workspaceId] as const) : (['templates'] as const),
  template: (id: string) => ['templates', 'detail', id] as const,
} as const;
