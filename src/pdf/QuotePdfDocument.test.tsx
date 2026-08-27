import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePdfDocument } from './QuotePdfDocument';
import {
  groupHeading,
  preparedByLine,
  roomsSummaryLine,
  shouldPrintGroup,
  visibleItems,
} from './document-content';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import {
  newGroup,
  newItem,
  newQuoteBody,
  newSection,
  type QuoteBody,
  type Room,
} from '@/domain/quote';
import { newId } from '@/domain/id';

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: newId(),
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

/**
 * Render sprawdzamy tylko na to, ze **dokument sie sklada** i wychodzi z niego
 * prawidlowy plik. Tresci szukamy w czystych funkcjach z `document-content.ts`,
 * bo `@react-pdf` renderuje do binarnego PDF-a — `toContain('Kuchnia')` na
 * bajtach jest testem, ktory zawsze przechodzi albo zawsze pada, niezaleznie
 * od tego, co dokument naprawde zawiera.
 */
async function renderPdf(body: QuoteBody) {
  return renderToBuffer(
    <QuotePdfDocument
      body={body}
      theme={buildPdfTheme(defaultBrandKit())}
      brandKit={defaultBrandKit()}
      number="WYC/2026/08/0001"
      issueDate="2026-08-01"
      currency="PLN"
    />,
  );
}

describe('QuotePdfDocument — render', () => {
  it('sklada wycene z pozycjami, pomieszczeniami i rabatem', async () => {
    const kuchnia = room({ label: 'Kuchnia', qty: 2 });
    const body = newQuoteBody({
      title: 'Wycena wnętrza',
      vatRate: 23,
      rooms: [kuchnia],
      sections: [
        newSection({
          title: 'Etap projektowy',
          items: [newItem({ name: 'Projekt koncepcyjny', unitPriceCents: 150_000 })],
          groups: [
            newGroup({
              name: 'Kuchnia',
              roomId: kuchnia.id,
              items: [newItem({ name: 'Wizualizacje', unitPriceCents: 45_000 })],
            }),
          ],
        }),
      ],
      discounts: [
        {
          id: newId(),
          name: 'Rabat za polecenie',
          description: '',
          enabled: true,
          type: 'percent',
          percent: 10,
          scope: 'quote',
          sectionId: null,
          itemIds: [],
          condition: 'always',
          roundToCents: 0,
        },
      ],
    });

    const buffer = await renderPdf(body);

    // Naglowek PDF-a i sensowny rozmiar: dokument naprawde sie wygenerowal.
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('pusta wycena tez sie renderuje', async () => {
    // Nowa wycena jest pusta — render nie moze sie na tym wywrocic.
    const buffer = await renderPdf(newQuoteBody({ sections: [] }));
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

describe('roomsSummaryLine', () => {
  it('wypisuje pomieszczenia z iloscia', () => {
    expect(
      roomsSummaryLine([room({ label: 'Wiatrołap' }), room({ label: 'Kuchnia', qty: 2 })]),
    ).toBe('Wiatrołap, Kuchnia x2');
  });

  it('bez pomieszczen daje pusty tekst — wiersz sie nie drukuje', () => {
    expect(roomsSummaryLine([])).toBe('');
  });
});

describe('visibleItems', () => {
  const items = [
    newItem({ name: 'Widoczna', unitPriceCents: 1000 }),
    newItem({ name: 'Odrzucona', unitPriceCents: 1000, enabled: false }),
  ];

  it('z `showDisabledItems` pokazuje takze odrzucone', () => {
    expect(visibleItems(items, true)).toHaveLength(2);
  });

  it('bez niego zostaja same wybrane', () => {
    expect(visibleItems(items, false).map((item) => item.name)).toEqual(['Widoczna']);
  });
});

describe('shouldPrintGroup', () => {
  const items = [newItem({ name: 'Usługa', unitPriceCents: 1000 })];

  it('zwykla grupa z pozycjami sie drukuje', () => {
    expect(shouldPrintGroup(newGroup({ name: 'Prace', items }), [], true)).toBe(true);
  });

  it('pusta grupa sie nie drukuje', () => {
    expect(shouldPrintGroup(newGroup({ name: 'Prace', items: [] }), [], true)).toBe(false);
  });

  it('grupa z samymi odrzuconymi pozycjami znika przy ukrytych wylaczonych', () => {
    const grupa = newGroup({
      name: 'Prace',
      items: [newItem({ name: 'Odrzucona', unitPriceCents: 1, enabled: false })],
    });
    expect(shouldPrintGroup(grupa, [], false)).toBe(false);
    expect(shouldPrintGroup(grupa, [], true)).toBe(true);
  });

  it('blok pomieszczenia odznaczonego w OBU czesciach nie trafia do oferty', () => {
    // W edytorze taki blok zostaje widoczny (zeby dalo sie go wlaczyc),
    // ale w dokumencie dla klienta jest tylko szumem.
    const piwnica = room({ label: 'Piwnica', includedInVisual: false, includedInTechnical: false });
    const grupa = newGroup({ name: 'Piwnica', roomId: piwnica.id, items });

    expect(shouldPrintGroup(grupa, [piwnica], true)).toBe(false);
  });

  it('blok pomieszczenia w jednej czesci sie drukuje', () => {
    const salon = room({ label: 'Salon', includedInVisual: false, includedInTechnical: true });
    const grupa = newGroup({ name: 'Salon', roomId: salon.id, items });

    expect(shouldPrintGroup(grupa, [salon], true)).toBe(true);
  });

  it('blok wskazujacy na skasowane pomieszczenie dalej sie drukuje', () => {
    // Lepiej pokazac pozycje z niepelnym naglowkiem niz po cichu wyciac je
    // z oferty, ktora klient juz widzial.
    const grupa = newGroup({ name: 'Kuchnia', roomId: newId(), items });
    expect(shouldPrintGroup(grupa, [], true)).toBe(true);
  });
});

describe('groupHeading', () => {
  it('blok pomieszczenia bierze etykiete z pomieszczenia i pokazuje ilosc', () => {
    const kuchnia = room({ label: 'Kuchnia', qty: 2 });
    const grupa = newGroup({ name: 'stara nazwa', roomId: kuchnia.id });

    expect(groupHeading(grupa, [kuchnia])).toBe('Kuchnia x2');
  });

  it('zwykla grupa zostaje przy swojej nazwie', () => {
    expect(groupHeading(newGroup({ name: 'Prace dodatkowe' }), [])).toBe('Prace dodatkowe');
  });
});

describe('preparedByLine', () => {
  it('pole z wyceny ma pierwszenstwo', () => {
    const body = newQuoteBody({ preparedBy: 'Jan z wyceny' });
    expect(preparedByLine(body, 'Anna z brandingu', 'projektant')).toBe('Jan z wyceny');
  });

  it('bez niego bierze wystawiajacego z brand kitu', () => {
    expect(preparedByLine(newQuoteBody(), 'Anna Kowalska', 'projektant wnętrz')).toBe(
      'Anna Kowalska, projektant wnętrz',
    );
  });

  it('brak obu danych daje pusty tekst, a nie sam przecinek', () => {
    expect(preparedByLine(newQuoteBody(), null, null)).toBe('');
  });
});
