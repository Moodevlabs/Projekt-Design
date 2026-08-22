import type { ReactNode } from 'react';
import type * as DndKit from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuoteDndProvider } from './QuoteDndProvider';

/**
 * Podgląd pod kursorem jest jedyną informacją zwrotną w trakcie przeciągania,
 * a wycena jest białą kartką — jasna plakietka po prostu na niej znika.
 * Testujemy więc dwie rzeczy: że w ogóle się pojawia i że jest ciemna.
 */
const dndState = vi.hoisted(() => ({ onDragStart: null as ((e: unknown) => void) | null }));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof DndKit>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragStart,
    }: {
      children: ReactNode;
      onDragStart: (event: unknown) => void;
    }) => {
      dndState.onDragStart = onDragStart;
      return <div>{children}</div>;
    },
    DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

describe('QuoteDndProvider — podgląd przeciągania', () => {
  it('poza trybem edycji nie montuje kontekstu przeciągania', () => {
    render(
      <QuoteDndProvider enabled={false}>
        <p>Treść</p>
      </QuoteDndProvider>,
    );
    expect(screen.getByText('Treść')).toBeInTheDocument();
    expect(screen.queryByTestId('drag-preview')).not.toBeInTheDocument();
  });

  it('pokazuje NAZWĘ przenoszonego elementu, nie sam jego rodzaj', () => {
    const { rerender } = render(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    dndState.onDragStart?.({
      active: { data: { current: { kind: 'item', itemId: 'i1', label: 'Blat kuchenny' } } },
    });
    rerender(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    const preview = screen.getByTestId('drag-preview');
    expect(preview).toHaveTextContent('Blat kuchenny');
    // Ciemne tło — na białym papierze wyceny jasna plakietka jest niewidoczna.
    expect(preview.className).toContain('bg-cta');
    expect(preview.className).toContain('text-cta-fg');
  });

  it('bez nazwy własnej pokazuje przynajmniej rodzaj', () => {
    const { rerender } = render(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    dndState.onDragStart?.({ active: { data: { current: { kind: 'group', groupId: 'g1', label: '  ' } } } });
    rerender(
      <QuoteDndProvider enabled>
        <p>Treść</p>
      </QuoteDndProvider>,
    );

    expect(screen.getByTestId('drag-preview')).toHaveTextContent('Grupa');
  });
});
