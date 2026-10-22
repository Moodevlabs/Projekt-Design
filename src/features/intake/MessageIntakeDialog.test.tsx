import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LibraryItem } from '@/data/repos/library.repo';
import type { MessageProposal, MessageToProjectPayload } from '@/domain/ai';
import { defaultWorkspaceSettings } from '@/domain/brand/schema';
import type { ClientOverview } from '@/domain/client/schema';
import type { QuoteBody } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { MessageIntakeDialog } from './MessageIntakeDialog';

type MutateOptions = { onSuccess?: (result: { data: MessageProposal }) => void };

const askMutate = vi.hoisted(() =>
  vi.fn<(payload: MessageToProjectPayload, options?: MutateOptions) => void>(),
);
const askReset = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());
const createProject = vi.hoisted(() => vi.fn());
const createQuote = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastMessage = vi.hoisted(() => vi.fn());
const clientsState = vi.hoisted((): { rows: ClientOverview[] } => ({ rows: [] }));

vi.mock('@/data/queries/useAi', () => ({
  useAiMessageToProject: () => ({
    mutate: askMutate,
    reset: askReset,
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
  }),
  useAiQuota: () => ({ data: { used: 3, limit: 300, resetsAt: '2026-11-01T00:00:00.000Z' } }),
}));

const EXISTING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEW_CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const LIB_KONCEPCJA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CAT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const RT_KUCHNIA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PROJECT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const libraryItem = (partial: Partial<LibraryItem>): LibraryItem => ({
  id: LIB_KONCEPCJA,
  workspaceId: 'ws-1',
  categoryName: 'Koncepcja',
  categoryId: CAT_ID,
  kind: 'item',
  name: 'Koncepcja funkcjonalna',
  description: '',
  unitPriceCents: 150_000,
  unit: 'lump',
  unitLabel: null,
  minPriceCents: null,
  active: true,
  isSample: false,
  sortOrder: 0,
  pricing: { mode: 'flat' },
  variantOf: null,
  pricingBasis: 'amount',
  ...partial,
});

vi.mock('@/data/queries/useLibrary', () => ({
  useAllLibraryItems: () => ({ data: [libraryItem({})], error: null, refetch: vi.fn() }),
}));

vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList: () => ({ data: [], error: null, refetch: vi.fn() }),
  useLibraryCategoryMap: () =>
    new Map([
      [
        CAT_ID,
        {
          id: CAT_ID,
          workspaceId: 'ws-1',
          name: 'Koncepcja',
          code: '02',
          color: null,
          sortOrder: 2,
          isSample: false,
        },
      ],
    ]),
}));

vi.mock('@/data/queries/useTemplates', () => ({
  useTemplates: () => ({ data: [], error: null, refetch: vi.fn() }),
}));

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes: () => ({
    data: [{ id: RT_KUCHNIA, workspaceId: 'ws-1', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 0 }],
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/data/queries/useClients', () => ({
  useClients: () => ({ data: clientsState.rows }),
  useCreateClient: () => ({ mutateAsync: createClient, isPending: false }),
}));

vi.mock('@/data/queries/useProjects', () => ({
  useCreateProject: () => ({ mutateAsync: createProject, isPending: false }),
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useCreateQuote: () => ({ mutateAsync: createQuote, isPending: false }),
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { settings: defaultWorkspaceSettings() } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, message: toastMessage },
}));

const MESSAGE =
  'Dzień dobry, nazywam się Anna Kowalska, tel. 600 100 200, anna@przyklad.pl. ' +
  'Mam mieszkanie 62 m² na Wilczaku 12 w Poznaniu i chciałabym zamówić projekt kuchni i salonu.';

