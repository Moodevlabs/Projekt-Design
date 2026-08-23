import { describe, expect, it } from 'vitest';
import {
  DARK_INK,
  LIGHT_INK,
  contrastRatio,
  contrastText,
  isLightBackground,
  parseHex,
  relativeLuminance,
} from './color';

describe('parseHex', () => {
  it('czyta `#RRGGBB` w obu wielkosciach liter', () => {
    expect(parseHex('#FF8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(parseHex('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('odrzuca skroty i inne formaty', () => {
    for (const bad of ['#FFF', 'FF8000', 'rgb(1,2,3)', '', '#GGGGGG']) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe('relativeLuminance', () => {
  it('czern to 0, biel to 1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('wazy kanaly wg czulosci oka, a nie po rowno', () => {
    // Ta sama „wartosc” skladowej, zupelnie inna jasnosc.
    const zielony = relativeLuminance('#00FF00');
    const niebieski = relativeLuminance('#0000FF');
    expect(zielony).toBeGreaterThan(niebieski * 5);
  });

  it('niepoprawny kolor traktuje jak czern zamiast wybuchac', () => {
    expect(relativeLuminance('terakota')).toBe(0);
  });
});

describe('contrastRatio', () => {
  it('czern do bieli to 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('kolor sam ze soba to 1', () => {
    expect(contrastRatio('#21201C', '#21201C')).toBeCloseTo(1, 5);
  });

  it('jest symetryczny', () => {
    expect(contrastRatio('#21201C', '#FAF7F1')).toBeCloseTo(
      contrastRatio('#FAF7F1', '#21201C'),
      5,
    );
  });
});

describe('contrastText', () => {
  it('na ciemnym tle daje jasny tekst', () => {
    expect(contrastText('#21201C')).toBe(LIGHT_INK);
    expect(contrastText('#000000')).toBe(LIGHT_INK);
  });

  it('na jasnym tle daje ciemny tekst', () => {
    expect(contrastText('#FAF7F1')).toBe(DARK_INK);
    expect(contrastText('#FFFFFF')).toBe(DARK_INK);
  });

  it('wybrany kolor ma NIE GORSZY kontrast niz odrzucony', () => {
    // Sedno funkcji: dla kazdego tla wybor musi byc ten czytelniejszy,
    // takze dla kolorow ze srodka skali, gdzie prog luminancji sie myli.
    const tla = ['#21201C', '#FAF7F1', '#7A7A7A', '#B9634A', '#00FF00', '#0000FF', '#808080'];

    for (const tlo of tla) {
      const wybrany = contrastText(tlo);
      const odrzucony = wybrany === DARK_INK ? LIGHT_INK : DARK_INK;
      expect(contrastRatio(tlo, wybrany)).toBeGreaterThanOrEqual(contrastRatio(tlo, odrzucony));
    }
  });

  it('domyslny akcent marki daje czytelny naglowek', () => {
    // Kontrast 4.5 to prog WCAG AA dla zwyklego tekstu.
    expect(contrastRatio('#21201C', contrastText('#21201C'))).toBeGreaterThan(4.5);
  });
});

describe('isLightBackground', () => {
  it('rozpoznaje tlo, na ktorym jasne logo zniknie', () => {
    expect(isLightBackground('#FAF7F1')).toBe(true);
    expect(isLightBackground('#21201C')).toBe(false);
  });
});
