import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Powłokę testujemy w izolacji od warstwy danych — `WorkspaceGuard` pyta
// o workspace, a to ciągnęłoby za sobą TanStack Query i Supabase.
vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ isError: false, error: null }),
  useWorkspaceId: () => 'ws-1',
}));

// Licznik okresu próbnego w panelu bocznym pyta o subskrypcję. Powłoka nie ma
// o tym nic do powiedzenia — `TrialBar` ma własne testy.
/*
 * Od T-58 `Topbar` montuje paletę ⌘K i dialog „Nowa wycena", a te pytają
 * o klientów, projekty i wyceny. Powłokę testujemy w izolacji od danych —
 * same zapytania mają własne testy.
 */
vi.mock('@/data/queries/useClients', () => ({
  useClients: () => ({ data: [] }),
  useCreateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [] }),
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useQuotesList: () => ({ data: [] }),
  useCreateQuote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems: () => ({ data: [] }),
}));

vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: true, reason: 'active', loading: true }),
}));
import { AppShell } from './AppShell';
import { AuthStub } from '@/features/auth/test-utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { pl } from '@/i18n/pl';

function renderShell(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          // Celowo prosta strona — AppShell testujemy w izolacji od pulpitu,
          // ktory ciagnie za soba TanStack Query i zapytania do Supabase.
          { index: true, element: <p>Tresc pulpitu</p>, handle: { title: pl.dashboard.title } },
          { path: 'biblioteka', element: <p>Biblioteka</p>, handle: { title: pl.library.title } },
        ],
      },
    ],
    { initialEntries: [path] },
  );

  return render(
    <AuthStub>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthStub>,
  );
}

describe('AppShell', () => {
  it('bierze tytuł strony z `handle` aktywnej trasy', () => {
    renderShell('/');
    expect(screen.getByRole('heading', { name: pl.dashboard.title, level: 1 })).toBeInTheDocument();
  });

  it('aktualizuje tytuł przy zmianie trasy', () => {
    renderShell('/biblioteka');
    expect(screen.getByRole('heading', { name: pl.library.title, level: 1 })).toBeInTheDocument();
  });

  it('renderuje nawigację i treść trasy', () => {
    renderShell('/');
    expect(screen.getByRole('link', { name: pl.nav.quotes })).toBeInTheDocument();
    expect(screen.getByText('Tresc pulpitu')).toBeInTheDocument();
  });
});
