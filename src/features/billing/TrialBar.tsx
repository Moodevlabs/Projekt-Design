import { Link } from 'react-router-dom';
import { useEntitlement } from './useEntitlement';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Od kiedy przypominamy o końcu okresu próbnego (03-BILLING §4). */
const REMIND_FROM_DAYS = 7;

/**
 * Pasek z licznikiem okresu próbnego w panelu bocznym.
 *
 * Pokazuje się **dopiero na tydzień przed końcem**. Licznik od pierwszego dnia
 * byłby ciągłym przypominaniem o płatności komuś, kto właśnie zaczął próbować
 * aplikacji — a to najlepszy sposób, żeby przestał.
 */
export function TrialBar({ expanded }: { expanded: boolean }) {
  const entitlement = useEntitlement();

  if (entitlement.loading) return null;
  if (entitlement.reason !== 'trial') return null;

  const days = entitlement.daysLeft ?? 0;
  if (days > REMIND_FROM_DAYS) return null;

  return (
    <Link
      to={routes.subscription}
      title={pl.billing.trialDaysLeft(days)}
      // Ten pasek stoi W SZYNIE, więc jedzie na jej rampie, a nie na bieli.
      className="bg-rail-ink/10 text-rail-ink-soft hover:bg-rail-ink/15 hover:text-rail-ink mx-2 mb-2 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 transition-colors"
    >
      <span className="tabular text-sm font-semibold">{days}</span>
      {expanded ? (
        <span className="min-w-0 flex-1 text-[11px] leading-tight">
          {pl.billing.trialDaysLeft(days)}
        </span>
      ) : null}
    </Link>
  );
}
