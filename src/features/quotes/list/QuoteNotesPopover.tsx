import { useEffect, useRef, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useSetQuoteRegisterFields } from '@/data/queries/useQuotes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Szybkie notatki prosto z rejestru (F7.1).
 *
 * Do T-99 byl tu tez wybor „rodzaju dokumentu". Zniknal, bo rodzaj przestal
 * byc etykieta: decyduje o widoku edytora i PDF, wiec ustala sie go przy
 * utworzeniu i nie przestawia z listy.
 *
 * Notatka zapisuje się **po opuszczeniu pola**, nie przy każdym znaku:
 * to jest lista, nie edytor — mutacja na literę zalałaby bazę zapisami
 * i migałaby optymistycznymi aktualizacjami całego wiersza.
 *
 * Ikona jest wypełniona, gdy notatka istnieje. Bez tego rejestr wygląda
 * identycznie z notatkami i bez nich, więc nikt by ich nie szukał.
 */
export function QuoteNotesPopover({
  quoteId,
  title,
  notes,
}: {
  quoteId: string;
  title: string;
  notes: string | null;
}) {
  const zapisz = useSetQuoteRegisterFields();
  const [draft, setDraft] = useState(notes ?? '');
  const zapisany = useRef(notes ?? '');

  useEffect(() => {
    // Zmiana z zewnatrz (odswiezenie listy) ma sie pokazac, ale nie moze
    // skasowac tego, co ktos wlasnie pisze.
    const zdalne = notes ?? '';
    if (zdalne !== zapisany.current) {
      zapisany.current = zdalne;
      setDraft(zdalne);
    }
  }, [notes]);

  const commit = () => {
    if (draft === zapisany.current) return;
    zapisany.current = draft;
    zapisz.mutate({ id: quoteId, internalNotes: draft });
  };

  const maNotatke = (notes ?? '').trim().length > 0;

  return (
    <Popover onOpenChange={(open) => (open ? undefined : commit())}>
      <PopoverTrigger
        aria-label={pl.quotes.notesFor(title)}
        title={maNotatke ? pl.quotes.hasNotes : pl.quotes.notes}
        className={cn(
          'flex size-7 items-center justify-center rounded-md transition-colors',
          maNotatke ? 'text-ink' : 'text-ink-soft/60 hover:text-ink',
        )}
      >
        <StickyNote className={cn('size-4', maNotatke && 'fill-current')} aria-hidden />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <label className="text-ink-soft text-xs font-semibold" htmlFor={`notes-${quoteId}`}>
            {pl.quotes.notes}
          </label>
          <Textarea
            id={`notes-${quoteId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            placeholder={pl.quotes.notesPlaceholder}
            aria-label={pl.quotes.notesFor(title)}
            rows={4}
          />
          <p className="text-ink-soft text-xs">{pl.quotes.notesHint}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
