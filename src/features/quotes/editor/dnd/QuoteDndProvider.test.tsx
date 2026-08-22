import type { ReactNode } from 'react';
import type * as DndKit from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuoteDndProvider } from './QuoteDndProvider';

/**
 * Nie ma plakietki pod kursorem — podglądem jest sam przenoszony wiersz,
 * a „trzymam" komunikuje KURSOR. Sprawdzamy więc, że klasa wymuszająca
 * kursor pojawia się na starcie i **na pewno** znika na końcu: zostawiona
 * przykleiłaby `grabbing` do całej aplikacji.
 */
const dndState = vi.hoisted(() => ({
  onDragStart: null as ((event: unknown) => void) | null,
  onDragEnd: null as ((event: unknown) => void) | null,
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof DndKit>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragStart,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragStart: (event: unknown) => void;
      onDragEnd: (event: unknown) => void;
    }) => {
      dndState.onDragStart = onDragStart;
      dndState.onDragEnd = onDragEnd;
      return <div>{children}</div>;
    },
  };
});

describe('QuoteDndProvider — kursor przeciągania', () => {
  it('poza trybem edycji nie montuje kontekstu przeciągania', () => {
    render(
      <QuoteDndProvider enabled={false}>
        <p>Treść</p>
      </QuoteDndProvider>,
    );
    expect(screen.getByText('Treść')).toBeInTheDocument();
    expect(document.body.classList.contains('is-dragging')).toBe(false);
  });

  it('na czas przeciągania wymusza kursor na całej stronie', () => {
    render(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    dndState.onDragStart?.({
      active: { data: { current: { kind: 'item', itemId: 'i1', label: 'Blat kuchenny' } } },
    });
    expect(document.body.classList.contains('is-dragging')).toBe(true);

    dndState.onDragEnd?.({ active: { data: { current: {} } }, over: null });
    expect(document.body.classList.contains('is-dragging')).toBe(false);
  });

  it('odmontowanie w trakcie przeciągania nie zostawia przyklejonego kursora', () => {
    const { unmount } = render(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    dndState.onDragStart?.({ active: { data: { current: { kind: 'item', itemId: 'i1' } } } });
    expect(document.body.classList.contains('is-dragging')).toBe(true);

    unmount();
    expect(document.body.classList.contains('is-dragging')).toBe(false);
  });
});
