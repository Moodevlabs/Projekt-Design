import { describe, expect, it } from 'vitest';
import { documentTextInfo, itemTextContext, quoteTextContext } from './text-context';
import { renderText } from './template-text';
import { newItem, newQuoteBody } from './factory';
import type { Room } from './schema';

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: `id-${partial.label}`,
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

const KUCHNIA = room({ label: 'kuchnia' });
const SALON = room({ label: 'salon', qty: 2 });

const BODY = newQuoteBody({
  client: { name: 'Jan Kowalski', phone: '', email: '', city: '' },
  rooms: [KUCHNIA, SALON],
});

describe('documentTextInfo', () => {
  it('bierze pomieszczenia i klienta z dokumentu', () => {
    const info = documentTextInfo(BODY, '31.01.2026');
    expect(info.rooms).toBe(BODY.rooms);
    expect(info.client).toBe('Jan Kowalski');
    expect(info.validUntil).toBe('31.01.2026');
  });

  it('bez daty nie wstawia pustego `validUntil`', () => {
    // Brak klucza znaczy „nie wiem" — placeholder zostaje wtedy dosłownie,
    // zamiast podstawić pusty string i zostawić dziurę w zdaniu.
    expect('validUntil' in documentTextInfo(BODY)).toBe(false);
  });
});

describe('itemTextContext', () => {
  it('dokłada ilość z wiersza', () => {
    const item = newItem({ name: 'Wizualizacja', qty: 3 });
    expect(itemTextContext(documentTextInfo(BODY), item).qty).toBe(3);
  });

  it('znajduje pomieszczenie bloku po `roomId`', () => {
    const item = newItem({ name: 'Projekt', roomId: SALON.id });
    const ctx = itemTextContext(documentTextInfo(BODY), item);

    expect(renderText('{room}', ctx)).toBe('salon x2');
  });

  it('martwy `roomId` daje pusty `{room}`, a nie wywrotkę', () => {
    // Usunięcie pomieszczenia odpina pozycje, ale zapisany dokument sprzed
    // tej zmiany może mieć wskaźnik na nieistniejący wpis.
    const item = newItem({ name: 'Projekt', roomId: 'nie-ma-takiego' });
    const ctx = itemTextContext(documentTextInfo(BODY), item);

    expect(renderText('{room}', ctx)).toBe('');
  });

  it('`{frames}` TYLKO dla pozycji liczonej za kadr', () => {
    // Przy innych trybach ta liczba nic nie znaczy — wstawienie jedynki byłoby
    // zmyślaniem, a dosłowny placeholder pokazuje pomyłkę autora tekstu.
    const zwykla = newItem({ name: 'Projekt' });
    expect(renderText('{frames}', itemTextContext(documentTextInfo(BODY), zwykla))).toBe(
      '{frames}',
    );

    const zaKadr = newItem({
      name: 'Wizualizacja',
      frames: 5,
      pricing: { mode: 'per_frame', perRoomCents: {}, defaultPerRoomCents: 0, baseCents: 0 },
    });
    expect(
      renderText('{frames|kadr|kadry|kadrów}', itemTextContext(documentTextInfo(BODY), zaKadr)),
    ).toBe('5 kadrów');
  });

  it('pozycja za kadr bez podanej liczby liczy się jak jeden', () => {
    const item = newItem({
      name: 'Wizualizacja',
      pricing: { mode: 'per_frame', perRoomCents: {}, defaultPerRoomCents: 0, baseCents: 0 },
    });
    expect(
      renderText('{frames|kadr|kadry|kadrów}', itemTextContext(documentTextInfo(BODY), item)),
    ).toBe('1 kadr');
  });
});

describe('spójność podglądu z PDF', () => {
  it('ten sam opis daje ten sam tekst w obu miejscach', () => {
    /*
     * Sedno tego modułu. Podgląd w edytorze i generator PDF budują kontekst
     * przez TE SAME funkcje — gdyby każde liczyło po swojemu, oferta mogłaby
     * wymieniać inne pomieszczenia niż to, co widział autor. Dokładnie ta klasa
     * błędu wyszła przy kwotach pozycji w T-35.
     */
    const item = newItem({
      name: 'Projekt',
      description: 'Dla {client}: {rooms}. Zakres techniczny: {rooms:technical}.',
      roomId: KUCHNIA.id,
    });

    const info = documentTextInfo(BODY, '31.01.2026');
    const zPodgladu = renderText(item.description, itemTextContext(info, item));
    const zPdf = renderText(item.description, itemTextContext(documentTextInfo(BODY, '31.01.2026'), item));

    expect(zPodgladu).toBe(zPdf);
    expect(zPodgladu).toBe(
      'Dla Jan Kowalski: kuchnia, salon x2. Zakres techniczny: kuchnia, salon x2.',
    );
  });

  it('tekst dokumentu nie zna ilości ani pomieszczenia bloku', () => {
    // `{qty}` we wstępie wyceny to pomyłka — nie ma tam żadnej pozycji.
    const ctx = quoteTextContext(documentTextInfo(BODY));
    expect(renderText('{qty}', ctx)).toBe('{qty}');
    expect(renderText('{room}', ctx)).toBe('');
  });
});
