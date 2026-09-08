import { useFiles } from '@/data/queries/useFiles';
import type { ProjectOverview } from '@/domain/project/schema';
import { ProjectGallery } from './ProjectGallery';
import { RecentFilesCard } from './RecentFilesCard';
import { ProjectSummaryCard } from './ProjectSummaryCard';

/**
 * Zakładka „Przegląd" (T-132) — pierwsze, co widać po wejściu w projekt.
 *
 * Układ z inspiracji: kadr z miniaturami po lewej, „Ostatnie pliki"
 * i „W skrócie" po prawej. Jedno zapytanie o pliki projektu karmi wszystkie
 * trzy karty — galeria i lista plików liczą z tej samej listy, więc nie ma
 * jak pokazać innej okładki niż ta, która jest „najnowsza" na liście.
 */
export function ProjectOverviewTab({
  project,
  onShowFiles,
}: {
  project: ProjectOverview;
  /** „Wszystkie ›" w „Ostatnich plikach" przełącza na zakładkę „Pliki". */
  onShowFiles: () => void;
}) {
  const files = useFiles({ projectId: project.id });
  const rows = files.data ?? [];

  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <ProjectGallery project={project} files={rows} />
      <div className="grid gap-[18px]">
        <RecentFilesCard files={rows} loading={files.isLoading} onShowAll={onShowFiles} />
        <ProjectSummaryCard project={project} />
      </div>
    </div>
  );
}
