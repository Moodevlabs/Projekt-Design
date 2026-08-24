import { Trash2 } from 'lucide-react';
import { NumberField } from '../components/NumberField';
import type { ScheduleExtra } from '@/domain/schedule';
import { pl } from '@/i18n/pl';

/**
 * Składniki etapu „Usługi dodatkowe" (T-64).
 *
 * Etap pokazuje **listę**, a nie samą sumę: użytkownik ma widzieć, skąd wzięło
 * się „+5 dni". Sama liczba w polu „Dni bazowe" byłaby prawdziwa i zupełnie
 * nieczytelna miesiąc później.
 *
 * Usunięcie pozycji z wyceny **nie** zdejmuje dni automatycznie (zasada
 * z T-44) — dlatego każdy składnik ma tu swój kosz.
 */
export function StageExtrasList({
  extras,
  editing,
  onRemove,
  onDays,
}: {
  extras: ScheduleExtra[];
  editing: boolean;
  onRemove: (extraId: string) => void;
  onDays: (extraId: string, days: number) => void;
}) {
  return (
    <div className="border-hair ml-6 flex flex-col gap-1.5 rounded-[var(--radius-control)] border p-2">
      <p className="text-ink-soft text-xs">{pl.editor.extrasStageHint}</p>

      <ul className="flex flex-col gap-1">
        {extras.map((extra) => (
          <li key={extra.id} className="flex items-center gap-2 text-xs">
            <span className="text-ink min-w-0 flex-1 truncate">{extra.name}</span>

            {editing ? (
              <NumberField
                value={extra.days}
                onCommit={(days) => onDays(extra.id, days)}
                min={0}
                ariaLabel={pl.editor.extrasEntryDaysLabel(extra.name)}
                className="w-14 text-right"
              />
            ) : (
              <span className="tabular text-ink-soft">{pl.editor.stageDays(extra.days)}</span>
            )}

            {editing ? (
              <button
                type="button"
                aria-label={pl.editor.removeExtrasEntry(extra.name)}
                onClick={() => onRemove(extra.id)}
                className="text-ink-soft hover:text-[var(--doc-terracotta)] flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors"
              >
                <Trash2 className="size-[13px]" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
