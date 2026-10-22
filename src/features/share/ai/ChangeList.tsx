import { Checkbox } from '@/components/ui/checkbox';
import type { CommentChange, CommentChangeDescription } from '@/domain/ai';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import type { CommentChangeRow } from './useCommentChanges';

/**
 * Lista proponowanych zmian z checkboxami (T-138).
 *
 * Każda zmiana to jedno zdanie z nazwą pozycji półgrubym i powodem modelu pod
 * spodem. Zmiany, których domena przy bieżącym zaznaczeniu nie nałoży, stoją
 * na liście **wyszarzone, z powodem zamiast uzasadnienia** — ale wciąż
 * z działającym checkboxem. Ukrycie ich sugerowałoby, że model niczego nie
 * pominął; zablokowanie — że nic się z tym nie da zrobić. A projektant ma
 * wiedzieć, że „usuń projekt oświetlenia" odpadło, bo pozycja jest włączona,
 * i że wystarczy z powrotem zaznaczyć „wyłącz", by usunięcie wróciło.
 */
export function ChangeList({
  rows,
  onToggle,
}: {
  rows: CommentChangeRow[];
  onToggle: (index: number) => void;
}) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => {
        const id = `comment-change-${row.index}`;
        const rejected = row.skipped !== null;
        return (
          <li
            key={row.index}
            className="flex items-start gap-3 border-t border-[var(--hair)] py-2.5 first:border-t-0 first:pt-0"
            data-rejected={rejected || undefined}
          >
            <Checkbox
              id={id}
              checked={row.checked}
              onCheckedChange={() => onToggle(row.index)}
              className={cn('mt-0.5', rejected && 'opacity-50')}
            />
            <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
              <span
                className={cn(
                  'block text-sm leading-snug',
                  rejected ? 'text-ink-faint' : 'text-ink',
                )}
              >
                <Sentence change={row.change} description={row.description} />
              </span>
              <span className="text-ink-soft mt-0.5 block text-xs leading-snug">
                {row.skipped ? pl.ai.comments.skipped[row.skipped] : row.change.reason}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function sentenceFor(change: CommentChange, description: CommentChangeDescription): string {
  const name = description.itemName ?? pl.ai.comments.unknownName;
  switch (change.kind) {
    case 'disable':
      return pl.ai.comments.kinds.disable(name);
    case 'enable':
      return pl.ai.comments.kinds.enable(name);
    case 'remove':
      return pl.ai.comments.kinds.remove(name);
    case 'qty':
      return pl.ai.comments.kinds.qty(name, change.qty);
    case 'add':
      return pl.ai.comments.kinds.add(name, description.sectionTitle ?? pl.ai.comments.unknownName);
  }
}

/**
 * Zdanie z nazwą pozycji półgrubym. Słownik oddaje gotowy napis, więc nazwę
 * wyróżniamy po jej pierwszym wystąpieniu — bez rozbijania słownika na
 * kawałki, które trzeba by składać w JSX w każdym języku osobno.
 */
function Sentence({
  change,
  description,
}: {
  change: CommentChange;
  description: CommentChangeDescription;
}) {
  const sentence = sentenceFor(change, description);
  const name = description.itemName ?? pl.ai.comments.unknownName;
  const at = sentence.indexOf(name);
  if (at === -1) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <strong className="font-semibold">{name}</strong>
      {sentence.slice(at + name.length)}
    </>
  );
}
