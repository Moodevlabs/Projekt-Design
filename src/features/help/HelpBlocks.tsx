import { Lightbulb, TriangleAlert } from 'lucide-react';
import type { HelpBlock } from '@/i18n/help.pl';
import { helpPl } from '@/i18n/help.pl';
import { cn } from '@/lib/utils';

/**
 * Bloki treści poradnika — jeden komponent na rodzaj bloku.
 *
 * Ton z edytora wyceny: numerowane kroki jak na stronie usługi (inspiracja 2),
 * wskazówka jako karta z ikoną (05-UI §3a.5), tabela skrótów tabularna.
 * Kolory i promienie wyłącznie z tokenów — poradnik ma wyglądać jak reszta
 * aplikacji, a nie jak wklejona strona WWW.
 */
export function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="text-ink text-[14.5px] leading-[1.65]">{block.text}</p>;

    case 'steps':
      return (
        <ol className="flex flex-col gap-2.5">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="bg-primary text-primary-foreground tabular flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                {index + 1}
              </span>
              <span className="text-ink pt-0.5 text-[14.5px] leading-[1.6]">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'list':
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span aria-hidden className="bg-ink-soft mt-[9px] size-1.5 shrink-0 rounded-full" />
              <span className="text-ink text-[14.5px] leading-[1.6]">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'tip':
    case 'warn': {
      const warn = block.kind === 'warn';
      const Icon = warn ? TriangleAlert : Lightbulb;
      return (
        <aside
          className={cn(
            'flex gap-3 rounded-[var(--radius-control)] border px-4 py-3',
            warn
              ? 'border-danger/30 bg-danger-wash'
              : 'border-hair bg-surface-2',
          )}
        >
          <Icon
            className={cn(
              'mt-0.5 size-4 shrink-0',
              warn ? 'text-danger' : 'text-ink-soft',
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-ink text-[13px] font-semibold">
              {block.title ?? (warn ? helpPl.warnLabel : helpPl.tipLabel)}
            </p>
            <p className="text-ink-soft mt-0.5 text-[13.5px] leading-[1.6]">{block.text}</p>
          </div>
        </aside>
      );
    }

    case 'keys':
      return (
        <div className="border-hair overflow-hidden rounded-[var(--radius-control)] border">
          <table className="w-full text-[13.5px]">
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.keys} className="border-hair border-b last:border-b-0">
                  <td className="bg-surface-2 w-[200px] px-3 py-2 align-top">
                    <kbd className="bg-surface border-hair text-ink tabular inline-block rounded-[6px] border px-2 py-0.5 text-[12px] font-medium shadow-[0_1px_0_var(--color-hair)]">
                      {row.keys}
                    </kbd>
                  </td>
                  <td className="text-ink px-3 py-2 leading-[1.55]">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'faq':
      return (
        <dl className="flex flex-col divide-y divide-[var(--color-hair)]">
          {block.items.map((item) => (
            <div key={item.q} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-ink text-[14.5px] font-semibold">{item.q}</dt>
              <dd className="text-ink-soft mt-1 text-[13.5px] leading-[1.6]">{item.a}</dd>
            </div>
          ))}
        </dl>
      );
  }
}
