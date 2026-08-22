/**
 * Numeracja wycen. Parytet z funkcją SQL `next_quote_number` (docs/02-DATABASE.md §2):
 * wzorzec z tokenami, licznik `seq` dopełniany zerami do 4 znaków.
 */

/** Domyślny wzorzec numeru wyceny (identyczny z fallbackiem w SQL). */
export const DEFAULT_NUMBER_PATTERN = 'WYC/{YYYY}/{MM}/{seq}';

/** Domyślna długość dopełnienia licznika zerami. */
const DEFAULT_SEQ_PAD = 4;

const TOKEN = /\{(YYYY|YY|MM|DD|seq(?::(\d+))?)\}/g;

/**
 * Buduje numer wyceny z wzorca.
 *
 * Tokeny: `{YYYY}`, `{YY}`, `{MM}`, `{DD}`, `{seq}` (dopełnione do 4 cyfr)
 * oraz `{seq:N}` (dopełnione do N cyfr). Nieznane tokeny zostają bez zmian.
 * Data brana jest w czasie lokalnym — tak jak `to_char(now(), ...)` w Postgresie.
 */
export function generateQuoteNumber(pattern: string, seq: number, date: Date = new Date()): string {
  const effectivePattern = pattern.trim() === '' ? DEFAULT_NUMBER_PATTERN : pattern;
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seqValue = Math.max(0, Math.trunc(seq));

  return effectivePattern.replace(TOKEN, (_match, token: string, padArg?: string) => {
    switch (token) {
      case 'YYYY':
        return year;
      case 'YY':
        return year.slice(-2);
      case 'MM':
        return month;
      case 'DD':
        return day;
      default:
        return String(seqValue).padStart(seqPad(padArg), '0');
    }
  });
}

/** Zwraca żądaną długość dopełnienia licznika (`{seq}` → 4, `{seq:6}` → 6). */
function seqPad(padArg?: string): number {
  if (padArg === undefined) return DEFAULT_SEQ_PAD;
  const parsed = Number(padArg);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SEQ_PAD;
}
