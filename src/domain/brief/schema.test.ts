import { describe, expect, it } from 'vitest';

import {
  briefTokenFromPath,
  buildBriefUrl,
  countAnswered,
  countQuestions,
  expiryOrNull,
} from './schema';
import { DEFAULT_BRIEF_TEMPLATE } from './template';

describe('brief — token i adres', () => {
  it('czyta token ze sciezki /b/{token}', () => {
    expect(briefTokenFromPath('/b/abc-123')).toBe('abc-123');
    expect(briefTokenFromPath('/b/abc-123/')).toBe('abc-123');
  });

  it('odrzuca adres o innym ksztalcie — takze oferte', () => {
    // Bez tego strona briefu probowalaby otworzyc token oferty.
    expect(briefTokenFromPath('/q/abc-123')).toBeNull();
    expect(briefTokenFromPath('/b/')).toBeNull();
    expect(briefTokenFromPath('/')).toBeNull();
  });

  it('sklada adres z bazy bez podwojnego ukosnika', () => {
    expect(buildBriefUrl('https://oferty.example.com/', 'tok')).toBe(
      'https://oferty.example.com/b/tok',
    );
  });
});

describe('brief — postep', () => {
  it('pusty string i pusta lista to BRAK odpowiedzi', () => {
    // Pole dotkniete i wyczyszczone nie jest odpowiedzia, a licznik, ktory
    // mowi inaczej, klamie dokladnie w te strone, w ktora nie wolno.
    expect(
      countAnswered(DEFAULT_BRIEF_TEMPLATE, {
        'obiekt.adres': '   ',
        'zakres.oczekiwania': [],
      }),
    ).toBe(0);
  });

  it('liczy odpowiedzi tekstowe i wielokrotnego wyboru', () => {
    expect(
      countAnswered(DEFAULT_BRIEF_TEMPLATE, {
        'obiekt.rodzaj': 'Mieszkanie',
        'obiekt.metraz': '64',
        'zakres.oczekiwania': ['Wizualizacje 3D'],
      }),
    ).toBe(3);
  });

  it('wbudowany szablon ma piec blokow i komplet pytan', () => {
    expect(DEFAULT_BRIEF_TEMPLATE).toHaveLength(5);
    expect(countQuestions(DEFAULT_BRIEF_TEMPLATE)).toBeGreaterThan(15);

    // Identyfikatory pytan sa kluczami odpowiedzi — duplikat cicho nadpisalby
    // odpowiedz klienta.
    const ids = DEFAULT_BRIEF_TEMPLATE.flatMap((section) =>
      section.questions.map((question) => question.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('wymagane sa tylko dwa pytania — brief wypelnia sie na raty', () => {
    const required = DEFAULT_BRIEF_TEMPLATE.flatMap((section) =>
      section.questions.filter((question) => question.required),
    );
    expect(required.map((question) => question.id)).toEqual(['obiekt.rodzaj', 'obiekt.metraz']);
  });
});

describe('expiryOrNull', () => {
  it('null znaczy bezterminowo', () => {
    expect(expiryOrNull(null)).toBeNull();
  });

  it('liczy date od podanej chwili', () => {
    const at = expiryOrNull(60, new Date('2026-08-27T10:00:00Z'));
    expect(at?.slice(0, 10)).toBe('2026-10-26');
  });
});
