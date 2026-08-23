import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { StagesPdfDocument } from './StagesPdfDocument';
import { stagesFileName } from './file-name';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newStagesDoc, newStageEntry, type StagesDoc } from '@/domain/documents';

function render(doc: StagesDoc) {
  return renderToBuffer(
    <StagesPdfDocument
      doc={doc}
      theme={buildPdfTheme(defaultBrandKit())}
      brandKit={defaultBrandKit()}
      number="WYC/2026/08/0001"
      issueDate="2026-08-01"
    />,
  );
}

describe('StagesPdfDocument — render', () => {
  it('składa dokument z pełnego szablonu', async () => {
    const bytes = await render(newStagesDoc());
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('etapy poza zakresem ZOSTAJĄ w dokumencie', async () => {
    /*
     * Sedno F6.1. Dokument bez odznaczonych etapów niczego nie wyjaśnia —
     * inwestor dowiaduje się, że nadzoru nie ma, w połowie budowy.
     * Render z samych odznaczonych etapów musi dać treść, a nie pustą kartkę.
     */
    const doc = newStagesDoc({
      entries: [
        newStageEntry({
          name: 'Nadzór autorski',
          description: 'Wizyty na budowie.',
          included: false,
        }),
        newStageEntry({ name: 'Kompletacja', description: 'Zamówienia.', included: false }),
      ],
    });

    const bytes = await render(doc);
    const pusty = await render(newStagesDoc({ entries: [] }));
    expect(bytes.length).toBeGreaterThan(pusty.length);
  });

  it('dokument bez etapów nadal się renderuje', async () => {
    // Użytkownik może wykasować wszystkie pozycje — to nie jest awaria.
    const bytes = await render(newStagesDoc({ entries: [] }));
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('przypis trafia do pliku', async () => {
    const bez = await render(newStagesDoc({ entries: [], footnote: '' }));
    const z = await render(
      newStagesDoc({ entries: [], footnote: 'Zakres poza listą wyceniamy osobno.' }),
    );
    expect(z.length).toBeGreaterThan(bez.length);
  });

  it('A4 przyjmuje pełny szablon bez wywrotki', async () => {
    const doc = newStagesDoc();
    expect(doc.entries).toHaveLength(19);
    const bytes = await render(doc);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe('stagesFileName', () => {
  it('ma przyrostek -etapy, żeby nie nadpisać oferty ani terminu', () => {
    expect(stagesFileName('WYC/2026/08/0001')).toBe('wyc-2026-08-0001-etapy.pdf');
  });

  it('bez numeru daje sensowną nazwę', () => {
    expect(stagesFileName(null)).toBe('wycena-etapy.pdf');
  });
});
