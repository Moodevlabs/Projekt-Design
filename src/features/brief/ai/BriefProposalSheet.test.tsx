import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LibraryItem } from '@/data/repos/library.repo';
import type { Template } from '@/data/repos/templates.repo';
import type { BriefProposal, BriefToQuotePayload } from '@/domain/ai';
import { defaultWorkspaceSettings } from '@/domain/brand/schema';
import type { Brief } from '@/domain/brief';
import type { QuoteBody } from '@/domain/quote';
import { newScheduleBody } from '@/domain/schedule';
import { pl } from '@/i18n/pl';
import { BriefProposalSheet } from './BriefProposalSheet';

type MutateOptions = { onSuccess?: (result: { data: BriefProposal }) => void };

const askMutate = vi.hoisted(() =>
  vi.fn<(payload: BriefToQuotePayload, options?: MutateOptions) => void>(),
);
const askState = vi.hoisted((): { isPending: boolean; isError: boolean; error: unknown } => ({
  isPending: false,
  isError: false,
  error: null,
}));
const createQuote = vi.hoisted(() => vi.fn());
const createProject = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastMessage = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useAi', () => ({
  useAiBriefToQuote: () => ({
    mutate: askMutate,
    reset: vi.fn(),
    isPending: askState.isPending,
    isError: askState.isError,
    error: askState.error,
  }),
  useAiQuota: () => ({ data: { used: 3, limit: 300, resetsAt: '2026-11-01T00:00:00.000Z' } }),
}));

const CLIENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LIB_KONCEPCJA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LIB_NADZOR = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
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
  useAllLibraryItems: () => ({
    data: [
      libraryItem({}),
      libraryItem({ id: LIB_NADZOR, name: 'Nadzór autorski', unitPriceCents: null }),
      libraryItem({ id: 'inactive', name: 'Wyłączona', active: false }),
    ],
    error: null,
    refetch: vi.fn(),
  }),
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

const templatesRefetch = vi.hoisted(() => vi.fn());
const templatesState = vi.hoisted((): { data: Template[] | undefined; error: Error | null } => ({
  data: [],
  error: null,
}));

vi.mock('@/data/queries/useTemplates', () => ({
  useTemplates: () => ({
    data: templatesState.data,
    error: templatesState.error,
    refetch: templatesRefetch,
  }),
}));

const TEMPLATE_BROKEN = '77777777-7777-4777-8777-777777777777';

/** Szablon „tylko termin/dokumenty" — `body === null`, ale niesie harmonogram. */
const brokenTemplate: Template = {
  id: TEMPLATE_BROKEN,
  workspaceId: 'ws-1',
  name: 'Tylko termin',
  body: null,
  bodyError: 'uszkodzony',
  schedule: newScheduleBody(),
  documents: null,
  itemCount: 0,
  totalNetCents: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes: () => ({
    data: [{ id: RT_KUCHNIA, workspaceId: 'ws-1', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 0 }],
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({
    data: [{ id: PROJECT_ID, clientId: CLIENT_ID, name: 'Mieszkanie na Woli', city: 'Warszawa' }],
  }),
  useCreateProject: () => ({ mutateAsync: createProject, isPending: false }),
}));

vi.mock('@/data/queries/useClients', () => ({
  useClient: () => ({
    data: {
      id: CLIENT_ID,
      name: 'Anna Kowalska',
      phone: '',
      email: 'anna@przyklad.pl',
      city: 'Kraków',
      address: '',
    },
  }),
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { settings: defaultWorkspaceSettings() } }),
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useCreateQuote: () => ({ mutateAsync: createQuote, isPending: false }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, message: toastMessage },
}));

