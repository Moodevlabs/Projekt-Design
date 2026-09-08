import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ProjectCover } from '../cover/ProjectCover';
import { FilePreviewDialog } from '@/features/files/FilePreviewDialog';
import { useFileOpen } from '@/features/files/useFileOpen';
import { docTypeLabel } from '@/features/files/doc-type-label';
import {
  fileExtension,
  formatBytes,
  isPreviewableImage,
  type StoredFile,
} from '@/domain/files/schema';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/** Ile wierszy — cztery, jak w inspiracji; reszta jest w zakładce „Pliki". */
const LIMIT = 4;

/**
 * „Ostatnie pliki" na zakładce „Przegląd" (T-132).
 *
 * Kliknięcie w obraz otwiera podgląd, w inny plik — systemową przeglądarkę
 * (`useFileOpen`, ta sama droga co „Otwórz" w zakładce „Pliki"). Wygenerowany
 * PDF podpisuje się rodzajem dokumentu („Wycena"), wgrany — rozszerzeniem.
 */
export function RecentFilesCard({
  files,
  loading,
  onShowAll,
}: {
  files: StoredFile[];
  loading: boolean;
  onShowAll: () => void;
}) {
  const open = useFileOpen();
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const recent = [...files]
    .filter((file) => file.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIMIT);

  return (
    <section className="card-surface" aria-label={pl.projects.recentFiles}>
      <div className="flex items-baseline justify-between px-[18px] pt-4 pb-2">
        <h2 className="text-[13px] font-semibold">{pl.projects.recentFiles}</h2>
        {files.length > 0 ? (
          <button
            type="button"
            onClick={onShowAll}
            className="text-ink-soft hover:text-ink text-[12.5px] underline-offset-4 hover:underline"
          >
            {pl.projects.allFiles(files.length)}
          </button>
        ) : null}
      </div>

      {!loading && recent.length === 0 ? (
        <p className="text-ink-soft px-[18px] pb-4 text-[13px]">{pl.projects.recentFilesEmpty}</p>
      ) : (
        <ul className="px-2 pb-2.5">
          {recent.map((file) => {
            const image = isPreviewableImage(file.mime, file.name);
            return (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => (image ? setPreview(file) : void open.open(file))}
                  disabled={open.busy}
                  className="hover:bg-surface-2 focus-visible:ring-ring grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[7px] px-2.5 py-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {image ? (
                    <ProjectCover path={file.storagePath} kind="" alt="" className="size-10" />
                  ) : (
                    <span className="border-hair bg-surface-2 text-ink-soft flex size-10 items-center justify-center rounded-[6px] border">
                      {fileExtension(file.name) ? (
                        <span className="text-[9.5px] font-semibold tracking-[.06em] uppercase">
                          {fileExtension(file.name)}
                        </span>
                      ) : (
                        <FileText className="size-4" aria-hidden />
                      )}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="text-ink block truncate text-[13.5px] font-medium">
                      {file.name}
                    </span>
                    <span className="text-ink-soft block text-xs">
                      {file.kind === 'generated' ? docTypeLabel(file.docType) : pl.files.typeUpload}
                      {' · '}
                      {formatBytes(file.sizeBytes)}
                    </span>
                  </span>
                  <span className="text-ink-faint text-xs whitespace-nowrap tabular-nums">
                    {formatRelativeDay(file.createdAt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
