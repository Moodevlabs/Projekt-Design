/**
 * Szerokości kolumn wiersza pozycji — **jedno źródło dla nagłówka i wiersza**.
 *
 * Powód jest konkretny, nie estetyczny. `ItemsColumnsHeader` i `ItemRow` miały
 * te liczby przepisane osobno i rozjechały się o **68 px**: nagłówek rezerwował
 * z prawej 94 px (trzy przyciski po 22 px z odstępami 14 px), a wiersz ma dziś
 * jeden przycisk — dwa pozostałe zdjęto przy poprawce 7 (2026-08-27,
 * „komunikacja projektowa"). Do tego uchwyt przeciągania urósł do 18 px,
 * a nagłówek dalej liczył 14 px. Ponieważ kolumna nazwy jest elastyczna
 * (`flex-1`), cała różnica lądowała na niej i podpisy „Ilość" oraz „Cena"
 * wisiały o te 68 px w lewo od pól, które opisują.
 *
 * Stała w jednym miejscu nie naprawia tego raz — sprawia, że nie da się tego
 * zepsuć po raz drugi.
 */

/** Uchwyt przeciągania. Musi zgadzać się z `DragHandle`, który go używa. */
export const COL_HANDLE = 'w-[18px] shrink-0';

/** Przełącznik TAK/NIE — 46×26, wymiar z prototypu (patrz `ItemToggle`). */
export const COL_TOGGLE = 'w-[46px] shrink-0';

/** Ilość: pole 56 px, treść do prawej. */
export const COL_QTY = 'w-14 shrink-0';

/**
 * Cena. `min-w`, nie `w`: kwota siedmiocyfrowa musi się zmieścić, a wiersz ma
 * ją pokazać w całości. Nagłówek używa TEJ SAMEJ klasy, więc przy szerszej
 * kwocie oba rosną razem.
 */
export const COL_PRICE = 'min-w-[86px] shrink-0';

/** Kosz. Jeden przycisk 22 px — od poprawki 7 nie ma tu nic więcej. */
export const COL_ACTIONS = 'w-[22px] shrink-0';

/** Odstęp między strefami wiersza. */
export const ITEM_ROW_GAP = 'gap-[14px]';
