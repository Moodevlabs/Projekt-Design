import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  formatMoney,
  formatMoneyRange,
  isCurrency,
  parseMoney,
  roundCents,
  safeCurrency,
} from './money';

/** ICU wstawia spacje twarde/wąskie — porównujemy po normalizacji. */
const norm = (value: string): string => value.replace(/[\s\u00A0\u202F]/g, ' ');

describe('roundCents', () => {
  it('zaokrągla w górę od połowy grosza', () => {
    expect(roundCents(10.4)).toBe(10);
    expect(roundCents(10.5)).toBe(11);
    expect(roundCents(10.6)).toBe(11);
  });

  it('jest symetryczne dla wartości ujemnych (half away from zero)', () => {
    expect(roundCents(-10.4)).toBe(-10);
    expect(roundCents(-10.5)).toBe(-11);
  });

  it('zwraca 0 dla wartości nieskończonych i NaN', () => {
    expect(roundCents(Number.NaN)).toBe(0);
    expect(roundCents(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('nie zmienia liczb całkowitych', () => {
    expect(roundCents(0)).toBe(0);
    expect(roundCents(12345)).toBe(12345);
  });
});

describe('formatMoney', () => {
  it('formatuje grosze w polskiej notacji z domyślną walutą PLN', () => {
    expect(norm(formatMoney(120050))).toBe('1200,50 zł');
    expect(norm(formatMoney(0))).toBe('0,00 zł');
    expect(norm(formatMoney(-35000))).toBe('-350,00 zł');
  });

  it('grupuje tysiące zgodnie z locale pl-PL (od 5 cyfr)', () => {
    expect(norm(formatMoney(1234567))).toBe('12 345,67 zł');
  });

  it('obsługuje inną walutę', () => {
    expect(norm(formatMoney(199900, 'EUR'))).toContain('€');
  });

  it('zaokrągla ułamkowe grosze przed formatowaniem', () => {
    expect(norm(formatMoney(1250.5))).toBe('12,51 zł');
  });
});

describe('parseMoney — poprawne formaty PL', () => {
  const cases: Array<[string, number]> = [
    ['1 200', 120000],
    ['1200,50', 120050],
    ['1200.5', 120050],
    ['1 200,50 zł', 120050],
    ['-350', -35000],
    [' 12 ', 1200],
    ['1\u00A0200,50', 120050],
    ['1\u202F200', 120000],
    ['1\u202F200,50 PLN', 120050],
    ['0', 0],
    ['0,01', 1],
    ['+15', 1500],
    [',5', 50],
    ['1.234.567,89', 123456789],
    ['1,234,567', 123456700],
    ['1.200', 120000],
    ['12,345', 1234500],
    ['-1 000,99zł', -100099],
  ];

  it.each(cases)('parseMoney(%j) === %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it('zaokrągla trzecią cyfrę po przecinku', () => {
    expect(parseMoney('1200,505')).toBe(120051);
    expect(parseMoney('1200,504')).toBe(120050);
    expect(parseMoney('1200,999')).toBe(120100);
  });
});

describe('parseMoney — wejście niepoprawne', () => {
  const garbage = ['', '   ', '\u00A0', 'abc', '12abc', 'zł', '--5', '1e3', '.', ',', 'NaN', '1/2'];

  it.each(garbage)('parseMoney(%j) === null', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});

describe('formatMoneyRange — cennik usług dodatkowych (F6.2)', () => {
  it('waluta pada raz, na końcu przedziału', () => {
    expect(norm(formatMoneyRange(30_000, 120_000))).toBe('300–1200 zł');
  });

  it('separator tysięcy zostawiamy locale’owi — tak jak `formatMoney`', () => {
    // pl-PL (CLDR `min2`) grupuje dopiero od pięciu cyfr: „1200 zł”, ale
    // „10 000 zł”. Wymuszenie grupowania tutaj rozjechałoby cennik z ofertą,
    // która jedzie w tej samej kopercie.
    expect(norm(formatMoneyRange(1_000_000, 2_000_000))).toBe('10 000–20 000 zł');
    expect(norm(formatMoney(120_050))).toBe(norm(formatMoneyRange(120_050)));
  });

  it('pełne złotówki idą bez groszy — cennik operuje okrągłymi widłekami', () => {
    expect(norm(formatMoneyRange(30_000, 120_000))).not.toContain(',00');
  });

  it('gdy którakolwiek kwota ma grosze, pokazujemy je przy OBU', () => {
    // Inaczej „300–1 200,50 zł” wyglądałoby na literówkę.
    const wynik = norm(formatMoneyRange(30_000, 120_050));
    expect(wynik).toBe('300,00–1200,50 zł');
  });

  it('brak górnej granicy znaczy JEDNĄ cenę, nie przedział', () => {
    expect(norm(formatMoneyRange(25_000))).toBe('250 zł');
    expect(norm(formatMoneyRange(25_000))).not.toContain('–');
  });

  it('górna równa dolnej też znaczy jedną cenę', () => {
    expect(norm(formatMoneyRange(25_000, 25_000))).toBe('250 zł');
  });

  it('jednostka dokleja się do kwoty', () => {
    expect(norm(formatMoneyRange(25_000, null, 'h'))).toBe('250 zł/h');
  });

  it('odwrócony przedział prostujemy — w dokumencie czyta się jak błąd', () => {
    expect(norm(formatMoneyRange(120_000, 30_000))).toBe(norm(formatMoneyRange(30_000, 120_000)));
  });

  it('szanuje walutę dokumentu', () => {
    expect(norm(formatMoneyRange(30_000, 120_000, '', 'EUR'))).toContain('€');
  });
});

describe('waluty (T-24)', () => {
  it('formatuje euro POLSKIM zapisem liczby', () => {
    // Sedno decyzji: waluta sie zmienia, format liczby NIE. Przecinek
    // dziesietny i symbol na koncu — a nie „€12,005.50" w polskim dokumencie.
    expect(norm(formatMoney(1_200_550, 'EUR'))).toBe('12 005,50 \u20ac');
  });

  /**
   * pl-PL (CLDR `min2`) nie grupuje liczb czterocyfrowych: „1200,50", ale
   * „12 005,50". Wyglada na przeoczenie, a jest regula jezyka — i tak samo
   * zachowuje sie `formatMoneyRange`, wiec cennik nie rozjezdza sie z oferta.
   */
  it('grupowanie min2 dziala tak samo w kazdej walucie', () => {
    expect(norm(formatMoney(120_050, 'EUR'))).toBe('1200,50 \u20ac');
    expect(norm(formatMoney(120_050, 'PLN'))).toBe('1200,50 z\u0142');
  });

  it('kazda waluta z listy formatuje sie bez wyjatku', () => {
    for (const code of CURRENCIES) {
      expect(() => formatMoney(100_00, code)).not.toThrow();
    }
  });

  /**
   * `Intl.NumberFormat` rzuca RangeError na niepoprawnym kodzie. Wycena
   * z uszkodzona wartoscia w kolumnie ma sie OTWORZYC i dac poprawic,
   * a nie wywalic edytora.
   */
  it('nieznany kod waluty cofa sie do zlotego zamiast rzucac', () => {
    expect(() => formatMoney(100_00, 'PNL')).not.toThrow();
    expect(norm(formatMoney(100_00, 'PNL'))).toBe(norm(formatMoney(100_00, 'PLN')));
  });

  it('safeCurrency przepuszcza znane i cofa nieznane', () => {
    expect(safeCurrency('EUR')).toBe('EUR');
    expect(safeCurrency('PNL')).toBe('PLN');
    expect(safeCurrency(null)).toBe('PLN');
    expect(safeCurrency(undefined)).toBe('PLN');
    expect(safeCurrency('')).toBe('PLN');
  });

  it('isCurrency rozpoznaje wylacznie kody z zamknietej listy', () => {
    expect(isCurrency('PLN')).toBe(true);
    expect(isCurrency('JPY')).toBe(false);
    expect(isCurrency('pln')).toBe(false);
  });

  it('przedzial cen tez idzie w wybranej walucie', () => {
    expect(norm(formatMoneyRange(300_00, 1_200_00, '', 'EUR'))).toContain('€');
  });
});
