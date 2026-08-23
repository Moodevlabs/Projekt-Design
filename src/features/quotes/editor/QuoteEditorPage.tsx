import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEditorStore } from './editor.store';
import { QuoteDndProvider } from './dnd/QuoteDndProvider';
import { useStableIds } from './dnd/useStableIds';
import { useAutosave } from './useAutosave';
import { EditorTopbar } from './components/EditorTopbar';
import { QuoteHeader } from './components/QuoteHeader';
import { SectionBlock } from './components/SectionBlock';
import { TotalsCard } from './components/TotalsCard';
import { RoomsPanel } from './components/RoomsPanel';
import { DiscountsSection } from './components/DiscountsSection';
import { AddLink } from './components/AddLink';
import { LibrarySheet } from './components/LibrarySheet';
import { useCreateQuote, useQuote } from '@/data/queries/useQuotes';
import { EmptyState } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Item } from '@/domain/quote';
import { useSaveToLibrary } from './useSaveToLibrary';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function QuoteEditorPage() {
  const { id } = useParams<{ id: string }>();

  return id ? <ExistingQuoteEditor quoteId={id} /> : <NewQuoteRedirect />;
}

/** `/wyceny/nowa` zakłada pustą wycenę i od razu przechodzi na jej adres. */
function NewQuoteRedirect() {
  const navigate = useNavigate();
  const create = useCreateQuote();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    create.mutate(
      {},
      {
        onSuccess: (quote) => void navigate(routes.quote(quote.id), { replace: true }),
      },
    );
  }, [create, navigate]);

  if (create.isError) {
    return (
      <div className="p-7">
        <Alert variant="destructive">
          <AlertDescription>{create.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <EditorSkeleton />;
}

function EditorSkeleton() {
  return (
    <div className="p-7">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-6 h-64 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

function ExistingQuoteEditor({ quoteId }: { quoteId: string }) {
  const quote = useQuote(quoteId);
  const { saveNow } = useAutosave();

  const load = useEditorStore((state) => state.load);
  const reset = useEditorStore((state) => state.reset);

  // Wczytujemy do store'u tylko przy zmianie wyceny albo po przeładowaniu
  // z serwera. Bez tego każdy refetch nadpisywałby to, co użytkownik pisze.
  const loadedVersion = useRef<string | null>(null);
  useEffect(() => {
    const data = quote.data;
    if (!data) return;
    const version = `${data.id}:${data.updatedAt}`;
    if (loadedVersion.current === version) return;
    if (loadedVersion.current?.startsWith(`${data.id}:`) && useEditorStore.getState().body) {
      // Ta sama wycena, świeższy serwer — przejmujemy tylko po konflikcie.
      if (!useEditorStore.getState().hasConflict) return;
    }
    loadedVersion.current = version;
    load(data);
  }, [quote.data, load]);

  useEffect(() => () => reset(), [reset]);

  // `⌘/Ctrl+S` wymusza zapis (05-UI §5).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveNow]);

  if (quote.isLoading) return <EditorSkeleton />;

  if (quote.isError) {
    return (
      <div className="p-7">
        <Alert variant="destructive">
          <AlertDescription>{quote.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Uszkodzony `body` z bazy: pokazujemy komunikat, nie biały ekran (02-DATABASE §4).
  if (quote.data?.bodyError) {
    return (
      <div className="p-7">
        <EmptyState
          icon={AlertTriangle}
          title={pl.editor.corruptedTitle}
          description={pl.editor.corruptedDescription}
        />
      </div>
    );
  }

  return (
    <EditorSurface
      createdAt={quote.data?.createdAt ?? new Date().toISOString()}
      onReload={() => void quote.refetch()}
      onRetry={saveNow}
    />
  );
}

function EditorSurface({
  createdAt,
  onReload,
  onRetry,
}: {
  createdAt: string;
  onReload: () => void;
  onRetry: () => void;
}) {
  const { body, mode, number, status, saveState, lastSavedAt } = useEditorStore(
    useShallow((state) => ({
      body: state.body,
      mode: state.mode,
      number: state.number,
      status: state.status,
      saveState: state.saveState,
      lastSavedAt: state.lastSavedAt,
    })),
  );

  // Akcje Zustanda sa stabilne, wiec zmemoizowane sekcje i wiersze nie
  // przerenderuja sie tylko dlatego, ze rodzic dostal nowy `body`.
  const setMode = useEditorStore((state) => state.setMode);
  const setNumber = useEditorStore((state) => state.setNumber);
  const patchHeader = useEditorStore((state) => state.patchHeader);
  const patchClient = useEditorStore((state) => state.patchClient);
  const addSection = useEditorStore((state) => state.addSection);
  const renameSection = useEditorStore((state) => state.renameSection);
  const removeSection = useEditorStore((state) => state.removeSection);
  const addGroup = useEditorStore((state) => state.addGroup);
  const renameGroup = useEditorStore((state) => state.renameGroup);
  const removeGroup = useEditorStore((state) => state.removeGroup);
  const toggleGroup = useEditorStore((state) => state.toggleGroup);
  const addItemAction = useEditorStore((state) => state.addItem);
  const updateItem = useEditorStore((state) => state.updateItem);
  const toggleItem = useEditorStore((state) => state.toggleItem);
  const removeItem = useEditorStore((state) => state.removeItem);
  const insertItems = useEditorStore((state) => state.insertItems);
  const insertGroup = useEditorStore((state) => state.insertGroup);
  const addRoom = useEditorStore((state) => state.addRoom);
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const removeRoom = useEditorStore((state) => state.removeRoom);
  const addDiscount = useEditorStore((state) => state.addDiscount);
  const updateDiscount = useEditorStore((state) => state.updateDiscount);
  const removeDiscount = useEditorStore((state) => state.removeDiscount);
  const toggleDiscount = useEditorStore((state) => state.toggleDiscount);
  const [libraryOpen, setLibraryOpen] = useState(false);

  /**
   * Wstawianie z biblioteki. Wpis oznaczony jako rabat trafia do **listy
   * rabatów**, a nie między pozycje — od T-36 rabat jest osobnym bytem, więc
   * pozycja z `kind: 'discount'` nie miałaby się gdzie narysować.
   */
  const handleInsertItems = useCallback(
    (sectionId: string, groupId: string | null, items: Item[]) => {
      const pozycje = items.filter((item) => item.kind !== 'discount');
      const rabaty = items.filter((item) => item.kind === 'discount');

      if (pozycje.length > 0) insertItems(sectionId, groupId, pozycje);
      for (const rabat of rabaty) {
        addDiscount({
          name: rabat.name,
          description: rabat.description,
          type: 'fixed',
          valueCents: rabat.unitPriceCents,
        });
      }
    },
    [insertItems, addDiscount],
  );

  const sectionIds = useStableIds(body?.sections ?? []);

  /**
   * Zapisy do biblioteki mieszkaja w „useSaveToLibrary” — strona tylko je
   * podaje dalej. Logika ma tam wlasne testy na prawdziwym store.
   */
  const library = useSaveToLibrary();

  if (!body) return <EditorSkeleton />;

  const editing = mode === 'edit';
  const issueDate = body.issueDate ?? createdAt.slice(0, 10);

  return (
    <QuoteDndProvider enabled={editing}>
      <div className="flex h-full min-h-0 flex-col">
        <EditorTopbar
          number={number}
          status={status}
          mode={mode}
          saveState={saveState}
          lastSavedAt={lastSavedAt}
          onNumberChange={setNumber}
          onModeChange={setMode}
          onRetry={onRetry}
          onReload={onReload}
          onSaveAllToLibrary={library.saveAll}
          onOpenLibrary={() => setLibraryOpen(true)}
        />

        <LibrarySheet open={libraryOpen} onOpenChange={setLibraryOpen} />

        {saveState === 'conflict' ? (
          <Alert variant="destructive" className="mx-7 mt-4 w-auto">
            <AlertDescription>{pl.editor.conflict}</AlertDescription>
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid w-full max-w-[1320px] items-start gap-7 px-7 pt-6 pb-14 lg:grid-cols-[1fr_336px]">
            <div className="quote-doc quote-sheet min-w-0 px-10 py-11" data-mode={mode}>
              <QuoteHeader
                body={body}
                editing={editing}
                createdAt={createdAt}
                onPatch={patchHeader}
                onPatchClient={patchClient}
              />

              <div className="mt-10">
                <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                  {body.sections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      editing={editing}
                      currency="PLN"
                      vatRate={body.vatRate}
                      pricesInclude={body.pricesInclude}
                    rooms={body.rooms}
                      onRename={renameSection}
                      onRemove={removeSection}
                      onAddGroup={addGroup}
                      onRenameGroup={renameGroup}
                      onRemoveGroup={removeGroup}
                      onToggleGroup={toggleGroup}
                      onAddItem={addItemAction}
                      onToggleItem={toggleItem}
                      onPatchItem={updateItem}
                      onRemoveItem={removeItem}
                    onInsertItems={handleInsertItems}
                    onInsertGroup={insertGroup}
                    onSaveItemToLibrary={library.saveItem}
                    onSaveGroupToLibrary={library.saveGroup}
                    />
                  ))}
                </SortableContext>

                {editing ? (
                  <AddLink icon={Plus} onClick={addSection} className="text-[13px]">
                    {pl.editor.addSection}
                  </AddLink>
                ) : null}

                {/* Rabaty na końcu dokumentu, jak w arkuszu — i jak w każdej
                    ofercie, gdzie obniżki czyta się po cenach. */}
                <div className="mt-10">
                  <DiscountsSection
                    body={body}
                    currency="PLN"
                    editing={editing}
                    onAdd={addDiscount}
                    onToggle={toggleDiscount}
                    onPatch={updateDiscount}
                    onRemove={removeDiscount}
                  />
                </div>
              </div>

              {body.preparedBy || editing ? (
                <p className="mt-8 text-[12.5px] text-[var(--doc-ink-soft)] italic">
                  {pl.editor.preparedBy}: {body.preparedBy}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-6">
              {/* Nad podsumowaniem, bo to pomieszczenia decydują o kwotach
                  usług liczonych za pomieszczenie. */}
              <RoomsPanel
                rooms={body.rooms}
                editing={editing}
                onAdd={addRoom}
                onPatch={updateRoom}
                onRemove={removeRoom}
              />
              <TotalsCard body={body} currency="PLN" issueDate={issueDate} />
            </div>
          </div>
        </div>
      </div>
    </QuoteDndProvider>
  );
}
