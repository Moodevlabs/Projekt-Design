import { newId } from '../id';
import { PriceListDocSchema, type PriceListDoc, type PriceListItem } from './price-list';

/**
 * Domyślny cennik usług dodatkowych (F6.2).
 *
 * Trzy grupy z arkusza `CENNIK USŁUG DODATKOWYCH`: opracowania techniczne,
 * wizualizacje, spotkania i komunikacja.
 *
 * **Kwoty i terminy są naszą propozycją, nie przepisaniem arkusza** — samego
 * pliku nie ma w repozytorium. Struktura i podział zgodne ze specyfikacją;
 * liczby trzeba skonfrontować z oryginałem, zanim dokument pójdzie do klienta.
 * To i tak punkt wyjścia do edycji, nie cudzy cennik.
 */
export type PriceListTemplateItem = Omit<PriceListItem, 'id'>;

const TECHNICZNE = 'Opracowania techniczne';
const WIZUALIZACJE = 'Wizualizacje';
const SPOTKANIA = 'Spotkania i komunikacja';

function pozycja(
  sectionLabel: string,
  name: string,
  description: string,
  priceMinCents: number,
  extra: Partial<PriceListTemplateItem> = {},
): PriceListTemplateItem {
  return {
    name,
    description,
    priceMinCents,
    priceMaxCents: null,
    unit: '',
    leadTime: '',
    // `null`, nie 0: „nie wiadomo, ile to dołoży do terminu" to inna
    // informacja niż „niczego nie wydłuża" (T-64).
    addedDays: null,
    sectionLabel,
    ...extra,
  };
}

const SZABLON: PriceListTemplateItem[] = [
  pozycja(
    TECHNICZNE,
    'Dodatkowy rzut techniczny',
    'Rysunek wykonawczy pomieszczenia spoza zakresu oferty.',
    30000,
    { priceMaxCents: 120000, leadTime: '4–7 dni roboczych', addedDays: 4 },
  ),
  pozycja(TECHNICZNE, 'Kład ściany', 'Widok ściany z wymiarami i rozrysem okładzin.', 15000, {
    priceMaxCents: 40000,
    leadTime: '3–5 dni roboczych',
    addedDays: 3,
  }),
  pozycja(
    TECHNICZNE,
    'Projekt zabudowy meblowej',
    'Detal stolarski do wyceny u wykonawcy.',
    40000,
    { priceMaxCents: 150000, leadTime: '5–10 dni roboczych', addedDays: 5 },
  ),
  pozycja(
    TECHNICZNE,
    'Aktualizacja dokumentacji',
    'Naniesienie zmian po decyzjach inwestora lub zmianie wykonawcy.',
    25000,
    { unit: 'h', priceMaxCents: null, leadTime: 'do 5 dni roboczych', addedDays: 5 },
  ),

  pozycja(
    WIZUALIZACJE,
    'Dodatkowy kadr',
    'Kolejne ujęcie pomieszczenia objętego projektem.',
    20000,
    {
      priceMaxCents: 45000,
      leadTime: '3–5 dni roboczych',
      addedDays: 3,
    },
  ),
  pozycja(
    WIZUALIZACJE,
    'Wizualizacja 360°',
    'Panorama pomieszczenia do obejrzenia w przeglądarce.',
    45000,
    {
      priceMaxCents: 90000,
      leadTime: '5–7 dni roboczych',
      addedDays: 5,
    },
  ),
  pozycja(
    WIZUALIZACJE,
    'Korekta wizualizacji poza turą',
    'Zmiany zgłoszone po zatwierdzeniu wizualizacji.',
    15000,
    { priceMaxCents: 60000, leadTime: '2–4 dni robocze', addedDays: 2 },
  ),

  pozycja(SPOTKANIA, 'Spotkanie dodatkowe', 'Spotkanie poza liczbą zawartą w ofercie.', 20000, {
    unit: 'h',
    leadTime: 'termin do uzgodnienia',
  }),
  pozycja(SPOTKANIA, 'Wyjazd do salonu', 'Wspólny dobór materiałów lub wyposażenia.', 25000, {
    unit: 'h',
    leadTime: 'termin do uzgodnienia',
  }),
  pozycja(SPOTKANIA, 'Nadzór na budowie', 'Wizyta kontrolna z notatką dla wykonawcy.', 30000, {
    priceMaxCents: 60000,
    leadTime: 'termin do uzgodnienia',
  }),
  pozycja(
    SPOTKANIA,
    'Konsultacja online',
    'Rozmowa z omówieniem dokumentacji, bez wizyty na miejscu.',
    15000,
    { unit: 'h', leadTime: 'w ciągu 3 dni roboczych', addedDays: 3 },
  ),
];

/** Pozycje szablonu ze świeżymi identyfikatorami. */
export function defaultPriceListItems(
  template: PriceListTemplateItem[] | null = null,
): PriceListItem[] {
  return (template ?? SZABLON).map((item) => ({ ...item, id: newId() }));
}

/** Nowy dokument „Cennik usług dodatkowych". */
export function newPriceListDoc(
  partial: Partial<PriceListDoc> = {},
  template: PriceListTemplateItem[] | null = null,
): PriceListDoc {
  return PriceListDocSchema.parse({ items: defaultPriceListItems(template), ...partial });
}
