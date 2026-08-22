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

/** Etykieta przenoszonego elementu — używana w komunikatach dla czytników. */
function labelOf(data: DragData): string {
  if (data.kind === 'item') return pl.editor.item;
  if (data.kind === 'group') return pl.editor.group;
  return pl.editor.section;
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
      pl.editor.dnd.start(labelOf(active.data.current as DragData)),
    onDragOver: ({ active, over }) =>
      over
        ? pl.editor.dnd.over(labelOf(active.data.current as DragData), String(over.id))
        : undefined,
    onDragEnd: ({ active }) => pl.editor.dnd.dropped(labelOf(active.data.current as DragData)),
    onDragCancel: ({ active }) =>
      pl.editor.dnd.cancelled(labelOf(active.data.current as DragData)),
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
      <DragOverlay dropAnimation={null}>
        {dragged ? (
          <div className="bg-surface border-hair rounded-[var(--radius-control)] border px-3 py-2 text-xs font-medium shadow-[var(--glass-shadow)]">
            {labelOf(dragged)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
