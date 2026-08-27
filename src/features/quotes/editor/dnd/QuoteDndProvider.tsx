import { useCallback, useEffect, type ReactNode } from 'react';
import {
  DndContext,
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

/** Klasa na `<body>` wymuszająca kursor „trzymam" na całej stronie. */
const DRAGGING_CLASS = 'is-dragging';

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
export function QuoteDndProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const moveItem = useEditorStore((state) => state.moveItem);
  const moveGroup = useEditorStore((state) => state.moveGroup);
  const moveSection = useEditorStore((state) => state.moveSection);

  const sensors = useSensors(
    // Krótki dystans aktywacji: uchwyt ma też zwykłe kliknięcie (focus),
    // więc nie chcemy łapać przeciągania przy każdym drgnięciu myszy.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = useCallback((_event: DragStartEvent) => {
    document.body.classList.add(DRAGGING_CLASS);
  }, []);

  // Gdyby komponent zniknął w trakcie przeciągania (przeładowanie wyceny,
  // wyjście z edytora), kursor „trzymam" zostałby na stałe.
  useEffect(() => () => document.body.classList.remove(DRAGGING_CLASS), []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      document.body.classList.remove(DRAGGING_CLASS);

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
    onDragStart: ({ active }) => pl.editor.dnd.start(nameLabel(active.data.current as DragData)),
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
      onDragCancel={() => document.body.classList.remove(DRAGGING_CLASS)}
    >
      {children}
    </DndContext>
  );
}
