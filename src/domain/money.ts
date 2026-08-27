/**
 * Pieniądze w całej aplikacji trzymamy jako **liczby całkowite w groszach**.
 * Ten moduł jest jedynym miejscem, w którym grosze zamieniamy na tekst i odwrotnie.
 */

/** Znaki traktowane jako separator tysięcy (spacje zwykłe, twarde i wąskie). */
const WHITESPACE = /[\s\u00A0\u202F\u2007\u2009\u2060]/g;

/** Oznaczenia walut, które użytkownik może wkleić razem z kwotą. */
const CURRENCY_MARKS = /(zł|zl|pln|eur|usd|gbp|€|\$|£)/gi;

/** Separator dziesiętny lub tysięczny w zapisie liczby. */
const SEPARATORS = /[.,]/g;

/** Zapis pogrupowany tysiącami, np. `1 234 567` po usunięciu spacji → `1.234.567`. */
const THOUSANDS_GROUPED = /^\d{1,3}([.,]\d{3})+$/;

/**
 * Zaokrąglenie do pełnych groszy metodą „half away from zero”
 * (0,5 gr → 1 gr, −0,5 gr → −1 gr) — symetryczne dla rabatów i dopłat.
 */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Waluty, w których da się wystawić ofertę (T-24).
 *
 * Lista jest ZAMKNIĘTA i krótka. Dowolny trzyliterowy kod przeszedłby przez
 * `Intl`, ale wpisany z literówką („PNL") dałby ofertę w walucie, której nie
 * ma — a błąd wyszedłby dopiero u klienta, na dokumencie z kwotą.
 *
 * Kolejność: złoty pierwszy, potem to, w czym polskie studia realnie
 * wystawiają oferty zagranicznym inwestorom.
 */
export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CZK', 'CHF', 'SEK', 'NOK'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(code: string): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code);
}

/**
 * Waluta do formatowania — nieznany kod cofamy do złotego.
 *
 * `Intl.NumberFormat` rzuca `RangeError` na niepoprawnym kodzie, a wycena
 * z uszkodzoną wartością w kolumnie ma się otworzyć i dać się poprawić,
 * a nie wywalić cały edytor.
 */
export function safeCurrency(code: string | null | undefined): Currency {
  return code && isCurrency(code) ? code : 'PLN';
}

/**
 * **Format liczb zostaje polski niezależnie od waluty.**
 *
 * `pl-PL` + `EUR` daje „1 200,50 €" — przecinek dziesiętny i spacja jako
 * separator tysięcy, czyli zapis, który czyta autor oferty. Przełączanie
 * całego formatu razem z walutą dałoby „€1,200.50" w polskim dokumencie:
 * kwota poprawna, dokument nieczytelny dla tego, kto go wystawia.
 *
 * Dlatego T-24 dokłada wybór WALUTY, a nie wybór locale'u.
 */
const LOCALE = 'pl-PL';

/** Formatuje grosze do postaci prezentacyjnej, np. `120050` → `1 200,50 zł`. */
export function formatMoney(cents: number, currency = 'PLN'): string {
  const formatter = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: safeCurrency(currency),
  });
  return formatter.format(roundCents(cents) / 100);
}

/**
 * Formatuje przedział cen do cennika usług dodatkowych (F6.2).
 *
 * Trzy decyzje, które widać w wyniku:
 *
 *  - **Waluta pada raz, na końcu**: `300–1 200 zł`, nie `300,00 zł – 1 200,00 zł`.
 *    Przedział ma się czytać jako jedna informacja, a nie dwie kwoty obok siebie.
 *  - **Grosze znikają, gdy obie kwoty są pełnymi złotymi.** Cennik operuje
 *    okrągłymi widełkami; `300,00–1 200,00 zł` to szum. Gdy któraś kwota ma
 *    grosze, pokazujemy je przy obu — inaczej wyglądałoby to na literówkę.
 *  - **Odwrócony przedział prostujemy.** `1200–300 zł` w dokumencie dla klienta
 *    czyta się jak błąd, a nie jak informacja; nie ma powodu go powielać.
 *
 * Separator tysięcy zostawiamy locale'owi: pl-PL (CLDR `min2`) pisze `1200 zł`,
 * ale `10 000 zł`. Wygląda to na przeoczenie, a jest regułą języka — i tak
 * samo zachowuje się `formatMoney`, więc cennik nie rozjeżdża się z ofertą.
 *
 * `max` równe `min` albo `null` znaczy „jedna cena", nie przedział.
 */
