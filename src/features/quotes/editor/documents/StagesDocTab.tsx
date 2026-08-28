import { useEffect, useState, type ReactNode } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { InlineText } from '../components/InlineText';
import { NumberField } from '../components/NumberField';
import { AddLink } from '../components/AddLink';
import { SaveToLibraryButton } from '../components/SaveToLibraryButton';
import { Button } from '@/components/ui/button';
import { DocLibraryPanel } from './DocLibraryPanel';
import { useSaveDocToLibrary } from './useSaveDocToLibrary';
import { useEditorStore } from '../editor.store';
import { useStageEntryAutoSync } from './useStageEntryAutoSync';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { groupStageEntries, type StageEntry } from '@/domain/documents';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Zakładka „Dokumenty → Etapy współpracy" (F6.1).
 *
 * Dokument mówi klientowi, **co wchodzi w zakres i czego w nim nie ma**.
 * Dlatego etapy nieobjęte zostają na liście z krzyżykiem, zamiast z niej
 * znikać: „nie robimy nadzoru" trzeba powiedzieć przed podpisaniem umowy,
 * a nie w połowie budowy.
 */
/** Stala referencja — patrz `ScheduleTab`. */
const EMPTY_TEMPLATE: never[] = [];

export function StagesDocTab({
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
  const { doc } = useEditorStore(useShallow((state) => ({ doc: state.documents?.stages ?? null })));

  const ensureStagesDoc = useEditorStore((state) => state.ensureStagesDoc);
  const patchStagesDoc = useEditorStore((state) => state.patchStagesDoc);
  const updateEntry = useEditorStore((state) => state.updateStageEntry);
  const addEntry = useEditorStore((state) => state.addStageEntry);
  const removeEntry = useEditorStore((state) => state.removeStageEntry);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const saveToLibrary = useSaveDocToLibrary('stages');
  const workspaceTemplate = useWorkspace().data?.settings.stagesTemplate ?? null;
  const template = startEmpty ? EMPTY_TEMPLATE : workspaceTemplate;

  useStageEntryAutoSync(editing);

  useEffect(() => {
    // Zakładamy dopiero przy pierwszym wejściu i tylko w edycji — samo
    // obejrzenie oferty nie ma prawa dopisać jej dokumentu ani zabrudzić
    // autozapisu (ta sama zasada co przy harmonogramie).
    if (editing) ensureStagesDoc(template);
  }, [editing, ensureStagesDoc, template]);

  if (!doc) {
    return <p className="text-ink-soft p-7 text-sm">{pl.editor.stagesDocEmpty}</p>;
  }

  const objete = doc.entries.filter((entry) => entry.included).length;

  return (
    <div
      className={cn(
        'mx-auto w-full px-7 pt-6 pb-14',
        aside ? 'grid max-w-[1320px] items-start gap-7 lg:grid-cols-[1fr_336px]' : 'max-w-[900px]',
      )}
    >
      <div className="quote-doc quote-sheet min-w-0 px-10 py-9">
        <h2 className="text-[22px] font-normal tracking-[-0.01em] uppercase">
          {pl.editor.stagesDocTitle}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--doc-ink-soft)]">
          {pl.editor.stagesDocIntro(objete, doc.entries.length)}
        </p>

        {editing ? (
          <label className="mt-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-[var(--doc-sage)] uppercase">
            {pl.editor.stagesDocValidDays}
            <NumberField
              value={doc.validDays}
              onCommit={(validDays) => patchStagesDoc({ validDays })}
              min={0}
              ariaLabel={pl.editor.stagesDocValidDays}
              className="w-16 text-[14px] font-normal normal-case"
            />
          </label>
        ) : null}

        {groupStageEntries(doc.entries).map((group) => (
          <section key={group.label || '—'} className="mt-7">
            {group.label ? (
              <h3 className="border-b border-[var(--doc-ink)] pb-1.5 text-[12px] font-bold tracking-[0.08em] uppercase">
                {group.label}
              </h3>
            ) : null}

            <ul className="flex flex-col">
              {group.entries.map((entry) => (
                <StageEntryRow
                  key={entry.id}
                  entry={entry}
                  editing={editing}
                  onPatch={(patch) => updateEntry(entry.id, patch)}
                  onRemove={() => removeEntry(entry.id)}
                  onSaveToLibrary={() => saveToLibrary(entry)}
                />
              ))}
            </ul>
          </section>
        ))}

        {/* Dwa wejscia, jak w wycenie (T-71): biblioteka albo pusty wiersz. */}
        {editing ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setLibraryOpen(true)}>
              <Plus className="size-3.5" aria-hidden />
              {pl.editor.docLibrary.open}
            </Button>
            <AddLink icon={Plus} onClick={() => addEntry()} className="text-[13px]">
              {pl.editor.docLibrary.manual.stages}
            </AddLink>
          </div>
        ) : null}

        <DocLibraryPanel
          kind="stages"
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          // Etap wybrany z biblioteki wchodzi OBJETY zakresem. Szablon trzyma
          // `included: false` (lista-propozycja), ale swiadome dodanie jednego
          // etapu to decyzja — jak `enabled` w terminie (T-108).
          onInsert={(payload) => addEntry({ ...payload, included: true })}
        />

        {editing || doc.footnote ? (
          <div className="mt-8 border-t border-[var(--doc-hair)] pt-3">
            <InlineText
              value={doc.footnote}
              onCommit={(footnote) => patchStagesDoc({ footnote })}
              readOnly={!editing}
              multiline
              placeholder={pl.editor.stagesDocFootnotePlaceholder}
              ariaLabel={pl.editor.stagesDocFootnote}
              className="inline-field text-[12.5px] leading-[1.55] text-[var(--doc-ink-soft)]"
            />
          </div>
        ) : null}
      </div>

      {aside ? <div className="flex flex-col gap-4 lg:sticky lg:top-6">{aside}</div> : null}
    </div>
  );
}

