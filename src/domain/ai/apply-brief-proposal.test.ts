import { describe, expect, it } from 'vitest';

import { defaultWorkspaceSettings } from '../brand/schema';
import { calcQuoteTotals } from '../quote/calc';
import { fromTemplate, newItem, newQuoteBody, newRoom, newSection } from '../quote/factory';
import { quoteBodyFromSettings } from '../quote/from-settings';
import {
  BRIEF_SCOPE_SECTION_TITLE,
  applyBriefProposal,
  type BriefLibraryEntry,
} from './apply-brief-proposal';
import type { BriefProposal } from './schema';

const library: BriefLibraryEntry[] = [
  {
    id: 'lib-koncepcja',
    kind: 'item',
    name: 'Koncepcja funkcjonalna',
    description: 'Układ ścian i mebli.',
    unitPriceCents: 150_000,
    unit: 'lump',
    pricing: { mode: 'flat' },
  },
  {
    id: 'lib-m2',
    kind: 'item',
    name: 'Projekt wykonawczy',
    description: '',
    unitPriceCents: 12_000,
    unit: 'm2',
    pricing: { mode: 'flat' },
  },
  {
    id: 'lib-nadzor',
    kind: 'item',
    name: 'Nadzór autorski',
    description: '',
    unitPriceCents: null,
    unit: 'lump',
    pricing: { mode: 'flat' },
  },
];

const RT_KUCHNIA = '11111111-1111-4111-8111-111111111111';
const RT_LAZIENKA = '22222222-2222-4222-8222-222222222222';
const roomTypeIds = new Set([RT_KUCHNIA, RT_LAZIENKA]);

function proposal(partial: Partial<BriefProposal> = {}): BriefProposal {
  return {
    title: 'Projekt wnętrza mieszkania 62 m²',
    projectDescription: 'Trzy pokoje, kuchnia i łazienka w stylu skandynawskim.',
    templateId: null,
    rooms: [
      { roomTypeId: RT_KUCHNIA, label: 'Kuchnia', qty: 1 },
      { roomTypeId: 'rt-obcy', label: 'Pokój', qty: 3 },
      { roomTypeId: null, label: '   ', qty: 1 },
    ],
    items: [
      { libraryItemId: 'lib-koncepcja', enabled: true, reason: 'Podstawa każdego projektu.' },
      { libraryItemId: 'lib-m2', enabled: true, reason: '' },
      { libraryItemId: 'lib-nadzor', enabled: false, reason: 'Klient nie wspomniał o nadzorze.' },
      { libraryItemId: 'lib-zmyslony', enabled: true, reason: 'Nie istnieje.' },
    ],
    openQuestions: ['Jaki budżet?'],
    ...partial,
  };
}

