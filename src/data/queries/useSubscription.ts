import { useQuery } from '@tanstack/react-query';
import { getSubscription } from '@/data/repos/subscription.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/** Po powrocie z Checkoutu webhook potrzebuje chwili — nie trzymamy danych długo świeżych. */
const SUBSCRIPTION_STALE_MS = 15_000;

/**
 * Subskrypcja jest tylko do odczytu — zmienia ją wyłącznie webhook Stripe
 * (03-BILLING), więc nie ma tu żadnej mutacji. Gating i polling po powrocie
 * z Checkoutu dokłada T-15.
 */
export function useSubscription() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => getSubscription(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: SUBSCRIPTION_STALE_MS,
  });
}
