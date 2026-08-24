import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { ItemVariant } from '../editor.store';
import { pl } from '@/i18n/pl';

export interface ItemVariantSelectProps {
  /** Warianty do wyboru — pusta lista znaczy „ta pozycja ich nie ma". */
  variants: LibraryItem[];
  /** Wpis biblioteczny, którym wiersz jest w tej chwili. */
  currentId: string | null;
  onChange: (variant: ItemVariant) => void;
}

/**
 * Wybór wariantu pozycji (F1.4) — „Wizualizacja 3D" / „Wizualizacja 360".
 *
 * Zastępuje **nazwę** wiersza, a nie stoi obok niej: wariant to jest ta nazwa.
 * Dwa pola — pole tekstowe z nazwą i lista wariantów — pozwalałyby wpisać
 * „Wizualizacja 3D" przy wybranym wariancie 360 i nikt by tego nie wyłapał.
 */
export function ItemVariantSelect({ variants, currentId, onChange }: ItemVariantSelectProps) {
  if (variants.length < 2) return null;

  const wybierz = (id: string) => {
    const variant = variants.find((candidate) => candidate.id === id);
    if (!variant) return;

    onChange({
      libraryItemId: variant.id,
      name: variant.name,
      description: variant.description,
      // Wariant bez ceny to „wycena indywidualna" — przenosimy `null`, bo
      // podmiana na zero zamieniłaby „ustalimy osobno" w „gratis".
      unitPriceCents: variant.unitPriceCents,
      pricing: variant.pricing,
    });
  };

  return (
    <Select value={currentId ?? undefined} onValueChange={wybierz}>
      <SelectTrigger
        aria-label={pl.editor.itemVariantLabel}
        className="h-7 w-auto min-w-[180px] border-transparent bg-transparent px-1.5 text-[14.5px] font-semibold shadow-none focus-visible:border-[var(--doc-hair-strong)]"
      >
        <SelectValue placeholder={pl.editor.itemVariantPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {variants.map((variant) => (
          <SelectItem key={variant.id} value={variant.id}>
            {variant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
