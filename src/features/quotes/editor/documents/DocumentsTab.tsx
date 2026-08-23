import { useState } from 'react';
import { StagesDocTab } from './StagesDocTab';
import { PriceListTab } from './PriceListTab';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type DocKind = 'stages' | 'priceList';

/**
 * Zakładka „Dokumenty" — dokumenty towarzyszące wycenie (F6).
 *
 * Drugi poziom zakładek zamiast dwóch pozycji na górnym pasku: „Etapy" i
 * „Cennik" to **ten sam rodzaj rzeczy** (dokument dla tego samego inwestora,
 * z tym samym numerem), a „Wycena" i „Termin" to co innego. Płaska lista
 * czterech zakładek gubiłaby tę różnicę, a pakiet z F6.3 doda kolejne.
 *
 * Wybrany dokument jest odmontowywany przy przełączeniu — to tylko widok,
 * treść siedzi w store'rze edytora i nie zależy od tego, na co się patrzy.
 */
export function DocumentsTab({ editing }: { editing: boolean }) {
  const [kind, setKind] = useState<DocKind>('stages');

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-hair mx-auto flex w-full max-w-[900px] items-center gap-1 border-b px-7 pt-4">
        <DocTab
          active={kind === 'stages'}
          onSelect={() => setKind('stages')}
          label={pl.editor.docTabStages}
        />
        <DocTab
          active={kind === 'priceList'}
          onSelect={() => setKind('priceList')}
          label={pl.editor.docTabPriceList}
        />
      </div>

      {kind === 'stages' ? <StagesDocTab editing={editing} /> : <PriceListTab editing={editing} />}
    </div>
  );
}

function DocTab({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative -mb-px px-3 py-2 text-[13px] transition-colors',
        active
          ? 'text-ink border-b-2 border-[var(--doc-ink)] font-semibold'
          : 'text-ink-soft hover:text-ink border-b-2 border-transparent',
      )}
    >
      {label}
    </button>
  );
}
