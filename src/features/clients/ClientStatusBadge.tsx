import type { ClientStatus } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Status klienta to dwa stany, nie tor postępu — dlatego pigułka, a nie
 * `StatusMark` z wycen. Ten sam kształt sugerowałby, że „zarchiwizowany" jest
 * kolejnym etapem współpracy, a jest jej zamknięciem.
 *
 * Wyprowadzone z `ClientsTable` przy przejściu na karty (poprawka 5,
 * 2026-08-27): tabeli już nie ma, a pigułki używa i karta, i nagłówek teczki.
 */
export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={cn(
        'rounded-[var(--radius-pill)] px-2.5 py-1 text-xs whitespace-nowrap',
        status === 'archived'
          ? 'bg-surface-2 text-ink-soft border-hair border'
          : 'bg-primary/10 text-ink',
      )}
    >
      {pl.clients.status[status]}
    </span>
  );
}
