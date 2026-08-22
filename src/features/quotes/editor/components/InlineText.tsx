import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pole tekstowe udające zwykły tekst (05-UI §5).
 *
 * Świadomie **nie** `contentEditable` — z Reactem gubi kursor i wymaga ręcznego
 * pilnowania DOM. Zwykły kontrolowany `<input>` daje to samo wrażenie, a
 * zachowuje się przewidywalnie.
 *
 * Enter = zatwierdź, Esc = przywróć wartość sprzed edycji.
 */
export function InlineText({
  value,
  onCommit,
  placeholder,
  readOnly = false,
  multiline = false,
  className,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  // Kopia szkicu w refie: `onBlur` po Escape czytalby stan sprzed `setDraft`
  // (aktualizacje stanu Reacta sa asynchroniczne) i zapisalby cofnieta zmiane.
  const draftRef = useRef(value);

  const setDraftBoth = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  // Wartość może zmienić się z zewnątrz (np. kaskada z biblioteki, przeładowanie).
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      draftRef.current = value;
      setDraft(value);
    }
  }, [value]);

  const commit = () => {
    const next = draftRef.current;
    if (next === committed.current) return;
    committed.current = next;
    onCommit(next);
  };

  const revert = () => {
    setDraftBoth(committed.current);
  };

  const shared = {
    value: draft,
    placeholder,
    readOnly,
    'aria-label': ariaLabel,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraftBoth(event.target.value),
    onBlur: commit,
    className: cn(
      'w-full rounded-[var(--radius-control)] bg-transparent px-2 py-1 -mx-2',
      'focus:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'placeholder:text-ink-soft/60',
      readOnly && 'cursor-default focus:bg-transparent',
      className,
    ),
  };

  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={2}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            revert();
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <input
      {...shared}
      type="text"
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          revert();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
