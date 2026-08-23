import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoomType,
  deleteRoomType,
  listRoomTypes,
  updateRoomType,
  type CreateRoomTypeInput,
  type RoomTypePatch,
} from '@/data/repos/room-types.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

export function useRoomTypes() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.roomTypes(workspaceId),
    queryFn: () => listRoomTypes(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

function useInvalidateRoomTypes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.roomTypes() });
    // Reguły cenowe w bibliotece są opisane po `roomTypeId`, więc zmiana
    // słownika zmienia to, co widać w macierzy cennika (F1.3).
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryItems() });
  };
}

export type CreateRoomTypeVars = Omit<CreateRoomTypeInput, 'workspaceId'>;

export function useCreateRoomType() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateRoomTypes();

  return useMutation({
    mutationFn: (vars: CreateRoomTypeVars) =>
      createRoomType({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateRoomType() {
  const invalidate = useInvalidateRoomTypes();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoomTypePatch }) => updateRoomType(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteRoomType() {
  const invalidate = useInvalidateRoomTypes();

  return useMutation({
    mutationFn: (id: string) => deleteRoomType(id),
    onSuccess: invalidate,
  });
}
