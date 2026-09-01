import { BookmarkPlus } from 'lucide-react';
import { useSaveToLibrary } from '../useSaveToLibrary';
import type { Group } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * „Zapisz grupę jako zestaw" — wyceniona kuchnia wraca do biblioteki (T-122).
 *
 * Do tej pory zestaw dawało się zbudować **tylko** ręcznie, kartą w bibliotece,
 * pozycja po pozycji. Logika odwrotnej drogi (`useSaveToLibrary().saveGroup`)
 * leżała w kodzie od T-10 z własnymi testami, ale **nie była podpięta do
 * żadnego przycisku** — i to jest powód, dla którego zakładka „Zestawy"
 * wyglądała na porzuconą. Zestaw ma powstawać z pracy, którą ktoś i tak
 * wykonał, a nie z formularza do wypełnienia.
 *
 * ⚠️ **Własny komponent, nie prop na `GroupBlock`.** Blok grupy jest
 * zmemoizowany, a `saveGroup` wisi na obiekcie mutacji z TanStack Query, który
 * dostaje nową referencję przy każdym renderze strony. Przekazany w dół jako
 * prop zabijałby `memo` na wszystkich blokach i zamieniał każdą literę wpisaną
 * w dokumencie w przerysowanie całej wyceny (pułapka z T-39, pilnuje jej
 * `SectionBlock.perf.test.tsx`). Tutaj hook siedzi w liściu i nikogo nie rusza.
 */
export function SaveGroupToSetButton({ group, className }: { group: Group; className?: string }) {
  const library = useSaveToLibrary();

  return (
    <button
      type="button"
      aria-label={pl.editor.saveGroupToLibrary(group.name || pl.editor.newGroupName)}
      title={pl.editor.saveGroupToLibraryShort}
      onClick={() => library.saveGroup(group)}
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full',
        'text-[var(--doc-ink-soft)] transition-colors',
        'hover:bg-[var(--doc-sage-light)] hover:text-[var(--doc-ink)]',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <BookmarkPlus className="size-[13px]" aria-hidden />
    </button>
  );
}
