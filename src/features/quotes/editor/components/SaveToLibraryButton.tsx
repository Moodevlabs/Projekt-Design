import { useEffect, useRef, useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type SaveToLibraryButtonProps = {
  /** Etykieta w spoczynku — pełne zdanie dla czytnika ekranu. */
  label: string;
  /** Etykieta po zapisie; ptaszek sam w sobie nic nie mówi. */
  savedLabel: string;
  /** Nie ma czego zapisać (np. pozycja bez nazwy) — przycisk gaśnie. */
  disabled?: boolean;
  onSave: () => void;
};

/**
 * „Zapisz do biblioteki" z krótkim potwierdzeniem: ikona zamienia się w ptaszka
 * na 900 ms i przycisk jest wtedy nieaktywny. Mikrodetal wzięty z prototypu —
 * daje pewność, że kliknięcie zadziałało, bez wyskakującego komunikatu.
 *
 * Wspólny dla pozycji (`ItemRow`) i zestawu (`GroupBlock`), bo to ten sam gest
 * w dwóch miejscach — rozjechane warianty czułyby się jak dwie różne funkcje.
 */
export function SaveToLibraryButton({
  label,
  savedLabel,
  disabled = false,
  onSave,
}: SaveToLibraryButtonProps) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <button
      type="button"
      disabled={saved || disabled}
      aria-label={saved ? savedLabel : label}
      onClick={() => {
        onSave();
        setSaved(true);
        timer.current = setTimeout(() => setSaved(false), 900);
      }}
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors',
        saved
          ? 'text-[var(--doc-sage)]'
          : 'text-[var(--doc-ink-soft)] hover:bg-[var(--doc-sage-light)] hover:text-[var(--doc-sage)]',
        disabled && !saved && 'opacity-30',
      )}
    >
      {saved ? (
        <Check className="size-[13px]" aria-hidden />
      ) : (
        <Bookmark className="size-[13px]" aria-hidden />
      )}
    </button>
  );
}
