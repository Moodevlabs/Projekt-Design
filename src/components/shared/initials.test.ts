import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('bierze pierwsze litery dwoch pierwszych slow', () => {
    expect(initialsOf('Anna i Piotr Kowalscy')).toBe('AI');
    expect(initialsOf('Jan Nowak')).toBe('JN');
  });

  it('jedno slowo daje dwie litery — pojedyncza wyglada jak blad', () => {
    expect(initialsOf('Studio')).toBe('ST');
  });

  it('z adresu bierze czesc przed malpa', () => {
    // „ak@studio.pl" ma dac „AK", a nie „AK@".
    expect(initialsOf('ak@studio.pl')).toBe('AK');
    expect(initialsOf('anna.kowalska@studio.pl')).toBe('AK');
  });

  it('pustka daje wartosc zastepcza', () => {
    expect(initialsOf('', 'TO')).toBe('TO');
    expect(initialsOf('   ')).toBe('?');
  });
});
