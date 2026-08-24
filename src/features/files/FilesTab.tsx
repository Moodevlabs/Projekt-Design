import { useRef, useState } from 'react';
import { FileUp, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { FilesTable } from './FilesTable';
import { FilePreviewDialog } from './FilePreviewDialog';
import { useFileUpload } from './useFileUpload';
import { useFiles } from '@/data/queries/useFiles';
import type { StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface FilesTabProps {
  clientId: string;
  /** `null` = zakładka klienta (wszystkie jego pliki). Id = zakładka projektu. */
  projectId?: string | null;
}

/**
 * Zakładka „Pliki" — ta sama u klienta i w projekcie.
 *
 * U klienta pokazuje **wszystkie** jego pliki (także te przypięte do teczek,
 * decyzja D2), w projekcie tylko jego własne. Wrzucone z poziomu projektu
 * dostają `project_id`, więc widać je w obu miejscach.
 */
export function FilesTab({ clientId, projectId = null }: FilesTabProps) {
  const files = useFiles(projectId ? { projectId } : { clientId });
  const upload = useFileUpload({ clientId, projectId });
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const rows = files.data ?? [];

  /**
   * „Dodaj pliki". W Tauri otwiera dialog systemowy; w przeglądarce
   * (`pnpm dev`) wraca `false` i wtedy klikamy ukryty `<input type=file>`.
   */
  const handleAdd = () => {
    void upload.pickFiles().then((handled) => {
      if (!handled) inputRef.current?.click();
    });
  };

  const addButton = (
    <Button onClick={handleAdd} disabled={upload.busy}>
      <Plus className="size-4" aria-hidden />
      {pl.files.add}
    </Button>
  );

  if (files.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.files.loadError}{' '}
          <button
            type="button"
            onClick={() => void files.refetch()}
            className="underline underline-offset-4"
          >
            {pl.common.retry}
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      className="space-y-4"
      // Zdarzenia HTML5 działają w przeglądarce. W Tauri pliki przechwytuje
      // warstwa natywna (`onDragDropEvent` w `useFileUpload`), więc tutaj
      // po prostu nic nie przyjdzie — i nie ma potrzeby tego rozgałęziać.
      onDragOver={(event) => {
        event.preventDefault();
        upload.setDragging(true);
      }}
      onDragLeave={() => upload.setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        upload.setDragging(false);
        if (event.dataTransfer.files.length > 0) {
          void upload.sendBrowserFiles(event.dataTransfer.files);
        }
      }}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed px-5 py-4 transition-colors',
          upload.dragging ? 'border-primary bg-surface-2' : 'border-hair',
        )}
      >
        <div className="flex items-center gap-3">
          <Upload className="text-ink-soft size-5" aria-hidden />
          <div>
            <p className="text-ink text-sm font-medium">
              {upload.progress
                ? pl.files.uploading(upload.progress.done, upload.progress.total)
                : pl.files.dropHere}
            </p>
            <p className="text-ink-soft text-xs">{pl.files.dropHint}</p>
          </div>
        </div>
        {addButton}
      </div>

      {/* Ukryty input to droga przeglądarki — w Tauri nigdy nie zostanie
          kliknięty, bo `pickFiles` obsłuży dialog systemowy wcześniej. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const picked = event.target.files;
          if (picked && picked.length > 0) void upload.sendBrowserFiles(picked);
          // Reset, żeby wybranie tego samego pliku drugi raz znów odpaliło zmianę.
          event.target.value = '';
        }}
      />

      {!files.isLoading && rows.length === 0 ? (
        <EmptyState
          icon={FileUp}
          title={pl.files.emptyTitle}
          description={pl.files.emptyDescription}
          action={addButton}
        />
      ) : (
        <FilesTable
          rows={rows}
          loading={files.isLoading}
          showScope={projectId === null}
          onPreview={setPreview}
        />
      )}

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
