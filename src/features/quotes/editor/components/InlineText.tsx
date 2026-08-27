import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  display,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
  /**
   * Tekst do pokazania w podgladzie, gdy rozni sie od zapisanej wartosci —
   * opis z podstawionymi placeholderami (F4.2). W trybie edycji pole ZAWSZE
   * pokazuje surowa tresc: inaczej nie dalo by sie tych placeholderow poprawic.
   */
  display?: string;
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

  /**
   * `contentEditable` rosl z trescia za darmo; `<textarea>` nie — bez tego
   * dluzsze opisy zostalyby uciete albo dostalyby pasek przewijania.
   */
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resize = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    if (multiline) resize();
  }, [draft, multiline, resize]);

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

  /*
   * W podglądzie renderujemy zwykły tekst, a NIE `readonly` input.
   * Input nie potrafi zawijać — długa wartość (najczęściej e-mail) była
   * po prostu ucinana na krawędzi pola. Tekst zawija się i jest czytany
   * przez czytniki ekranu jako treść, a nie jako pole formularza.
   */
  if (readOnly) {
    const shown = display ?? draft;
    if (!shown) return null;
    return (
      <div
        aria-label={ariaLabel}
        className={cn(shared.className, 'break-words', multiline && 'whitespace-pre-wrap')}
      >
        {shown}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        {...shared}
        ref={textareaRef}
        rows={1}
        style={{ resize: 'none', overflow: 'hidden' }}
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
