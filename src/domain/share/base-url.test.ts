import { describe, expect, it } from 'vitest';
import { checkShareBaseUrl } from './base-url';

describe('checkShareBaseUrl', () => {
  it('przyjmuje adres produkcyjny strony klienta', () => {
    expect(checkShareBaseUrl('https://klient.toolier.pl')).toEqual({ ok: true });
    expect(checkShareBaseUrl('https://klient.toolier.pl/')).toEqual({ ok: true });
    // Spacje z pola sekretu w CI nie sa bledem konfiguracji.
    expect(checkShareBaseUrl('  https://klient.toolier.pl  ')).toEqual({ ok: true });
  });

  it('odrzuca brak wartosci — to najczestsza wpadka przy wydaniu', () => {
    // Literowka w nazwie sekretu daje dokladnie ten przypadek: build sie udaje,
    // a projektant dostaje goly token zamiast adresu do wyslania.
    expect(checkShareBaseUrl(undefined).ok).toBe(false);
    expect(checkShareBaseUrl('').ok).toBe(false);
    expect(checkShareBaseUrl('   ').ok).toBe(false);
  });

  it('odrzuca adres bez https — oferta niesie dane inwestora', () => {
    expect(checkShareBaseUrl('http://klient.toolier.pl').ok).toBe(false);
    expect(checkShareBaseUrl('klient.toolier.pl').ok).toBe(false);
  });

  it('odrzuca baze ze sciezka, bo rozjechalaby regule hostingu', () => {
    // `buildShareUrl` doklei /q/{token}, a vercel.json przepisuje tylko /q/*.
    // Baza ze sciezka dalaby klientowi 404 zamiast oferty.
    const wynik = checkShareBaseUrl('https://klient.toolier.pl/oferty');
    expect(wynik.ok).toBe(false);
    expect(wynik.ok === false && wynik.reason).toContain('/oferty');
  });

  it('odrzuca parametry i kotwice', () => {
    expect(checkShareBaseUrl('https://klient.toolier.pl?utm=1').ok).toBe(false);
    expect(checkShareBaseUrl('https://klient.toolier.pl#x').ok).toBe(false);
  });

  it('podaje powod, ktory da sie wydrukowac w logu builda', () => {
    const wynik = checkShareBaseUrl('');
    expect(wynik.ok).toBe(false);
    expect(wynik.ok === false && wynik.reason.length).toBeGreaterThan(10);
  });
});
