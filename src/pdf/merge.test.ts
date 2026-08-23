import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from './merge';

/** Minimalny PDF o zadanej liczbie stron — nie potrzebujemy do tego renderera. */
async function pdfZeStronami(count: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) doc.addPage([595, 842]);
  return doc.save();
}

async function liczStron(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('mergePdfs', () => {
  it('scala strony wszystkich części', async () => {
    const scalony = await mergePdfs([
      await pdfZeStronami(2),
      await pdfZeStronami(1),
      await pdfZeStronami(3),
    ]);

    expect(await liczStron(scalony)).toBe(6);
    expect(Buffer.from(scalony).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('zachowuje kolejność części', async () => {
    // Rozmiary stron sluza za znacznik kolejnosci — inaczej niz tekst, nie
    // wymagaja czytania zawartosci.
    const a = await PDFDocument.create();
    a.addPage([200, 200]);
    const b = await PDFDocument.create();
    b.addPage([400, 400]);

    const scalony = await PDFDocument.load(await mergePdfs([await a.save(), await b.save()]));
    expect(scalony.getPage(0).getWidth()).toBe(200);
    expect(scalony.getPage(1).getWidth()).toBe(400);
  });

  it('jedna część też się scala', async () => {
    expect(await liczStron(await mergePdfs([await pdfZeStronami(2)]))).toBe(2);
  });

  it('pusta lista to BŁĄD, nie biały dokument', async () => {
    /*
     * `pdf-lib` po zapisie i odczycie robi z dokumentu bez stron jedna pusta
     * strone. Cichy sukces oznaczalby biala kartke wyslana inwestorowi.
     */
    await expect(mergePdfs([])).rejects.toThrow();
  });
});

describe('mergePdfs — ciągła numeracja stron (kryterium F6.3)', () => {
  it('numeruje CIĄGLE przez cały pakiet, nie od nowa w każdej części', async () => {
    /*
     * Cztery dokumenty z wlasnymi numeracjami od jedynki to nie pakiet, tylko
     * cztery pliki w jednej kopercie. Sprawdzamy, ze ostatnia strona nosi
     * numer rowny liczbie stron calosci.
     */
    const etykiety: string[] = [];
    const scalony = await mergePdfs([await pdfZeStronami(2), await pdfZeStronami(3)], {
      pageLabel: (page, total) => {
        const text = `${page} / ${total}`;
        etykiety.push(text);
        return text;
      },
    });

    expect(await liczStron(scalony)).toBe(5);
    expect(etykiety).toEqual(['1 / 5', '2 / 5', '3 / 5', '4 / 5', '5 / 5']);
  });

  it('bez `pageLabel` nie rysuje niczego — tryb „osobne pliki"', async () => {
    const bez = await mergePdfs([await pdfZeStronami(1)]);
    const z = await mergePdfs([await pdfZeStronami(1)], { pageLabel: () => '1 / 1' });
    expect(z.length).toBeGreaterThan(bez.length);
  });

  it('numer trafia w prawy dolny róg, poza pole stopki', async () => {
    // Stopka brand kitu siedzi po lewej — numer po prawej, na tej samej
    // wysokosci, zeby sie nie nakladaly.
    const scalony = await mergePdfs([await pdfZeStronami(1)], { pageLabel: () => '1 / 1' });
    const strona = (await PDFDocument.load(scalony)).getPage(0);
    expect(strona.getWidth()).toBe(595);
  });
});
