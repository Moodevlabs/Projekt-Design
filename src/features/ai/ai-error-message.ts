import type { AiError } from '@/data/repos/ai.repo';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/** Komunikat błędu asystenta z kodu — jedno miejsce na tłumaczenie kodów. */
export function aiErrorMessage(error: AiError): string {
  if (error.code === 'limit_reached' && error.quota) {
    return pl.ai.errors.limit_reached(error.quota.limit, formatDate(error.quota.resetsAt));
  }
  const known = pl.ai.errors[error.code];
  return typeof known === 'string' ? known : error.message;
}
