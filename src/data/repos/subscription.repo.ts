import { z } from 'zod';
import { getSupabase } from '@/data/supabase';
import type { Tables } from '@/data/types.generated';
import { unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('subscription.repo');

type SubscriptionRow = Tables<'subscriptions'>;

/**
 * Statusy subskrypcji — parytet z CHECK-iem na `subscriptions.status`.
 * Docelowo (T-15) przeniesie się do `domain/billing/`, razem z regułami dostępu.
 */
export const SubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid',
  'paused',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export interface Subscription {
  workspaceId: string;
  status: SubscriptionStatus;
  /** `pro_monthly` | `pro_yearly`; `null` dopóki trwa trial. */
  plan: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    workspaceId: row.workspace_id,
    // Nieznany status traktujemy jak `incomplete` — najbezpieczniej: brak zapisu.
    status: SubscriptionStatusSchema.catch('incomplete').parse(row.status),
    plan: row.plan ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    stripeCustomerId: row.stripe_customer_id ?? null,
  };
}

/**
 * Subskrypcja workspace'u. Tylko odczyt — RLS nie daje klientowi insert/update,
 * wiersz pisze wyłącznie webhook Stripe przez `service_role` (03-BILLING).
 *
 * Brak wiersza zwracamy jako `null` (a nie wyjątek): tak wygląda konto sprzed
 * migracji billingowej i UI ma to pokazać jako „brak subskrypcji", nie jako błąd.
 */
export async function getSubscription(workspaceId: string): Promise<Subscription | null> {
  const rows = unwrap(
    await getSupabase().from('subscriptions').select('*').eq('workspace_id', workspaceId).limit(1),
    'Odczyt subskrypcji',
  );

  const row = rows[0];
  if (!row) {
    log.warn('Workspace bez wiersza w `subscriptions`', { workspaceId });
    return null;
  }
  return mapSubscription(row);
}
