import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBrandKit, updateBrandKit, type BrandKitPatch } from '@/data/repos/brand.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';
import type { BrandKit } from '@/domain/brand/schema';

export function useBrandKit() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.brandKit,
    queryFn: () => getBrandKit(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdateBrandKit() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (patch: BrandKitPatch) => updateBrandKit(requireWorkspaceId(workspaceId), patch),
    onSuccess: (brandKit) => {
      // Podgląd PDF w ustawieniach brandingu czyta ten cache — podmieniamy od razu.
      queryClient.setQueryData<BrandKit>(queryKeys.brandKit, brandKit);
      void queryClient.invalidateQueries({ queryKey: queryKeys.brandKit });
    },
  });
}
