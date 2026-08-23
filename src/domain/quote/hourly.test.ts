import { describe, expect, it } from 'vitest';
import {
  AMOUNT_BASIS,
  calcItemCents,
  calcItemUnits,
  calcQuoteTotals,
  calcWorkload,
  pricingContextOf,
  toCents,
  toMinutes,
} from './calc';
import { newItem, newQuoteBody, newSection } from './factory';
import type { PricingContext } from './calc';

/** 60 zł/h = 6000 gr/h, czyli **1 minuta = 1 złotówka** (100 groszy). */
const RATE_60: PricingContext = { pricingBasis: 'time', hourlyRateCents: 6_000 };
/** 200 zł/h — stawka z arkusza (`K22`). */
const RATE_200: PricingContext = { pricingBasis: 'time', hourlyRateCents: 20_000 };

describe('toCents', () => {
  it('w trybie kwotowym nic nie zmienia', () => {
    expect(toCents(12_345, AMOUNT_BASIS)).toBe(12_345);
  });

  it('w trybie godzinowym liczy minuty × stawka / 60', () => {
    // 90 min przy 200 zł/h = 1,5 h × 200 zł = 300 zł.
    expect(toCents(90, RATE_200)).toBe(30_000);
  });

  it('BRAK stawki daje 0, a nie wyjątek', () => {
    // Wycena bez stawki jest niedokończona, ale ma się otwierać i dawać
    // poprawić. Wyjątek z funkcji liczącej zamieniłby brakujące pole w biały
    // ekran.
    expect(toCents(90, { pricingBasis: 'time', hourlyRateCents: null })).toBe(0);
  });

  it('zaokrągla do pełnego grosza', () => {
    // 7 min przy 100 zł/h = 11,666… zł → 11,67 zł.
    expect(toCents(7, { pricingBasis: 'time', hourlyRateCents: 10_000 })).toBe(1_167);
  });
});

describe('toMinutes', () => {
  it('jest odwrotnością `toCents` przy stawce 60 zł/h', () => {
    // 60 zł/h → minuta kosztuje złotówkę, więc 45 zł to 45 minut pracy.
    expect(toMinutes(4_500, RATE_60)).toBe(45);
    expect(toCents(45, RATE_60)).toBe(4_500);
  });

  it('w trybie kwotowym zwraca 0 — nie ma z czego liczyć minut', () => {
    expect(toMinutes(12_345, AMOUNT_BASIS)).toBe(0);
  });
});

describe('kontrola parytetu: 1 min = 1 zł przy 60 zł/h', () => {
  /*
   * Test kontrolny z `FEATURES §F2.1`. Przy 60 zł/h minuta pracy kosztuje
   * dokładnie złotówkę, więc wycena godzinowa na 690 minut musi dać tyle samo,
   * co kwotowa na 690 zł. Gdyby te liczby się rozjechały, konwersja jednostek
   * gdzieś się gubi.
   *
   * (Pierwsza wersja tego testu zakładała „1 min = 1 grosz" i padła: 60 zł/h
   * to 6000 groszy na 60 minut, czyli 100 groszy za minutę. Zostawiam tę
   * uwagę, bo pomyłkę łatwo powtórzyć.)
   */
  const MINUTY_A = 120;
  const MINUTY_B = 450;

  function wycena(pricingBasis: 'amount' | 'time') {
    // W trybie kwotowym te same wielkości wyrażamy w groszach: minuta = 100 gr.
    const mnoznik = pricingBasis === 'time' ? 1 : 100;
    return newQuoteBody({
      pricingBasis,
      hourlyRateCents: pricingBasis === 'time' ? 6_000 : null,
      vatRate: 23,
      sections: [
        newSection({
          title: 'Projekt',
          items: [
            newItem({ name: 'Koncepcja', qty: 2, unitPriceCents: MINUTY_A * mnoznik }),
            newItem({ name: 'Rysunki', qty: 1, unitPriceCents: MINUTY_B * mnoznik }),
          ],
        }),
      ],
    });
  }

  it('sumy zgadzają się co do grosza', () => {
    const kwotowa = calcQuoteTotals(wycena('amount'));
    const godzinowa = calcQuoteTotals(wycena('time'));

    expect(godzinowa).toEqual(kwotowa);
    // (2×120 + 450) minut = 690 minut = 690 zł = 69 000 gr netto.
    expect(godzinowa.netCents).toBe(69_000);
  });

  it('pracochłonność zgadza się z tym, co wpisano', () => {
    expect(calcWorkload(wycena('time')).minutesTotal).toBe(690);
  });
});

