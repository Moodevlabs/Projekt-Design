import { pl } from '@/i18n/pl';

/**
 * Nagłówek kolumn nad pozycjami — **tylko w edycji**.
 *
 * Wiersz pozycji ma cztery strefy (przełącznik · nazwa · ilość · cena) i bez
 * podpisu trzeba było zgadywać, czym jest liczba „1" obok kwoty. Szerokości
 * odpowiadają `ItemRow`: uchwyt 14 px + przełącznik 46 px, pole ilości 56 px,
 * kolumna ceny 86 px, trzy przyciski po 22 px z odstępami 14 px.
 *
 * W podglądzie nagłówka nie ma — papier idący do klienta mówi to samo
 * układem, a etykieta „Ilość" przy pozycji „1 ×" byłaby szumem.
 */
export function ItemsColumnsHeader() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-[14px] pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--doc-ink-soft)] uppercase"
    >
      <span className="w-[14px] shrink-0" />
      <span className="w-[46px] shrink-0" />
      <span className="min-w-0 flex-1">{pl.editor.itemsColName}</span>
      <span className="w-14 shrink-0 text-right">{pl.editor.itemsColQty}</span>
      <span className="min-w-[86px] shrink-0 text-right">{pl.editor.itemsColPrice}</span>
      <span className="w-[94px] shrink-0" />
    </div>
  );
}
