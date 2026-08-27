import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { AMOUNT_BASIS, newQuoteBody, newSection } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());
const useLibraryCategoryList = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({ useLibraryItems, useLibraryGroups }));
vi.mock('@/data/queries/useLibraryCategories', () => ({ useLibraryCategoryList }));

const { ScopePanel } = await import('./ScopePanel');
const { useScopePanel } = await import('./scope-panel.store');
const { useEditorStore } = await import('../editor.store');

function item(partial: Partial<LibraryItem> & { id: string; name: string }): LibraryItem {
  return {
    workspaceId: 'ws',
    categoryName: 'Inne',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    description: '',
    unitPriceCents: 10_000,
    sortOrder: 0,
    variantOf: null,
    pricingBasis: 'amount',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

const PER_ROOM = item({
  id: 'l3',
  name: 'Koncepcja funkcjonalna',
  categoryName: 'Układ',
  pricing: {
    mode: 'per_room',
    baseCents: 0,
    perRoomCents: { kuchnia: 50_000 },
    defaultPerRoomCents: 0,
    roomScope: 'all',
  },
});

const SECTION = newSection({ title: 'Projekt' });

function setup() {
  const body = newQuoteBody();
  body.sections = [SECTION];
  useEditorStore.getState().reset();
  useEditorStore.getState().load({
    id: 'q1',
    workspaceId: 'ws',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
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
    body,
    bodyError: null,
    schedule: null,
    documents: null,
  });
  useScopePanel.setState({ open: false, target: null });

  const onInsertItems = vi.fn();
  const onInsertGroup = vi.fn();
  render(
    <ScopePanel
      pricing={AMOUNT_BASIS}
      onInsertItems={onInsertItems}
      onInsertGroup={onInsertGroup}
    />,
  );
  return { onInsertItems, onInsertGroup, user: userEvent.setup() };
}

function otworz() {
  useScopePanel.getState().openFor({ sectionId: SECTION.id, groupId: null });
}

describe('ScopePanel — dodawanie usług z tabeli (T-71)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLibraryItems.mockReturnValue({
      data: [
        item({ id: 'l1', name: 'Blat kuchenny', categoryName: 'Kuchnia', unitPriceCents: 120_000 }),
        item({ id: 'l2', name: 'Fronty', categoryName: 'Kuchnia', unit: 'm2' }),
        PER_ROOM,
      ],
    });
    useLibraryGroups.mockReturnValue({ data: [] });
    useLibraryCategoryList.mockReturnValue({ data: [] });
  });

  it('jest zamknięty, dopóki blok nie poprosi o otwarcie', () => {
    setup();
    expect(screen.queryByText(pl.editor.scopeTitle)).not.toBeInTheDocument();
  });

  it('pokazuje kolumny z inspiracji: usługa, grupa, sposób wyceny, stawka', async () => {
    setup();
    otworz();

    expect(await screen.findByText(pl.editor.scopeColService)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.scopeColGroup)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.scopeColMode)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.scopeColPrice)).toBeInTheDocument();

    const wiersz = screen.getAllByTestId('scope-row')[1];
    expect(wiersz).toBeDefined();
    // Sposób wyceny widać ZANIM się kliknie — „Za m²" obok nazwy (w kolumnie
    // i w wariancie mobilnym pod nazwą; jsdom nie zna `sm:hidden`).
    expect(
      within(wiersz as HTMLElement).getAllByText(pl.library.pricingChoices.flat_m2).length,
    ).toBeGreaterThan(0);
  });

  it('„Dodaj” wstawia pozycję do celu i NIE zamyka panelu', async () => {
    const { onInsertItems, user } = setup();
    otworz();

    await user.click(
      await screen.findByRole('button', { name: pl.editor.scopeAddLabel('Blat kuchenny') }),
    );
    await user.click(screen.getByRole('button', { name: pl.editor.scopeAddLabel('Fronty') }));

    expect(onInsertItems).toHaveBeenCalledTimes(2);
    const [sectionId, groupId, items] = onInsertItems.mock.calls[0] as [
      string,
      string | null,
      { libraryItemId: string; unitPriceCents: number }[],
    ];
    expect(sectionId).toBe(SECTION.id);
    expect(groupId).toBeNull();
    expect(items[0]?.libraryItemId).toBe('l1');
    expect(items[0]?.unitPriceCents).toBe(120_000);
    // Panel dalej otwarty, stopka liczy.
    expect(screen.getByText(pl.editor.scopeTitle)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.pickerAddedSummary(2))).toBeInTheDocument();
  });

  it('„Gotowe” zamyka i zeruje sesję dobierania', async () => {
    const { user } = setup();
    otworz();

    await user.click(
      await screen.findByRole('button', { name: pl.editor.scopeAddLabel('Blat kuchenny') }),
    );
    await user.click(screen.getByRole('button', { name: pl.editor.pickerDone }));
    expect(useScopePanel.getState().open).toBe(false);

    otworz();
    expect(await screen.findByText(pl.editor.scopeTitle)).toBeInTheDocument();
    expect(screen.queryByText(pl.editor.pickerAddedSummary(1))).not.toBeInTheDocument();
  });

  it('pigułki grup zawężają listę, szukajka filtruje po nazwie', async () => {
    const { user } = setup();
    otworz();

    await user.click(await screen.findByRole('button', { name: 'Kuchnia' }));
    expect(screen.getAllByTestId('scope-row')).toHaveLength(2);
    expect(screen.getByText(pl.editor.scopeCount(2))).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: pl.editor.scopeSearch }), 'fron');
    expect(screen.getAllByTestId('scope-row')).toHaveLength(1);
    expect(screen.getByText('Fronty')).toBeInTheDocument();
  });

  it('JEDNO ostrzeżenie o braku pomieszczeń nad listą, ze skrótem, który je dodaje', async () => {
    const { user } = setup();
    otworz();

    // Jedna informacja, nie po jednej przy każdym wierszu (w T-70 to było tło).
    expect(await screen.findByRole('status')).toHaveTextContent(pl.editor.scopeNoRoomsTitle);
    expect(screen.getAllByText(pl.editor.scopeNoRoomsTitle)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: pl.editor.scopeNoRoomsAction }));

    expect(useEditorStore.getState().body?.rooms).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(pl.editor.scopeRoomsOk(1))).toBeInTheDocument();
  });

  it('bez usług liczonych za pomieszczenie nie ma ostrzeżenia', async () => {
    useLibraryItems.mockReturnValue({
      data: [item({ id: 'l1', name: 'Blat kuchenny', categoryName: 'Kuchnia' })],
    });
    setup();
    otworz();

    await screen.findByText(pl.editor.scopeTitle);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('zestaw wstawia się jako grupa do sekcji, a zakładka znika przy celu w grupie', async () => {
    useLibraryGroups.mockReturnValue({
      data: [
        {
          id: 'g1',
          workspaceId: 'ws',
          name: 'Kuchnia — pakiet',
          sortOrder: 0,
          items: [
            {
              name: 'Projekt koncepcyjny',
              description: '',
              kind: 'item',
              qty: 14,
              unitPriceCents: 9_000,
              libraryItemId: null,
            },
          ],
        },
      ],
    });
    const { onInsertGroup, user } = setup();
    otworz();

    await user.click(await screen.findByRole('tab', { name: pl.editor.scopeTabSets }));
    await user.click(
      screen.getByRole('button', { name: pl.editor.scopeAddLabel('Kuchnia — pakiet') }),
    );

    expect(onInsertGroup).toHaveBeenCalledTimes(1);
    const grupa = onInsertGroup.mock.calls[0]?.[1] as { name: string; items: { qty: number }[] };
    expect(grupa.name).toBe('Kuchnia — pakiet');
    expect(grupa.items[0]?.qty).toBe(14);

    // Do grupy nie da się wstawić zestawu — zakładki nie ma.
    act(() => useScopePanel.getState().setTarget({ sectionId: SECTION.id, groupId: 'grp' }));
    expect(screen.queryByRole('tab', { name: pl.editor.scopeTabSets })).not.toBeInTheDocument();
    expect(screen.getByText(pl.editor.scopeColService)).toBeInTheDocument();
  });
});