const proposal: MessageProposal = {
  title: 'Projekt kuchni i salonu',
  projectDescription: 'Mieszkanie 62 m².',
  templateId: null,
  rooms: [{ roomTypeId: RT_KUCHNIA, label: 'Kuchnia', qty: 1 }],
  items: [{ libraryItemId: LIB_KONCEPCJA, enabled: true, reason: 'Podstawa.' }],
  openQuestions: ['Budżet?'],
  summary: 'Projekt kuchni i salonu w mieszkaniu 62 m².',
  client: { name: 'Anna Kowalska', city: 'Poznań', address: 'Wilczak 12' },
  project: { name: 'Mieszkanie na Wilczaku', areaM2: 62, kind: 'apartment' },
  hasScope: true,
};

const existingClient: ClientOverview = {
  id: EXISTING_ID,
  workspaceId: 'ws-1',
  name: 'Anna Kowalska',
  phone: '',
  email: 'anna@przyklad.pl',
  address: '',
  city: 'Poznań',
  notes: '',
  avatarPath: null,
  status: 'active',
  archivedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  quotesCount: 0,
  projectsCount: 0,
  acceptedNetCents: 0,
  lastActivityAt: '2026-10-01T00:00:00.000Z',
};

/** Wkleja wiadomość, woła asystenta i wstrzykuje odpowiedź. */
async function analyze(received: MessageProposal = proposal, message = MESSAGE) {
  const user = userEvent.setup();
  fireEvent.change(screen.getByRole('textbox', { name: pl.ai.intake.title }), {
    target: { value: message },
  });
  await user.click(screen.getByRole('button', { name: pl.ai.intake.analyze }));
  await waitFor(() => expect(askMutate).toHaveBeenCalledTimes(1));
  const [payload, options] = askMutate.mock.calls[0] ?? [];
  act(() => options?.onSuccess?.({ data: received }));
  return { user, payload };
}

beforeEach(() => {
  askMutate.mockReset();
  askReset.mockReset();
  createClient.mockReset();
  createProject.mockReset();
  createQuote.mockReset();
  navigate.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  toastMessage.mockReset();
  clientsState.rows = [];
  createClient.mockResolvedValue({ ...existingClient, id: NEW_CLIENT_ID });
  createProject.mockResolvedValue({ id: PROJECT_ID, city: 'Poznań' });
  createQuote.mockResolvedValue({ id: 'quote-1' });
});