describe('applyBriefProposal', () => {
  it('bez szablonu: tworzy sekcję „Zakres", pomieszczenia i pozycje z biblioteki', () => {
    const base = quoteBodyFromSettings(defaultWorkspaceSettings());
    const { body, skipped } = applyBriefProposal({
      proposal: proposal(),
      base,
      library,
      roomTypeIds,
    });

    expect(body.title).toBe('Projekt wnętrza mieszkania 62 m²');
    expect(body.projectDescription).toContain('skandynawskim');

    expect(body.rooms).toHaveLength(2);
    expect(body.rooms[0]).toMatchObject({ label: 'Kuchnia', qty: 1, roomTypeId: RT_KUCHNIA });
    // Obcy typ pomieszczenia nie przechodzi — etykieta zostaje, typ znika.
    expect(body.rooms[1]).toMatchObject({ label: 'Pokój', qty: 3, roomTypeId: null });

    expect(body.sections).toHaveLength(1);
    const scope = body.sections[0];
    expect(scope?.title).toBe(BRIEF_SCOPE_SECTION_TITLE);
    expect(scope?.items.map((item) => [item.libraryItemId, item.enabled])).toEqual([
      ['lib-koncepcja', true],
      ['lib-m2', true],
      ['lib-nadzor', false],
    ]);
    expect(scope?.items[1]).toMatchObject({ unit: 'm2', unitPriceCents: 12_000 });
    expect(skipped).toEqual(['lib-zmyslony']);
  });

  it('z szablonem: pozycja już obecna dostaje tylko stan włączenia, reszta trafia do pierwszej sekcji', () => {
    const template = newQuoteBody({
      title: 'Szablon kompleksowy',
      sections: [
        newSection({
          title: 'Projekt',
          items: [newItem({ name: 'Koncepcja', libraryItemId: 'lib-koncepcja', enabled: true })],
          groups: [],
        }),
        newSection({ title: 'Dodatki', items: [] }),
      ],
    });
    const base = fromTemplate(template);
    const { body, skipped } = applyBriefProposal({
      proposal: proposal({
        items: [
          { libraryItemId: 'lib-koncepcja', enabled: false, reason: '' },
          { libraryItemId: 'lib-nadzor', enabled: true, reason: '' },
        ],
      }),
      base,
      library,
      roomTypeIds,
    });

    expect(body.sections).toHaveLength(2);
    const first = body.sections[0];
    expect(first?.items).toHaveLength(2);
    expect(first?.items[0]).toMatchObject({ name: 'Koncepcja', enabled: false });
    expect(first?.items[1]).toMatchObject({ libraryItemId: 'lib-nadzor', enabled: true });
    expect(body.sections[1]?.items).toHaveLength(0);
    expect(skipped).toEqual([]);
  });

  it('nie rusza bazy i zostawia jej tytuł, gdy propozycja ma pusty', () => {
    const base = newQuoteBody({ title: 'Mój tytuł', rooms: [newRoom({ label: 'Salon' })] });
    const snapshot = structuredClone(base);
    const { body } = applyBriefProposal({
      proposal: proposal({ title: '  ', projectDescription: '' }),
      base,
      library,
      roomTypeIds,
    });

    expect(base).toEqual(snapshot);
    expect(body.title).toBe('Mój tytuł');
    expect(body.projectDescription).toBe('');
    expect(body.rooms.map((room) => room.label)).toEqual(['Salon', 'Kuchnia', 'Pokój']);
  });

  it('pomieszczenie już obecne w bazie nie dubluje się — rośnie tylko qty, gdy propozycja ma większe', () => {
    const base = newQuoteBody({
      rooms: [
        newRoom({ label: 'Kuchnia', qty: 1, roomTypeId: RT_KUCHNIA }),
        newRoom({ label: 'Łazienka', qty: 2, roomTypeId: RT_LAZIENKA }),
      ],
    });
    const { body } = applyBriefProposal({
      proposal: proposal({
        rooms: [
          { roomTypeId: null, label: '  kuchnia ', qty: 1 },
          { roomTypeId: RT_LAZIENKA, label: 'ŁAZIENKA', qty: 1 },
          { roomTypeId: null, label: 'Sypialnia', qty: 2 },
          { roomTypeId: null, label: 'sypialnia', qty: 3 },
        ],
      }),
      base,
      library,
      roomTypeIds,
    });

    expect(body.rooms.map((room) => [room.label, room.qty, room.roomTypeId])).toEqual([
      // Z bazy: etykieta i typ bez zmian; qty nie maleje.
      ['Kuchnia', 1, RT_KUCHNIA],
      ['Łazienka', 2, RT_LAZIENKA],
      // Duplikat w samej propozycji też nie wchodzi drugi raz — tylko podnosi qty.
      ['Sypialnia', 3, null],
    ]);
  });

  it('calcQuoteTotals liczy tylko pozycje włączone', () => {
    const base = quoteBodyFromSettings(defaultWorkspaceSettings());
    const { body } = applyBriefProposal({
      proposal: proposal({
        items: [
          { libraryItemId: 'lib-koncepcja', enabled: true, reason: '' },
          { libraryItemId: 'lib-m2', enabled: false, reason: '' },
        ],
      }),
      base,
      library,
      roomTypeIds,
    });

    expect(calcQuoteTotals(body).netCents).toBe(150_000);
  });

  it('pozycja zmyślona dwa razy odpada dwa razy, a istniejąca nie dubluje się', () => {
    const base = quoteBodyFromSettings(defaultWorkspaceSettings());
    const { body, skipped } = applyBriefProposal({
      proposal: proposal({
        items: [
          { libraryItemId: 'lib-zmyslony', enabled: true, reason: '' },
          { libraryItemId: 'lib-koncepcja', enabled: true, reason: '' },
          { libraryItemId: 'lib-koncepcja', enabled: false, reason: '' },
          { libraryItemId: 'lib-zmyslony', enabled: true, reason: '' },
        ],
      }),
      base,
      library,
      roomTypeIds,
    });

    expect(body.sections[0]?.items).toHaveLength(1);
    expect(body.sections[0]?.items[0]?.enabled).toBe(false);
    expect(skipped).toEqual(['lib-zmyslony', 'lib-zmyslony']);
  });
});
