import { useState } from 'react';
import { ChevronDown, Link2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { useEditorStore } from '../editor.store';
import { ClientLinksEditor } from './ClientLinksEditor';

/**
 * Karta „Odnośniki dla klienta" w prawej kolumnie edytora (T-116).
 *
 * Zwinięta, dopóki lista jest pusta — prawa kolumna jest wąska i ma już
 * cztery karty; piąta, otwarta na stałe, spychałaby podsumowanie kwot poniżej
 * ekranu w ofercie, która żadnych materiałów nie ma. Gdy odnośniki są,
 * karta otwiera się sama: wtedy jest treścią, a nie opcją.
 */
export function ClientLinksCard() {
  const count = useEditorStore(useShallow((state) => state.body?.links.length ?? 0));
  /*
   * `null` = użytkownik jeszcze nie decydował, więc o stanie mówi zawartość.
   * Zwykłe `useState(count > 0)` dałoby kartę zwiniętą przy każdej ofercie
   * z odnośnikami: przy pierwszym renderze dokumentu nie ma jeszcze w pamięci,
   * a wartość początkowa `useState` już się nie zmienia.
   */
  const [open, setOpen] = useState<boolean | null>(null);

  const expanded = open ?? count > 0;

  return (
    <section className="card-surface space-y-3 p-4">
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <Link2 className="text-ink-soft size-4 shrink-0" aria-hidden />
        <h2 className="text-ink flex-1 text-sm font-semibold">{pl.quoteLinks.title}</h2>
        {count > 0 ? <span className="text-ink-soft tabular text-xs">{count}</span> : null}
        <ChevronDown
          className={cn('text-ink-soft size-4 transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {expanded ? (
        <>
          <p className="text-ink-soft text-xs">{pl.quoteLinks.hint}</p>
          <ClientLinksEditor />
        </>
      ) : null}
    </section>
  );
}
