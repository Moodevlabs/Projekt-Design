import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBriefTemplate,
  deleteBriefTemplate,
  listBriefTemplates,
  updateBriefTemplate,
  type BriefTemplatePatch,
  type CreateBriefTemplateInput,
} from '@/data/repos/brief-templates.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Szablony briefu (T-96).
 *
 * Bez `refetchInterval`: to konfiguracja pracowni, którą zmienia jedna osoba
 * w jednym miejscu — odpytywanie w tle nie ma tu czego wykryć.
 */
export function useBriefTemplates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.briefTemplates(workspaceId),
    queryFn: listBriefTemplates,
    enabled: Boolean(workspaceId),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  return () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.briefTemplates(workspaceId) });
}

export function useCreateBriefTemplate() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (input: Omit<CreateBriefTemplateInput, 'workspaceId'>) =>
      createBriefTemplate({ ...input, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateBriefTemplate() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BriefTemplatePatch }) =>
      updateBriefTemplate(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteBriefTemplate() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (id: string) => deleteBriefTemplate(id),
    onSuccess: invalidate,
  });
}
