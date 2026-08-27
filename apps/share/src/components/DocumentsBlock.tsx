import { formatMoney } from '@/domain/money';
import type { QuoteDocuments } from '@/domain/documents';

/**
 * Dokumenty towarzyszące w linku klienta (poprawka 7a, 2026-08-27).
 *
 * Dwa dokumenty, oba istotne PRZED decyzją, a nie po niej:
 *
 *  * **Etapy współpracy** — co robimy i, co ważniejsze, czego NIE robimy.
 *    Wpisy nieobjęte zostają na liście z krzyżykiem; wycięcie ich z widoku
 *    klienta odebrałoby dokumentowi sens (patrz `StageEntrySchema.included`).
 *  * **Cennik usług dodatkowych** — czego można dokupić i po ile. Klient,
 *    który to widzi przed akceptacją, nie odbiera późniejszej wyceny zmiany
 *    jako niespodzianki.
 */
export function DocumentsBlock({
  documents,
  currency,
}: {
  documents: QuoteDocuments;
  currency: string;
}) {
  const stages = documents.stages;
  const priceList = documents.priceList;

  const hasStages = (stages?.entries.length ?? 0) > 0;
  const hasPriceList = (priceList?.items.length ?? 0) > 0;
  if (!hasStages && !hasPriceList) return null;

  return (
    <>
      {hasStages && stages ? (
        <section className="mt-10">
          <h2 className="font-display text-lg tracking-tight">Zakres współpracy</h2>

          <ul className="mt-3 space-y-2">
            {stages.entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-3 text-sm">
                <span
                  aria-hidden
                  className={entry.included ? 'text-[var(--accent)]' : 'text-ink-faint'}
                >
                  {entry.included ? '✓' : '✕'}
                </span>
                <span className={entry.included ? '' : 'text-ink-soft'}>
                  <span className="font-medium">{entry.name}</span>
                  {entry.description ? (
                    <span className="text-ink-soft block text-xs leading-relaxed">
                      {entry.description}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {stages.footnote ? (
            <p className="text-ink-soft mt-3 text-xs leading-relaxed whitespace-pre-line">
              {stages.footnote}
            </p>
          ) : null}
        </section>
      ) : null}

      {hasPriceList && priceList ? (
        <section className="mt-10">
          <h2 className="font-display text-lg tracking-tight">Usługi dodatkowe</h2>
          <p className="text-ink-soft mt-1 text-xs">
            Poza zakresem oferty. Wyceniane osobno, jeśli będą potrzebne.
          </p>

          <ul className="mt-3 space-y-2">
            {priceList.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0">
                  <span>{item.name}</span>
                  {item.leadTime ? (
                    <span className="text-ink-soft block text-xs">{item.leadTime}</span>
                  ) : null}
                </span>
                <span className="tabular shrink-0 whitespace-nowrap">
                  {price(item.priceMinCents, item.priceMaxCents, item.unit, currency)}
                </span>
              </li>
            ))}
          </ul>

          {priceList.footnote ? (
            <p className="text-ink-soft mt-3 text-xs leading-relaxed whitespace-pre-line">
              {priceList.footnote}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

/**
 * „300 zł" to zobowiązanie, „300–1 200 zł" to widełki — różnica jest dla
 * klienta znacząca, więc jedna cena i przedział wyglądają inaczej.
 */
function price(minCents: number, maxCents: number | null, unit: string, currency: string): string {
  const suffix = unit ? ` / ${unit}` : '';
  if (maxCents === null || maxCents === minCents) {
    return `${formatMoney(minCents, currency)}${suffix}`;
  }
  return `${formatMoney(minCents, currency)} – ${formatMoney(maxCents, currency)}${suffix}`;
}
