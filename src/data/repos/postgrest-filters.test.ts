import { describe, expect, it } from 'vitest';
import { ilikeAnyOf, ilikeFilter } from './postgrest-filters';

describe('ilikeFilter', () => {
  it('opakowuje wartosc w cudzyslow', () => {
    expect(ilikeFilter('name', 'Kowalski')).toBe('name.ilike."%Kowalski%"');
  });

  it('przecinek w frazie NIE rozbija warunku', () => {
    /*
     * To jest sedno bledu: bez cudzyslowu „Kowalski, Jan" rozpada sie na dwa
     * warunki drzewa logicznego i PostgREST odpowiada `failed to parse logic
     * tree` — czyli wyszukiwanie zwraca blad zamiast wynikow.
     */
    expect(ilikeFilter('name', 'Kowalski, Jan')).toBe('name.ilike."%Kowalski, Jan%"');
  });

  it('nawias tez zostaje w frazie', () => {
    expect(ilikeFilter('title', 'Wycena (v2)')).toBe('title.ilike."%Wycena (v2)%"');
  });

  it('ucieka przed cudzyslowem i backslashem', () => {
    // W cudzyslowie to jedyne dwa znaki, ktore trzeba odkreslic.
    expect(ilikeFilter('name', 'Salon "Duzy"')).toBe('name.ilike."%Salon \\"Duzy\\"%"');
    expect(ilikeFilter('name', 'a\\b')).toBe('name.ilike."%a\\\\b%"');
  });

  it('NIE wycina znakow z frazy', () => {
    // „Kowalski, Jan" to nazwa, ktora czlowiek widzi na ekranie i ma prawo
    // w nia wpisac — okrojenie zapytania daloby ciche, nie swoje wyniki.
    expect(ilikeFilter('name', 'Kowalski, Jan')).toContain('Kowalski, Jan');
  });
});

describe('ilikeAnyOf', () => {
  it('skleja kolumny przecinkiem', () => {
    expect(ilikeAnyOf(['number', 'title'], 'abc')).toBe('number.ilike."%abc%",title.ilike."%abc%"');
  });

  it('przecinek z frazy nie miesza sie z separatorem kolumn', () => {
    const filtr = ilikeAnyOf(['number', 'title'], 'a,b');
    // Separator kolumn stoi POZA cudzyslowem, przecinek z frazy w srodku.
    expect(filtr).toBe('number.ilike."%a,b%",title.ilike."%a,b%"');
  });
});
