import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBrandKit,
  getLogoUrl,
  removeLogo,
  updateBrandKit,
  uploadLogo,
  type BrandKitPatch,
  type LogoVariant,
} from '@/data/repos/brand.repo';
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

/**
 * Wgranie logo: plik do Storage, ścieżka do brand kitu, stary plik do kosza.
 *
 * Wszystko w jednej mutacji, bo to jedna operacja z punktu widzenia
 * użytkownika — a rozbicie jej na trzy zostawiałoby przy błędzie brand kit
 * wskazujący na plik, którego nie ma (albo plik, do którego nic nie wskazuje).
 */
export function useUploadLogo() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async ({ variant, file }: { variant: LogoVariant; file: File }) => {
      const ws = requireWorkspaceId(workspaceId);
      const previous = queryClient.getQueryData<BrandKit>(queryKeys.brandKit);
      const path = await uploadLogo(ws, variant, file);

      const patch: BrandKitPatch =
        variant === 'dark' ? { logoDarkPath: path } : { logoLightPath: path };
      const saved = await updateBrandKit(ws, patch);

      // Stare logo kasujemy dopiero, gdy nowa ścieżka jest już zapisana.
      const oldPath = variant === 'dark' ? previous?.logoDarkPath : previous?.logoLightPath;
      if (oldPath && oldPath !== path) await removeLogo(oldPath);

      return saved;
    },
    onSuccess: (brandKit) => {
      queryClient.setQueryData<BrandKit>(queryKeys.brandKit, brandKit);
      void queryClient.invalidateQueries({ queryKey: queryKeys.brandKit });
    },
  });
}

/** Usunięcie logo: najpierw wyczyść wskazanie, potem plik. */
export function useRemoveLogo() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (variant: LogoVariant) => {
      const ws = requireWorkspaceId(workspaceId);
      const previous = queryClient.getQueryData<BrandKit>(queryKeys.brandKit);
      const path = variant === 'dark' ? previous?.logoDarkPath : previous?.logoLightPath;

      const patch: BrandKitPatch =
        variant === 'dark' ? { logoDarkPath: null } : { logoLightPath: null };
      const saved = await updateBrandKit(ws, patch);

      if (path) await removeLogo(path);
      return saved;
    },
    onSuccess: (brandKit) => {
      queryClient.setQueryData<BrandKit>(queryKeys.brandKit, brandKit);
      void queryClient.invalidateQueries({ queryKey: queryKeys.brandKit });
    },
  });
}

/** Podpisany URL do podglądu logo. `null`, gdy logo nie ma albo podpis się nie udał. */
export function useLogoUrl(path: string | null) {
  return useQuery({
    queryKey: [...queryKeys.brandKit, 'logo-url', path],
    queryFn: () => (path ? getLogoUrl(path) : null),
    enabled: Boolean(path),
    // Podpis wygasa po godzinie — odświeżamy z zapasem.
    staleTime: 45 * 60 * 1000,
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
