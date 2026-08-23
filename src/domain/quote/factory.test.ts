import { describe, expect, it, vi } from 'vitest';
import {
  duplicateQuoteBody,
  fromTemplate,
  newGroup,
  newItem,
  newQuoteBody,
  newSection,
} from './factory';

// newId jest opakowany w osobny moduł właśnie po to, żeby dało się go zamockować.
vi.mock('../id', () => {
  let counter = 0;
  return {
    newId: (): string => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    },
  };
});

const idsOf = (body: ReturnType<typeof newQuoteBody>): string[] =>
  body.sections.flatMap((section) => [
    section.id,
    ...section.items.map((i) => i.id),
    ...section.groups.flatMap((group) => [group.id, ...group.items.map((i) => i.id)]),
  ]);

describe('fabryki', () => {
  it('newItem daje sensowne wartości domyślne', () => {
    expect(newItem()).toMatchObject({
      kind: 'item',
      name: 'Nowa pozycja',
      description: '',
      qty: 1,
      unitPriceCents: 0,
      enabled: true,
      libraryItemId: null,
    });
  });

  it('newItem przyjmuje nadpisania', () => {
    expect(newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 5000 })).toMatchObject({
      name: 'Rabat',
      kind: 'discount',
      unitPriceCents: 5000,
    });
  });

  it('newGroup i newSection są puste na start', () => {
    expect(newGroup()).toMatchObject({ name: 'Nowa grupa', items: [] });
    expect(newSection()).toMatchObject({ title: 'Nowa sekcja', groups: [], items: [] });
  });

  it('newQuoteBody ma domyślne ustawienia wyceny', () => {
    expect(newQuoteBody()).toMatchObject({
      title: 'Wycena',
      validDays: 7,
      vatRate: 23,
      pricesInclude: 'net',
      sections: [],
      showDisabledItems: true,
      client: { name: '', phone: '', email: '', city: '' },
    });
  });

  it('każdy element dostaje unikalne id', () => {
    const ids = new Set([newItem().id, newItem().id, newGroup().id, newSection().id]);
    expect(ids.size).toBe(4);
  });
});

describe('duplicateQuoteBody', () => {
  const source = newQuoteBody({
    title: 'Wycena wnętrza',
    client: { name: 'Jan Kowalski', phone: '600100200', email: 'jan@example.com', city: '' },
    sections: [
      newSection({
        title: 'Projekt',
        items: [newItem({ name: 'Koncepcja', unitPriceCents: 250000 })],
        groups: [newGroup({ name: 'Kuchnia', items: [newItem({ name: 'Rzuty' })] })],
      }),
    ],
  });

  it('podmienia wszystkie identyfikatory', () => {
    const copy = duplicateQuoteBody(source);
    const before = new Set(idsOf(source));
    for (const id of idsOf(copy)) {
      expect(before.has(id)).toBe(false);
    }
    expect(idsOf(copy)).toHaveLength(idsOf(source).length);
  });

  it('zachowuje dane i klienta', () => {
    const copy = duplicateQuoteBody(source);
    expect(copy.title).toBe('Wycena wnętrza');
    expect(copy.client).toEqual(source.client);
    expect(copy.sections[0]?.groups[0]?.items[0]?.name).toBe('Rzuty');
  });

  it('nie mutuje oryginału', () => {
    const snapshot = structuredClone(source);
    const copy = duplicateQuoteBody(source);
    copy.sections[0]?.items.push(newItem({ name: 'Dopisek' }));
    expect(source).toEqual(snapshot);
  });
});

describe('fromTemplate', () => {
  it('czyści dane inwestora, zachowując strukturę', () => {
    const template = newQuoteBody({
      title: 'Szablon standard',
      client: { name: 'Jan', phone: '600', email: 'j@x.pl', city: '' },
      sections: [newSection({ items: [newItem({ name: 'Koncepcja' })] })],
    });

    const created = fromTemplate(template);
    expect(created.client).toEqual({ name: '', phone: '', email: '', city: '' });
    expect(created.title).toBe('Szablon standard');
    expect(created.sections[0]?.items[0]?.name).toBe('Koncepcja');
    expect(created.sections[0]?.id).not.toBe(template.sections[0]?.id);
  });
});
