import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultWorkspaceSettings } from '@/domain/brand/schema';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import { newScheduleBody } from '@/domain/schedule';
import { pl } from '@/i18n/pl';

const useClients = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));
const useProjects = vi.hoisted(() =>
  vi.fn((_filters?: Record<string, unknown>) => ({ data: [] as unknown[] })),
);
const useTemplates = vi.hoisted(() => vi.fn(() => ({ data: [] as unknown[] })));
const createMutateAsync = vi.hoisted(() =>
  vi.fn((_vars: Record<string, unknown>) => Promise.resolve({ id: 'nowa-1' })),
);

vi.mock('@/data/queries/useClients', () => ({ useClients }));
vi.mock('@/data/queries/useProjects', () => ({ useProjects }));
vi.mock('@/data/queries/useTemplates', () => ({ useTemplates }));
vi.mock('@/data/queries/useQuotes', () => ({
  useCreateQuote: () => ({ mutateAsync: createMutateAsync, isPending: false }),
}));
vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { id: 'ws', settings: defaultWorkspaceSettings() } }),
  useWorkspaceId: () => 'ws',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const { NewQuoteDialog } = await import('./NewQuoteDialog');

const KOWALSCY = {
  id: 'c1',
  name: 'Kowalscy',
  phone: '600 100 200',
  email: 'k@example.com',
  city: 'Poznań',
  address: '',
  notes: '',
  status: 'active' as const,
  archivedAt: null,
  workspaceId: 'ws',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  quotesCount: 0,
  projectsCount: 1,
  acceptedNetCents: 0,
  lastActivityAt: '2026-08-01T10:00:00Z',
};

function renderDialog() {
  return render(
    <MemoryRouter>
      <NewQuoteDialog open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('NewQuoteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClients.mockReturnValue({ data: [KOWALSCY] });
    useProjects.mockReturnValue({ data: [] });
    useTemplates.mockReturnValue({ data: [] });
  });

  it('domyslnie NIE wybiera klienta — „bez klienta" zostaje mozliwe', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      clientId: null,
      projectId: null,
    });
  });

  it('wybor klienta przepisuje jego dane do dokumentu', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('combobox', { name: pl.quotes.client }));
    await user.click(screen.getByRole('option', { name: 'Kowalscy' }));
    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const vars = createMutateAsync.mock.calls[0]?.[0] as {
      clientId: string;
      body: { client: { name: string; phone: string } };
    };
    expect(vars.clientId).toBe('c1');
    // Snapshot, nie referencja — dane ida do dokumentu w chwili zalozenia.
    expect(vars.body.client).toMatchObject({ name: 'Kowalscy', phone: '600 100 200' });
  });

  it('projekt pokazuje sie DOPIERO po wybraniu klienta', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Bez klienta pusty select udawalby, ze cos da sie wybrac.
    expect(screen.queryByRole('combobox', { name: pl.projects.title })).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: pl.quotes.client }));
    await user.click(screen.getByRole('option', { name: 'Kowalscy' }));

    expect(screen.getByRole('combobox', { name: pl.projects.title })).toBeInTheDocument();
  });

  it('pyta o projekty TEGO klienta, nie o wszystkie', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('combobox', { name: pl.quotes.client }));
    await user.click(screen.getByRole('option', { name: 'Kowalscy' }));

    const calls = useProjects.mock.calls;
    expect(calls[calls.length - 1]?.[0]).toEqual({ clientId: 'c1' });
  });
});

describe('NewQuoteDialog — start z szablonu (T-70)', () => {
  const SZABLON = {
    id: 't1',
    workspaceId: 'ws',
    name: 'Projekt kompleksowy',
    body: newQuoteBody({
      title: 'Projekt kompleksowy',
      sections: [newSection({ title: 'Etap wizualny', items: [newItem({ name: 'Koncepcja' })] })],
    }),
    bodyError: null,
    schedule: newScheduleBody({ startDate: '2026-03-01' }),
    documents: { stages: null, priceList: null },
    itemCount: 1,
    totalNetCents: 0,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useClients.mockReturnValue({ data: [KOWALSCY] });
    useProjects.mockReturnValue({ data: [] });
    useTemplates.mockReturnValue({ data: [SZABLON] });
  });

  async function wybierzSzablon(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('combobox', { name: pl.quotes.startFrom }));
    await user.click(screen.getByRole('option', { name: 'Projekt kompleksowy' }));
  }

  it('bez szablonow pole w ogole sie nie pokazuje', () => {
    // Pusty select udawalby, ze cos da sie wybrac.
    useTemplates.mockReturnValue({ data: [] });
    renderDialog();

    expect(screen.queryByRole('combobox', { name: pl.quotes.startFrom })).not.toBeInTheDocument();
  });

  it('domyslnie zaklada PUSTA wycene', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const vars = createMutateAsync.mock.calls[0]?.[0] as { body: { sections: unknown[] } };
    expect(vars.body.sections).toHaveLength(0);
  });

  it('wybrany szablon wnosi uklad i pozycje', async () => {
    const user = userEvent.setup();
    renderDialog();

    await wybierzSzablon(user);
    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const vars = createMutateAsync.mock.calls[0]?.[0] as {
      body: { sections: { title: string; items: { name: string }[] }[] };
    };
    expect(vars.body.sections[0]?.title).toBe('Etap wizualny');
    expect(vars.body.sections[0]?.items[0]?.name).toBe('Koncepcja');
  });

  it('szablon niesie termin i dokumenty, ale BEZ daty startu', async () => {
    /*
     * Pakiet z T-63 ma dojechac do nowej wyceny w calosci. Data startu nalezy
     * do konkretnego projektu — szablon zapisany w marcu z marcowa data bylby
     * pulapka, ktorej nikt nie zauwazy przed wyslaniem oferty.
     */
    const user = userEvent.setup();
    renderDialog();

    await wybierzSzablon(user);
    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const vars = createMutateAsync.mock.calls[0]?.[0] as {
      schedule: { startDate: string | null; stages: unknown[] } | null;
      documents: unknown;
    };
    expect(vars.schedule?.stages.length).toBeGreaterThan(0);
    expect(vars.schedule?.startDate).toBeNull();
    expect(vars.documents).not.toBeNull();
  });

  it('dane klienta wygrywaja z tym, co bylo w szablonie', async () => {
    const user = userEvent.setup();
    renderDialog();

    await wybierzSzablon(user);
    await user.click(screen.getByRole('combobox', { name: pl.quotes.client }));
    await user.click(screen.getByRole('option', { name: 'Kowalscy' }));
    await user.click(screen.getByRole('button', { name: pl.quotes.new }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const vars = createMutateAsync.mock.calls[0]?.[0] as { body: { client: { name: string } } };
    expect(vars.body.client.name).toBe('Kowalscy');
  });
});