function StageEntryRow({
  entry,
  editing,
  onPatch,
  onRemove,
  onSaveToLibrary,
}: {
  entry: StageEntry;
  editing: boolean;
  onPatch: (patch: Partial<StageEntry>) => void;
  onRemove: () => void;
  onSaveToLibrary: () => void;
}) {
  const label = entry.name || pl.editor.newStageEntryName;

  return (
    <li className="flex items-start gap-3 border-b border-[var(--doc-hair)] py-2.5 last:border-b-0">
      <button
        type="button"
        disabled={!editing}
        aria-pressed={entry.included}
        aria-label={pl.editor.stageEntryIncluded(label)}
        onClick={() => onPatch({ included: !entry.included })}
        className={cn(
          'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors',
          entry.included
            ? 'bg-[var(--doc-sage)] text-white'
            : 'border border-[var(--doc-hair-strong)] text-[var(--doc-ink-soft)]',
          !editing && 'cursor-default',
        )}
      >
        {entry.included ? (
          <Check className="size-3" aria-hidden />
        ) : (
          <X className="size-3" aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <InlineText
          value={entry.name}
          onCommit={(name) => onPatch({ name })}
          readOnly={!editing}
          placeholder={pl.editor.newStageEntryName}
          ariaLabel={pl.editor.stageEntryNameLabel(label)}
          className={cn(
            'inline-field text-[14px] font-semibold',
            // Etap nieobjęty NIE jest przekreślony ani wyszarzony do
            // nieczytelności — klient ma go przeczytać, żeby wiedzieć,
            // czego nie zamawia. Zmienia się sam kolor.
            entry.included ? 'text-[var(--doc-ink)]' : 'text-[var(--doc-ink-soft)]',
          )}
        />
        {editing || entry.description ? (
          <InlineText
            value={entry.description}
            onCommit={(description) => onPatch({ description })}
            readOnly={!editing}
            multiline
            placeholder={pl.editor.stageEntryDescriptionPlaceholder}
            ariaLabel={pl.editor.stageEntryDescriptionLabel(label)}
            className="inline-field text-[12.5px] leading-[1.55] text-[var(--doc-ink-soft)]"
          />
        ) : null}
      </div>

      {editing ? (
        <SaveToLibraryButton
          label={pl.editor.docLibrary.saveRow(label)}
          savedLabel={pl.editor.docLibrary.savedRow(label)}
          disabled={entry.name.trim().length === 0}
          onSave={onSaveToLibrary}
        />
      ) : null}

      {editing ? (
        <button
          type="button"
          aria-label={pl.editor.removeStageEntry(label)}
          onClick={onRemove}
          className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[var(--doc-ink-soft)] transition-colors hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]"
        >
          <Trash2 className="size-[13px]" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}
