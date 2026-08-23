import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import { InlineText } from './InlineText';
import { SaveIndicator } from './SaveIndicator';
import { StatusMark } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
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
}: {
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
}) {
  return (
    <div className="glass relative z-10 flex h-[68px] shrink-0 items-center gap-4 px-7">
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
          className="tabular w-52 rounded-[var(--radius-control)] px-2 py-1 text-sm font-medium hover:bg-white/60 focus:bg-white/70"
        />
        <StatusMark status={status} />
        <SaveIndicator
          state={saveState}
          lastSavedAt={lastSavedAt}
          onRetry={onRetry}
          onReload={onReload}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-[var(--radius-pill)] border border-white/60 bg-white/45 p-0.5">
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
            <DropdownMenuItem onSelect={onExportPdf} disabled={exportingPdf}>
              {pl.editor.exportPdf}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportSchedule} disabled={exportingSchedule}>
              {pl.pdf.exportSchedule}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportStages} disabled={exportingStages}>
              {pl.pdf.exportStages}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportPriceList} disabled={exportingPriceList}>
              {pl.pdf.exportPriceList}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportPackage}>{pl.pdf.exportPackage}</DropdownMenuItem>
            <DropdownMenuSeparator />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
