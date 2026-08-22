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

/** Formatuje grosze do postaci prezentacyjnej, np. `120050` → `1 200,50 zł`. */
export function formatMoney(cents: number, currency = 'PLN'): string {
  const formatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency });
  return formatter.format(roundCents(cents) / 100);
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
