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

describe('Sidebar — kolejnosc i zakres (T-58)', () => {
  it('kolejnosc z 05-UI §2: Pulpit · Klienci · Wyceny · Biblioteka · Szablony | Kosz · Pomoc · Ustawienia', () => {
    // Klienci PRZED wycenami: od T-53 to oni sa osia aplikacji.
    //
    // Kosz doszedl 2026-08-27 NAD Pomoca. Byl sekcja Ustawien, ktora znikala,
    // gdy byl pusty — czyli czlowiek szukajacy skasowanego pliku nie mial
    // gdzie zajrzec. Stoi pod kreska, bo sie do niego ZAGLADA, a nie pracuje.
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      pl.nav.dashboard,
      pl.nav.clients,
      pl.nav.quotes,
      pl.nav.library,
      pl.nav.templates,
      pl.nav.trash,
      pl.nav.help,
      pl.nav.settings,
    ]);
    // Kosz, Pomoc i Ustawienia sa w osobnej grupie, pod kreska (T-73).
    expect(NAV_ITEMS.map((item) => item.group)).toEqual([
      'main',
      'main',
      'main',
      'main',
      'main',
      'system',
      'system',
      'system',
    ]);
  });

  it('Kosz prowadzi na wlasny ekran i jest pierwszy pod kreska', () => {
    renderAt('/kosz');
    const trash = screen.getByRole('link', { name: pl.nav.trash });
    expect(trash).toHaveAttribute('href', '/kosz');
    expect(trash).toHaveAttribute('aria-current', 'page');
    // Kulka liczy pozycje W SWOJEJ grupie — Kosz jest w niej pierwszy.
    expect(screen.getByTestId('nav-active-marker')).toHaveAttribute('data-index', '0');
  });

  it('Pomoc prowadzi do poradnika i podswietla sie na jego trasie', () => {
    renderAt('/pomoc');
    const help = screen.getByRole('link', { name: pl.nav.help });
    expect(help).toHaveAttribute('href', '/pomoc');
    expect(help).toHaveAttribute('aria-current', 'page');
    // Kulka liczy pozycje W SWOJEJ grupie — od 2026-08-27 Pomoc jest DRUGA,
    // bo nad nia stoi Kosz.
    expect(screen.getByTestId('nav-active-marker')).toHaveAttribute('data-index', '1');
  });

  it('Branding zniknal z sidebara — wszedl do Ustawien', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: pl.nav.brand })).not.toBeInTheDocument();
  });

  it('trasa /branding dalej podswietla Ustawienia — alias nie moze gubic kontekstu', () => {
    // Zapisane linki sprzed T-58 maja dzialac, ale to juz sekcja Ustawien.
    renderAt('/ustawienia/branding');
    expect(screen.getByRole('link', { name: pl.nav.settings })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('zaznacza klientow na trasie projektu', () => {
    // `/klienci/:id/projekty/:pid` — dwa poziomy zagniezdzenia (§9.8).
    renderAt('/klienci/abc/projekty/xyz');
    expect(screen.getByRole('link', { name: pl.nav.clients })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
