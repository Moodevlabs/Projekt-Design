import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_CHECKS,
  roomAreaM2,
  totalAreaM2,
  unresolvedChecks,
  type RoomMeasurement,
  type SiteCheck,
} from './schema';

function room(partial: Partial<RoomMeasurement> = {}): RoomMeasurement {
  return {
    id: 'r1',
    name: 'Salon',
    lengthCm: 500,
    widthCm: 400,
    heightCm: 270,
    note: '',
    ...partial,
  };
}

function check(partial: Partial<SiteCheck> = {}): SiteCheck {
  return { id: 'c1', label: 'Elektryka', state: 'unknown', note: '', ...partial };
}

describe('roomAreaM2', () => {
  it('liczy powierzchnie z centymetrow', () => {
    // 5,00 m x 4,00 m = 20 m².
    expect(roomAreaM2(room())).toBe(20);
  });

  it('zaokragla do dwoch miejsc', () => {
    expect(roomAreaM2(room({ lengthCm: 345, widthCm: 267 }))).toBe(9.21);
  });

  it('BRAK wymiaru daje null, a nie zero', () => {
    // Zero wygladaloby jak wynik pomiaru, a jest brakiem pomiaru.
    expect(roomAreaM2(room({ widthCm: null }))).toBeNull();
    expect(roomAreaM2(room({ lengthCm: null }))).toBeNull();
  });

  it('wysokosc nie wchodzi do powierzchni', () => {
    expect(roomAreaM2(room({ heightCm: null }))).toBe(20);
  });
});

describe('totalAreaM2', () => {
  it('sumuje tylko zmierzone pomieszczenia', () => {
    const suma = totalAreaM2([
      room(),
      room({ id: 'r2', lengthCm: 300, widthCm: 250 }),
      room({ id: 'r3', widthCm: null }),
    ]);
    expect(suma).toBe(27.5);
  });

  it('pusty obmiar daje zero', () => {
    expect(totalAreaM2([])).toBe(0);
  });
});

describe('unresolvedChecks', () => {
  it('liczy pozycje bez ustalenia', () => {
    expect(
      unresolvedChecks([
        check(),
        check({ id: 'c2', state: 'ok' }),
        check({ id: 'c3', state: 'replace' }),
      ]),
    ).toBe(1);
  });
});

describe('DEFAULT_SITE_CHECKS', () => {
  it('ma komplet rzeczy sprawdzanych na wizji, bez duplikatow', () => {
    expect(DEFAULT_SITE_CHECKS.length).toBeGreaterThanOrEqual(12);
    const ids = DEFAULT_SITE_CHECKS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zaczyna od tego, co widac od progu, a konczy na ustaleniach z zewnatrz', () => {
    expect(DEFAULT_SITE_CHECKS[0]?.id).toBe('sciany');
    expect(DEFAULT_SITE_CHECKS.at(-1)?.id).toBe('wspolnota');
  });
});
