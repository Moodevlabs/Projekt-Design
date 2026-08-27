import { useQuery } from '@tanstack/react-query';

import { listWorkspaceActivity } from '@/data/repos/activity.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/** Co ile pulpit sam sprawdza, czy klient coś zrobił. */
const REFRESH_MS = 60_000;

/**
 * Pasek „na bieżąco" (poprawka 6, 2026-08-27).
 *
 * Odświeża się sam co minutę i przy powrocie do okna. To jedyne miejsce
 * w aplikacji, gdzie odpytywanie w tle jest uzasadnione: pulpit stoi otwarty
 * godzinami, a jego jedynym zadaniem jest powiedzieć, że coś się zmieniło.
 */
export function useActivity(limit = 8) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: [...queryKeys.workspace, 'activity', limit],
    queryFn: () => listWorkspaceActivity(requireWorkspaceId(workspaceId), limit),
    enabled: Boolean(workspaceId),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
