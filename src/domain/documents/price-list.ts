import { z } from 'zod';
import { newId } from '../id';

/**
 * Dokument „Cennik usług dodatkowych" (F6.2).
 *
 * Różni się od pozycji wyceny jedną rzeczą, która zmienia wszystko: **cena
 * jest przedziałem, nie liczbą**. „Rzut techniczny: 300–1 200 zł" to uczciwa
 * odpowiedź na pytanie, na które przed obejrzeniem mieszkania nie da się
 * odpowiedzieć dokładnie. Wyceny takiej pozycji nie da się policzyć — i o to
 * chodzi: cennik jest **ofertą na rozmowę**, a nie zamówieniem.
 */

export const PriceListItemSchema = z.object({
  id: z.string().uuid(),
  /** Nazwa i opis miękko, jak wszędzie: parser pilnuje kształtu, nie treści. */
  name: z.string().default(''),
  description: z.string().default(''),
  /** Dolna granica ceny w groszach. Przy jednej cenie to po prostu ta cena. */
  priceMinCents: z.number().int().nonnegative().default(0),
  /**
   * Górna granica; `null` = jedna cena, nie przedział.
   *
   * Osobne pole zamiast `priceMaxCents = priceMinCents`, bo różnica jest
   * znacząca dla klienta: „300 zł" to zobowiązanie, „300–1 200 zł" to widełki.
   */
  priceMaxCents: z.number().int().nonnegative().nullable().default(null),
  /** Jednostka doklejana do kwoty: `h`, `m²`, `szt.`. Pusta = cena za całość. */
  unit: z.string().default(''),
  /** Termin realizacji, wolny tekst („4–7 dni roboczych"). */
  leadTime: z.string().default(''),
  /** Nagłówek grupy, np. „Opracowania techniczne". Pusty = pozycja luźna. */
  sectionLabel: z.string().default(''),
});
export type PriceListItem = z.infer<typeof PriceListItemSchema>;

export const PriceListDocSchema = z.object({
  /** Ważność — jak przy etapach, dłuższa niż oferty (arkusz: 14 dni). */
  validDays: z.number().int().nonnegative().default(14),
  items: z.array(PriceListItemSchema).default([]),
  footnote: z.string().default(''),
});
export type PriceListDoc = z.infer<typeof PriceListDocSchema>;

/**
 * Nowa pozycja cennika.
 *
 * Czyta wymienione pola i przepuszcza wynik przez schemat — ta sama zasada co
 * w `newRoom`/`newStageEntry`: akcje bywają podpinane wprost pod `onClick`,
 * a obiekt zdarzenia rozsypany do dokumentu wywraca zapis.
 */
export function newPriceListItem(partial: Partial<PriceListItem> = {}): PriceListItem {
  const domyslna: PriceListItem = {
    id: newId(),
    name: '',
    description: '',
    priceMinCents: 0,
    priceMaxCents: null,
    unit: '',
    leadTime: '',
    sectionLabel: '',
  };

  const kandydat: PriceListItem = {
    ...domyslna,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.name === undefined ? {} : { name: partial.name }),
    ...(partial.description === undefined ? {} : { description: partial.description }),
    ...(partial.priceMinCents === undefined ? {} : { priceMinCents: partial.priceMinCents }),
    ...(partial.priceMaxCents === undefined ? {} : { priceMaxCents: partial.priceMaxCents }),
    ...(partial.unit === undefined ? {} : { unit: partial.unit }),
    ...(partial.leadTime === undefined ? {} : { leadTime: partial.leadTime }),
    ...(partial.sectionLabel === undefined ? {} : { sectionLabel: partial.sectionLabel }),
  };

  return PriceListItemSchema.safeParse(kandydat).data ?? domyslna;
}

/** Pozycje pogrupowane po nagłówku, w kolejności pierwszego wystąpienia. */
export function groupPriceListItems(
  items: PriceListItem[],
): { label: string; items: PriceListItem[] }[] {
  const groups = new Map<string, PriceListItem[]>();

  for (const item of items) {
    const group = groups.get(item.sectionLabel);
    if (group) group.push(item);
    else groups.set(item.sectionLabel, [item]);
  }

  return [...groups].map(([label, group]) => ({ label, items: group }));
}
