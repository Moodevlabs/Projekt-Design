import { calcItemCents, pricingContextOf } from '@/domain/quote/calc';
import type { Group, Item, QuoteBody, Section } from '@/domain/quote/schema';
import { formatMoney } from '@/domain/money';

interface Props {
  body: QuoteBody;
  currency: string;
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
  readOnly: boolean;
}

/**
 * Dokument oferty z przełącznikami TAK/NIE.
 *
 * Cena pozycji liczy się przez `calcItemCents` — ten sam kod, co w edytorze
 * i w PDF. Strona klienta nie ma własnej arytmetyki i mieć jej nie może:
 * inaczej kwota na ekranie inwestora mogłaby różnić się od kwoty w ofercie.
 */
export function QuoteDocument({ body, currency, enabled, onToggle, readOnly }: Props) {
  const pricing = pricingContextOf(body);

  return (
    <div className="space-y-10">
      {body.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          body={body}
          currency={currency}
          enabled={enabled}
          onToggle={onToggle}
          readOnly={readOnly}
          priceOf={(item) => calcItemCents(item, body.rooms, pricing)}
        />
      ))}
    </div>
  );
}

interface SectionProps extends Omit<Props, 'body'> {
  section: Section;
  body: QuoteBody;
  priceOf: (item: Item) => number;
}

function SectionBlock({ section, currency, enabled, onToggle, readOnly, priceOf }: SectionProps) {
  return (
    <section>
      <h2 className="font-display border-b border-[var(--hair-strong)] pb-2 text-xl tracking-tight">
        {section.title || 'Sekcja'}
      </h2>
      <ul className="mt-4 divide-y divide-[var(--hair)]">
        {section.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            cents={priceOf(item)}
            currency={currency}
            checked={enabled.has(item.id)}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        ))}
      </ul>

      {section.groups.map((group) => (
        <GroupBlock
          key={group.id}
          group={group}
          currency={currency}
          enabled={enabled}
          onToggle={onToggle}
          readOnly={readOnly}
          priceOf={priceOf}
        />
      ))}
    </section>
  );
}

interface GroupProps {
  group: Group;
  currency: string;
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
  readOnly: boolean;
  priceOf: (item: Item) => number;
}

function GroupBlock({ group, currency, enabled, onToggle, readOnly, priceOf }: GroupProps) {
  return (
    <div className="mt-6">
      <h3 className="text-ink-soft text-xs font-semibold tracking-[0.14em] uppercase">
        {group.name || 'Grupa'}
      </h3>
      <ul className="mt-2 divide-y divide-[var(--hair)]">
        {group.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            cents={priceOf(item)}
            currency={currency}
            checked={enabled.has(item.id)}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        ))}
      </ul>
    </div>
  );
}

interface RowProps {
  item: Item;
  cents: number;
  currency: string;
  checked: boolean;
  onToggle: (id: string) => void;
  readOnly: boolean;
}

function ItemRow({ item, cents, currency, checked, onToggle, readOnly }: RowProps) {
  const isDiscount = item.kind === 'discount';
  const name = item.name || 'Pozycja';

  return (
    <li className={`py-3 ${checked ? '' : 'item-off'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={readOnly}
          onChange={() => onToggle(item.id)}
          className="accent-accent mt-1 size-4 shrink-0 cursor-pointer disabled:cursor-default"
          aria-label={`Włącz pozycję: ${name}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{name}</span>
          {item.description ? (
            <span className="text-ink-soft mt-0.5 block text-xs leading-relaxed">
              {item.description}
            </span>
          ) : null}
        </span>
        <span
          className={`tabular shrink-0 text-sm font-medium ${isDiscount ? 'text-discount' : ''}`}
        >
          {/* `unitPriceCents === null` znaczy „ustalimy osobno" i NIE wchodzi
              do sumy (T-60). Pokazanie tu 0 zł sugerowałoby, że to gratis. */}
          {item.unitPriceCents === null ? 'indywidualnie' : formatMoney(cents, currency)}
        </span>
      </label>
    </li>
  );
}
