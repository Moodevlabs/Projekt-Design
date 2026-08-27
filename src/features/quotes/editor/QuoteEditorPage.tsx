import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useEditorStore } from './editor.store';
import { QuoteDndProvider } from './dnd/QuoteDndProvider';
import { useStableIds } from './dnd/useStableIds';
import { useAutosave } from './useAutosave';
import { EditorTopbar } from './components/EditorTopbar';
import { ShareDialog } from './components/ShareDialog';
import { VersionHistoryDialog } from './components/VersionHistoryDialog';
import { QuoteHeader } from './components/QuoteHeader';
import { SectionBlock } from './components/SectionBlock';
import { TotalsCard } from './components/TotalsCard';
import { RoomsPanel } from './components/RoomsPanel';
import { ScheduleTab } from './schedule/ScheduleTab';
import { DocumentsTab } from './documents/DocumentsTab';
import { PricingBasisCard } from './components/PricingBasisCard';
import { ClientCard } from './components/ClientCard';
import { DocumentsCard } from './components/DocumentsCard';
import { QuoteFeedback } from '@/features/share/QuoteFeedback';
import { DiscountsSection } from './components/DiscountsSection';
import { AddLink } from './components/AddLink';
import { LibrarySheet } from './components/LibrarySheet';
import { ScopePanel } from './scope/ScopePanel';
import { OverwriteTemplateDialog, SaveAsTemplateDialog } from './components/TemplateDialogs';
import { useCreateQuote, useCreateQuoteVersion, useQuote } from '@/data/queries/useQuotes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { canCreateVersion, quoteBodyFromSettings, versionLabel } from '@/domain/quote';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Item, Room } from '@/domain/quote';

/** Stała referencja — pusta lista nie może przebijać `memo` na wierszach. */
const NO_ROOMS: Room[] = [];
import { useSaveToLibrary } from './useSaveToLibrary';
import { useVariantOptions } from './useVariantOptions';
import { useMarkAsSentPrompt } from './useMarkAsSentPrompt';
import { usePricingBasisChange } from './usePricingBasisChange';
import { useTemplateActions } from './useTemplateActions';
import { useArchiveTarget } from './useArchiveTarget';
import { useExportPdf } from '@/pdf/useExportPdf';
import { useExportSchedulePdf } from '@/pdf/useExportSchedulePdf';
import { useExportStagesPdf } from '@/pdf/useExportStagesPdf';
import { useExportPriceListPdf } from '@/pdf/useExportPriceListPdf';
import { usePackageExport } from '@/pdf/usePackageExport';
import { ExportPackageDialog } from './components/ExportPackageDialog';
import { ReadOnlyBanner } from '@/features/billing/ReadOnlyBanner';
import { useEntitlement } from '@/features/billing/useEntitlement';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export function QuoteEditorPage() {
  const { id } = useParams<{ id: string }>();

  return id ? <ExistingQuoteEditor quoteId={id} /> : <NewQuoteRedirect />;
}

