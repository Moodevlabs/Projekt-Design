import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pl } from '@/i18n/pl';

const useClients = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));
const useProjects = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));
const useQuotesList = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));
const useLibraryItems = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));

vi.mock('@/data/queries/useClients', () => ({ useClients }));
vi.mock('@/data/queries/useProjects', () => ({ useProjects }));
vi.mock('@/data/queries/useQuotes', () => ({ useQuotesList }));
vi.mock('@/data/queries/useLibrary', () => ({ useLibraryItems }));

const { CommandPalette } = await import('./CommandPalette');

function renderPalette() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CommandPalette open onOpenChange={vi.fn()} />} />
        <Route path="/klienci/:id" element={<p>Karta klienta</p>} />
        <Route path="/klienci/:id/projekty/:projectId" element={<p>Karta projektu</p>} />
        <Route path="/wyceny/:id" element={<p>Edytor wyceny</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Ostatnie filtry, z jakimi komponent zawolal danego hooka. */
function lastFilters(hook: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const calls = hook.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClients.mockReturnValue({ data: [] });
    useProjects.mockReturnValue({ data: [] });
    useQuotesList.mockReturnValue({ data: [] });
    useLibraryItems.mockReturnValue({ data: [] });
  });

  it('przekazuje fraze do WSZYSTKICH zapytan — filtruje baza, nie cmdk', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByPlaceholderText(pl.search.placeholder), 'kowal');

    // Sedno: gdyby filtrowal `cmdk`, trzeba by sciagnac wszystko i odsiac
    // w przegladarce — ten sam blad co liczenie totali w komponencie.
    expect(lastFilters(useClients).search).toBe('kowal');
    expect(lastFilters(useProjects).search).toBe('kowal');
    expect(lastFilters(useQuotesList).search).toBe('kowal');
    expect(lastFilters(useLibraryItems).search).toBe('kowal');
  });

  it('nie wysyla pustej frazy jako filtra', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByPlaceholderText(pl.search.placeholder), '   ');
    expect(lastFilters(useClients).search).toBeUndefined();
  });

  it('szuka takze wsrod ZARCHIWIZOWANYCH klientow i wycen', () => {
    renderPalette();

    // Stary klient wraca po latach — paleta ma go znalezc, a nie udawac,
    // ze go nie ma.
    expect(lastFilters(useClients).status).toBe('all');
    expect(lastFilters(useQuotesList).status).toBe('all');
  });

  it('pokazuje akcje nawet przy pustych wynikach', () => {
    renderPalette();

    expect(screen.getByText(pl.clients.new)).toBeInTheDocument();
    expect(screen.getByText(pl.quotes.new)).toBeInTheDocument();
  });

  it('klient prowadzi do swojej karty', async () => {
    const user = userEvent.setup();
    useClients.mockReturnValue({
      data: [{ id: 'c1', name: 'Anna Kowalska', city: 'Poznań' }],
    });
    renderPalette();

    await user.click(screen.getByText('Anna Kowalska'));
    expect(await screen.findByText('Karta klienta')).toBeInTheDocument();
  });

  it('projekt prowadzi do teczki i pokazuje, czyja jest', async () => {
    const user = userEvent.setup();
    useProjects.mockReturnValue({
      data: [{ id: 'p1', clientId: 'c1', name: 'Dom 164 m²', clientName: 'Kowalscy' }],
    });
    renderPalette();

    expect(screen.getByText('Kowalscy')).toBeInTheDocument();
    await user.click(screen.getByText('Dom 164 m²'));
    expect(await screen.findByText('Karta projektu')).toBeInTheDocument();
  });

  it('wycena pokazuje numer z wersja i prowadzi do edytora', async () => {
    const user = userEvent.setup();
    useQuotesList.mockReturnValue({
      data: [{ id: 'q1', title: 'Remont kuchni', number: 'WYC/2026/08/0001', version: 2 }],
    });
    renderPalette();

    expect(screen.getByText(/WYC\/2026\/08\/0001 · v2/)).toBeInTheDocument();
    await user.click(screen.getByText('Remont kuchni'));
    expect(await screen.findByText('Edytor wyceny')).toBeInTheDocument();
  });

  it('grupa bez wynikow sie NIE renderuje', () => {
    useClients.mockReturnValue({ data: [{ id: 'c1', name: 'Anna', city: '' }] });
    renderPalette();

    expect(screen.getByText(pl.nav.clients)).toBeInTheDocument();
    // Pusty naglowek grupy to szum — nie mowi nic poza „tu nic nie ma".
    expect(screen.queryByText(pl.projects.title)).not.toBeInTheDocument();
  });
});
