import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBrandImageUrl, removeBrandImage, uploadBrandImage } from '@/data/repos/brand.repo';
import { updateWorkspaceSettings, type Workspace } from '@/data/repos/workspace.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspace, useWorkspaceId } from './useWorkspace';

/**
 * Zdjęcie użytkownika (poprawka 4, 2026-08-27).
 *
 * Ścieżka siedzi w `workspaces.settings.avatarPath`, plik — w buckecie `brand`.
 * Ta sama kolejność co przy logo: **najpierw plik, potem wskazanie, na końcu
 * kasowanie starego**. Odwrotna zostawiałaby przy błędzie ustawienia
 * wskazujące na plik, którego nie ma.
 */
export function useAvatarPath(): string | null {
  return useWorkspace().data?.settings.avatarPath ?? null;
}

/** Podpisany URL avatara. `null`, gdy nie ma zdjęcia albo podpis się nie udał. */
export function useAvatarUrl(path: string | null) {
  return useQuery({
    queryKey: [...queryKeys.workspace, 'avatar-url', path],
    queryFn: () => (path ? getBrandImageUrl(path) : null),
    enabled: Boolean(path),
    // Podpis wygasa po godzinie — odświeżamy z zapasem.
    staleTime: 45 * 60 * 1000,
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const workspace = useWorkspace().data;

  return useMutation({
    mutationFn: async (file: File) => {
      const ws = requireWorkspaceId(workspaceId);
      if (!workspace) throw new Error('Workspace nie jest jeszcze wczytany.');

      const previous = workspace.settings.avatarPath;
      const path = await uploadBrandImage(ws, 'avatar', file);
      const settings = await updateWorkspaceSettings(ws, {
        ...workspace.settings,
        avatarPath: path,
      });

      if (previous && previous !== path) await removeBrandImage(previous);
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<Workspace>(queryKeys.workspace, (prev) =>
        prev ? { ...prev, settings } : prev,
      );
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const workspace = useWorkspace().data;

  return useMutation({
    mutationFn: async () => {
      const ws = requireWorkspaceId(workspaceId);
      if (!workspace) throw new Error('Workspace nie jest jeszcze wczytany.');

      const previous = workspace.settings.avatarPath;
      const settings = await updateWorkspaceSettings(ws, {
        ...workspace.settings,
        avatarPath: null,
      });

      if (previous) await removeBrandImage(previous);
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<Workspace>(queryKeys.workspace, (prev) =>
        prev ? { ...prev, settings } : prev,
      );
    },
  });
}
