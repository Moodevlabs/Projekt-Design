import { useRef, type DragEvent } from 'react';
import { FileText, Upload } from 'lucide-react';

import { AI_FILE_ACCEPT, AI_TEXT_MAX_CHARS } from '@/lib/ai-file-source';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import type { useSourceFile } from './useSourceFile';

type SourceFile = ReturnType<typeof useSourceFile>;

/**
 * Strefa upuszczania pliku — jedna dla obu dróg wejścia.
 *
 * W przeglądarce obsługuje zdarzenia HTML5 sama; w Tauri upuszczenie
 * przechwytuje okno (`useSourceFile`), a strefa tylko pokazuje stan
 * `dragging`, który stamtąd przychodzi. Ukryty `<input>` to droga
 * „wybierz z dysku" poza Tauri.
 */
export function DropZone({ file, disabled }: { file: SourceFile; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async () => {
    if (disabled) return;
    const handled = await file.pick();
    if (!handled) inputRef.current?.click();
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    file.setDragging(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 0) void file.acceptBrowserFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!file.dragging) file.setDragging(true);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={`${pl.ai.import.dropHint} ${pl.ai.import.pickFile}`}
        onClick={() => void pick()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void pick();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => file.setDragging(false)}
        className={cn(
          'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed px-6 py-8 text-center',
          'transition-[border-color,background-color,transform] duration-200 ease-out',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
          file.dragging
            ? 'border-brown bg-surface-2 scale-[1.01]'
            : 'border-hair-strong bg-surface hover:bg-surface-2',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {file.fileName ? (
          <>
            <FileText className="text-ink-soft size-6" aria-hidden />
            <p className="text-ink text-sm font-medium">{pl.ai.import.fileRead(file.fileName)}</p>
            <span className="text-ink-soft text-xs underline underline-offset-4">
              {pl.ai.import.changeFile}
            </span>
          </>
        ) : (
          <>
            <Upload className="text-ink-soft size-6" aria-hidden />
            <p className="text-ink-soft text-sm">
              {file.reading ? (
                pl.ai.import.readingFile
              ) : (
                <>
                  {pl.ai.import.dropHint}{' '}
                  <span className="text-ink font-medium underline underline-offset-4">
                    {pl.ai.import.pickFile}
                  </span>
                </>
              )}
            </p>
            <p className="text-ink-faint text-xs">{pl.ai.import.formats}</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AI_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          if (event.target.files?.length) void file.acceptBrowserFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {file.error ? (
        <p role="alert" className="text-danger text-sm">
          {file.error.code === 'docx'
            ? pl.ai.import.docxHint
            : file.error.code === 'too_large'
              ? pl.ai.import.tooLarge
              : file.error.code === 'too_long'
                ? pl.ai.import.tooLong(file.error.chars ?? 0, AI_TEXT_MAX_CHARS)
                : file.error.code === 'read_failed'
                  ? pl.errors.generic
                  : pl.ai.import.unsupported(file.error.ext || '?')}
        </p>
      ) : null}
    </div>
  );
}
