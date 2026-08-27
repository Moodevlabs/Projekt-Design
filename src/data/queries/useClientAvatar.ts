import { useMutation, useQuery } from '@tanstack/react-query';

import { getBrandImageUrl, removeBrandImage, uploadBrandImage } from '@/data/repos/brand.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Zdjęcie klienta (poprawka 5, 2026-08-27).
 *
 * Plik idzie do Storage **od razu przy wyborze**, a ścieżka wraca do
 * formularza jako zwykła wartość pola. Alternatywa — trzymanie pliku
 * w pamięci do czasu „Zapisz" — znaczyłaby wysyłkę w środku zapisu
 * kartoteki: wolniejszą i z drugim miejscem, w którym coś może paść.
 *
 * Ceną jest osierocony plik, gdy ktoś wybierze zdjęcie i zamknie dialog
 * przyciskiem „Anuluj". To kilkadziesiąt kilobajtów w prywatnym buckecie
 * i nikt tego nie zobaczy — tańsze niż wysyłka w krytycznym momencie.
 */
export function useClientAvatarUrl(path: string | null) {
  return useQuery({
    queryKey: [...queryKeys.clients(), 'avatar-url', path],
    queryFn: () => (path ? getBrandImageUrl(path) : null),
    enabled: Boolean(path),
    // Podpis wygasa po godzinie — odświeżamy z zapasem.
    staleTime: 45 * 60 * 1000,
  });
}

export function useUploadClientAvatar() {
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (file: File) => uploadBrandImage(requireWorkspaceId(workspaceId), 'client', file),
  });
}

/** Kasuje plik zdjęcia. Wskazanie w kartotece czyści wołający. */
export function useRemoveClientAvatar() {
  return useMutation({
    mutationFn: (path: string) => removeBrandImage(path),
  });
}
