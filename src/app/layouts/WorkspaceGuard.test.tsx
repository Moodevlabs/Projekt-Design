import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pl } from '@/i18n/pl';

const useWorkspace = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useWorkspace', () => ({ useWorkspace }));

const { WorkspaceGuard } = await import('./WorkspaceGuard');

describe('WorkspaceGuard', () => {
  it('przepuszcza aplikację, gdy workspace się wczytał', () => {
    useWorkspace.mockReturnValue({ isError: false, error: null });
    render(
      <WorkspaceGuard>
        <p>Zawartość</p>
      </WorkspaceGuard>,
    );
    expect(screen.getByText('Zawartość')).toBeInTheDocument();
  });

  it('zamiast pustego ekranu tłumaczy, że danych NIE UDAŁO SIĘ pobrać', () => {
    useWorkspace.mockReturnValue({
      isError: true,
      error: new Error('Konto nie ma workspace.'),
    });
    render(
      <WorkspaceGuard>
        <p>Zawartość</p>
      </WorkspaceGuard>,
    );

    // Najważniejsze: aplikacja NIE renderuje swoich stanów pustych, bo to
    // wyglądałoby jak „brak danych", a nie jak awaria połączenia.
    expect(screen.queryByText('Zawartość')).not.toBeInTheDocument();
    expect(screen.getByText(pl.errors.workspaceTitle)).toBeInTheDocument();
    expect(screen.getByText('Konto nie ma workspace.')).toBeInTheDocument();
  });

  it('pokazuje adres bazy, żeby było widać, dokąd aplikacja faktycznie celuje', () => {
    useWorkspace.mockReturnValue({ isError: true, error: new Error('boom') });
    render(
      <WorkspaceGuard>
        <p>Zawartość</p>
      </WorkspaceGuard>,
    );
    expect(screen.getByText(/Adres bazy:/)).toBeInTheDocument();
  });
});
