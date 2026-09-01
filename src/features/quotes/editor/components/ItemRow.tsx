import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { InlineMoney } from './InlineMoney';
import { ItemToggle } from './ItemToggle';
import { DragHandle } from './DragHandle';
import { ItemVariantSelect } from './ItemVariantSelect';
import type { VariantOptions } from '../useVariantOptions';
import type { ItemVariant } from '../editor.store';
import type { LibraryItem } from '@/data/repos/library.repo';
import { formatMoney } from '@/domain/money';
import {
  calcItemCents,
  itemTextContext,
  type PricingContext,
  renderText,
  type DocumentTextInfo,
  type Item,
  type Room,
} from '@/domain/quote';
import { formatQty, unitLabel } from '@/domain/library/units';
import {
  COL_ACTIONS,
  COL_PRICE,
  COL_QTY,
  ITEM_ROW_GAP,
} from './item-columns';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Krótkie „skąd ta kwota” dla pozycji liczonej z reguły. `null` dla `flat` —
 * przy zwykłej pozycji cena jednostkowa jest widoczna wprost i dopisek byłby
 * szumem.
 *
 * Liczba pomieszczeń jest ta sama, którą widzi kalkulacja: filtrowana po
 * zasięgu reguły, więc „7 pom.” zgadza się z kwotą także wtedy, gdy część
 * pomieszczeń ma odznaczoną flagę.
 */
function pricingSummary(item: Item, rooms: Room[], currency: string): string | null {
  const pricing = item.pricing;

  if (pricing.mode === 'per_room') {
    const liczone = rooms.filter((room) =>
      pricing.roomScope === 'visual'
        ? room.includedInVisual
        : pricing.roomScope === 'technical'
          ? room.includedInTechnical
          : true,
    );
    const sztuk = liczone.reduce((sum, room) => sum + room.qty, 0);
    return pl.editor.pricingFromRooms(formatMoney(pricing.baseCents, currency), sztuk);
  }

  if (pricing.mode === 'per_frame') {
    return pl.editor.pricingFromFrames(item.frames ?? 1);
  }

  return null;
}

/**
 * Co pokazuje pole ceny w edycji: cenę jednostkową dla `flat`, BAZĘ reguły
 * dla pozycji parametrycznej. `null` = wycena indywidualna w obu trybach.
 */
function priceFieldCents(item: Item): number | null {
  if (item.unitPriceCents === null) return null;
  return item.pricing.mode === 'flat' ? item.unitPriceCents : item.pricing.baseCents;
}

/**
 * Łatka po wpisaniu kwoty w polu ceny. Dla reguły parametrycznej kwota idzie
 * w `baseCents`, a `unitPriceCents` dostaje tę samą liczbę tylko po to, żeby
 * pozycja przestała liczyć się jako „indywidualna" (`countIndividualItems`
 * patrzy na `unitPriceCents`). Wyczyszczenie (`null`) zeruje bazę.
 */
function priceFieldPatch(item: Item, cents: number | null): Partial<Item> {
  if (item.pricing.mode === 'flat') return { unitPriceCents: cents };
  return {
    unitPriceCents: cents,
    pricing: { ...item.pricing, baseCents: cents ?? 0 },
  };
}

/** Stała referencja: brak wariantów nie może przebijać `memo` na wierszach. */
const EMPTY_VARIANTS: LibraryItem[] = [];

export interface ItemRowProps {
  item: Item;
  editing: boolean;
  currency: string;
  onToggle: (itemId: string) => void;
  onPatch: (itemId: string, patch: Partial<Item>) => void;
  onRemove: (itemId: string) => void;
  /** Pomieszczenia wyceny — pozycja parametryczna bez nich policzy samą bazę. */
  rooms: Room[];
  /** Dane dokumentu do placeholderów w opisie (F4.2). Stabilna referencja. */
  textInfo: DocumentTextInfo;
  /** Tryb liczenia (F2.1) — w trybie godzinowym liczby są minutami. */
  pricing: PricingContext;
  /** Warianty po id wpisu bibliotecznego (F1.4). Referencja musi być stabilna. */
  variants: VariantOptions;
  onVariantChange: (itemId: string, variant: ItemVariant) => void;
}

/**
 * Wiersz pozycji.
 *
 * `memo` jest tu **wymaganiem wydajnosciowym**, nie ozdoba: store dzieli
 * strukture (immer), wiec nietkniete pozycje dostaja ta sama referencje i przy
 * 300 wierszach edycja jednego pola nie renderuje rodzenstwa.
 *
 * Wyłączona pozycja **nie jest wyszarzana ani przekreslana** — zmienia sie tylko
 * kolor nazwy i kwoty. Klient ma dalej czytac, z czego rezygnuje.
 */
