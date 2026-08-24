import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getDownloadUrl } from '@/data/repos/files.repo';
import type { StoredFile } from '@/domain/files/schema';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('files.preview');

/**
 * Podgląd obrazu w dialogu.
 *
 * Ciągniemy **podpisany URL**, a nie bajty do data URL: przeglądarka i tak
 * pobierze obraz sama, a trzymanie kilku megabajtów w stringu base64 tylko
 * po to, żeby go pokazać, jest marnotrawstwem pamięci. URL żyje minutę —
 * tyle, ile trwa otwarcie okna.
 */
export function FilePreviewDialog({
  file,
  onClose,
}: {
  file: StoredFile | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setUrl(null);
    setError(false);

    void getDownloadUrl(file.storagePath)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((reason: unknown) => {
        log.error('Podglad pliku nieudany', { id: file.id, reason });
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name ?? ''}</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-ink-soft py-8 text-center text-sm">{pl.files.downloadFailed}</p>
        ) : url ? (
          <img
            src={url}
            alt={file?.name ?? ''}
            className="mx-auto max-h-[70vh] w-auto rounded-[var(--radius-control)]"
          />
        ) : (
          <Skeleton className="h-64 w-full rounded-[var(--radius-control)]" />
        )}
      </DialogContent>
    </Dialog>
  );
}
