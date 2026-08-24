import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { pl } from '@/i18n/pl';

export interface NotesPanelProps {
  /** Zapisana treść. Zmiana tej wartości przestawia pole. */
  value: string;
  /** Klucz rekordu — zmiana znaczy „to już inna notatka", nie „ktoś dopisał". */
  recordId: string;
  label: string;
  placeholder: string;
  hint: string;
  saving: boolean;
  onSave: (next: string) => void;
}

/**
 * Notatka przy rekordzie (klient, projekt) z **jawnym** zapisem.
 *
 * Edytor wyceny zapisuje sam, bo tam człowiek pracuje ciągle i dokument jest
 * jego jedyną robotą. Notatka na marginesie jest inna: autozapis w trakcie
 * pisania zdania zostawiałby w kartotece urwane pół myśli.
 */
export function NotesPanel({
  value,
  recordId,
  label,
  placeholder,
  hint,
  saving,
  onSave,
}: NotesPanelProps) {
  const [draft, setDraft] = useState(value);

  // Zależność od `recordId` **i** `value`: przejście na inny rekord ma
  // przestawić pole, a zapis z innego miejsca — pokazać nową treść.
  useEffect(() => setDraft(value), [recordId, value]);

  const dirty = draft !== value;

  return (
    <div className="card-surface space-y-3 p-5">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={10}
        aria-label={label}
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink-soft text-xs">{hint}</p>
        <Button disabled={!dirty || saving} onClick={() => onSave(draft)}>
          {pl.common.save}
        </Button>
      </div>
    </div>
  );
}
