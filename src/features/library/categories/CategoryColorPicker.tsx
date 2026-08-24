import { LIBRARY_COLORS, type LibraryColor } from '@/domain/library/schema';
import { SWATCHES } from './swatches';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wybór koloru grupy — z palety, nie z color pickera. Uzasadnienie i wartości
 * siedzą w `swatches.ts`.
 */
export function CategoryColorPicker({
  value,
  onChange,
}: {
  value: LibraryColor | null;
  onChange: (next: LibraryColor | null) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={pl.library.categoryColor}>
      {/* „Bez koloru" jest pełnoprawnym wyborem: nie każde studio dzieli
          bibliotekę kolorami, a wymuszony kolor to szum. */}
      <button
        type="button"
        aria-label={pl.library.categoryNoColor}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={cn(
          'border-hair size-5 rounded-full border',
          value === null && 'ring-ring ring-2 ring-offset-1',
        )}
      />
      {LIBRARY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: SWATCHES[color] }}
          className={cn('size-5 rounded-full', value === color && 'ring-ring ring-2 ring-offset-1')}
        />
      ))}
    </div>
  );
}