export const ItemRow = memo(function ItemRow({
  item,
  editing,
  currency,
  onToggle,
  onPatch,
  onRemove,
  rooms,
  textInfo,
  pricing,
  variants,
  onVariantChange,
}: ItemRowProps) {
  const isDiscount = item.kind === 'discount';
  // Wartość liczy domena, a nie wiersz: pozycja `per_room` to baza plus
  // składniki za pomieszczenia, więc `qty × cena` dałoby tu inną kwotę niż
  // w podsumowaniu wyceny.
  const valueCents = calcItemCents(item, rooms, pricing);
  // Wiersz niepowiązany z biblioteką nie ma wariantów — i nie musi ich mieć.
  const itemVariants = (item.libraryItemId && variants.get(item.libraryItemId)) || EMPTY_VARIANTS;
  const parametric = pricingSummary(item, rooms, currency);
  const godzinowa = pricing.pricingBasis === 'time';

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { kind: 'item', itemId: item.id, label: item.name },
    disabled: !editing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-center border-b py-[13px]',
        ITEM_ROW_GAP,
        'border-[var(--doc-hair)]',
        // Bez plakietki pod kursorem to SAM WIERSZ jest podglądem przeciągania,
        // więc musi zostać w pełni czytelny — tylko unosi się nad resztą.
        isDragging &&
          'relative z-20 rounded-[var(--radius-control)] bg-[var(--doc-surface)] shadow-[0_14px_30px_-10px_rgba(20,22,28,0.45)]',
      )}
      data-testid="item-row"
    >
      {editing ? (
        <DragHandle
          ref={setActivatorNodeRef}
          label={`${pl.editor.dragItem}: ${item.name || pl.editor.newItemName}`}
          {...attributes}
          {...listeners}
        />
      ) : null}

      <ItemToggle
        checked={item.enabled}
        onChange={() => onToggle(item.id)}
        label={`${pl.editor.toggleItem}: ${item.name || pl.editor.newItemName}`}
      />

      <div className="min-w-0 flex-1">
        {/* Wariant ZASTĘPUJE nazwę, a nie stoi obok niej — inaczej dałoby się
            wpisać „Wizualizacja 3D" przy wybranym wariancie 360. */}
        {editing && itemVariants.length > 1 ? (
          <ItemVariantSelect
            variants={itemVariants}
            currentId={item.libraryItemId}
            onChange={(variant) => onVariantChange(item.id, variant)}
          />
        ) : (
          <InlineText
            value={item.name}
            onCommit={(name) => onPatch(item.id, { name })}
            readOnly={!editing}
            placeholder={pl.editor.newItemName}
            ariaLabel={pl.editor.itemNameLabel}
            className={cn(
              'inline-field text-[14.5px] font-semibold',
              item.enabled ? 'text-[var(--doc-ink)]' : 'text-[var(--doc-ink-soft)]',
            )}
          />
        )}
        {editing || item.description ? (
          <InlineText
            value={item.description}
            onCommit={(description) => onPatch(item.id, { description })}
            readOnly={!editing}
            // W edycji surowy tekst, w podgladzie podstawiony — inaczej nie
            // dalo by sie poprawic placeholdera, ktory sie nie podstawil.
            display={renderText(item.description, itemTextContext(textInfo, item))}
            multiline
            placeholder={pl.editor.newItemDescription}
            ariaLabel={pl.editor.itemDescriptionLabel}
            className="inline-field text-[13px] leading-[1.55] text-[var(--doc-ink-soft)]"
          />
        ) : null}
      </div>

      {editing && item.pricing.mode === 'per_frame' ? (
        // Wizualizacja bez liczby kadrów liczy się jak jeden kadr, więc bez
        // tego pola tryb `per_frame` byłby w praktyce nieużywalny.
        <input
          type="number"
          min={1}
          step={1}
          value={item.frames ?? 1}
          aria-label={pl.editor.itemFramesLabel}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isInteger(next) && next > 0) onPatch(item.id, { frames: next });
          }}
          className={cn(COL_QTY, 'inline-field price-field amount px-1 py-[2px] text-right text-[14.5px]')}
        />
      ) : editing ? (
        <input
          type="number"
          min={0}
          step="0.5"
          value={item.qty}
          aria-label={pl.editor.itemQtyLabel}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            onPatch(item.id, { qty: Number.isFinite(next) && next > 0 ? next : 1 });
          }}
          className={cn(COL_QTY, 'inline-field price-field amount px-1 py-[2px] text-right text-[14.5px]')}
        />
      ) : item.qty !== 1 || unitLabel(item.unit, item.unitLabel) ? (
        /*
         * W podgladzie ilosc pokazujemy, gdy wnosi informacje: albo jest inna
         * niz 1, albo ma jednostke („80 m²"). „1 ×" przy kazdej pozycji tylko
         * zasmiecaloby wiersz, ale „1 wizyta ×" juz cos mowi.
         */
        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">
          {formatQty(item.qty, item.unit, item.unitLabel)} ×
        </span>
      ) : null}

      <div className={cn(COL_PRICE, 'flex flex-col items-end')}>
        <div
          className={cn(
            'flex items-center justify-end gap-0.5 text-[14.5px]',
            isDiscount
              ? item.enabled
                ? 'text-[var(--doc-terracotta)]'
                : 'text-[var(--doc-price-off)]'
              : item.enabled
                ? 'text-[var(--doc-ink-soft)]'
                : 'text-[var(--doc-price-off)]',
          )}
        >
          {isDiscount ? <span aria-hidden>−</span> : null}
          {editing && parametric === null && godzinowa ? (
            /*
             * W trybie godzinowym edytuje się MINUTY, a kwota jest wynikiem.
             * Pole ze złotówkami sugerowałoby, że da się ją wpisać wprost —
             * a wpisana kwota i tak przeliczyłaby się z powrotem na minuty
             * i wróciła zaokrąglona.
             */
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={5}
                value={item.unitPriceCents ?? 0}
                aria-label={pl.editor.itemMinutesLabel}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  onPatch(item.id, {
                    unitPriceCents: Number.isInteger(next) && next >= 0 ? next : 0,
                  });
                }}
                className="inline-field price-field amount w-[64px] px-1 py-[2px] text-right text-[14.5px]"
              />
              <span className="text-[12px] text-[var(--doc-ink-soft)]">min</span>
              <span aria-hidden className="text-[12px] text-[var(--doc-ink-soft)]">
                →
              </span>
              <span className="amount">{formatMoney(valueCents, currency)}</span>
            </span>
          ) : editing ? (
            /*
             * Cena jest edytowalna ZAWSZE w trybie edycji (T-115) — także gdy
             * pozycja przyszła z biblioteki lub szablonu bez ceny („wycena
             * indywidualna") i także dla pozycji parametrycznej.
             *
             * Do tej pory `null` pokazywał sam napis, a pozycja parametryczna
             * samą kwotę wynikową. Człowiek, który wziął szablon startowy
             * (wszystkie ceny puste, połowa pozycji „za pomieszczenie"), nie
             * miał gdzie wpisać stawki — musiał iść do biblioteki, żeby
             * wycenić JEDNĄ ofertę. Teraz: puste pole z podpowiedzią, wpisanie
             * kwoty nadaje cenę, wyczyszczenie wraca do „ustalimy osobno".
             *
             * Dla reguły `per_room`/`per_frame` pole edytuje BAZĘ (część
             * niezależną od pomieszczeń); składniki za pomieszczenia dochodzą
             * z cennika i są opisane dopiskiem pod kwotą.
             */
            <InlineMoney
              cents={priceFieldCents(item)}
              currency={currency}
              nullable
              placeholder={pl.editor.individualPrice}
              onCommit={(cents) => onPatch(item.id, priceFieldPatch(item, cents))}
              onClear={() => onPatch(item.id, priceFieldPatch(item, null))}
              ariaLabel={pl.editor.itemPriceLabel}
              className="price-field inline-field amount w-[76px] text-[14.5px]"
            />
          ) : item.unitPriceCents === null ? (
            /*
             * „Wycena indywidualna" (T-60) — pozycja jest w ofercie, ale ceny
             * nie ma i NIE wchodzi do sumy. Zero w tym miejscu znaczyłoby
             * „gratis", a to zupełnie co innego niż „ustalimy osobno".
             */
            <span className="text-[13px] text-[var(--doc-ink-soft)] italic">
              {pl.editor.individualPrice}
            </span>
          ) : (
            <span className="amount">{formatMoney(valueCents, currency)}</span>
          )}
        </div>

        {parametric ? (
          // Skąd ta kwota. Bez tego pozycja liczona za pomieszczenie pokazuje
          // liczbę, której użytkownik nie umie sprawdzić — a automatowi, którego
          // nie da się prześledzić, nikt nie ufa.
          <span className="text-[11px] whitespace-nowrap text-[var(--doc-ink-soft)]">
            {parametric}
          </span>
        ) : null}
      </div>

      {/*
        PRZEŁĄCZNIK „komunikacja projektowa" ZDJĘTY (poprawka 7, 2026-08-27).

        Był to okrągły przycisk z ikoną dymka przy każdej pozycji. Nie zmieniał
        ani ceny, ani treści dokumentu — dokładał tylko wiersz „w tym
        komunikacja" do wyliczenia pracochłonności, którego nikt nie czytał,
        a przy pozycji wyglądał jak coś, co robi z nią COŚ.

        Sama etykieta zostaje w danych i w `calcWorkload`: wyceny, w których
        ją kiedyś zaznaczono, dalej pokazują ten wiersz. Nowych już nie
        przybędzie — i o to chodziło.
      */}

      {editing ? (
        <button
          type="button"
          aria-label={`${pl.editor.removeItem}: ${item.name || pl.editor.newItemName}`}
          onClick={() => onRemove(item.id)}
          className={cn(
            COL_ACTIONS,
            'flex h-[22px] items-center justify-center rounded-full text-base leading-none',
            'text-[var(--doc-ink-soft)] transition-colors',
            'hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          <Trash2 className="size-[13px]" aria-hidden />
        </button>
      ) : null}
    </div>
  );
});
