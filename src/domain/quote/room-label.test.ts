import { describe, expect, it } from 'vitest';
import { isAutoRoomLabel, nextRoomLabel } from './room-label';

const DOMYSLNA = 'Nowe pomieszczenie';

function zmiana(partial: Partial<Parameters<typeof nextRoomLabel>[0]>) {
  return nextRoomLabel({
    currentLabel: DOMYSLNA,
    previousTypeName: null,
    nextTypeName: null,
    defaultLabel: DOMYSLNA,
    ...partial,
  });
}

describe('isAutoRoomLabel', () => {
  it('pusta nazwa i nazwa domyślna pochodzą od automatu', () => {
    expect(isAutoRoomLabel('', null, DOMYSLNA)).toBe(true);
    expect(isAutoRoomLabel('   ', null, DOMYSLNA)).toBe(true);
    expect(isAutoRoomLabel(DOMYSLNA, null, DOMYSLNA)).toBe(true);
  });

  it('nazwa poprzednio wybranego typu też pochodzi od automatu', () => {
    expect(isAutoRoomLabel('Kuchnia', 'Kuchnia', DOMYSLNA)).toBe(true);
  });

  it('nazwa wpisana ręcznie NIE pochodzi od automatu', () => {
    expect(isAutoRoomLabel('Kuchnia z jadalnią', 'Kuchnia', DOMYSLNA)).toBe(false);
  });
});

describe('nextRoomLabel', () => {
  it('wybór typu NAZYWA świeże pomieszczenie', () => {
    // Zgłoszenie użytkownika: wybieram „Kuchnia", a pomieszczenie dalej nazywa
    // się „Nowe pomieszczenie" — i taka nazwa trafia potem do bloku w sekcji.
    expect(zmiana({ nextTypeName: 'Kuchnia' })).toBe('Kuchnia');
  });

  it('zmiana typu przemianowuje, gdy nazwa była automatyczna', () => {
    expect(
      zmiana({ currentLabel: 'Kuchnia', previousTypeName: 'Kuchnia', nextTypeName: 'Salon' }),
    ).toBe('Salon');
  });

  it('NIE nadpisuje nazwy wpisanej ręcznie', () => {
    // To jedyne miejsce, w którym użytkownik opisuje swój układ, a nie wybiera
    // z listy — automat nie ma prawa mu tego skasować.
    expect(
      zmiana({
        currentLabel: 'Kuchnia z jadalnią',
        previousTypeName: 'Kuchnia',
        nextTypeName: 'Salon',
      }),
    ).toBe('Kuchnia z jadalnią');
  });

  it('przejście na „własne" zostawia nazwę, zamiast ją czyścić', () => {
    // Człowiek chce wtedy zwykle dopisać coś swojego; puste pole kazałoby mu
    // zaczynać od zera.
    expect(
      zmiana({ currentLabel: 'Kuchnia', previousTypeName: 'Kuchnia', nextTypeName: null }),
    ).toBe('Kuchnia');
  });

  it('pusta nazwa dostaje nazwę typu', () => {
    expect(zmiana({ currentLabel: '', nextTypeName: 'Łazienka' })).toBe('Łazienka');
  });
});
