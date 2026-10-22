import { describe, expect, it } from 'vitest';

import { newGroup, newItem, newQuoteBody, newRoom, newSection } from '../quote/factory';
import { briefQuestions, libraryEntries, pricingChoiceWords, quoteView } from './payloads';

describe('briefQuestions', () => {
  it('oddaje tylko pytania z odpowiedzią, listy wyborów skleja przecinkiem', () => {
    const payload = briefQuestions({
      template: [
        {
          id: 's1',
          title: 'Obiekt',
          hint: '',
          questions: [
            {
              id: 'q1',
              label: 'Metraż',
              kind: 'number',
              hint: '',
              placeholder: '',
              options: [],
              required: false,
            },
            {
              id: 'q2',
              label: 'Styl',
              kind: 'multi',
              hint: '',
              placeholder: '',
              options: [],
              required: false,
            },
            {
              id: 'q3',
              label: 'Uwagi',
              kind: 'text',
              hint: '',
              placeholder: '',
              options: [],
              required: false,
            },
          ],
        },
      ],
      answers: { q1: '62', q2: ['skandynawski', 'jasny'], q3: '   ' },
    });

    expect(payload.questions).toEqual([
      { section: 'Obiekt', question: 'Metraż', answer: '62' },
      { section: 'Obiekt', question: 'Styl', answer: 'skandynawski, jasny' },
    ]);
  });

  it('nie przenosi niczego poza pytaniami i odpowiedziami (A7)', () => {
    const payload = briefQuestions({ template: [], answers: {} });
    expect(Object.keys(payload)).toEqual(['questions']);
  });
});

describe('libraryEntries', () => {
  const categories = new Map([['c1', { code: '01', name: 'Projekt' }]]);

  it('tłumaczy regułę na słowa, dodaje etykietę grupy i pomija nieaktywne', () => {
    const entries = libraryEntries(
      [
        {
          id: 'a',
          name: 'Koncepcja',
          description: 'x'.repeat(300),
          unitPriceCents: 120000,
          unit: 'm2',
          pricing: { mode: 'flat' },
          categoryId: 'c1',
          active: true,
        },
        {
          id: 'b',
          name: 'Nieaktywna',
          description: '',
          unitPriceCents: 1,
          unit: 'lump',
          pricing: { mode: 'flat' },
          categoryId: null,
          active: false,
        },
        {
          id: 'c',
          name: 'Indywidualna',
          description: '',
          unitPriceCents: null,
          unit: 'lump',
          pricing: { mode: 'flat' },
          categoryId: null,
        },
      ],
      categories,
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: 'a',
      category: '01 · Projekt',
      pricing: 'za m²',
      priceCents: 120000,
    });
    expect(entries[0]!.description).toHaveLength(200);
    expect(entries[1]).toMatchObject({ id: 'c', pricing: 'indywidualnie', priceCents: null });
  });

  it('własna jednostka dostaje jej nazwę', () => {
    expect(pricingChoiceWords('flat_custom', 'rysunek')).toBe('za rysunek');
    expect(pricingChoiceWords('flat_custom', null)).toBe('za własną jednostkę');
  });
});

describe('quoteView', () => {
  it('oddaje identyfikatory, stan i kwotę pozycji oraz etykietę pomieszczenia — bez klienta', () => {
    const room = newRoom({ label: 'kuchnia', qty: 2 });
    const item = newItem({ name: 'Rzuty', qty: 2, unitPriceCents: 10000, roomId: room.id });
    const grouped = newItem({ name: 'Indywidualna', unitPriceCents: null, enabled: false });
    const body = newQuoteBody({
      client: { name: 'Jan Kowalski', phone: '600', email: 'jan@example.com', city: 'Poznań' },
      rooms: [room],
      sections: [
        newSection({
          title: 'Projekt',
          items: [item],
          groups: [newGroup({ name: 'Dodatki', items: [grouped] })],
        }),
      ],
    });

    const view = quoteView(body);
    expect(JSON.stringify(view)).not.toContain('Kowalski');
    expect(view.rooms).toEqual([{ id: room.id, label: 'kuchnia', qty: 2 }]);
    expect(view.sections[0]!.items[0]).toMatchObject({
      id: item.id,
      enabled: true,
      qty: 2,
      roomLabel: 'kuchnia',
    });
    expect(view.sections[0]!.items[0]!.amount).toMatch(/200,00/);
    expect(view.sections[0]!.groups[0]!.items[0]).toMatchObject({
      enabled: false,
      amount: 'indywidualnie',
      roomLabel: null,
    });
  });
});

describe('quoteView — kwota pozycji liczona jak w podsumowaniu', () => {
  it('nadpisanie ręczne i tryb godzinowy dają tę samą kwotę, którą widzi klient', () => {
    const overridden = newItem({
      name: 'Ręcznie',
      qty: 3,
      unitPriceCents: 10000,
      priceOverrideCents: 50,
    });
    const hourly = newItem({ name: 'Godzinowa', qty: 1, unitPriceCents: 90 });
    const body = newQuoteBody({
      pricingBasis: 'time',
      hourlyRateCents: 20000,
      sections: [newSection({ title: 'Projekt', items: [overridden, hourly] })],
    });

    const [first, second] = quoteView(body).sections[0]!.items;
    // Nadpisanie to wartość pozycji w jednostkach dokumentu (minuty) → 50 min × 200 zł/h = 166,67 zł.
    expect(first!.amount).toMatch(/166,67/);
    // 90 minut × 200 zł/h = 300 zł, a nie „90 × 1".
    expect(second!.amount).toMatch(/300,00/);
  });
});