export function formatMoneyRange(
  minCents: number,
  maxCents: number | null = null,
  unit = '',
  currency = 'PLN',
): string {
  const dol = roundCents(minCents);
  const gora = maxCents === null ? dol : roundCents(maxCents);
  const od = Math.min(dol, gora);
  const do_ = Math.max(dol, gora);

  const grosze = od % 100 !== 0 || do_ % 100 !== 0;
  const cyfry = grosze ? 2 : 0;

  const zWaluta = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: cyfry,
    maximumFractionDigits: cyfry,
  });

  const kwota =
    od === do_
      ? zWaluta.format(do_ / 100)
      : `${new Intl.NumberFormat('pl-PL', {
          minimumFractionDigits: cyfry,
          maximumFractionDigits: cyfry,
        }).format(od / 100)}–${zWaluta.format(do_ / 100)}`;

  return unit ? `${kwota}/${unit}` : kwota;
}

/**
 * Parsuje tekst wpisany przez użytkownika na grosze (int).
 *
 * Obsługuje polskie formaty: `1 200`, `1200,50`, `1200.5`, `1 200,50 zł`, `-350`,
 * spacje twarde (\u00A0) i wąskie (\u202F). Zwraca `null` dla pustego wejścia
 * i dla tekstu, którego nie da się zinterpretować jako liczby.
 *
 * Heurystyka separatorów: zapis w całości pogrupowany tysiącami (`1.234`, `12,345`,
 * `1,234,567`) traktujemy jako liczbę całkowitą; w pozostałych przypadkach ostatnia
 * kropka/przecinek jest separatorem dziesiętnym, a wcześniejsze — tysięcy.
 */
export function parseMoney(input: string): number | null {
  const stripped = input.replace(WHITESPACE, '').replace(CURRENCY_MARKS, '');
  if (stripped === '') return null;

  const negative = stripped.startsWith('-');
  const digits = negative || stripped.startsWith('+') ? stripped.slice(1) : stripped;
  if (digits === '') return null;

  const parts = splitIntegerAndFraction(digits);
  if (parts === null) return null;

  const magnitude = toCents(parts.int, parts.frac);
  return negative ? -magnitude : magnitude;
}

/** Rozbija tekst liczby na część całkowitą i ułamkową; `null` gdy to nie jest liczba. */
function splitIntegerAndFraction(value: string): { int: string; frac: string } | null {
  let int: string;
  let frac: string;

  const mixedSeparators = value.includes(',') && value.includes('.');
  if (!mixedSeparators && THOUSANDS_GROUPED.test(value)) {
    int = value.replace(SEPARATORS, '');
    frac = '';
  } else {
    const lastSeparator = Math.max(value.lastIndexOf(','), value.lastIndexOf('.'));
    if (lastSeparator === -1) {
      int = value;
      frac = '';
    } else {
      int = value.slice(0, lastSeparator).replace(SEPARATORS, '');
      frac = value.slice(lastSeparator + 1);
    }
  }

  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return null;
  if (int === '' && frac === '') return null;
  return { int, frac };
}

/** Składa grosze z części całkowitej i ułamkowej, zaokrąglając trzecią cyfrę po przecinku. */
function toCents(int: string, frac: string): number {
  const padded = `${frac}000`.slice(0, 3);
  const wholeCents = Number(padded.slice(0, 2));
  const thirdDigit = Number(padded.slice(2, 3));
  const integerPart = int === '' ? 0 : Number(int);
  return integerPart * 100 + wholeCents + (thirdDigit >= 5 ? 1 : 0);
}
