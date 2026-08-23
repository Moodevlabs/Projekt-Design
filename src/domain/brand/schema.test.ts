import { describe, expect, it } from 'vitest';
import { DEFAULT_NUMBER_PATTERN } from '../numbering';
import {
  BrandKitSchema,
  FontFamilySchema,
  HexColorSchema,
  MAX_OPENING_HOURS_ROWS,
  WorkspaceSettingsSchema,
  defaultBrandKit,
  defaultWorkspaceSettings,
} from './schema';

describe('HexColorSchema', () => {
  it('akceptuje #RRGGBB w obu wielkościach liter', () => {
    expect(HexColorSchema.parse('#21201C')).toBe('#21201C');
    expect(HexColorSchema.parse('#faf7f1')).toBe('#faf7f1');
  });

  it('odrzuca inne formaty', () => {
    for (const bad of ['21201C', '#212', '#21201', '#21201CC', 'rgb(1,2,3)', '#GGGGGG']) {
      expect(HexColorSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('komunikat błędu jest po polsku', () => {
    const result = HexColorSchema.safeParse('czerwony');
    expect(result.success).toBe(false);
    if (result.success) throw new Error('oczekiwano błędu');
    expect(result.error.issues[0]?.message).toBe('Kolor musi być w formacie #RRGGBB');
  });
});

describe('FontFamilySchema', () => {
  it('akceptuje tylko fonty wbudowane w PDF', () => {
    for (const font of ['Lato', 'Inter', 'Playfair', 'DM Sans', 'Source Serif']) {
      expect(FontFamilySchema.parse(font)).toBe(font);
    }
    expect(FontFamilySchema.safeParse('Comic Sans').success).toBe(false);
  });
});

describe('BrandKitSchema', () => {
  it('domyślne wartości odpowiadają migracji brand_kits', () => {
    expect(defaultBrandKit()).toEqual({
      companyName: '',
      logoDarkPath: null,
      logoLightPath: null,
      accentColor: '#21201C',
      bgColor: '#FAF7F1',
      fontFamily: 'Lato',
      contacts: [],
      address: null,
      taxId: null,
      footerText: null,
      defaultIntro: null,
      defaultValidDays: 7,
      // F7.2: bez wierszy blok „CZYNNE” w stopce się nie drukuje.
      openingHours: [],
      signerName: null,
      signerTitle: null,
    });
  });

  it('waliduje listę kontaktów', () => {
    const kit = BrandKitSchema.parse({
      companyName: 'Studio Demo',
      contacts: [{ name: 'Anna', phone: '600100200' }],
    });
    expect(kit.contacts[0]).toEqual({ name: 'Anna', phone: '600100200', email: '' });
  });

  it('odrzuca niepoprawny kolor akcentu', () => {
    expect(BrandKitSchema.safeParse({ accentColor: 'terakota' }).success).toBe(false);
  });
});

describe('WorkspaceSettingsSchema', () => {
  it('domyślne ustawienia workspace', () => {
    expect(defaultWorkspaceSettings()).toEqual({
      currency: 'PLN',
      vatRate: 23,
      numberPattern: DEFAULT_NUMBER_PATTERN,
      showDisabledItems: true,
      pricesInclude: 'net',
    });
  });

  it('odrzuca niepoprawną walutę, VAT i pusty wzorzec numeracji', () => {
    expect(WorkspaceSettingsSchema.safeParse({ currency: 'ZLOTY' }).success).toBe(false);
    expect(WorkspaceSettingsSchema.safeParse({ vatRate: 120 }).success).toBe(false);
    expect(WorkspaceSettingsSchema.safeParse({ numberPattern: '' }).success).toBe(false);
  });

  it('przyjmuje własny wzorzec numeracji i tryb cen brutto', () => {
    expect(
      WorkspaceSettingsSchema.parse({ numberPattern: 'OF/{YY}/{seq:6}', pricesInclude: 'gross' }),
    ).toMatchObject({ numberPattern: 'OF/{YY}/{seq:6}', pricesInclude: 'gross' });
  });
});

describe('BrandKitSchema — godziny otwarcia i wystawiajacy (F7.2)', () => {
  it('brak pol daje pusta stopke, a nie blad', () => {
    // Konta zalozone przed migracja 0008 nie maja tych wartosci.
    const kit = BrandKitSchema.parse({ companyName: 'Studio' });

    expect(kit.openingHours).toEqual([]);
    expect(kit.signerName).toBeNull();
    expect(kit.signerTitle).toBeNull();
  });

  it('przyjmuje wiersze godzin jako wolny tekst', () => {
    // W arkuszu stoi „sobota (tylko spotkania)” — parsowanie tego na model
    // czasowy odebraloby mozliwosc dopisania uwagi.
    const kit = BrandKitSchema.parse({
      openingHours: [
        { label: 'poniedziałek – piątek', hours: '8.00 – 16.00' },
        { label: 'sobota (tylko spotkania)', hours: '10.00 – 13.00' },
      ],
    });

    expect(kit.openingHours).toHaveLength(2);
    expect(kit.openingHours[1]?.label).toContain('spotkania');
  });

  it('odrzuca wiecej niz cztery wiersze — stopka ich nie zmiesci', () => {
    const rows = Array.from({ length: MAX_OPENING_HOURS_ROWS + 1 }, () => ({
      label: 'dzien',
      hours: '8-16',
    }));

    expect(BrandKitSchema.safeParse({ openingHours: rows }).success).toBe(false);
  });

  it('niekompletny wiersz uzupelnia sie pustymi tekstami', () => {
    const kit = BrandKitSchema.parse({ openingHours: [{ label: 'poniedziałek' }] });
    expect(kit.openingHours[0]).toEqual({ label: 'poniedziałek', hours: '' });
  });
});
