import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFiles } from '@/data/queries/useFiles';
import { useFileUpload } from '@/features/files/useFileUpload';
import { FilePreviewThumb } from './FilePreviewThumb';
import { pl } from '@/i18n/pl';

/**
 * Zdjęcia z wizji (T-94, poprawka 10).
 *
 * ## Jeden magazyn plików, nie drugi
 *
 * Zdjęcia idą do tej samej tabeli `files` i tego samego bucketa co reszta
 * plików projektu — dostają tylko wskaźnik `site_visit_id`. Osobny magazyn
 * znaczyłby drugie miejsce liczenia limitu 2 GB i drugi kosz do sprzątania,
 * a zdjęcie ze stanu zastanego jest po prostu plikiem projektu, zrobionym
 * przy konkretnej okazji.
 */
export function SiteVisitPhotos({
  visitId,
  clientId,
  projectId,
}: {
  visitId: string;
  clientId: string;
  projectId: string;
}) {
  const photos = useFiles({ siteVisitId: visitId });
  const upload = useFileUpload({ clientId, projectId, siteVisitId: visitId });
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = photos.data ?? [];

  /**
   * W Tauri otwiera dialog systemowy; w przeglądarce (`pnpm dev`) wraca
   * `false` i wtedy klikamy ukryty `<input type=file>` — ta sama dwudroga
   * co w zakładce „Pliki".
   */
  const handleAdd = () => {
    void upload.pickFiles().then((handled) => {
      if (!handled) inputRef.current?.click();
    });
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label-caps text-ink-soft">{pl.siteVisit.photos}</h3>
        <span className="text-ink-soft text-xs">{pl.siteVisit.photosHint}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.siteVisit.photosEmpty}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
          {rows.map((file) => (
            <li key={file.id}>
              <FilePreviewThumb file={file} />
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        aria-label={pl.siteVisit.addPhotos}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void upload.sendBrowserFiles(event.target.files);
          // Czyścimy, żeby ponowny wybór TEGO SAMEGO pliku znów odpalił zmianę.
          event.target.value = '';
        }}
      />

      <Button type="button" variant="outline" size="sm" disabled={upload.busy} onClick={handleAdd}>
        <ImagePlus className="size-4" aria-hidden />
        {upload.busy ? pl.siteVisit.uploading : pl.siteVisit.addPhotos}
      </Button>
    </section>
  );
}
