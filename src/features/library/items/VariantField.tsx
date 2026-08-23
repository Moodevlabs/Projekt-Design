import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

/** Wartość „nie jest wariantem" — `Select` z Radiksa nie przyjmuje pustego stringa. */
const NONE = '__none__';

export interface VariantFieldProps {
  item: LibraryItem;
  /** Cała biblioteka, nie przefiltrowany widok — patrz komentarz niżej. */
  allItems: LibraryItem[];
  value: string | null;
  onChange: (variantOf: string | null) => void;
}

/**
 * Przypięcie pozycji do grupy wariantów (F1.4).
 *
 * Grupa jest **płaska**: wariant wskazuje na pozycję główną i nic więcej.
 * Dlatego pozycja, która sama ma już warianty, nie może stać się cudzym
 * wariantem — zamiast martwej listy pokazujemy jej wprost, czym jest. Baza
 * pilnuje tego samego wyzwalaczem (`0010_library_variants.sql`); tutaj chodzi
 * o to, żeby użytkownik nie dowiadywał się o regule z komunikatu błędu.
 */
export function VariantField({ item, allItems, value, onChange }: VariantFieldProps) {
  const wlasneWarianty = allItems.filter((candidate) => candidate.variantOf === item.id);

  if (wlasneWarianty.length > 0) {
    return (
      <p className="text-ink-soft px-2 text-xs">
        {pl.library.variantLeaderNote(wlasneWarianty.length)}
      </p>
    );
  }

  /*
   * Kandydaci pochodzą z CAŁEJ biblioteki, a nie z przefiltrowanej listy na
   * ekranie. Inaczej wpisanie czegoś w szukajkę po cichu zmieniałoby zestaw
   * opcji, a pozycja, do której chcemy się podpiąć, znikałaby z listy tylko
   * dlatego, że nie pasuje do frazy.
   */
  const kandydaci = allItems.filter(
    (candidate) =>
      candidate.id !== item.id &&
      // Wariant wariantu dałby drzewo zamiast grupy.
      candidate.variantOf === null &&
      candidate.kind === item.kind,
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-soft shrink-0 px-2 text-xs">{pl.library.variantOf}</span>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => onChange(next === NONE ? null : next)}
      >
        <SelectTrigger
          aria-label={`${pl.library.variantOfLabel}: ${item.name || pl.library.newItemName}`}
          className="text-ink-soft h-8 flex-1 text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{pl.library.variantNone}</SelectItem>
          {kandydaci.map((candidate) => (
            <SelectItem key={candidate.id} value={candidate.id}>
              {candidate.name || pl.library.newItemName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
