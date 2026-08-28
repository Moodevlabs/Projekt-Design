import { DndContext } from '@dnd-kit/core';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionBlock } from './SectionBlock';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS } from '@/domain/quote';

/** Stale referencje — sedno tego testu: nic nie moze przebijac `memo`. */
const NO_TEXT = { rooms: [], client: '' };
import { useEditorStore } from '../editor.store';
import { newGroup, newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';
import * as money from '@/domain/money';
import type { Room } from '@/domain/quote';

/**
 * Stala referencja, nie `[]` inline. Nowa tablica przy kazdym renderze
 * zabilaby `memo` na wierszach — a w aplikacji `body.rooms` jest stabilne,
 * bo immer zachowuje referencje nietknietych galezi. Ten test pilnuje
 * mechanizmu, wiec musi odwzorowac te wlasnosc.
 */
const NO_ROOMS: Room[] = [];

/**
 * Dowód na kryterium T-08 „300 pozycji bez laga".
 *
 * Nie mierzymy czasu (w jsdom nic by to nie znaczyło) — sprawdzamy MECHANIZM:
 * czy edycja jednej pozycji renderuje tylko ten jeden wiersz. Renderowanie
 * `ItemRow` w trybie podglądu wywołuje `formatMoney`, więc liczba jej wywołań
 * jest obserwowalnym licznikiem renderów wierszy.
 */
const ITEM_COUNT = 6;

function makeQuote(): Quote {
  const body = newQuoteBody({
    sections: [
      newSection({
        title: 'Sekcja',
        groups: [
          newGroup({
            name: 'Grupa',
            items: Array.from({ length: ITEM_COUNT }, (_, index) =>
              newItem({ name: `Pozycja ${index}`, unitPriceCents: (index + 1) * 1000 }),
            ),
          }),
        ],
      }),
    ],
  });

  return {
    id: 'q1',
    workspaceId: 'ws',
    number: null,
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    body,
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

/**
 * Stabilna zaślepka. MUSI być zdefiniowana poza komponentem — nowa funkcja przy
 * każdym renderze łamałaby memoizację wierszy i test mierzyłby wadę harnessu
 * zamiast zachowania komponentu. W aplikacji te funkcje pochodzą ze store'u
 * (akcje Zustanda są stabilne).
 */
const noop = () => undefined;

/** Harness: subskrybuje store i przekazuje sekcję w dół, tak jak robi to edytor. */
function Harness() {
  const section = useEditorStore((state) => state.body?.sections[0]);
  const updateItem = useEditorStore((state) => state.updateItem);
  const toggleItem = useEditorStore((state) => state.toggleItem);
  const removeItem = useEditorStore((state) => state.removeItem);

  if (!section) return null;

  return (
    <SectionBlock
      section={section}
      editing={false}
      onAddRoomBlocks={() => undefined}
      currency="PLN"
      vatRate={23}
      pricesInclude="net"
      rooms={NO_ROOMS}
      textInfo={NO_TEXT}
      pricing={AMOUNT_BASIS}
      variants={NO_VARIANTS}
      onVariantChange={noop}
      onRename={noop}
      onRemove={noop}
      onAddGroup={noop}
      onRenameGroup={noop}
      onRemoveGroup={noop}
      onToggleGroup={noop}
      onAddItem={noop}
      onToggleItem={toggleItem}
      onPatchItem={updateItem}
      onRemoveItem={removeItem}
    />
  );
}

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.getState().load(makeQuote());
});

describe('SectionBlock — wydajność', () => {
  it('edycja jednej pozycji renderuje tylko ten wiersz, nie całą listę', () => {
    const spy = vi.spyOn(money, 'formatMoney');
    render(
      <DndContext>
        <Harness />
      </DndContext>,
    );

    // Render początkowy: każdy wiersz + suma sekcji + suma grupy.
    const initial = spy.mock.calls.length;
    expect(initial).toBeGreaterThanOrEqual(ITEM_COUNT);
    spy.mockClear();

    const targetId = useEditorStore.getState().body?.sections[0]?.groups[0]?.items[0]?.id;
    if (!targetId) throw new Error('brak pozycji');

    act(() => {
      useEditorStore.getState().updateItem(targetId, { unitPriceCents: 999_00 });
    });

    // Gdyby memoizacja nie działała, przerenderowałoby się wszystkie ITEM_COUNT
    // wierszy. Zmieniony wiersz + dwie sumy (sekcji i grupy) to sufit.
    expect(spy.mock.calls.length).toBeLessThan(ITEM_COUNT);
    spy.mockRestore();
  });
});
