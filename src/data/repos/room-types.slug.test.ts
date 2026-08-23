import { describe, expect, it } from 'vitest';
import { slugifyRoomType } from './room-types.repo';

describe('slugifyRoomType', () => {
  it('zdejmuje polskie znaki', () => {
    expect(slugifyRoomType('Łazienka')).toBe('lazienka');
    expect(slugifyRoomType('Pokój dziecięcy')).toBe('pokoj-dzieciecy');
    expect(slugifyRoomType('Spiżarnia')).toBe('spizarnia');
    expect(slugifyRoomType('Sień / hol')).toBe('sien-hol');
  });

  it('skleja separatory w pojedynczy myslnik i obcina brzegowe', () => {
    expect(slugifyRoomType('  Salon   z jadalnią  ')).toBe('salon-z-jadalnia');
    expect(slugifyRoomType('Korytarz + schody')).toBe('korytarz-schody');
  });

  it('nazwa z samych znakow specjalnych nie daje pustego sluga', () => {
    // Pusty slug wpadlby w unikalny indeks przy drugim takim wpisie.
    expect(slugifyRoomType('???')).toBe('typ');
    expect(slugifyRoomType('   ')).toBe('typ');
  });

  it('cyfry zostaja — „Pokój 2” to sensowna nazwa', () => {
    expect(slugifyRoomType('Pokój 2')).toBe('pokoj-2');
  });
});
