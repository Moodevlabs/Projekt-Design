import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
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
  it('ustawia kulkę na wysokości aktywnej pozycji', () => {
    renderAt('/wyceny');
    const pill = screen.getByTestId('nav-active-pill');
    const expected = NAV_ITEMS.findIndex((item) => item.to === '/wyceny');
    expect(pill).toHaveAttribute('data-index', String(expected));
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

  it('chowa kulkę na trasie spoza nawigacji', () => {
    renderAt('/subskrypcja');
    expect(screen.queryByTestId('nav-active-pill')).not.toBeInTheDocument();
  });

  it('oznacza pozycje z fazy 2 jako niedostępne', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /Klienci/ })).toHaveAttribute('aria-disabled', 'true');
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
