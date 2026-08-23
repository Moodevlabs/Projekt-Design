import { describe, expect, it } from 'vitest';
import { quoteBodyFromSettings } from './from-settings';
import { defaultWorkspaceSettings } from '../brand/schema';

describe('quoteBodyFromSettings', () => {
  it('bierze VAT i tryb cen z ustawień, a nie z zaszytych wartości', () => {
    // Regresja: nowa wycena startowała z `newQuoteBody`, więc VAT 8% ustawiony
    // w ustawieniach i tak dawał w dokumencie 23%.
    const body = quoteBodyFromSettings({
      ...defaultWorkspaceSettings(),
      vatRate: 8,
      pricesInclude: 'gross',
      showDisabledItems: false,
    });

    expect(body.vatRate).toBe(8);
    expect(body.pricesInclude).toBe('gross');
    expect(body.showDisabledItems).toBe(false);
  });

  it('kopiuje stawkę godzinową do wyceny godzinowej', () => {
    const body = quoteBodyFromSettings({
      ...defaultWorkspaceSettings(),
      defaultPricingBasis: 'time',
      hourlyRateCents: 15_000,
    });

    expect(body.pricingBasis).toBe('time');
    expect(body.hourlyRateCents).toBe(15_000);
  });

  it('NIE kopiuje stawki do wyceny kwotowej', () => {
    // Byłaby liczbą bez zastosowania, która myli przy późniejszym
    // przełączeniu trybu: wyglądałaby na świadomie ustawioną.
    const body = quoteBodyFromSettings({
      ...defaultWorkspaceSettings(),
      defaultPricingBasis: 'amount',
      hourlyRateCents: 15_000,
    });

    expect(body.pricingBasis).toBe('amount');
    expect(body.hourlyRateCents).toBeNull();
  });

  it('to KOPIA, nie odwołanie — późniejsza zmiana ustawień nic nie rusza', () => {
    /*
     * Sedno tej funkcji. Gdyby dokument czytał stawkę z workspace'u przy
     * każdym otwarciu, podniesienie cennika zmieniłoby kwoty w ofertach, które
     * już poszły do klientów.
     */
    const settings = {
      ...defaultWorkspaceSettings(),
      defaultPricingBasis: 'time' as const,
      hourlyRateCents: 15_000,
      vatRate: 23,
    };
    const body = quoteBodyFromSettings(settings);

    settings.hourlyRateCents = 20_000;
    settings.vatRate = 8;

    expect(body.hourlyRateCents).toBe(15_000);
    expect(body.vatRate).toBe(23);
  });

  it('nadpisania mają pierwszeństwo przed ustawieniami', () => {
    const body = quoteBodyFromSettings(defaultWorkspaceSettings(), { title: 'Oferta na kuchnię' });
    expect(body.title).toBe('Oferta na kuchnię');
  });
});
