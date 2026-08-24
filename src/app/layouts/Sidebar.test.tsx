import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Panel boczny trzymamy w izolacji od warstwy danych. Licznik okresu próbnego
// pyta o subskrypcję, co ciągnęłoby tu TanStack Query i Supabase — a testuje
// się go osobno, w `billing-ui.test.tsx`.
vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: true, reason: 'active', loading: true }),
}));
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthStub } from '@/features/auth/test-utils';
import { Sidebar } from './Sidebar';
import { NAV_ITEMS } from './nav-items';
import { pl } from '@/i18n/pl';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthStub>
        <TooltipProvider>
          <Sidebar />
        </TooltipProvider>
      </AuthStub>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Sidebar — aktywna pozycja', () => {
  it('ustawia znacznik na wysokości aktywnej pozycji', () => {
    renderAt('/wyceny');
    const marker = screen.getByTestId('nav-active-marker');
    const expected = NAV_ITEMS.findIndex((item) => item.to === '/wyceny');
    expect(marker).toHaveAttribute('data-index', String(expected));
  });

  it('oznacza aktywny link atrybutem aria-current', () => {
    renderAt('/wyceny');
    // Regresja: `TooltipTrigger asChild` scala className jako string, więc
    // funkcyjny className NavLinka wyciekłby do DOM zamiast klas.
    const active = screen.getByRole('link', { name: pl.nav.quotes });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).not.toContain('isActive');
  });

  it('nie zaznacza pulpitu, gdy jesteśmy na podstronie', () => {
    renderAt('/wyceny');
    expect(screen.getByRole('link', { name: pl.nav.dashboard })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('zaznacza wyceny także na widoku edytora', () => {
    renderAt('/wyceny/abc');
    expect(screen.getByRole('link', { name: pl.nav.quotes })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('chowa znacznik na trasie spoza nawigacji', () => {
    renderAt('/subskrypcja');
    expect(screen.queryByTestId('nav-active-marker')).not.toBeInTheDocument();
  });

  it('klienci sa dostepni — nie ma juz pozycji „wkrotce"', () => {
    renderAt('/');
    const clients = screen.getByRole('link', { name: pl.nav.clients });
    expect(clients).not.toHaveAttribute('aria-disabled', 'true');
    expect(clients).toHaveAttribute('href', '/klienci');
  });

  it('zaznacza klientow takze na karcie klienta', () => {
    // Pulapka z T-04 (§9.8): trasy zagniezdzone (`/klienci/:id`, pozniej
    // `/klienci/:id/projekty/:pid`) musza podswietlac „Klienci".
    renderAt('/klienci/abc');
    expect(screen.getByRole('link', { name: pl.nav.clients })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('Sidebar — rozwijanie', () => {
  it('startuje zwinięty i pokazuje tylko ikony', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByText(pl.nav.library)).not.toBeInTheDocument();
  });

  it('po rozwinięciu pokazuje etykiety', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('button', { name: pl.nav.expand }));

    expect(screen.getByRole('navigation')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByText(pl.nav.library)).toBeInTheDocument();
  });

  it('zapamiętuje rozwinięcie między uruchomieniami', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/');

    await user.click(screen.getByRole('button', { name: pl.nav.expand }));
    unmount();

    renderAt('/');
    expect(screen.getByRole('navigation')).toHaveAttribute('data-expanded', 'true');
  });
});
