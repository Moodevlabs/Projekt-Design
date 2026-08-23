import { describe, expect, it } from 'vitest';
import { calcWorkload, TAG_COMMUNICATION } from './calc';
import { newGroup, newItem, newQuoteBody, newSection } from './factory';

/** 120 zł/h = 12 000 gr/h, czyli 200 groszy za minutę. */
const RATE = 12_000;

describe('szacunek pracochłonności w trybie kwotowym (F2.3)', () => {
  const body = newQuoteBody({
    sections: [
      newSection({
        title: 'Projekt',
        items: [
          // 240 zł przy 120 zł/h = 2 h = 120 min.
          newItem({ name: 'Koncepcja', unitPriceCents: 24_000 }),
          // 60 zł = 30 min.
          newItem({ name: 'Konsultacja', unitPriceCents: 6_000 }),
        ],
      }),
    ],
  });

  it('liczy czas WSTECZ z ceny: kwota / stawka × 60', () => {
    const workload = calcWorkload(body, RATE);

    expect(workload.available).toBe(true);
    expect(workload.minutesTotal).toBe(150);
    expect(workload.minutesBySection[0]).toMatchObject({ title: 'Projekt', minutes: 150 });
  });

  it('bez stawki mówi „nie wiem", zamiast pokazywać zero', () => {
    const workload = calcWorkload(body);

    expect(workload.available).toBe(false);
    expect(workload.minutesTotal).toBe(0);
  });

  it('stawka zero jest traktowana jak brak — nie dzielimy przez zero', () => {
    expect(calcWorkload(body, 0).available).toBe(false);
  });

  it('wycena godzinowa IGNORUJE stawkę z ustawień', () => {
    // W trybie godzinowym minuty są w dokumencie wprost. Podstawienie tam
    // cudzej stawki przeliczyłoby je drugi raz.
    const godzinowa = newQuoteBody({
      pricingBasis: 'time',
      hourlyRateCents: 6_000,
      sections: [newSection({ title: 'X', items: [newItem({ name: 'A', unitPriceCents: 45 })] })],
    });

    expect(calcWorkload(godzinowa, 99_999).minutesTotal).toBe(45);
  });
});

describe('komunikacja projektowa', () => {
  function wycena() {
    return newQuoteBody({
      sections: [
        newSection({
          title: 'Projekt',
          items: [
            newItem({ name: 'Koncepcja', unitPriceCents: 24_000 }),
            newItem({ name: 'Spotkania', unitPriceCents: 6_000, tags: [TAG_COMMUNICATION] }),
          ],
          groups: [
            newGroup({
              name: 'Kuchnia',
              items: [
                newItem({ name: 'Telefony', unitPriceCents: 12_000, tags: [TAG_COMMUNICATION] }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  it('wyodrębnia minuty oznaczone etykietą — także z grup', () => {
    const workload = calcWorkload(wycena(), RATE);

    // 60 zł + 120 zł = 30 + 60 = 90 min komunikacji.
    expect(workload.communicationMinutes).toBe(90);
  });

  it('komunikacja jest WLICZONA w sumę, a nie doliczona obok', () => {
    // Inaczej suma w popoverze nie zgadzałaby się z sumą per sekcja
    // i wyglądałaby na policzoną dwa razy.
    const workload = calcWorkload(wycena(), RATE);

    expect(workload.minutesTotal).toBe(210);
    expect(workload.communicationMinutes).toBeLessThan(workload.minutesTotal);
    expect(workload.minutesBySection[0]?.minutes).toBe(210);
  });

  it('bez oznaczonych pozycji daje zero, a nie całą sumę', () => {
    const bezTagow = newQuoteBody({
      sections: [newSection({ title: 'X', items: [newItem({ name: 'A', unitPriceCents: 6_000 })] })],
    });

    expect(calcWorkload(bezTagow, RATE).communicationMinutes).toBe(0);
  });

  it('nieznana etykieta niczego nie psuje', () => {
    // `tags` to luźna lista notatek o charakterze pracy — nieznana wartość
    // ma być pomijana, a nie wywracać liczenie.
    const dziwny = newQuoteBody({
      sections: [
        newSection({
          title: 'X',
          items: [newItem({ name: 'A', unitPriceCents: 6_000, tags: ['cokolwiek', 'meeting'] })],
        }),
      ],
    });

    const workload = calcWorkload(dziwny, RATE);
    expect(workload.minutesTotal).toBe(30);
    expect(workload.communicationMinutes).toBe(0);
  });
});

describe('co się liczy do pracochłonności', () => {
  it('pomija rabaty — obniżka ceny to nie praca', () => {
    const body = newQuoteBody({
      sections: [
        newSection({
          title: 'X',
          items: [
            newItem({ name: 'Praca', unitPriceCents: 12_000 }),
            newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 6_000 }),
          ],
        }),
      ],
    });

    expect(calcWorkload(body, RATE).minutesTotal).toBe(60);
  });

  it('pomija pozycje wyłączone — to praca, której nie będzie', () => {
    const body = newQuoteBody({
      sections: [
        newSection({
          title: 'X',
          items: [
            newItem({ name: 'Wchodzi', unitPriceCents: 12_000 }),
            { ...newItem({ name: 'Nie wchodzi', unitPriceCents: 60_000 }), enabled: false },
          ],
        }),
      ],
    });

    expect(calcWorkload(body, RATE).minutesTotal).toBe(60);
  });

  it('pusta wycena daje zero minut, ale liczby SĄ dostępne', () => {
    // „Zero minut" i „nie da się policzyć" to dwie różne odpowiedzi.
    const workload = calcWorkload(newQuoteBody({}), RATE);

    expect(workload.available).toBe(true);
    expect(workload.minutesTotal).toBe(0);
  });
});