/** `/wyceny/nowa` zakłada pustą wycenę i od razu przechodzi na jej adres. */
function NewQuoteRedirect() {
  const navigate = useNavigate();
  const create = useCreateQuote();
  const workspace = useWorkspace();
  const settings = workspace.data?.settings;
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Czekamy na ustawienia: dokument zakłada się RAZ i bierze z nich kopię,
    // więc utworzenie go przed ich wczytaniem zapisałoby domyślne wartości
    // i nie dałoby się tego już naprawić inaczej niż ręcznie.
    if (started.current || !settings) return;
    started.current = true;

    /*
     * `mutateAsync` i zwykła obietnica, a NIE `onSuccess` z `mutate` ani stan
     * mutacji.
     *
     * TanStack Query wiąże jedno i drugie z obserwatorem hooka, a `StrictMode`
     * w trybie deweloperskim montuje komponent dwa razy (mount → cleanup →
     * mount) i pierwszego obserwatora porzuca. Skutek: wycena POWSTAWAŁA
     * w bazie, ale nikt na nią nie przechodził — użytkownik zostawał na
     * szkielecie, a na liście przybywało pustych dokumentów. W zbudowanej
     * aplikacji tego nie widać, bo StrictMode działa wyłącznie w devie.
     *
     * Obietnica nie zależy od cyklu życia komponentu, więc przekierowanie
     * dochodzi do skutku niezależnie od tego, ile razy React nas przemontuje.
     */
    void create
      .mutateAsync({ body: quoteBodyFromSettings(settings) })
      .then((quote) => navigate(routes.quote(quote.id), { replace: true }))
      .catch((reason: unknown) => {
        // Bez własnego stanu błąd zginąłby razem z porzuconym obserwatorem
        // i użytkownik zostałby na szkielecie bez wyjaśnienia.
        setError(reason instanceof Error ? reason.message : pl.quotes.loadError);
      });
  }, [create, navigate, settings]);

  if (error) {
    return (
      <div className="p-7">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <EditorSkeleton />;
}

/** Zakladka edytora — jeden dokument, rozne widoki na niego. */
function EditorTab({
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
        'relative -mb-px px-3 py-2.5 text-sm transition-colors',
        active
          ? 'text-ink border-b-2 border-[var(--doc-ink)] font-semibold'
          : 'text-ink-soft hover:text-ink border-b-2 border-transparent',
      )}
    >
      {label}
    </button>
  );
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
    const state = useEditorStore.getState();

    /*
     * Pytamy STORE, a nie tylko `loadedVersion`.
     *
     * Ref przeżywa odmontowanie, a store jest wtedy czyszczony (`reset`).
     * W trybie deweloperskim `StrictMode` montuje komponent dwa razy
     * (mount → cleanup → mount), więc po powrocie ref twierdził „ta wersja
     * jest już wczytana", podczas gdy dokument został właśnie skasowany —
     * i edytor zostawał na szkielecie na zawsze. W zbudowanej aplikacji tego
     * nie widać, bo StrictMode działa wyłącznie w devie.
     */
    const wStorze = state.quoteId === data.id && state.body !== null;

    if (wStorze) {
      if (loadedVersion.current === version) return;
      // Ta sama wycena, świeższy serwer — przejmujemy tylko po konflikcie.
      if (loadedVersion.current?.startsWith(`${data.id}:`) && !state.hasConflict) return;
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
      sentAt={quote.data?.sentAt ?? null}
      onReload={() => void quote.refetch()}
      onRetry={saveNow}
    />
  );
}

