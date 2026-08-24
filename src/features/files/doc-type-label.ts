import type { DocType } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

/**
 * Nazwa rodzaju dokumentu po polsku.
 *
 * `null` zdarza się przy wierszach sprzed T-56 i przy plikach wrzuconych
 * ręcznie — pokazujemy wtedy ogólne „Dokument", a nie pustkę w kolumnie.
 */
export function docTypeLabel(docType: DocType | null): string {
  return docType ? pl.documents.types[docType] : pl.documents.unknownType;
}
