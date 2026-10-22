import { describe, expect, it } from 'vitest';

import { applyPolishedText, placeholdersIn, placeholdersKept } from './placeholders';

describe('placeholdersIn', () => {
  it('znajduje proste i odmienne placeholdery bez powtórzeń', () => {
    const text = 'Widoki dla {rooms}: {frames|kadr|kadry|kadrów} ({rooms}).';
    expect(placeholdersIn(text)).toEqual(['{rooms}', '{frames|kadr|kadry|kadrów}']);
  });

  it('nie łapie klamr bez nazwy', () => {
    expect(placeholdersIn('{} i { } oraz {123}')).toEqual([]);
  });
});

describe('placeholdersKept', () => {
  it('true, gdy każdy placeholder z oryginału jest w nowym tekście', () => {
    expect(
      placeholdersKept(
        'Oferta dla {client} ważna do {validUntil}.',
        'Dla {client}: ważna {validUntil}.',
      ),
    ).toBe(true);
  });

  it('false, gdy choć jeden zniknął', () => {
    expect(placeholdersKept('Oferta dla {client} do {validUntil}.', 'Oferta dla {client}.')).toBe(
      false,
    );
  });
});

describe('applyPolishedText', () => {
  it('przyjmuje tekst z zachowanymi placeholderami', () => {
    const outcome = applyPolishedText(
      'Projekt obejmuje {rooms}.',
      '  Zakres projektu obejmuje {rooms}.  ',
    );
    expect(outcome).toEqual({ ok: true, text: 'Zakres projektu obejmuje {rooms}.', lost: [] });
  });

  it('odrzuca propozycję, która zgubiła placeholder, i wymienia go', () => {
    const outcome = applyPolishedText(
      'Projekt obejmuje {rooms}.',
      'Zakres projektu obejmuje salon.',
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.lost).toEqual(['{rooms}']);
  });

  it('przycina do limitu i odrzuca pusty wynik', () => {
    expect(applyPolishedText('', 'a'.repeat(50), 10).text).toHaveLength(10);
    expect(applyPolishedText('coś', '   ').ok).toBe(false);
  });
});
