import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DOCUMENT_KINDS } from '@/domain/documents';
import type { DocKind } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * „Nowy dokument ▾" — cztery rodzaje w jednym przycisku (T-100).
 *
 * Na karcie klienta i w teczce projektu lista miesza rodzaje, wiec jeden
 * przycisk „Nowa wycena" przestal wystarczac. Cztery przyciski obok siebie
 * zajelyby caly pasek; to jest JEDNA akcja („zaloz dokument") w czterech
 * wariantach, a nie cztery akcje — stad menu, jak przy eksporcie rejestru.
 */
export function NewDocumentMenu({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (kind: DocKind) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="size-4" aria-hidden />
          {pl.quotes.newDocument}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DOCUMENT_KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onSelect={() => onSelect(kind)}>
            {pl.quotes.newOfKind[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
