import { describe, expect, it } from 'vitest';
import { groupVariants, isVariantLeader, variantGroupId, variantsOf } from './variants';

const lider = { id: 'wiz', variantOf: null };
const wariant3d = { id: 'wiz-3d', variantOf: 'wiz' };
const wariant360 = { id: 'wiz-360', variantOf: 'wiz' };
const osobna = { id: 'projekt', variantOf: null };

describe('variantGroupId', () => {
  it('lider jest liderem samego siebie', () => {
    // Dzieki temu porownanie grup to zwykle porownanie stringow, bez
    // rozgalezienia na „lider czy wariant".
    expect(variantGroupId(lider)).toBe('wiz');
    expect(variantGroupId(wariant3d)).toBe('wiz');
    expect(variantGroupId(wariant360)).toBe('wiz');
  });

  it('rozroznia liderow od wariantow', () => {
    expect(isVariantLeader(lider)).toBe(true);
    expect(isVariantLeader(wariant3d)).toBe(false);
  });
});

describe('groupVariants', () => {
  it('sklada grupe z lidera i jego wariantow', () => {
    const grupy = groupVariants([lider, wariant3d, wariant360, osobna]);

    expect(grupy.get('wiz')?.map((m) => m.id)).toEqual(['wiz', 'wiz-3d', 'wiz-360']);
    expect(grupy.get('projekt')?.map((m) => m.id)).toEqual(['projekt']);
  });

  it('lider stoi pierwszy, nawet gdy przyszedl na koncu listy', () => {
    // To on nadaje grupie nazwe i to jego wybiera sie domyslnie.
    const grupy = groupVariants([wariant3d, wariant360, lider]);
    expect(grupy.get('wiz')?.[0]?.id).toBe('wiz');
  });

  it('zostawia grupy jednoelementowe', () => {
    // „Ta pozycja nie ma wariantow” to informacja, a nie brak danych —
    // odsiewanie tutaj zmusiloby kazde miejsce wywolujace do sprawdzania
    // `undefined` zamiast czytania dlugosci.
    const grupy = groupVariants([osobna]);
    expect(grupy.size).toBe(1);
    expect(grupy.get('projekt')).toHaveLength(1);
  });

  it('kolejnosc wariantow zostaje taka, jak przyszla', () => {
    const grupy = groupVariants([lider, wariant360, wariant3d]);
    expect(grupy.get('wiz')?.map((m) => m.id)).toEqual(['wiz', 'wiz-360', 'wiz-3d']);
  });

  it('wariant osierocony (lider skasowany) tworzy wlasna grupe', () => {
    // `on delete set null` w bazie zwykle temu zapobiega, ale zrzut z innego
    // zrodla moze przyjsc niekompletny — lepiej pokazac pozycje niz zgubic.
    const sierota = { id: 'wiz-360', variantOf: 'nie-ma-takiego' };
    const grupy = groupVariants([sierota]);
    expect(grupy.get('nie-ma-takiego')?.map((m) => m.id)).toEqual(['wiz-360']);
  });
});

describe('variantsOf', () => {
  it('zwraca cale rodzenstwo razem z pytanym wpisem', () => {
    const rodzenstwo = variantsOf([lider, wariant3d, wariant360, osobna], 'wiz-360');
    expect(rodzenstwo.map((m) => m.id)).toEqual(['wiz', 'wiz-3d', 'wiz-360']);
  });

  it('dziala tak samo, o ktorego czlonka grupy nie zapytac', () => {
    const wszyscy = [lider, wariant3d, wariant360];
    const zLidera = variantsOf(wszyscy, 'wiz').map((m) => m.id);
    const zWariantu = variantsOf(wszyscy, 'wiz-3d').map((m) => m.id);
    expect(zLidera).toEqual(zWariantu);
  });

  it('pozycja bez wariantow daje PUSTA liste, nie liste jednoelementowa', () => {
    // „Jeden wariant” i „brak wariantow” to dla interfejsu ten sam przypadek:
    // nie ma z czego wybierac.
    expect(variantsOf([lider, osobna], 'projekt')).toEqual([]);
  });

  it('nieznane id daje pusta liste zamiast wyjatku', () => {
    expect(variantsOf([lider], 'nie-ma')).toEqual([]);
  });
});
