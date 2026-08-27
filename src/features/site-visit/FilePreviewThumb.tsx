import { useEffect, useState } from 'react';
import { FileIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { getDownloadUrl } from '@/data/repos/files.repo';
import type { StoredFile } from '@/domain/files/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('site-visit.thumb');

/**
 * Miniatura zdjęcia z wizji.
 *
 * Ciągniemy **podpisany URL**, nie bajty: przeglądarka pobierze obraz sama,
 * a trzymanie kilku megabajtów w base64 tylko po to, żeby pokazać kafelek
 * 120 px, byłoby marnotrawstwem pamięci (ta sama zasada co w
 * `FilePreviewDialog`).
 *
 * Plik, który nie jest obrazem, dostaje ikonę zamiast pustej ramki — do
 * wizji trafiają czasem PDF-y z rzutami od dewelopera.
 */
export function FilePreviewThumb({ file }: { file: StoredFile }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = file.mime.startsWith('image/');

  useEffect(() => {
    if (!isImage) return;

    let cancelled = false;
    void getDownloadUrl(file.storagePath)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((reason: unknown) => {
        log.warn('Miniatura nieudana', { id: file.id, reason });
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [file.id, file.storagePath, isImage]);

  if (!isImage || failed) {
    return (
      <div className="border-hair bg-surface-2 text-ink-soft flex aspect-square items-center justify-center rounded-[var(--radius-control)] border">
        <FileIcon className="size-5" aria-hidden />
      </div>
    );
  }

  if (!url) {
    return <Skeleton className="aspect-square w-full rounded-[var(--radius-control)]" />;
  }

  return (
    <img
      src={url}
      alt={file.name}
      loading="lazy"
      className="border-hair aspect-square w-full rounded-[var(--radius-control)] border object-cover"
    />
  );
}
