import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Share2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { SaveIndicator } from './SaveIndicator';
import { StatusMark } from '@/components/shared';
import { showsVersion, versionLabel, type DocKind } from '@/domain/quote';
import { hasQuoteSurface } from '@/domain/documents';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EditorMode, SaveState } from '../editor.store';
import type { QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export function EditorTopbar({
  docKind,
  title,
  onTitleChange,
  number,
  status,
  mode,
  saveState,
  lastSavedAt,
  onNumberChange,
  onModeChange,
  canWrite = true,
  onRetry,
  onReload,
  onSaveAllToLibrary,
  onExportPdf,
  exportingPdf,
  archiveAvailable,
  archiveEnabled,
  onArchiveChange,
  onExportSchedule,
  exportingSchedule,
  onExportStages,
  exportingStages,
  onExportPriceList,
  exportingPriceList,
  onExportPackage,
  onSaveAsTemplate,
  onOverwriteTemplate,
  canOverwriteTemplate,
  onOpenLibrary,
  version,
  onNewVersion,
  creatingVersion,
  onShare,
  onVersionHistory,
}: {
  /** Rodzaj dokumentu (T-101) — decyduje, ktore akcje maja sens. */
  docKind: DocKind;
  /** Tytul dokumentu — edytowany tu tylko, gdy nie ma naglowka wyceny. */
  title: string;
  onTitleChange: (next: string) => void;
  number: string | null;
  status: QuoteStatus;
  mode: EditorMode;
  saveState: SaveState;
  lastSavedAt: string | null;
  onNumberChange: (next: string) => void;
  onModeChange: (next: EditorMode) => void;
  /** Bez prawa zapisu przelacznik „Edycja” jest martwy — patrz nizej. */
  canWrite?: boolean;
  onRetry: () => void;
  onReload: () => void;
  onSaveAllToLibrary: () => void;
  onExportPdf: () => void;
  exportingPdf: boolean;
  /** Widoczne tylko, gdy wycena ma klienta — bez niego nie ma archiwum (T-56). */
  archiveAvailable: boolean;
  archiveEnabled: boolean;
  onArchiveChange: (next: boolean) => void;
  /** Osobny dokument „Szacowany termin" (F5.3). */
  onExportSchedule: () => void;
  exportingSchedule: boolean;
  /** Osobny dokument „Etapy współpracy” (F6.1). */
  onExportStages: () => void;
  exportingStages: boolean;
  /** Osobny dokument „Cennik usług dodatkowych” (F6.2). */
  onExportPriceList: () => void;
  exportingPriceList: boolean;
  /** Pakiet dokumentów (F6.3) — otwiera dialog wyboru. */
  onExportPackage: () => void;
  onSaveAsTemplate: () => void;
  onOverwriteTemplate: () => void;
  /** Bez szablonów nie ma czego nadpisywać — pozycja menu znika. */
  canOverwriteTemplate: boolean;
  onOpenLibrary: () => void;
  /** Numer wersji (T-57). Badge pojawia sie dopiero od v2. */
  version: number;
  /** `null` = tej wyceny nie da sie wersjonowac (jest juz archiwalna). */
  onNewVersion: (() => void) | null;
  creatingVersion: boolean;
  /** Link dla klienta (T-25). Osobny przycisk, nie pozycja w menu — patrz nizej. */
  onShare: () => void;
  /** Historia wersji (T-22). `null` = wycena ma jedna wersje, nie ma czego porownywac. */
  onVersionHistory: (() => void) | null;
}) {
  const isOffer = hasQuoteSurface(docKind);

  return (
    <div className="surface-band relative z-10 flex h-[68px] shrink-0 items-center gap-4 px-7">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={routes.quotes}>
          <ArrowLeft className="size-4" aria-hidden />
          {pl.editor.backToList}
        </Link>
      </Button>

      <div className="flex min-w-0 items-center gap-3">
        <InlineText
          value={number ?? ''}
          onCommit={onNumberChange}
          placeholder={pl.quotes.noNumber}
          ariaLabel={pl.quotes.number}
          className="tabular hover:bg-surface focus:bg-surface w-52 rounded-[var(--radius-control)] px-2 py-1 text-sm font-medium"
        />
        {/* Wersja przy numerze, jak w 05-UI §3: `WYC/2026/08/0012 · v2`.
            Dopiero od v2 — „· v1" przy każdej wycenie byłby szumem. */}
        {showsVersion(version) ? (
          <span className="text-ink-soft text-sm whitespace-nowrap">{versionLabel(version)}</span>
        ) : null}
        {/* Termin, etapy i cennik nie maja naglowka z tytulem na arkuszu —
            tytul (to, co widac w rejestrze) edytuje sie tutaj. */}
        {isOffer ? null : (
          <InlineText
            value={title}
            onCommit={onTitleChange}
            placeholder={pl.editor.titlePlaceholder}
            ariaLabel={pl.quotes.quoteTitle}
            className="hover:bg-surface focus:bg-surface w-56 rounded-[var(--radius-control)] px-2 py-1 text-sm"
          />
        )}
        <StatusMark status={status} />
        <SaveIndicator
          state={saveState}
          lastSavedAt={lastSavedAt}
          onRetry={onRetry}
          onReload={onReload}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/*
          „Udostepnij" stoi OBOK menu, a nie w nim. Od T-25 to jest glowna
          droga wyslania oferty do inwestora — schowanie jej pod trzema
          kropkami obok „Nadpisz szablon" mowilby, ze to czynnosc rzadka.
        */}
        {/* Strona klienta czyta wycene — dokumentu innego rodzaju nie ma jak
            tam pokazac, wiec przycisk znika, a nie prowadzi do pustej strony. */}
        {isOffer ? (
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="size-4" aria-hidden />
            {pl.share.action}
          </Button>
        ) : null}

        <div className="border-hair-strong bg-surface flex items-center rounded-[var(--radius-control)] border p-0.5">
          {(['edit', 'preview'] as const).map((value) => {
            const Icon = value === 'edit' ? Pencil : Eye;
            const label = value === 'edit' ? pl.editor.edit : pl.editor.preview;
            // Po wygasnieciu dostepu wlaczenie edycji tylko by skusilo do
            // pisania w dokument, ktorego i tak nie da sie zapisac.
            const locked = value === 'edit' && !canWrite;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={locked}
                title={locked ? pl.billing.readOnlyEditHint : undefined}
                onClick={() => onModeChange(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
                  locked && 'cursor-not-allowed opacity-45',
                  mode === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-ink-soft hover:text-ink',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={pl.common.more} className="size-9">
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/*
              Checkbox nad listą eksportów, a nie osobny dialog przed każdym:
              zapis do archiwum jest domyślny i rzadko się go wyłącza, więc
              modal przed jednoklikową akcją byłby karą za normalne użycie.
              Bez klienta nie ma go wcale — zasada z 05-UI §3a.8.
            */}
            {archiveAvailable ? (
              <>
                <DropdownMenuCheckboxItem
                  checked={archiveEnabled}
                  onCheckedChange={onArchiveChange}
                  onSelect={(event) => event.preventDefault()}
                >
                  {pl.documents.saveToClient}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            {/*
              Eksport pokazuje tylko to, czym dokument JEST (T-101). Menu
              „eksportuj termin" w dokumencie, ktory jest cennikiem, dawaloby
              pusty PDF i pytanie „gdzie sie podzialy moje dane".
            */}
            {isOffer ? (
              <DropdownMenuItem onSelect={onExportPdf} disabled={exportingPdf}>
                {pl.editor.exportPdf}
              </DropdownMenuItem>
            ) : null}
            {docKind === 'offer' || docKind === 'schedule' ? (
              <DropdownMenuItem onSelect={onExportSchedule} disabled={exportingSchedule}>
                {pl.pdf.exportSchedule}
              </DropdownMenuItem>
            ) : null}
            {docKind === 'offer' || docKind === 'stages' ? (
              <DropdownMenuItem onSelect={onExportStages} disabled={exportingStages}>
                {pl.pdf.exportStages}
              </DropdownMenuItem>
            ) : null}
            {docKind === 'offer' || docKind === 'price_list' ? (
              <DropdownMenuItem onSelect={onExportPriceList} disabled={exportingPriceList}>
                {pl.pdf.exportPriceList}
              </DropdownMenuItem>
            ) : null}
            {isOffer ? (
              <>
                <DropdownMenuItem onSelect={onExportPackage}>
                  {pl.pdf.exportPackage}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* „Nowa wersja" kontynuuje TĘ SAMĄ linię (koncepcja §4 reguła 1);
                    „Duplikuj" z listy zakłada nową. Archiwalnej nie wersjonujemy —
                    linia poszła dalej i powstałyby dwie „najnowsze". */}
                {onNewVersion ? (
                  <DropdownMenuItem
                    disabled={creatingVersion}
                    title={pl.quotes.newVersionHint}
                    onSelect={onNewVersion}
                  >
                    {pl.quotes.newVersion}
                  </DropdownMenuItem>
                ) : null}
                {/* Znika przy jednej wersji: pozycja menu, ktora zawsze prowadzi
                    do „nie ma czego porownywac", jest gorsza niz jej brak. */}
                {onVersionHistory ? (
                  <DropdownMenuItem onSelect={onVersionHistory}>
                    {pl.versions.open}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={onOpenLibrary}>{pl.library.title}</DropdownMenuItem>
                <DropdownMenuItem onSelect={onSaveAllToLibrary}>
                  {pl.editor.saveAllToLibrary}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onSaveAsTemplate}>
                  {pl.templates.saveAsTemplate}
                </DropdownMenuItem>
                {canOverwriteTemplate ? (
                  <DropdownMenuItem onSelect={onOverwriteTemplate}>
                    {pl.templates.overwrite}
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
