import { MoneyInput } from '../components/MoneyInput';
import { PricingModeToggle } from './PricingModeToggle';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import type { PricingRule, RoomScope } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type Mode = PricingRule['mode'];

/**
 * Domyślne kształty reguł. Przełączenie trybu buduje regułę od zera zamiast
 * doklejać pola — inaczej po przejściu `per_room → flat → per_room` zostałyby
 * w JSON-ie śmieci po nieaktywnym trybie.
 *
 * Stawki (`perRoomCents`) przenosimy między trybami parametrycznymi świadomie:
 * to zwykle ta sama tabela cen, tylko inaczej liczona.
 */
function toMode(mode: Mode, current: PricingRule): PricingRule {
  if (mode === 'flat') return { mode: 'flat' };

  const perRoomCents = current.mode === 'flat' ? {} : current.perRoomCents;
  const defaultPerRoomCents = current.mode === 'flat' ? 0 : current.defaultPerRoomCents;
  const baseCents = current.mode === 'flat' ? 0 : current.baseCents;

  if (mode === 'per_room') {
    return {
      mode: 'per_room',
      baseCents,
      perRoomCents,
      defaultPerRoomCents,
      roomScope: current.mode === 'per_room' ? current.roomScope : 'all',
    };
  }

  return { mode: 'per_frame', baseCents, perRoomCents, defaultPerRoomCents };
}

const SCOPES: { value: RoomScope; label: string }[] = [
  { value: 'all', label: pl.library.pricingScopeAll },
  { value: 'visual', label: pl.library.pricingScopeVisual },
  { value: 'technical', label: pl.library.pricingScopeTechnical },
];

const HINTS: Record<Mode, string> = {
  flat: pl.library.pricingFlatHint,
  per_room: pl.library.pricingPerRoomHint,
  per_frame: pl.library.pricingPerFrameHint,
};

/**
 * Edycja reguły cenowej pozycji bibliotecznej — odwzorowanie arkusza
 * `OFERTA - DANE` F–S: baza plus stawka za każdy typ pomieszczenia.
 */
export function PricingEditor({
  value,
  onChange,
  itemName,
}: {
  value: PricingRule;
  onChange: (pricing: PricingRule) => void;
  /** Nazwa pozycji — trafia do etykiet, bo na stronie jest wiele takich edytorów. */
  itemName: string;
}) {
  const roomTypes = useRoomTypes();
  const types = roomTypes.data ?? [];

  const patchRoomPrice = (roomTypeId: string, cents: number) => {
    if (value.mode === 'flat') return;
    onChange({ ...value, perRoomCents: { ...value.perRoomCents, [roomTypeId]: cents } });
  };

  return (
    <div className="border-hair flex flex-col gap-3 border-t pt-3">
      <PricingModeToggle
        value={value.mode}
        onChange={(mode) => onChange(toMode(mode, value))}
        label={`${pl.library.pricingLabel}: ${itemName}`}
      />

      <p className="text-ink-soft text-xs">{HINTS[value.mode]}</p>

      {value.mode !== 'flat' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-soft text-xs">
              {value.mode === 'per_frame' ? pl.library.pricingPerFrameBase : pl.library.pricingBase}
            </span>
            <MoneyInput
              cents={value.baseCents}
              onChange={(baseCents) => onChange({ ...value, baseCents })}
              ariaLabel={pl.library.pricingBaseFor(itemName)}
              className="w-32"
            />
          </div>

          {value.mode === 'per_room' ? (
            <div
              role="group"
              aria-label={`${pl.library.pricingScope}: ${itemName}`}
              className="flex flex-col gap-1"
            >
              <span className="text-ink-soft text-xs">{pl.library.pricingScope}</span>
              <div className="flex gap-1">
                {SCOPES.map((scope) => {
                  const active = scope.value === value.roomScope;
                  return (
                    <button
                      key={scope.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ ...value, roomScope: scope.value })}
                      className={cn(
                        'rounded-[var(--radius-pill)] px-2 py-1 text-xs transition-colors',
                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface text-ink-soft border-hair hover:text-ink border',
                      )}
                    >
                      {scope.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <span className="text-ink-soft text-xs">{pl.library.pricingRooms}</span>

            {types.length === 0 ? (
              <p className="text-ink-soft text-xs">{pl.library.pricingNoRoomTypes}</p>
            ) : (
              types.map((type) => (
                <div key={type.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink min-w-0 flex-1 truncate text-sm">{type.name}</span>
                  <MoneyInput
                    // Brak wpisu w mapie znaczy „stawka domyślna”, nie zero —
                    // pokazujemy więc to, co faktycznie się policzy.
                    cents={value.perRoomCents[type.id] ?? value.defaultPerRoomCents}
                    onChange={(cents) => patchRoomPrice(type.id, cents)}
                    ariaLabel={pl.library.pricingRoomPrice(type.name)}
                    className="w-28"
                  />
                </div>
              ))
            )}

            <div className="border-hair mt-1 flex items-center justify-between gap-2 border-t pt-2">
              <span className="text-ink-soft min-w-0 flex-1 truncate text-sm">
                {pl.library.pricingDefaultRoom}
              </span>
              <MoneyInput
                cents={value.defaultPerRoomCents}
                onChange={(defaultPerRoomCents) => onChange({ ...value, defaultPerRoomCents })}
                ariaLabel={`${pl.library.pricingDefaultRoom}: ${itemName}`}
                className="w-28"
              />
            </div>
            <p className="text-ink-soft text-xs">{pl.library.pricingDefaultRoomHint}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
