import { useMemo } from 'react';

/**
 * Zwraca listę identyfikatorów, której **referencja zmienia się tylko wtedy,
 * gdy zmieni się skład albo kolejność** — nie przy każdej edycji pola.
 *
 * Po co: `SortableContext` przelicza wartość kontekstu, kiedy dostanie nową
 * tablicę `items`. Zmiana kontekstu przerenderowuje wszystkich konsumentów
 * `useSortable` **niezależnie od `memo`**, więc naiwne `items.map(i => i.id)`
 * w ciele komponentu kasowałoby całą memoizację wierszy: edycja jednej nazwy
 * przerysowywałaby wszystkie 300 pozycji listy.
 */
export function useStableIds(items: readonly { id: string }[]): string[] {
  const key = items.map((item) => item.id).join('|');

  return useMemo(
    () => items.map((item) => item.id),
    // Celowo zależymy od klucza treściowego, a nie od tablicy `items` —
    // to jest cały sens tego hooka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
}
