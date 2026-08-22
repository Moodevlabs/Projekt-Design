import { useCallback, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { resolveDrop, type DragData, type DropData } from './drop-resolution';
import { useEditorStore } from '../editor.store';
import { pl } from '@/i18n/pl';

/** Rodzaj przenoszonego elementu — do komunikatów dla czytników ekranu. */
function kindLabel(data: DragData): string {
  if (data.kind === 'item') return pl.editor.item;
  if (data.kind === 'group') return pl.editor.group;
  return pl.editor.section;
}

/** Nazwa własna przenoszonego elementu, gdy jest; inaczej sam rodzaj. */
function nameLabel(data: DragData): string {
  return data.label?.trim() || kindLabel(data);
}

/**
 * Przeciąganie w edytorze wyceny.
 *
 * Poza trybem edycji kontekst w ogóle się nie montuje — w podglądzie nie ma
 * czego przenosić, a każdy nasłuch to koszt przy 300 pozycjach.
 *
 * Ruch w pionie jest wymuszony modyfikatorem: dokument jest jedną kolumną,
 * więc swoboda w poziomie tylko utrudniałaby trafienie w cel.
 */
export function QuoteDndProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [dragged, setDragged] = useState<DragData | null>(null);

  const moveItem = useEditorStore((state) => state.moveItem);
  const moveGroup = useEditorStore((state) => state.moveGroup);
  const moveSection = useEditorStore((state) => state.moveSection);

  const sensors = useSensors(
    // Krótki dystans aktywacji: uchwyt ma też zwykłe kliknięcie (focus),
    // więc nie chcemy łapać przeciągania przy każdym drgnięciu myszy.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setDragged((event.active.data.current as DragData | undefined) ?? null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragged(null);

      const active = event.active.data.current as DragData | undefined;
      const over = event.over?.data.current as DropData | undefined;
      if (!active || !over) return;

      // Świeży dokument prosto ze store'u — w trakcie przeciągania mógł się
      // zmienić (autozapis, kaskada z biblioteki).
      const body = useEditorStore.getState().body;
      if (!body) return;

      const intent = resolveDrop(body, active, over);
      if (!intent) return;

      if (intent.kind === 'item') moveItem(intent.args);
      else if (intent.kind === 'group') moveGroup(intent.args);
      else moveSection(intent.args);
    },
    [moveItem, moveGroup, moveSection],
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      pl.editor.dnd.start(nameLabel(active.data.current as DragData)),
    onDragOver: ({ active, over }) =>
      over
        ? pl.editor.dnd.over(nameLabel(active.data.current as DragData), String(over.id))
        : undefined,
    onDragEnd: ({ active }) => pl.editor.dnd.dropped(nameLabel(active.data.current as DragData)),
    onDragCancel: ({ active }) =>
      pl.editor.dnd.cancelled(nameLabel(active.data.current as DragData)),
  };

  if (!enabled) return <>{children}</>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={{ announcements }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      {children}
      {/*
        Podgląd pod kursorem MUSI być ciemny. Wycena jest białą kartką, więc
        jasna plakietka z włosem obramowania po prostu na niej znika — a to
        jedyna rzecz, która w trakcie przeciągania mówi, co się dzieje.
        Pokazujemy nazwę elementu, nie sam jego rodzaj.
      */}
      <DragOverlay dropAnimation={null}>
        {dragged ? (
          <div
            data-testid="drag-preview"
            className="bg-cta text-cta-fg flex max-w-[280px] items-center gap-2 rounded-[var(--radius-pill)] py-2 pr-4 pl-3 text-xs font-medium shadow-[0_12px_28px_-8px_rgba(20,22,28,0.6)]"
          >
            <span aria-hidden className="opacity-60">
              {kindLabel(dragged)}
            </span>
            <span className="truncate">{nameLabel(dragged)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
