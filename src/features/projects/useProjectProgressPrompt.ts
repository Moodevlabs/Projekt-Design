import { useCallback } from 'react';
import { toast } from 'sonner';
import { getProject } from '@/data/repos/projects.repo';
import { useSetProjectStatus } from '@/data/queries/useProjects';
import { suggestsInProgress } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

/**
 * Po akceptacji wyceny **proponujemy** przestawienie projektu na „W realizacji".
 *
 * Propozycja, nie automat (koncepcja §2 reguła 3): status teczki należy do
 * człowieka. Zaakceptowana oferta zwykle znaczy start prac — ale bywa, że
 * klient akceptuje w grudniu, a robota rusza w marcu, i wtedy automat
 * kłamałby na liście projektów.
 *
 * Toast z akcją, a nie dialog: przerywanie modalem czynności, która właśnie
 * się udała, jest karą za sukces. Zignorowanie propozycji nie kosztuje nic.
 */
export function useProjectProgressPrompt() {
  const setStatus = useSetProjectStatus();

  const promptFor = useCallback(
    async (projectId: string | null) => {
      if (!projectId) return;

      let project;
      try {
        project = await getProject(projectId);
      } catch {
        // Nie udało się sprawdzić teczki — to nie powód, żeby psuć komunikat
        // o zaakceptowanej wycenie. Po prostu nie proponujemy.
        return;
      }

      if (!suggestsInProgress(project.status)) return;

      toast(pl.projects.suggestInProgress(project.name), {
        action: {
          label: pl.projects.suggestInProgressAction,
          onClick: () => {
            setStatus.mutate(
              { id: project.id, status: 'in_progress' },
              {
                onSuccess: () => toast.success(pl.projects.statusChanged),
                onError: (error) => toast.error(error.message),
              },
            );
          },
        },
      });
    },
    [setStatus],
  );

  return { promptFor };
}
