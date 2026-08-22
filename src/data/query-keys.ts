/**
 * Klucze cache TanStack Query w jednym miejscu — inaczej unieważnianie
 * rozjeżdża się z pobieraniem.
 */
export const queryKeys = {
  workspace: ['workspace'] as const,
  workspaceSettings: ['workspace', 'settings'] as const,
  subscription: ['subscription'] as const,
  brandKit: ['brand-kit'] as const,
  quotes: (filters?: unknown) => (filters ? (['quotes', filters] as const) : (['quotes'] as const)),
  quote: (id: string) => ['quotes', 'detail', id] as const,
  libraryItems: ['library', 'items'] as const,
  libraryGroups: ['library', 'groups'] as const,
  templates: ['templates'] as const,
} as const;
