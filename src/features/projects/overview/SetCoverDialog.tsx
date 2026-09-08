import { toast } from 'sonner';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectCover } from '../cover/ProjectCover';
import { useSetProjectCover } from '@/data/queries/useProjects';
import type { StoredFile } from '@/domain/files/schema';
import type { CoverSource } from '@/domain/project/cover';
import type { ProjectOverview } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * „Ustaw zdjęcie" (T-132): wybór okładki z obrazów projektu.
 *
 * Pierwszy kafel to **„Automatycznie"** — powrót do reguły „najnowszy
 * obraz". Bez niego ręczny wybór byłby drogą w jedną stronę: po wgraniu
 * lepszej wizualizacji okładka zostawałaby przy starym zdjęciu i nikt nie
 * wiedziałby, dlaczego.
 */
export function SetCoverDialog({
  open,
  onOpenChange,
  project,
  images,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectOverview;
  images: StoredFile[];
  current: { file: StoredFile | null; source: CoverSource };
}) {
  const setCover = useSetProjectCover();

  const choose = (coverFileId: string | null) => {
    setCover.mutate(
      { id: project.id, coverFileId },
      {
        onSuccess: () => {
          toast.success(pl.projects.coverSaved);
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const autoActive = current.source !== 'chosen';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pl.projects.coverDialogTitle}</DialogTitle>
          <DialogDescription>{pl.projects.coverDialogHint}</DialogDescription>
        </DialogHeader>

        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label={pl.projects.coverDialogTitle}
        >
          <li>
            <CoverOption
              active={autoActive}
              onClick={() => choose(null)}
              disabled={setCover.isPending}
            >
              <div className="bg-surface-2 text-ink-soft flex aspect-[4/3] items-center justify-center rounded-[7px] px-3 text-center text-xs">
                {pl.projects.coverAuto}
              </div>
            </CoverOption>
          </li>
          {images.map((file) => (
            <li key={file.id}>
              <CoverOption
                active={current.source === 'chosen' && current.file?.id === file.id}
                onClick={() => choose(file.id)}
                disabled={setCover.isPending}
                label={file.name}
              >
                <ProjectCover
                  path={file.storagePath}
                  kind={project.kind}
                  alt={file.name}
                  className="aspect-[4/3] w-full rounded-[7px]"
                />
              </CoverOption>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function CoverOption({
  active,
  onClick,
  disabled,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'focus-visible:ring-ring relative block w-full rounded-[9px] p-[3px] text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
        active ? 'ring-ink ring-2' : 'hover:bg-surface-2',
      )}
    >
      {children}
      {active ? (
        <span className="bg-ink text-beige absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full">
          <Check className="size-3.5" aria-hidden />
        </span>
      ) : null}
      {label ? (
        <span className="text-ink-soft mt-1 block truncate px-1 text-xs">{label}</span>
      ) : null}
    </button>
  );
}
