import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import {
  createClient,
  deleteClient,
  getClient,
  getClientOverview,
  listClients,
  setClientStatus,
  updateClient,
  type ClientFilters,
  type ClientPatch,
} from '@/data/repos/clients.repo';
import { queryKeys } from '@/data/query-keys';
import type { Client, ClientDraft, ClientStatus } from '@/domain/client/schema';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * `['clients']` jest prefiksem także dla detalu `['clients','detail',id]`
 * — ta sama pułapka co przy wycenach (T-06). Operacje na listach muszą
 * wykluczyć detale, żeby nie próbowały mapować pojedynczego klienta jak listy.
 */
const listQueries = {
  queryKey: queryKeys.clients(),
  predicate: (query: Query) => query.queryKey[1] !== 'detail',
};

export type ClientListFilters = Omit<ClientFilters, 'workspaceId'>;

export function useClients(filters: ClientListFilters = {}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.clients({ workspaceId, ...filters }),
    queryFn: () => listClients({ ...filters, workspaceId: requireWorkspaceId(workspaceId) }),
    enabled: Boolean(workspaceId),
  });
}

/** Sam rekord klienta — bez sum. Do formularza i do comboboxa w edytorze. */
export function useClient(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.client(id ?? ''),
    queryFn: () => getClient(id as string),
    enabled: Boolean(id),
  });
}

/** Klient z sumami — do nagłówka karty `/klienci/:id`. */
export function useClientOverview(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.clientOverview(id ?? ''),
    queryFn: () => getClientOverview(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateClients() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries(listQueries);
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientOverview(id) });
    }
  };
}

export function useCreateClient() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: (draft: ClientDraft) =>
      createClient({ ...draft, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: (client) => {
      // Detal do cache od razu: po dodaniu klienta z edytora combobox ma
      // pokazać jego dane bez czekania na round-trip.
      queryClient.setQueryData<Client>(queryKeys.client(client.id), client);
      invalidate(client.id);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ClientPatch }) => updateClient(id, patch),
    onSuccess: (client) => {
      queryClient.setQueryData<Client>(queryKeys.client(client.id), client);
      invalidate(client.id);
      /*
       * Wycen NIE unieważniamy.
       *
       * `body.client` to snapshot z chwili utworzenia (CLAUDE.md §14) —
       * poprawiony telefon nie ma prawa zmienić dokumentu, który poszedł do
       * inwestora. Odświeżenie jest jawną akcją w edytorze, nie skutkiem
       * ubocznym zapisu kartoteki.
       */
    },
  });
}

export function useSetClientStatus() {
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClientStatus }) =>
      setClientStatus(id, status),
    onSuccess: (client) => invalidate(client.id),
  });
}

export function useDeleteClient() {
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}
