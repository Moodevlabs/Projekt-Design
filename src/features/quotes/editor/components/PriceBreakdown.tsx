import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMoney } from '@/domain/money';
import {
  explainItemPrice,
  isUnpinnedInRoomBlock,
  toCents,
  type Item,
  type PriceExplanation,
  type PricingContext,
  type Room,
} from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * „Skąd ta kwota" pod ceną pozycji parametrycznej (T-128).
 *
 * Dwie warstwy: **jeden wiersz** rachunku, który da się sprawdzić w głowie
 * („kuchnia ×2: 2 × 350,00 zł", „200,00 zł + 7 pom."), i **popover** z pełnym
 * rozbiciem po pomieszczeniach — dla tego, kto automatowi nie ufa. Oba biorą
 * liczby z `explainItemPrice`, czyli z tej samej logiki, która policzyła
 * kwotę w wierszu i w podsumowaniu.
 *
 * Tu też mieszkają akcje, które dotyczą SPOSOBU liczenia, a nie kwoty:
 * „Przywróć z cennika" (zdejmuje nadpisanie ręczne), „Wyceń indywidualnie"
 * (jawny wybór — a nie skutek wyczyszczenia pola) i „Przypnij do: kuchnia"
 * dla pozycji sprzed T-126, które stoją w bloku pomieszczenia, ale liczą
 * wszystkie pomieszczenia.
 */
export function PriceBreakdown({
  item,
  rooms,
  currency,
  pricing,
  editing,
  blockRoomId,
  onPatch,
}: {
  item: Item;
  rooms: Room[];
  currency: string;
  pricing: PricingContext;
  editing: boolean;
  /** `roomId` bloku, w którym leży pozycja (`null`/`undefined` = poza blokiem). */
  blockRoomId?: string | null;
  onPatch: (itemId: string, patch: Partial<Item>) => void;
}) {
  const explanation = explainItemPrice(item, rooms);
  const money = (units: number) => formatMoney(toCents(units, pricing), currency);
  const unpinned = isUnpinnedInRoomBlock(item, blockRoomId);
  const blockRoom = blockRoomId ? (rooms.find((room) => room.id === blockRoomId) ?? null) : null;

  const summary = summaryLine(explanation, money);
  if (summary === null && !unpinned) return null;

  const line = (
    <span
      className={cn(
        'text-[11px] whitespace-nowrap',
        explanation.kind === 'global' &&
          (explanation.missingRates || explanation.rooms.length === 0)
          ? 'text-[var(--doc-terracotta)]'
          : 'text-[var(--doc-ink-soft)]',
      )}
    >
      {summary}
    </span>
  );

  return (
    <div className="flex flex-col items-end gap-0.5">
      {summary !== null && editing ? (
        <Popover>
          <PopoverTrigger
            type="button"
            aria-label={`${pl.editor.priceBreakdownOpen}: ${item.name || pl.editor.newItemName}`}
            className="focus-visible:ring-ring rounded-[var(--radius-control)] underline decoration-solid decoration-[0.5px] underline-offset-[3px] hover:text-[var(--doc-ink)] focus-visible:ring-2 focus-visible:outline-none"
          >
            {line}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] space-y-3">
            <p className="text-ink text-sm font-semibold">{pl.editor.priceBreakdownTitle}</p>
            <BreakdownBody explanation={explanation} money={money} />
            <BreakdownActions item={item} explanation={explanation} onPatch={onPatch} />
          </PopoverContent>
        </Popover>
      ) : (
        summary !== null && line
      )}

      {unpinned && editing ? (
        // Pozycja sprzed T-126: stoi pod nagłówkiem pomieszczenia, ale liczy
        // wszystkie. Nie migrujemy jej po cichu (zmieniłoby to kwotę wysłanej
        // oferty) — mówimy wprost i dajemy jedno kliknięcie.
        <button
          type="button"
          onClick={() => onPatch(item.id, { roomId: blockRoomId ?? null })}
          className="focus-visible:ring-ring rounded-[var(--radius-control)] text-[11px] whitespace-nowrap text-[var(--doc-terracotta)] underline decoration-solid decoration-[0.5px] underline-offset-[3px] hover:text-[var(--doc-ink)] focus-visible:ring-2 focus-visible:outline-none"
          title={pl.editor.pricingPin(blockRoom?.label || pl.editor.newRoomName)}
        >
          {pl.editor.pricingUnpinned} ·{' '}
          {pl.editor.pricingPin(blockRoom?.label || pl.editor.newRoomName)}
        </button>
      ) : unpinned ? (
        <span className="text-[11px] whitespace-nowrap text-[var(--doc-terracotta)]">
          {pl.editor.pricingUnpinned}
        </span>
      ) : null}
    </div>
  );
}

/** Jeden wiersz pod kwotą. `null` = nie ma czego tłumaczyć (zwykła pozycja). */
function summaryLine(
  explanation: PriceExplanation,
  money: (units: number) => string,
): string | null {
  switch (explanation.kind) {
    case 'flat':
    case 'individual':
      return null;
    case 'override':
      return pl.editor.pricingOverridden;
    case 'room':
      return pl.editor.pricingFromRoom(
        explanation.room.label || pl.editor.newRoomName,
        explanation.room.qty,
        money(explanation.room.rateUnits),
      );
    case 'global':
      if (explanation.rooms.length === 0) return pl.editor.pricingNoRooms;
      if (explanation.missingRates) return pl.editor.pricingNoRates;
      return pl.editor.pricingFromRooms(
        explanation.baseUnits !== 0 ? money(explanation.baseUnits) : null,
        explanation.roomsQty,
      );
    case 'frame':
      return pl.editor.pricingFromFrames(explanation.frames);
  }
}

