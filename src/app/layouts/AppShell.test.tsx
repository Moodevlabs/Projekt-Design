import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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