const brief: Brief = {
  id: '99999999-9999-4999-8999-999999999999',
  workspaceId: '88888888-8888-4888-8888-888888888888',
  clientId: CLIENT_ID,
  projectId: null,
  token: 'tok',
  template: [
    {
      id: 's1',
      title: 'Obiekt',
      hint: '',
      questions: [
        {
          id: 'q1',
          label: 'Metraż',
          kind: 'text',
          hint: '',
          placeholder: '',
          options: [],
          required: false,
        },
      ],
    },
  ],
  answers: { q1: '62 m²' },
  expiresAt: null,
  revokedAt: null,
  submittedAt: '2026-10-20T10:00:00.000Z',
  firstViewedAt: null,
  lastViewedAt: null,
  viewCount: 1,
  createdAt: '2026-10-19T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

const proposal: BriefProposal = {
  title: 'Projekt mieszkania 62 m²',
  projectDescription: 'Dwa pokoje z aneksem.',
  templateId: null,
  rooms: [{ roomTypeId: RT_KUCHNIA, label: 'Kuchnia', qty: 1 }],
  items: [
    { libraryItemId: LIB_KONCEPCJA, enabled: true, reason: 'Podstawa.' },
    { libraryItemId: LIB_NADZOR, enabled: false, reason: '' },
    { libraryItemId: 'zmyslone', enabled: true, reason: '' },
  ],
  openQuestions: ['Budżet?'],
};

beforeEach(() => {
  askMutate.mockReset();
  createQuote.mockReset();
  createProject.mockReset();
  navigate.mockReset();
  toastSuccess.mockReset();
  toastMessage.mockReset();
  toastError.mockReset();
  templatesRefetch.mockReset();
  templatesState.data = [];
  templatesState.error = null;
  askState.isPending = false;
  askState.isError = false;
  askState.error = null;
});

describe('BriefProposalSheet', () => {
  it('woła asystenta z pytaniami briefu i aktywną biblioteką, a potem pokazuje propozycję', async () => {
    render(<BriefProposalSheet brief={brief} open onOpenChange={() => undefined} />);

    await waitFor(() => expect(askMutate).toHaveBeenCalledTimes(1));
    const [payload, options] = askMutate.mock.calls[0] ?? [];
    expect(payload?.brief.questions).toEqual([
      { section: 'Obiekt', question: 'Metraż', answer: '62 m²' },
    ]);
    expect(payload?.library.map((entry) => entry.id)).toEqual([LIB_KONCEPCJA, LIB_NADZOR]);
    expect(payload?.roomTypes).toEqual([{ id: RT_KUCHNIA, name: 'Kuchnia' }]);

    // W trakcie: szkielet, nie spinner i nie pusty ekran.
    expect(screen.getByText(pl.ai.brief.analyzing)).toBeInTheDocument();

    act(() => options?.onSuccess?.({ data: proposal }));

    expect(screen.getByDisplayValue('Kuchnia')).toBeInTheDocument();
    expect(screen.getByText('Koncepcja funkcjonalna')).toBeInTheDocument();
    expect(screen.getByText('Nadzór autorski')).toBeInTheDocument();
    expect(screen.getByText('Podstawa.')).toBeInTheDocument();
    expect(screen.getByText('Budżet?')).toBeInTheDocument();
    // Pozycja spoza biblioteki nie ma wiersza.
    expect(screen.queryByText('zmyslone')).not.toBeInTheDocument();
    expect(screen.getByText(pl.ai.brief.scopeSummary(1, 2))).toBeInTheDocument();
  });

  it('tworzy wycenę w nowym projekcie z pomieszczeniami i pozycjami z propozycji', async () => {
    const user = userEvent.setup();
    createProject.mockResolvedValue({ id: PROJECT_ID, city: 'Gdańsk' });
    createQuote.mockResolvedValue({ id: 'quote-1' });

    render(<BriefProposalSheet brief={brief} open onOpenChange={() => undefined} />);
    await waitFor(() => expect(askMutate).toHaveBeenCalled());
    act(() => askMutate.mock.calls[0]?.[1]?.onSuccess?.({ data: proposal }));

    // Przełączenie „Nadzór" na włączony przed zapisem.
    await user.click(screen.getByRole('checkbox', { name: 'Nadzór autorski' }));
    await user.click(screen.getByRole('button', { name: pl.ai.brief.create }));

    await waitFor(() => expect(createQuote).toHaveBeenCalledTimes(1));
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Projekt mieszkania 62 m²', clientId: CLIENT_ID }),
    );

    const vars = createQuote.mock.calls[0]?.[0] as { body: QuoteBody; projectId: string };
    expect(vars.projectId).toBe(PROJECT_ID);
    expect(vars.body.title).toBe('Projekt mieszkania 62 m²');
    expect(vars.body.client).toMatchObject({ name: 'Anna Kowalska', city: 'Gdańsk' });
    expect(vars.body.rooms.map((room) => [room.label, room.roomTypeId])).toEqual([
      ['Kuchnia', RT_KUCHNIA],
    ]);
    expect(vars.body.sections[0]?.items.map((item) => [item.libraryItemId, item.enabled])).toEqual([
      [LIB_KONCEPCJA, true],
      [LIB_NADZOR, true],
    ]);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(pl.ai.brief.created));
    // „zmyslone" nie ma w bibliotece — jedna cicha informacja, nie błąd.
    expect(toastMessage).toHaveBeenCalledWith(pl.ai.brief.skipped(1));
    expect(toastError).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/wyceny/quote-1');
  });

  it('szablon bez body nie idzie do modelu, a wybrany działa jak „Bez szablonu"', async () => {
    const user = userEvent.setup();
    templatesState.data = [brokenTemplate];
    createProject.mockResolvedValue({ id: PROJECT_ID, city: '' });
    createQuote.mockResolvedValue({ id: 'quote-2' });

    render(<BriefProposalSheet brief={brief} open onOpenChange={() => undefined} />);
    await waitFor(() => expect(askMutate).toHaveBeenCalledTimes(1));
    expect(askMutate.mock.calls[0]?.[0]?.templates).toEqual([]);

    // Model mimo to wskazał ten szablon (zmyślił albo trafił w stary id).
    act(() =>
      askMutate.mock.calls[0]?.[1]?.onSuccess?.({
        data: { ...proposal, templateId: TEMPLATE_BROKEN },
      }),
    );
    await user.click(screen.getByRole('button', { name: pl.ai.brief.create }));

    await waitFor(() => expect(createQuote).toHaveBeenCalledTimes(1));
    const vars = createQuote.mock.calls[0]?.[0] as {
      body: QuoteBody;
      schedule: unknown;
      documents: unknown;
    };
    // Baza z ustawień: sekcja „Zakres" z pozycjami, a termin i dokumenty
    // NIE z uszkodzonego szablonu.
    expect(vars.body.sections.map((section) => section.title)).toEqual(['Zakres']);
    expect(vars.schedule).toBeNull();
    expect(vars.documents).toBeNull();
  });

  it('błąd zapytań wstępnych pokazuje komunikat z ponowieniem zamiast wiecznego szkieletu', async () => {
    const user = userEvent.setup();
    templatesState.data = undefined;
    templatesState.error = new Error('RLS');

    render(<BriefProposalSheet brief={brief} open onOpenChange={() => undefined} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(pl.ai.brief.prerequisitesFailed);
    expect(screen.queryByText(pl.ai.brief.analyzing)).not.toBeInTheDocument();
    expect(askMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.ai.retry }));
    expect(templatesRefetch).toHaveBeenCalledTimes(1);
  });
});