function EditorSurface({
  createdAt,
  sentAt,
  onReload,
  onRetry,
}: {
  createdAt: string;
  /** `quotes.sent_at` — pierwszy krok ścieżki decyzji klienta (poprawka 7a). */
  sentAt: string | null;
  onReload: () => void;
  onRetry: () => void;
}) {
  const {
    body,
    mode,
    number,
    status,
    saveState,
    lastSavedAt,
    quoteId,
    version,
    lineageId,
    currency,
  } = useEditorStore(
    useShallow((state) => ({
      body: state.body,
      mode: state.mode,
      number: state.number,
      status: state.status,
      saveState: state.saveState,
      lastSavedAt: state.lastSavedAt,
      quoteId: state.quoteId,
      version: state.version,
      lineageId: state.lineageId,
      currency: state.currency,
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
  const setItemVariant = useEditorStore((state) => state.setItemVariant);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const templates = useTemplateActions();
  // Jedno miejsce, z ktorego wszystkie eksporty biora „gdzie zapisac kopie" (T-56).
  const archive = useArchiveTarget();
  const newVersion = useCreateQuoteVersion();
  // Nowa wersja to inny dokument — po jej zalozeniu przechodzimy na nia,
  // zeby edycja nie szla dalej w kopii, ktora wlasnie zostala zastapiona.
  const navigate = useNavigate();
  const workspaceSettings = useWorkspace().data?.settings;
  /*
   * Wersja na SAMYM dokumencie tylko przy wlaczonym `showVersionOnPdf`
   * (domyslnie off) — inwestor nie musi wiedziec, ze to trzecie podejscie.
   * W nazwie pliku wersja jest zawsze i to jest osobna sprawa.
   */
  const pdfVersionLabel =
    workspaceSettings?.showVersionOnPdf && version > 1 ? versionLabel(version) : null;
  const { exportPdf, exporting: exportingPdf } = useExportPdf();
  const { exportSchedule, exporting: exportingSchedule } = useExportSchedulePdf();
  const { exportStages, exporting: exportingStages } = useExportStagesPdf();
  const { exportPriceList, exporting: exportingPriceList } = useExportPriceListPdf();
  const { exportPackage, exporting: exportingPackage } = usePackageExport();
  // Subskrybowane, a nie czytane przez `getState()`: dialog pakietu ma
  // pokazac dokument zalozony przed chwila w sasiedniej zakladce.
  const schedule = useEditorStore((state) => state.schedule);
  const documents = useEditorStore((state) => state.documents);
  const [packageOpen, setPackageOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tab, setTab] = useState<'quote' | 'schedule' | 'documents'>('quote');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [overwriteTemplateOpen, setOverwriteTemplateOpen] = useState(false);

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
          // Rabat bez kwoty nie ma sensu — „wycena indywidualna" dotyczy
          // usług, nie obniżek. Zero to tu jedyna uczciwa wartość domyślna.
          valueCents: rabat.unitPriceCents ?? 0,
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
  const canWrite = useEntitlement().canWrite;
  const variants = useVariantOptions();
  // Stawka z ustawien — wycena kwotowa jej nie ma, a szacunek czasu (F2.3)
  // musi ja skads wziac.
  const workspaceRate = useWorkspace().data?.settings.hourlyRateCents ?? null;
  const markAsSent = useMarkAsSentPrompt();
  const basisChange = usePricingBasisChange();
  /*
   * Dane do placeholderow (F4.2). Rozbite na kawalki, a nie cale `body`:
   * wiersze sa zmemoizowane, a `body` dostaje nowa referencje przy kazdym
   * nacisnieciu klawisza — przekazanie go w dol przerysowywaloby wszystkie
   * pozycje przy kazdej literze.
   */
  // Tryb liczenia (F2.1). `useMemo` na dwoch prostych polach, bo `ItemRow`
  // jest zmemoizowany — nowy obiekt przy kazdym renderze przebijalby `memo`.
  const pricing = useMemo(
    () => ({
      pricingBasis: body?.pricingBasis ?? 'amount',
      hourlyRateCents: body?.hourlyRateCents ?? null,
    }),
    [body?.pricingBasis, body?.hourlyRateCents],
  );
  const textInfo = useMemo(
    () => ({ rooms: body?.rooms ?? NO_ROOMS, client: body?.client.name ?? '' }),
    [body?.rooms, body?.client.name],
  );

  if (!body) return <EditorSkeleton />;

  /**
   * Tryb edycji wymaga prawa zapisu. Sam `mode` nie wystarczy: dostep moze
   * wygasnac przy otwartym edytorze, a wtedy dokument ma sie zamknac na
   * pisanie od razu, a nie dopiero po przeladowaniu strony.
   */
  const editing = mode === 'edit' && canWrite;
  const issueDate = body.issueDate ?? createdAt.slice(0, 10);

  return (
    <QuoteDndProvider enabled={editing}>
      <div className="flex h-full min-h-0 flex-col">
        <EditorTopbar
          number={number}
          status={status}
          mode={editing ? mode : 'preview'}
          saveState={saveState}
          lastSavedAt={lastSavedAt}
          onNumberChange={setNumber}
          onModeChange={setMode}
          canWrite={canWrite}
          onRetry={onRetry}
          onReload={onReload}
          onSaveAllToLibrary={library.saveAll}
          archiveAvailable={archive.available}
          archiveEnabled={archive.enabled}
          onArchiveChange={archive.setEnabled}
          onExportPdf={() =>
            void exportPdf({
              body,
              number,
              issueDate,
              currency,
              onExported: markAsSent.afterExport,
              archive: archive.target,
              version,
              versionLabel: pdfVersionLabel,
            })
          }
          exportingPdf={exportingPdf}
          onExportSchedule={() =>
            void exportSchedule({
              schedule: useEditorStore.getState().schedule,
              rooms: body.rooms,
              number,
              issueDate,
              archive: archive.target,
              version,
            })
          }
          exportingSchedule={exportingSchedule}
          onExportStages={() =>
            void exportStages({
              // Ze store'u, nie z `body` — dokument żyje obok tresci wyceny
              // i moze byc swiezszy niz ostatni zapis.
              doc: useEditorStore.getState().documents?.stages ?? null,
              number,
              issueDate,
              archive: archive.target,
              version,
            })
          }
          exportingStages={exportingStages}
          onExportPriceList={() =>
            void exportPriceList({
              doc: useEditorStore.getState().documents?.priceList ?? null,
              number,
              issueDate,
              archive: archive.target,
              version,
            })
          }
          exportingPriceList={exportingPriceList}
          onExportPackage={() => setPackageOpen(true)}
          onSaveAsTemplate={() => setSaveTemplateOpen(true)}
          onOverwriteTemplate={() => setOverwriteTemplateOpen(true)}
          canOverwriteTemplate={templates.canOverwrite}
          onOpenLibrary={() => setLibraryOpen(true)}
          version={version}
          creatingVersion={newVersion.isPending}
          onNewVersion={
            canCreateVersion(status) && quoteId
              ? () => {
                  newVersion.mutate(quoteId, {
                    onSuccess: (kopia) => {
                      toast.success(pl.quotes.versionCreated(versionLabel(kopia.version)));
                      void navigate(routes.quote(kopia.id));
                    },
                    onError: (error) => toast.error(error.message),
                  });
                }
              : null
          }
          onShare={() => setShareOpen(true)}
          onVersionHistory={version > 1 ? () => setHistoryOpen(true) : null}
        />

        {/*
          Montujemy DOPIERO po otwarciu, a nie trzymamy zamknietego w drzewie:
          zamkniety modal wolalby trzy zapytania (linki, uwagi, akceptacja)
          przy kazdym wejsciu do edytora, a nikt na nie nie patrzy.
        */}
        {quoteId && historyOpen && lineageId ? (
          <VersionHistoryDialog
            lineageId={lineageId}
            currentId={quoteId}
            currency={currency}
            open
            onOpenChange={setHistoryOpen}
          />
        ) : null}

        {quoteId && shareOpen ? (
          <ShareDialog quoteId={quoteId} quoteNumber={number} open onOpenChange={setShareOpen} />
        ) : null}

        <ReadOnlyBanner />

        {/* Pytanie po eksporcie — tylko dla szkicu i tylko raz na sesję. */}
        <ConfirmDialog
          open={markAsSent.open}
          onOpenChange={markAsSent.setOpen}
          title={pl.editor.markAsSentTitle}
          description={pl.editor.markAsSentDescription}
          confirmLabel={pl.editor.markAsSentConfirm}
          cancelLabel={pl.editor.markAsSentDismiss}
          onConfirm={markAsSent.confirm}
        />

        {/* Zmiana trybu w wycenie z pozycjami — liczby zmieniaja znaczenie. */}
        <Dialog
          open={basisChange.pending !== null}
          onOpenChange={(open) => {
            if (!open) basisChange.cancel();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{pl.editor.convertTitle}</DialogTitle>
              <DialogDescription>{basisChange.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={basisChange.cancel}>
                {pl.common.cancel}
              </Button>
              <Button variant="outline" onClick={() => basisChange.resolve(false)}>
                {pl.editor.convertNo}
              </Button>
              {basisChange.canConvert ? (
                <Button onClick={() => basisChange.resolve(true)}>{pl.editor.convertYes}</Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <LibrarySheet open={libraryOpen} onOpenChange={setLibraryOpen} />

        {/* Panel „Dodaj usługi" (T-71) — jeden na wycenę, cel wybierany w środku. */}
        <ScopePanel
          pricing={pricing}
          onInsertItems={handleInsertItems}
          onInsertGroup={insertGroup}
        />

        <ExportPackageDialog
          open={packageOpen}
          onOpenChange={setPackageOpen}
          contents={{
            hasSchedule: schedule !== null,
            hasStages: documents?.stages != null,
            hasPriceList: documents?.priceList != null,
          }}
          exporting={exportingPackage}
          onExport={(selected, single) => {
            setPackageOpen(false);
            void exportPackage({
              selected,
              single,
              body,
              rooms: body.rooms,
              schedule,
              stages: documents?.stages ?? null,
              priceList: documents?.priceList ?? null,
              number,
              issueDate,
              currency,
              archive: archive.target,
            });
          }}
        />

        <SaveAsTemplateDialog
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          defaultName={body.title}
          saving={templates.saving}
          available={templates.available}
          onSave={templates.saveAs}
        />

        <OverwriteTemplateDialog
          open={overwriteTemplateOpen}
          onOpenChange={setOverwriteTemplateOpen}
          templates={templates.templates}
          saving={templates.saving}
          available={templates.available}
          onOverwrite={templates.overwrite}
        />

        {saveState === 'conflict' ? (
          <Alert variant="destructive" className="mx-7 mt-4 w-auto">
            <AlertDescription>{pl.editor.conflict}</AlertDescription>
          </Alert>
        ) : null}

        {/*
          Zakladki (F5.2). Store jest JEDEN na cala wycene, wiec przelaczenie
          nie odmontowuje dokumentu ani nie przerywa autozapisu — zmienia sie
          tylko to, co widac. Harmonogram jedzie z dokumentem w tym samym
          zapisie (patrz `useAutosave`).
        */}
        <div className="border-hair flex items-center gap-1 border-b px-7">
          <EditorTab
            active={tab === 'quote'}
            onSelect={() => setTab('quote')}
            label={pl.editor.tabQuote}
          />
          <EditorTab
            active={tab === 'schedule'}
            onSelect={() => setTab('schedule')}
            label={pl.editor.tabSchedule}
          />
          <EditorTab
            active={tab === 'documents'}
            onSelect={() => setTab('documents')}
            label={pl.editor.tabDocuments}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'schedule' ? <ScheduleTab editing={editing} /> : null}
          {tab === 'documents' ? <DocumentsTab editing={editing} /> : null}
          <div
            className={cn(
              'mx-auto grid w-full max-w-[1320px] items-start gap-7 px-7 pt-6 pb-14 lg:grid-cols-[1fr_336px]',
              tab === 'quote' ? '' : 'hidden',
            )}
          >
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
                      currency={currency}
                      vatRate={body.vatRate}
                      pricesInclude={body.pricesInclude}
                      rooms={body.rooms}
                      textInfo={textInfo}
                      pricing={pricing}
                      variants={variants}
                      onVariantChange={setItemVariant}
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
                    currency={currency}
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
              {/* Tylko w edycji — w podgladzie nie ma czego przelaczac, a stawka
                  godzinowa to liczba wewnetrzna, nie tresc oferty. */}
              {editing ? (
                <PricingBasisCard
                  body={body}
                  onPatch={patchHeader}
                  onBasisChange={basisChange.request}
                />
              ) : null}

              {/* Karta klienta tylko w edycji: przypisanie do kartoteki jest
                  informacja robocza, a nie trescia oferty. W podgladzie liczy
                  sie to, co w naglowku dokumentu. */}
              {editing ? <ClientCard /> : null}

              {/* Archiwum dokumentow — skrot do tego, co juz poszlo do
                  inwestora. Sama karta chowa sie, gdy wycena nie ma klienta. */}
              {/*
                Co wrocilo od klienta — TU, a nie tylko w oknie „Udostepnij".
                Do 2026-08-27 fakt akceptacji byl widoczny wylacznie po
                otwarciu modala; kto nie wiedzial, ze tam jest, nie dowiadywal
                sie o niej wcale. Karta milczy, dopoki nie ma czego pokazac.
              */}
              {quoteId ? <QuoteFeedback quoteId={quoteId} sentAt={sentAt} /> : null}

              {editing ? <DocumentsCard /> : null}

              <RoomsPanel
                rooms={body.rooms}
                editing={editing}
                onAdd={addRoom}
                onPatch={updateRoom}
                onRemove={removeRoom}
              />
              <TotalsCard
                body={body}
                currency={currency}
                issueDate={issueDate}
                hourlyRateCents={workspaceRate}
              />
            </div>
          </div>
        </div>
      </div>
    </QuoteDndProvider>
  );
}