function BreakdownBody({
  explanation,
  money,
}: {
  explanation: PriceExplanation;
  money: (units: number) => string;
}) {
  if (explanation.kind === 'override') {
    return <p className="text-ink-soft text-xs">{pl.editor.priceBreakdownOverrideHint}</p>;
  }

  if (explanation.kind === 'individual') {
    return <p className="text-ink-soft text-xs">{pl.editor.priceBreakdownIndividualHint}</p>;
  }

  if (explanation.kind === 'flat') return null;

  if (explanation.kind === 'room') {
    return (
      <dl className="space-y-1 text-xs">
        <Row
          label={`${pl.editor.priceBreakdownRoom}: ${explanation.room.label || pl.editor.newRoomName}${
            explanation.room.qty > 1 ? ` ×${explanation.room.qty}` : ''
          }`}
          value={
            explanation.room.qty > 1
              ? `${explanation.room.qty} × ${money(explanation.room.rateUnits)}`
              : money(explanation.room.rateUnits)
          }
        />
        {explanation.itemQty !== 1 ? (
          <Row label={pl.editor.priceBreakdownItemQty(explanation.itemQty)} value="" />
        ) : null}
        <Row label={pl.editor.priceBreakdownTotal} value={money(explanation.units)} strong />
        <p className="text-ink-soft pt-1">{pl.editor.priceBreakdownRatesHint}</p>
      </dl>
    );
  }

  if (explanation.kind === 'frame') {
    return (
      <dl className="space-y-1 text-xs">
        <Row
          label={
            explanation.room
              ? `${pl.editor.priceBreakdownRoom}: ${explanation.room.label || pl.editor.newRoomName}`
              : pl.editor.priceBreakdownRoom
          }
          value={money(explanation.rateUnits)}
        />
        <Row
          label={pl.editor.priceBreakdownFrames(explanation.frames, money(explanation.baseUnits))}
          value={money(explanation.baseUnits * explanation.frames)}
        />
        {explanation.room && explanation.room.qty > 1 ? (
          <Row label={`× ${explanation.room.qty}`} value="" />
        ) : null}
        {explanation.itemQty !== 1 ? (
          <Row label={pl.editor.priceBreakdownItemQty(explanation.itemQty)} value="" />
        ) : null}
        <Row label={pl.editor.priceBreakdownTotal} value={money(explanation.units)} strong />
        <p className="text-ink-soft pt-1">{pl.editor.priceBreakdownRatesHint}</p>
      </dl>
    );
  }

  return (
    <dl className="space-y-1 text-xs">
      <Row label={pl.editor.priceBreakdownBase} value={money(explanation.baseUnits)} />
      <dt className="text-ink-soft pt-1">
        {pl.editor.priceBreakdownRoomsScope[explanation.scope]}
      </dt>
      {explanation.rooms.length === 0 ? (
        <dd className="text-[var(--doc-terracotta)]">{pl.editor.priceBreakdownNoRooms}</dd>
      ) : (
        explanation.rooms.map((part) => (
          <Row
            key={part.roomId}
            label={`${part.label || pl.editor.newRoomName}${part.qty > 1 ? ` ×${part.qty}` : ''}`}
            value={part.qty > 1 ? `${part.qty} × ${money(part.rateUnits)}` : money(part.rateUnits)}
          />
        ))
      )}
      {explanation.itemQty !== 1 ? (
        <Row label={pl.editor.priceBreakdownItemQty(explanation.itemQty)} value="" />
      ) : null}
      <Row label={pl.editor.priceBreakdownTotal} value={money(explanation.units)} strong />
      {explanation.missingRates ? (
        <p className="pt-1 text-[var(--doc-terracotta)]">{pl.editor.pricingNoRates}</p>
      ) : (
        <p className="text-ink-soft pt-1">{pl.editor.priceBreakdownRatesHint}</p>
      )}
    </dl>
  );
}

function BreakdownActions({
  item,
  explanation,
  onPatch,
}: {
  item: Item;
  explanation: PriceExplanation;
  onPatch: (itemId: string, patch: Partial<Item>) => void;
}) {
  if (explanation.kind === 'override') {
    return (
      <ActionButton onClick={() => onPatch(item.id, { priceOverrideCents: null })}>
        {pl.editor.pricingRestore}
      </ActionButton>
    );
  }
  if (explanation.kind === 'individual') {
    // Powrót do cennika: pozycja dostaje cenę „0", żeby reguła znów liczyła.
    return (
      <ActionButton onClick={() => onPatch(item.id, { unitPriceCents: 0 })}>
        {pl.editor.pricingRestore}
      </ActionButton>
    );
  }
  if (explanation.kind === 'flat') return null;
  return (
    <ActionButton
      onClick={() => onPatch(item.id, { unitPriceCents: null, priceOverrideCents: null })}
    >
      {pl.editor.priceBreakdownMakeIndividual}
    </ActionButton>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink hover:bg-surface-2 focus-visible:ring-ring rounded-[var(--radius-control)] border px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t pt-1 font-semibold')}>
      <dt className={strong ? 'text-ink' : 'text-ink-soft'}>{label}</dt>
      <dd className="tabular text-ink">{value}</dd>
    </div>
  );
}
