import { describe, expect, it } from 'vitest';
import { polishPlural, renderText } from './template-text';
import type { Room } from './schema';

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: `rt-${partial.label}`,
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

const KUCHNIA = room({ label: 'kuchnia' });
const SALON = room({ label: 'salon', qty: 2 });
const LAZIENKA = room({ label: 'łazienka', includedInVisual: false });

describe('polishPlural', () => {
  it.each([
    [1, 'kadr'],
    [2, 'kadry'],
    [3, 'kadry'],
    [4, 'kadry'],
    [5, 'kadrów'],
    [11, 'kadrów'],
    [21, 'kadrów'],
    [22, 'kadry'],
    [25, 'kadrów'],
    [102, 'kadry'],
  ])('%i → %s', (count, oczekiwane) => {
    expect(polishPlural(count, 'kadr', 'kadry', 'kadrów')).toBe(oczekiwane);
  });

  it.each([12, 13, 14])('%i to WYJĄTEK — końcówka kłamie', (count) => {
    // Jedyne miejsce, w którym sama końcówka prowadzi na manowce:
    // „22 kadry", ale „12 kadrów". Bez tego tekst wygląda na maszynowy.
    expect(polishPlural(count, 'kadr', 'kadry', 'kadrów')).toBe('kadrów');
    expect(polishPlural(count + 100, 'kadr', 'kadry', 'kadrów')).toBe('kadrów');
  });

  it('zero bierze formę mnogą', () => {
    expect(polishPlural(0, 'kadr', 'kadry', 'kadrów')).toBe('kadrów');
  });
});

describe('renderText — pomieszczenia', () => {
  const rooms = [KUCHNIA, SALON, LAZIENKA];

  it('wypisuje pomieszczenia z krotnością', () => {
    expect(renderText('Zakres: {rooms}.', { rooms: [KUCHNIA, SALON] })).toBe(
      'Zakres: kuchnia, salon x2.',
    );
  });

  it('pojedyncze pomieszczenie idzie bez „x1”', () => {
    expect(renderText('{rooms}', { rooms: [KUCHNIA] })).toBe('kuchnia');
  });

  it('zakres wizualny pomija pomieszczenia bez tej flagi', () => {
    // Ten sam zakres, którym posługuje się cennik — zdanie wymienia dokładnie
    // te pomieszczenia, za które klient płaci w tej pozycji.
    expect(renderText('{rooms:visual}', { rooms })).toBe('kuchnia, salon x2');
    expect(renderText('{rooms:technical}', { rooms })).toBe('kuchnia, salon x2, łazienka');
  });

  it('brak pomieszczeń daje pusty tekst, nie „undefined”', () => {
    expect(renderText('Zakres: {rooms}.', { rooms: [] })).toBe('Zakres: .');
    expect(renderText('Zakres: {rooms}.', {})).toBe('Zakres: .');
  });

  it('{room} bierze pomieszczenie bloku', () => {
    expect(renderText('Dotyczy: {room}.', { room: SALON })).toBe('Dotyczy: salon x2.');
    expect(renderText('Dotyczy: {room}.', { room: null })).toBe('Dotyczy: .');
  });
});

describe('renderText — liczby i odmiana', () => {
  it('składa liczbę z odmienionym słowem', () => {
    expect(renderText('{frames|kadr|kadry|kadrów}', { frames: 1 })).toBe('1 kadr');
    expect(renderText('{frames|kadr|kadry|kadrów}', { frames: 3 })).toBe('3 kadry');
    expect(renderText('{frames|kadr|kadry|kadrów}', { frames: 5 })).toBe('5 kadrów');
    expect(renderText('{frames|kadr|kadry|kadrów}', { frames: 22 })).toBe('22 kadry');
    expect(renderText('{frames|kadr|kadry|kadrów}', { frames: 12 })).toBe('12 kadrów');
  });

  it('bez form odmiany wstawia samą liczbę', () => {
    expect(renderText('Kadrów: {frames}.', { frames: 4 })).toBe('Kadrów: 4.');
  });

  it('{qty} działa tak samo', () => {
    expect(renderText('{qty} x', { qty: 3 })).toBe('3 x');
  });
});

describe('renderText — nieznane i brzegowe', () => {
  it('NIEZNANY placeholder zostaje dosłownie', () => {
    // Tekst pisze człowiek, więc literówka ma zostać widoczna. Ciche
    // zniknięcie znaczyłoby zdanie z dziurą, wysłane do klienta.
    expect(renderText('Zakres: {pokoje}.', { rooms: [KUCHNIA] })).toBe('Zakres: {pokoje}.');
  });

  it('nieznany WARIANT też zostaje dosłownie', () => {
    expect(renderText('{rooms:kuchnia}', { rooms: [KUCHNIA] })).toBe('{rooms:kuchnia}');
  });

  it('placeholder bez danych w kontekście zostaje dosłownie', () => {
    // `{frames}` w pozycji, która nie ma kadrów, to pomyłka autora tekstu —
    // wstawienie tam zera byłoby zmyślaniem.
    expect(renderText('{frames}', {})).toBe('{frames}');
    expect(renderText('{qty}', {})).toBe('{qty}');
  });

  it('nie rusza tekstu bez placeholderów', () => {
    const tekst = 'Projekt wnętrza — zakres podstawowy.';
    expect(renderText(tekst, { rooms: [KUCHNIA] })).toBe(tekst);
  });

  it('nie zjada zwykłych nawiasów klamrowych', () => {
    expect(renderText('Wzór {a+b} i { } oraz {}', {})).toBe('Wzór {a+b} i { } oraz {}');
  });

  it('podstawia wiele placeholderów w jednym zdaniu', () => {
    const wynik = renderText('Dla {client}: {rooms}, ważne do {validUntil}.', {
      client: 'Jan Kowalski',
      rooms: [KUCHNIA, SALON],
      validUntil: '31.01.2026',
    });
    expect(wynik).toBe('Dla Jan Kowalski: kuchnia, salon x2, ważne do 31.01.2026.');
  });

  it('pusty szablon zostaje pusty', () => {
    expect(renderText('', { rooms: [KUCHNIA] })).toBe('');
  });
});
