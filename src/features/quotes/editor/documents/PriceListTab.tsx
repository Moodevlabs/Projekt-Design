import { useEffect, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { InlineText } from '../components/InlineText';
import { InlineMoney } from '../components/InlineMoney';
import { NumberField } from '../components/NumberField';
import { AddLink } from '../components/AddLink';
import { AddToQuoteBridge } from './AddToQuoteBridge';
import { useEditorStore } from '../editor.store';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { groupPriceListItems, type PriceListItem } from '@/domain/documents';
import { formatMoneyRange } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Zakładka „Dokumenty → Cennik usług dodatkowych" (F6.2).
 *
 * Cena jest **przedziałem**, nie liczbą: „300–1 200 zł" to uczciwa odpowiedź
 * na pytanie, na które przed obejrzeniem mieszkania nie da się odpowiedzieć
 * dokładnie. Dlatego tego dokumentu nie da się zsumować — i nie próbujemy.
 */
/** Stala referencja — patrz `ScheduleTab`. */
const EMPTY_TEMPLATE: never[] = [];

export function PriceListTab({
  editing,
  startEmpty = false,
  aside,
}: {
  editing: boolean;
  /** Dokument standalone (T-101) startuje pusty i buduje sie z biblioteki. */
  startEmpty?: boolean;
  /** Prawa kolumna (klient, archiwum) — tylko dla dokumentu standalone. */
  aside?: ReactNode;
}) {
  const { doc } = useEditorStore(
    useShallow((state) => ({ doc: state.documents?.priceList ?? null })),
  );

  const ensureDoc = useEditorStore((state) => state.ensurePriceListDoc);
  const patchDoc = useEditorStore((state) => state.patchPriceListDoc);
  const updateItem = useEditorStore((state) => state.updatePriceListItem);
  const addItem = useEditorStore((state) => state.addPriceListItem);
  const removeItem = useEditorStore((state) => state.removePriceListItem);

  const workspaceTemplate = useWorkspace().data?.settings.priceListTemplate ?? null;
  const template = startEmpty ? EMPTY_TEMPLATE : workspaceTemplate;

  useEffect(() => {
    // Jak przy etapach: zakładamy przy pierwszym wejściu i tylko w edycji.
    if (editing) ensureDoc(template);
  }, [editing, ensureDoc, template]);

  if (!doc) {
    return <p className="text-ink-soft p-7 text-sm">{pl.editor.priceListEmpty}</p>;
  }

  return (
    <div
      className={cn(
        'mx-auto w-full px-7 pt-6 pb-14',
        aside ? 'grid max-w-[1320px] items-start gap-7 lg:grid-cols-[1fr_336px]' : 'max-w-[900px]',
      )}
    >
      <div className="quote-doc quote-sheet min-w-0 px-10 py-9">
        <h2 className="text-[22px] font-normal tracking-[-0.01em] uppercase">
          {pl.editor.priceListTitle}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--doc-ink-soft)]">{pl.editor.priceListIntro}</p>

        {editing ? (
          <label className="mt-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-[var(--doc-sage)] uppercase">
            {pl.editor.priceListValidDays}
            <NumberField
              value={doc.validDays}
              onCommit={(validDays) => patchDoc({ validDays })}
              min={0}
              ariaLabel={pl.editor.priceListValidDays}
              className="w-16 text-[14px] font-normal normal-case"
            />
          </label>
        ) : null}

        {groupPriceListItems(doc.items).map((group) => (
          <section key={group.label || '—'} className="mt-7">
            {group.label ? (
              <h3 className="border-b border-[var(--doc-ink)] pb-1.5 text-[12px] font-bold tracking-[0.08em] uppercase">
                {group.label}
              </h3>
            ) : null}

            <ul className="flex flex-col">
              {group.items.map((item) => (
                <PriceListRow
                  key={item.id}
                  item={item}
                  editing={editing}
                  onPatch={(patch) => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ul>
          </section>
        ))}

        {editing ? (
          <AddLink icon={Plus} onClick={() => addItem()} className="mt-4 text-[13px]">
            {pl.editor.addPriceListItem}
          </AddLink>
        ) : null}

        {editing || doc.footnote ? (
          <div className="mt-8 border-t border-[var(--doc-hair)] pt-3">
            <InlineText
              value={doc.footnote}
              onCommit={(footnote) => patchDoc({ footnote })}
              readOnly={!editing}
              multiline
              placeholder={pl.editor.priceListFootnotePlaceholder}
              ariaLabel={pl.editor.priceListFootnote}
              className="inline-field text-[12.5px] leading-[1.55] text-[var(--doc-ink-soft)]"
            />
          </div>
        ) : null}
      </div>

      {aside ? <div className="flex flex-col gap-4 lg:sticky lg:top-6">{aside}</div> : null}
    </div>
  );
}

function PriceListRow({
  item,
  editing,
  onPatch,
  onRemove,
}: {
  item: PriceListItem;
  editing: boolean;
  onPatch: (patch: Partial<PriceListItem>) => void;
  onRemove: () => void;
}) {
  const label = item.name || pl.editor.newPriceListItemName;

  return (
    <li className="border-b border-[var(--doc-hair)] py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <InlineText
            value={item.name}
            onCommit={(name) => onPatch({ name })}
            readOnly={!editing}
            placeholder={pl.editor.newPriceListItemName}
            ariaLabel={pl.editor.priceListNameLabel(label)}
            className="inline-field text-[14px] font-semibold"
          />
          {editing || item.description ? (
            <InlineText
              value={item.description}
              onCommit={(description) => onPatch({ description })}
              readOnly={!editing}
              multiline
              placeholder={pl.editor.priceListDescriptionPlaceholder}
              ariaLabel={pl.editor.priceListDescriptionLabel(label)}
              className="inline-field text-[12.5px] leading-[1.55] text-[var(--doc-ink-soft)]"
            />
          ) : null}
        </div>

        <div className="w-[170px] shrink-0 text-right">
          {editing ? (
            <PriceRangeFields item={item} label={label} onPatch={onPatch} />
          ) : (
            <span className="text-[14px] font-semibold">
              {formatMoneyRange(item.priceMinCents, item.priceMaxCents, item.unit)}
            </span>
          )}
          {editing || item.leadTime ? (
            <InlineText
              value={item.leadTime}
              onCommit={(leadTime) => onPatch({ leadTime })}
              readOnly={!editing}
              placeholder={pl.editor.priceListLeadTimePlaceholder}
              ariaLabel={pl.editor.priceListLeadTimeLabel(label)}
              className="inline-field mt-1 text-right text-[12px] text-[var(--doc-ink-soft)]"
            />
          ) : null}
          {/*
            `addedDays` widac tylko w edycji — to liczba dla harmonogramu,
            a nie tresc dla klienta. Klient czyta `leadTime` (T-64).
          */}
          {editing ? (
            <label className="mt-1 flex items-center justify-end gap-1 text-[12px] text-[var(--doc-ink-soft)]">
              {pl.editor.priceListAddedDays}
              <NumberField
                value={item.addedDays ?? 0}
                onCommit={(addedDays) => onPatch({ addedDays: addedDays > 0 ? addedDays : null })}
                min={0}
                ariaLabel={pl.editor.priceListAddedDaysLabel(label)}
                className="w-12 text-right"
              />
            </label>
          ) : null}
        </div>

        {editing ? (
          <button
            type="button"
            aria-label={pl.editor.removePriceListItem(label)}
            onClick={onRemove}
            className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[var(--doc-ink-soft)] transition-colors hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]"
          >
            <Trash2 className="size-[13px]" aria-hidden />
          </button>
        ) : null}
      </div>

      {editing ? <AddToQuoteBridge item={item} /> : null}
    </li>
  );
}

function PriceRangeFields({
  item,
  label,
  onPatch,
}: {
  item: PriceListItem;
  label: string;
  onPatch: (patch: Partial<PriceListItem>) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 text-[13px]">
      <InlineMoney
        cents={item.priceMinCents}
        onCommit={(priceMinCents) => onPatch({ priceMinCents })}
        ariaLabel={pl.editor.priceListMinLabel(label)}
        className="inline-field w-[84px] text-right"
      />
      <span aria-hidden className="text-[var(--doc-ink-soft)]">
        –
      </span>
      {/*
        Puste pole gornej granicy znaczy „jedna cena", nie „zero". Dlatego
        czyscimy je do `null`, a nie do 0 — 0 zl w cenniku to obietnica,
        ktorej nikt nie chcial zlozyc.
      */}
      <InlineMoney
        cents={item.priceMaxCents ?? item.priceMinCents}
        onCommit={(priceMaxCents) =>
          onPatch({ priceMaxCents: priceMaxCents === item.priceMinCents ? null : priceMaxCents })
        }
        ariaLabel={pl.editor.priceListMaxLabel(label)}
        className="inline-field w-[84px] text-right"
      />
      <InlineText
        value={item.unit}
        onCommit={(unit) => onPatch({ unit })}
        placeholder={pl.editor.priceListUnitPlaceholder}
        ariaLabel={pl.editor.priceListUnitLabel(label)}
        className="inline-field w-[46px] text-[12px] text-[var(--doc-ink-soft)]"
      />
    </div>
  );
}
