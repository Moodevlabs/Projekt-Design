import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectCover } from '../cover/ProjectCover';
import { SetCoverDialog } from './SetCoverDialog';
import { FilePreviewDialog } from '@/features/files/FilePreviewDialog';
import { useFileUpload } from '@/features/files/useFileUpload';
import { resolveCover, projectImages } from '@/domain/project/cover';
import type { StoredFile } from '@/domain/files/schema';
import type { ProjectOverview } from '@/domain/project/schema';
import { kindLabel } from '../kind-label';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Ile miniatur pod kadrem — trzy, jak w inspiracji; reszta jest w „Pliki". */
const THUMBS = 3;

/**
 * Galeria na zakładce „Przegląd" (T-132): kadr + miniatury + „Dodaj zdjęcie".
 *
 * Kadr bierze `resolveCover` — tę samą regułę, którą widok liczy do listy
 * (wybrany plik → najnowszy obraz → placeholder), więc karta i tabela
 * pokazują ten sam obraz. Podpis pod kadrem mówi, skąd on jest: „wybrane
 * ręcznie", „najnowszy obraz" albo „placeholder „Dom"" — bez tego człowiek
 * nie wie, czy to jego zdjęcie, czy nasz rysunek.
 *
 * „Dodaj zdjęcie" wgrywa do plików PROJEKTU tą samą drogą co zakładka
 * „Pliki" (`useFileUpload`): dialog systemowy w Tauri, `<input>` w
 * przeglądarce. Nowy obraz staje się okładką sam, bo jest najnowszy.
 */
export function ProjectGallery({
  project,
  files,
}: {
  project: ProjectOverview;
  files: StoredFile[];
}) {
  const cover = resolveCover(project.coverFileId, files);
  const images = projectImages(files);
  const upload = useFileUpload({ clientId: project.clientId, projectId: project.id });
  const inputRef = useRef<HTMLInputElement>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const handleAdd = () => {
    void upload.pickFiles().then((handled) => {
      if (!handled) inputRef.current?.click();
    });
  };

  const sourceLabel =
    cover.source === 'chosen'
      ? pl.projects.coverChosenTag
      : cover.source === 'auto'
        ? pl.projects.coverAutoTag
        : pl.projects.coverPlaceholderTag(kindLabel(project.kind || 'other'));

  return (
    <section className="card-surface grid gap-2.5 p-2.5" aria-label={pl.projects.gallery}>
      <div className="relative">
        <ProjectCover
          path={cover.file?.storagePath ?? null}
          kind={project.kind}
          alt={project.name}
          className="aspect-[16/10] w-full rounded-[7px]"
        />
        <span className="bg-surface/90 border-hair text-ink-soft absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1 text-xs">
          {cover.source === 'placeholder' ? <span>{pl.projects.coverNoPhoto} —</span> : null}
          <span className="text-ink">{sourceLabel}</span>
        </span>
        {images.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-surface/90 absolute top-3 right-3"
            onClick={() => setCoverOpen(true)}
          >
            {pl.projects.setCover}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {images.slice(0, THUMBS).map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => setPreview(file)}
            aria-label={`${pl.files.previewAction}: ${file.name}`}
            className="focus-visible:ring-ring rounded-[7px] focus-visible:ring-2 focus-visible:outline-none"
          >
            <ProjectCover
              path={file.storagePath}
              kind={project.kind}
              alt={file.name}
              className="aspect-[4/3] w-full rounded-[7px]"
            />
          </button>
        ))}
        {images.length < THUMBS ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={upload.busy}
            className={cn(
              'border-hair-strong text-ink-soft hover:text-ink hover:bg-surface-2 flex aspect-[4/3] items-center justify-center gap-1.5 rounded-[7px] border border-dashed text-[12.5px] transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
            )}
          >
            <ImagePlus className="size-4" aria-hidden />
            {upload.busy ? pl.common.loading : pl.projects.addPhoto}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={pl.projects.addPhoto}
        onChange={(event) => {
          if (event.target.files) void upload.sendBrowserFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <SetCoverDialog
        open={coverOpen}
        onOpenChange={setCoverOpen}
        project={project}
        images={images}
        current={cover}
      />
      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
