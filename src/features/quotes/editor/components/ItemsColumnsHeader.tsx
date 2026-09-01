import {
  COL_ACTIONS,
  COL_HANDLE,
  COL_PRICE,
  COL_QTY,
  COL_TOGGLE,
  ITEM_ROW_GAP,
} from './item-columns';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Nagłówek kolumn nad pozycjami — **tylko w edycji**.
 *
 * Wiersz pozycji ma cztery strefy (przełącznik · nazwa · ilość · cena) i bez
 * podpisu trzeba było zgadywać, czym jest liczba „1" obok kwoty.
 *
 * Szerokości bierze z `item-columns.ts`, wspólnych z `ItemRow` — wcześniej
 * były tu przepisane liczbowo i rozjechały się o 68 px. Uzasadnienie stoi
 * w tamtym pliku.
 *
 * W podglądzie nagłówka nie ma — papier idący do klienta mówi to samo
 * układem, a etykieta „Ilość" przy pozycji „1 ×" byłaby szumem.
 */
export function ItemsColumnsHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        'flex items-center pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--doc-ink-soft)] uppercase',
        ITEM_ROW_GAP,
      )}
    >
      <span className={COL_HANDLE} />
      <span className={COL_TOGGLE} />
      <span className="min-w-0 flex-1">{pl.editor.itemsColName}</span>
      <span className={cn(COL_QTY, 'text-right')}>{pl.editor.itemsColQty}</span>
      <span className={cn(COL_PRICE, 'text-right')}>{pl.editor.itemsColPrice}</span>
      <span className={COL_ACTIONS} />
    </div>
  );
}
