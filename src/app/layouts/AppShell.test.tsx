import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';
import { AuthStub } from '@/features/auth/test-utils';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { pl } from '@/i18n/pl';

function renderShell(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage />, handle: { title: pl.dashboard.title } },
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
    expect(screen.getByText(pl.dashboard.recentQuotes)).toBeInTheDocument();
  });
});
