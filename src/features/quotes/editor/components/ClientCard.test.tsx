import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newQuoteBody } from '@/domain/quote';
import type { Client, ClientOverview } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

const useClients = vi.hoisted(() => vi.fn());
const useClient = vi.hoisted(() => vi.fn());
const asyncMutationStub = vi.hoisted(() => () => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/data/queries/useClients', () => ({
  useClients,
  useClient,
  useCreateClient: asyncMutationStub,
  useUpdateClient: asyncMutationStub,
}));

const { useEditorStore } = await import('../editor.store');
const { ClientCard } = await import('./ClientCard');

const KOWALSCY: ClientOverview = {
  id: 'c1',
  workspaceId: 'ws',
  name: 'Anna i Piotr Kowalscy',
  phone: '600 100 200',
  email: 'anna@example.com',
  address: 'ul. Wiosenna 12/3',
  city: 'Poznań',
  notes: '',
  status: 'active',
  archivedAt: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  quotesCount: 0,
  projectsCount: 0,
  acceptedNetCents: 0,
  lastActivityAt: '2026-08-01T10:00:00Z',
};

function loadQuote(clientId: string | null = null) {
  useEditorStore.getState().load({
    id: 'q1',
    workspaceId: 'ws',
    clientId,
    projectId: null,
    number: 'WYC/2026/08/0001',
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer',
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    body: newQuoteBody({ title: 'Wycena' }),
    bodyError: null,
    schedule: null,
    documents: null,
  });
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ClientCard />
    </MemoryRouter>,
  );
}

describe('ClientCard — przypiecie wyceny do klienta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useClients.mockReturnValue({ data: [KOWALSCY] });
    useClient.mockReturnValue({ data: null });
  });

  it('wybor klienta ustawia przypisanie I wypelnia dane inwestora', async () => {
    const user = userEvent.setup();
    loadQuote(null);
    renderCard();

    await user.click(screen.getByRole('combobox', { name: pl.editor.clientPick }));
    await user.click(screen.getByText('Anna i Piotr Kowalscy'));

    const state = useEditorStore.getState();
    expect(state.clientId).toBe('c1');
    expect(state.body?.client).toEqual({
      name: 'Anna i Piotr Kowalscy',
      phone: '600 100 200',
      email: 'anna@example.com',
      city: 'Poznań',
    });
  });

  it('przypiecie brudzi dokument, wiec autozapis ma co zapisac', async () => {
    const user = userEvent.setup();
    loadQuote(null);
    expect(useEditorStore.getState().saveState).toBe('idle');

    renderCard();
    await user.click(screen.getByRole('combobox', { name: pl.editor.clientPick }));
    await user.click(screen.getByText('Anna i Piotr Kowalscy'));

    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('odpiecie zostawia dane w dokumencie — oferta ma zostac kompletna', async () => {
    const user = userEvent.setup();
    loadQuote('c1');
    useClient.mockReturnValue({ data: KOWALSCY as Client });
    useEditorStore.getState().patchClient({ name: 'Anna i Piotr Kowalscy', city: 'Poznań' });
    renderCard();

    await user.click(screen.getByRole('combobox', { name: pl.editor.clientPick }));
    await user.click(screen.getByText(pl.editor.clientNone));

    const state = useEditorStore.getState();
    expect(state.clientId).toBeNull();
    expect(state.body?.client.name).toBe('Anna i Piotr Kowalscy');
  });

  it('zgodny snapshot: bez przycisku odswiezania, za to z wyjasnieniem', () => {
    loadQuote('c1');
    useClient.mockReturnValue({ data: KOWALSCY as Client });
    useEditorStore.getState().patchClient({
      name: KOWALSCY.name,
      phone: KOWALSCY.phone,
      email: KOWALSCY.email,
      city: KOWALSCY.city,
    });

    renderCard();

    expect(screen.queryByRole('button', { name: pl.editor.clientRefresh })).not.toBeInTheDocument();
    expect(screen.getByText(pl.editor.clientSnapshotHint)).toBeInTheDocument();
  });

  it('rozjazd z kartoteka: przycisk odswiezania przepisuje dane na zadanie', async () => {
    const user = userEvent.setup();
    loadQuote('c1');
    useClient.mockReturnValue({ data: { ...KOWALSCY, phone: '999 888 777' } as Client });
    useEditorStore.getState().patchClient({
      name: KOWALSCY.name,
      phone: KOWALSCY.phone,
      email: KOWALSCY.email,
      city: KOWALSCY.city,
    });

    renderCard();

    // Sedno CLAUDE.md §14: dokument NIE zmienia sie sam po edycji kartoteki.
    expect(useEditorStore.getState().body?.client.phone).toBe('600 100 200');

    await user.click(screen.getByRole('button', { name: pl.editor.clientRefresh }));
    expect(useEditorStore.getState().body?.client.phone).toBe('999 888 777');
  });

  it('prowadzi do karty przypietego klienta', () => {
    loadQuote('c1');
    useClient.mockReturnValue({ data: KOWALSCY as Client });
    renderCard();

    expect(screen.getByRole('link', { name: pl.editor.clientOpen })).toHaveAttribute(
      'href',
      '/klienci/c1',
    );
  });
});
