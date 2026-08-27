import type { LibraryItem } from '@/data/repos/library.repo';

/**
 * Grupuje pozycje biblioteki po kategorii i wypycha na górę kategorię pasującą
 * do kontekstu (nazwa grupy albo tytuł sekcji). Trik z prototypu: wstawiając
 * pozycję do „Kuchni" najczęściej szuka się właśnie kuchennych.
 */
export function byCategory(items: LibraryItem[], priority?: string): [string, LibraryItem[]][] {
  const map = new Map<string, LibraryItem[]>();
  for (const item of items) {
    const list = map.get(item.categoryName) ?? [];
    list.push(item);
    map.set(item.categoryName, list);
  }

  const normalized = priority?.trim().toLowerCase();
  return [...map.entries()].sort(([a], [b]) => {
    if (normalized) {
      const aMatch = a.toLowerCase() === normalized;
      const bMatch = b.toLowerCase() === normalized;
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
    }
    return a.localeCompare(b, 'pl');
  });
}