describe('MessageIntakeDialog', () => {
  it('maskuje e-mail i telefon przed wysłaniem, a w arkuszu wstawia je do karty klienta', async () => {
    render(<MessageIntakeDialog open onOpenChange={() => undefined} />);
    const { payload } = await analyze();

    // Do modelu idzie tekst ze znacznikami — bez danych kontaktowych (A7a).
    expect(payload?.message).not.toContain('600 100 200');
    expect(payload?.message).not.toContain('anna@przyklad.pl');
    expect(payload?.message).toContain('[e-mail]');
    expect(payload?.message).toContain('[telefon]');
    expect(payload?.knownClient).toBeNull();
    expect(payload?.library.map((entry) => entry.id)).toEqual([LIB_KONCEPCJA]);

    // A w arkuszu kontakt wraca z maski prosto do pól klienta.
    expect(screen.getByLabelText(pl.ai.intake.fields.email)).toHaveValue('anna@przyklad.pl');
    expect(screen.getByLabelText(pl.ai.intake.fields.phone)).toHaveValue('600 100 200');
    expect(screen.getByLabelText(pl.ai.intake.fields.clientName)).toHaveValue('Anna Kowalska');
    expect(screen.getByLabelText(pl.ai.intake.fields.projectName)).toHaveValue(
      'Mieszkanie na Wilczaku',
    );
    expect(screen.getByLabelText(pl.ai.intake.fields.areaM2)).toHaveValue('62');
    expect(screen.getByText(pl.ai.intake.masked(1, 1))).toBeInTheDocument();
  });

  it('istniejący klient o tym samym e-mailu: „Podepnij" nie zakłada nowego, teczka idzie do niego', async () => {
    clientsState.rows = [existingClient];
    render(<MessageIntakeDialog open onOpenChange={() => undefined} />);
    const { user } = await analyze();

    expect(screen.getByText(pl.ai.intake.existingClient('Anna Kowalska'))).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: pl.ai.intake.useExisting })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Przy podpięciu pola klienta znikają — nic z nich nie trafiłoby do bazy.
    expect(screen.queryByLabelText(pl.ai.intake.fields.clientName)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.ai.intake.create }));

    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    expect(createClient).not.toHaveBeenCalled();
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: EXISTING_ID, status: 'lead' }),
    );
  });

  it('bez zakresu: checkbox wyceny jest zablokowany, powstaje klient i teczka bez wyceny', async () => {
    render(<MessageIntakeDialog open onOpenChange={() => undefined} />);
    const { user } = await analyze({ ...proposal, items: [], hasScope: false });

    const checkbox = screen.getByRole('checkbox', { name: pl.ai.intake.withQuote });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(pl.ai.intake.noScope)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.ai.intake.create }));

    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Anna Kowalska',
        email: 'anna@przyklad.pl',
        phone: '600 100 200',
        city: 'Poznań',
      }),
    );
    const projectVars = createProject.mock.calls[0]?.[0] as {
      clientId: string;
      notes: string;
      areaM2: string;
      kind: string;
    };
    expect(projectVars.clientId).toBe(NEW_CLIENT_ID);
    // Notatki = ORYGINALNA wiadomość, z kontaktami — to nasza baza, nie model.
    expect(projectVars.notes).toBe(MESSAGE);
    expect(projectVars.areaM2).toBe('62');
    expect(projectVars.kind).toBe('apartment');

    expect(createQuote).not.toHaveBeenCalled();
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(pl.ai.intake.created));
    expect(navigate).toHaveBeenCalledWith(`/klienci/${NEW_CLIENT_ID}/projekty/${PROJECT_ID}`);
  });

  it('pełna ścieżka: klient → teczka → wycena z `projectId` nowej teczki', async () => {
    render(<MessageIntakeDialog open onOpenChange={() => undefined} />);
    const { user } = await analyze();

    expect(screen.getByRole('checkbox', { name: pl.ai.intake.withQuote })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('button', { name: pl.ai.intake.create }));

    await waitFor(() => expect(createQuote).toHaveBeenCalledTimes(1));
    const vars = createQuote.mock.calls[0]?.[0] as {
      body: QuoteBody;
      clientId: string;
      projectId: string;
    };
    expect(vars.projectId).toBe(PROJECT_ID);
    expect(vars.clientId).toBe(NEW_CLIENT_ID);
    expect(vars.body.client).toMatchObject({ name: 'Anna Kowalska', city: 'Poznań' });
    expect(vars.body.rooms.map((room) => [room.label, room.roomTypeId])).toEqual([
      ['Kuchnia', RT_KUCHNIA],
    ]);
    expect(vars.body.sections[0]?.items.map((item) => item.libraryItemId)).toEqual([LIB_KONCEPCJA]);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(pl.ai.intake.createdWithQuote));
    expect(toastError).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/wyceny/quote-1');
  });

  it('z karty klienta: model dostaje nadawcę, a arkusz nie pyta o klienta', async () => {
    render(
      <MessageIntakeDialog knownClient={existingClient} open onOpenChange={() => undefined} />,
    );
    const { user, payload } = await analyze();

    expect(payload?.knownClient).toEqual({ name: 'Anna Kowalska', city: 'Poznań' });
    expect(screen.getByText(pl.ai.intake.knownClient('Anna Kowalska'))).toBeInTheDocument();
    expect(screen.queryByLabelText(pl.ai.intake.fields.clientName)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.ai.intake.create }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    expect(createClient).not.toHaveBeenCalled();
    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({ clientId: EXISTING_ID }));
  });

  it('„Wróć" zachowuje wklejony tekst', async () => {
    render(<MessageIntakeDialog open onOpenChange={() => undefined} />);
    const { user } = await analyze();

    await user.click(screen.getByRole('button', { name: pl.ai.intake.back }));
    expect(screen.getByRole('textbox', { name: pl.ai.intake.title })).toHaveValue(MESSAGE);
    expect(askReset).toHaveBeenCalled();
  });
});
