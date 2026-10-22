import { describe, expect, it } from 'vitest';

import { maskContacts } from './mask-contacts';

describe('maskContacts', () => {
  it('wycina e-mail i telefon, zostawia resztę zdania', () => {
    const masked = maskContacts(
      'Dzień dobry, jestem Anna Kowalska (anna.kowalska@example.com, tel. +48 600 100 200). Mieszkanie 62 m² na Wilczaku 12.',
    );
    expect(masked.emails).toEqual(['anna.kowalska@example.com']);
    expect(masked.phones).toEqual(['+48 600 100 200']);
    expect(masked.text).toBe(
      'Dzień dobry, jestem Anna Kowalska ([e-mail], tel. [telefon]). Mieszkanie 62 m² na Wilczaku 12.',
    );
  });

  it('rozpoznaje telefon z myślnikami i w nawiasie, nie rusza metrażu ani kwoty', () => {
    const masked = maskContacts(
      'Budżet 150 000 zł, 3 pokoje, 62 m². Numer 600-100-200 albo (22) 123 45 67.',
    );
    expect(masked.phones).toEqual(['600-100-200', '(22) 123 45 67']);
    expect(masked.text).toContain('150 000 zł');
    expect(masked.text).toContain('62 m²');
  });

  it('ten sam adres dwa razy → jeden wpis', () => {
    const masked = maskContacts('jan@x.pl, proszę pisać na jan@x.pl');
    expect(masked.emails).toEqual(['jan@x.pl']);
    expect(masked.text).toBe('[e-mail], proszę pisać na [e-mail]');
  });

  it('tekst bez kontaktów wraca bez zmian', () => {
    const message = 'Chcielibyśmy projekt kuchni i salonu, dom 164 m².';
    expect(maskContacts(message)).toEqual({ text: message, emails: [], phones: [] });
  });
});