describe('parytet z arkuszem (K22)', () => {
  it('(100 + 100) × qty × 200/60', () => {
    // Arkusz: dwie składowe po 100 min, ilość 3, stawka 200 zł/h.
    const item = newItem({ name: 'Etap', qty: 3, unitPriceCents: 200 });
    const oczekiwane = Math.round(((200 * 3) / 60) * 20_000);

    expect(calcItemCents(item, [], RATE_200)).toBe(oczekiwane);
    expect(calcItemCents(item, [], RATE_200)).toBe(200_000);
  });

  it('zaokrąglamy PER POZYCJĘ — arkusz nie zaokrągla wcale', () => {
    /*
     * Świadoma różnica wobec Excela. Przy stawce niepodzielnej przez 60
     * (tu 100 zł/h) wartość minuty ma nieskończone rozwinięcie, więc arkusz
     * niesie ułamek groszy dalej, a my go ucinamy na każdej pozycji.
     *
     * Wybór jest po stronie użytkownika: kwoty wierszy MUSZĄ się dodawać do
     * pokazanej sumy. Klient, który zsumuje kolumnę i dostanie inną liczbę niż
     * w podsumowaniu, ma prawo stracić zaufanie do całej oferty.
     */
    const stawka: PricingContext = { pricingBasis: 'time', hourlyRateCents: 10_000 };
    const pozycje = [
      newItem({ name: 'A', unitPriceCents: 7 }),
      newItem({ name: 'B', unitPriceCents: 7 }),
      newItem({ name: 'C', unitPriceCents: 7 }),
    ];

    const perPozycja = pozycje.reduce((sum, item) => sum + calcItemCents(item, [], stawka), 0);
    const bezZaokraglen = Math.round(((7 * 3) / 60) * 10_000);

    expect(perPozycja).toBe(3 * 1_167); // 3501
    expect(bezZaokraglen).toBe(3_500);
    // Różnica jednego grosza jest CENĄ za zgodność kolumny z podsumowaniem.
    expect(perPozycja - bezZaokraglen).toBe(1);
  });
});

describe('calcWorkload', () => {
  const body = newQuoteBody({
    pricingBasis: 'time',
    hourlyRateCents: 6_000,
    sections: [
      newSection({
        title: 'Projekt',
        items: [
          newItem({ name: 'Koncepcja', qty: 2, unitPriceCents: 90 }),
          newItem({ name: 'Wyłączona', unitPriceCents: 500, enabled: false }),
        ],
      }),
      newSection({
        title: 'Nadzór',
        items: [newItem({ name: 'Wizyta', unitPriceCents: 120 })],
      }),
    ],
  });

  it('sumuje minuty per sekcja i łącznie', () => {
    const workload = calcWorkload(body);

    expect(workload.minutesBySection.map((s) => [s.title, s.minutes])).toEqual([
      ['Projekt', 180],
      ['Nadzór', 120],
    ]);
    expect(workload.minutesTotal).toBe(300);
  });

  it('pomija pozycje wyłączone — to praca, której nie będzie', () => {
    expect(calcWorkload(body).minutesTotal).toBe(300);
  });

  it('w trybie kwotowym zwraca zera, zamiast zgadywać', () => {
    // Przeliczenie groszy na minuty wymagałoby stawki, której wycena kwotowa
    // nie musi mieć.
    const kwotowa = newQuoteBody({
      sections: [newSection({ title: 'X', items: [newItem({ name: 'A', unitPriceCents: 500 })] })],
    });

    expect(calcWorkload(kwotowa)).toEqual({ minutesTotal: 0, minutesBySection: [] });
  });
});

describe('jednostki vs grosze', () => {
  it('`calcItemUnits` zwraca to, co wpisano — bez względu na tryb', () => {
    const item = newItem({ name: 'Etap', qty: 2, unitPriceCents: 45 });
    expect(calcItemUnits(item)).toBe(90);
  });

  it('`calcItemCents` w trybie godzinowym NIE zwraca minut', () => {
    // Sedno pułapki nazw: „45" w wycenie godzinowej to 45 minut, a nie 45 gr.
    const item = newItem({ name: 'Etap', unitPriceCents: 45 });

    expect(calcItemUnits(item)).toBe(45);
    expect(calcItemCents(item, [], RATE_200)).toBe(15_000); // 45 min × 200 zł/h
  });

  it('`pricingContextOf` bierze tryb i stawkę z dokumentu', () => {
    const body = newQuoteBody({ pricingBasis: 'time', hourlyRateCents: 9_900 });
    expect(pricingContextOf(body)).toEqual({ pricingBasis: 'time', hourlyRateCents: 9_900 });
  });
});
