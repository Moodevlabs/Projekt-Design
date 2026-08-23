import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { calcQuoteTotals, newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';

/**
 * Kryterium akceptacji T-35 odegrane na PRAWDZIWYM store edytora, a nie na
 * samej domenie: 7 pomieszczeń, „Projekt budowlany” liczony za pomieszczenie,
 * wyłączenie części technicznej dla salonu, kuchnia ×2.
 *
 * Domena ma to pokryte w `pricing.test.ts`; tutaj sprawdzamy, że akcje store’u
 * faktycznie prowadzą do tych kwot — czyli że panel pomieszczeń liczy to samo,
 * co arkusz.
 */
const POMIESZCZENIA = [
  'Wiatrolap',
  'Korytarz',
  'Kuchnia',
  'Salon',
  'Lazienka',
  'Sypialnia',
  'Gabinet',
];

function makeQuote(body: QuoteBody): Quote {
  return {
    id: 'quote-rooms',
    workspaceId: 'ws-1',
    number: null,
    title: body.title,
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    body,
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

const store = () => useEditorStore.getState();

/** „Projekt budowlany”: baza 200 zl + 15 zl za kazde pomieszczenie techniczne. */
function makeBody(): QuoteBody {
  return newQuoteBody({
    title: 'Wycena z pomieszczeniami',
    vatRate: 0,
    sections: [
      newSection({
        title: 'Etap techniczny',
        items: [
          newItem({
            name: 'Projekt budowlany',
            pricing: {
              mode: 'per_room',
              baseCents: 20_000,
              perRoomCents: {},
              defaultPerRoomCents: 1_500,
              roomScope: 'technical',
            },
          }),
        ],
      }),
    ],
  });
}

function totals() {
  const body = store().body;
  if (!body) throw new Error('brak wyceny');
  return calcQuoteTotals(body);
}

beforeEach(() => {
  store().reset();
  store().load(makeQuote(makeBody()));
  for (const label of POMIESZCZENIA) store().addRoom({ label });
});

describe('scenariusz z arkusza — pomieszczenia w edytorze', () => {
  it('7 pomieszczen daje baze plus skladnik za kazde', () => {
    // Arkusz K95: 200 + 15 × 7 = 305 zl.
    expect(totals().netCents).toBe(30_500);
  });

  it('wylaczenie czesci technicznej dla salonu zdejmuje jego skladnik', () => {
    const salon = store().body?.rooms.find((room) => room.label === 'Salon');
    if (!salon) throw new Error('brak salonu');

    store().updateRoom(salon.id, { includedInTechnical: false });

    // 305 − 15 = 290 zl.
    expect(totals().netCents).toBe(29_000);
  });

  it('wylaczenie czesci WIZUALNEJ nie rusza uslugi technicznej', () => {
    // Wiersz 49 arkusza: salon ma M=NIE, A=TAK — do technicznej wchodzi.
    const salon = store().body?.rooms.find((room) => room.label === 'Salon');
    if (!salon) throw new Error('brak salonu');

    store().updateRoom(salon.id, { includedInVisual: false });

    expect(totals().netCents).toBe(30_500);
  });

  it('kuchnia x2 podwaja swoj skladnik', () => {
    const kuchnia = store().body?.rooms.find((room) => room.label === 'Kuchnia');
    if (!kuchnia) throw new Error('brak kuchni');

    store().updateRoom(kuchnia.id, { qty: 2 });

    // 305 + 15 = 320 zl.
    expect(totals().netCents).toBe(32_000);
  });

  it('usuniecie pomieszczenia obniza cene uslugi', () => {
    const gabinet = store().body?.rooms.find((room) => room.label === 'Gabinet');
    if (!gabinet) throw new Error('brak gabinetu');

    store().removeRoom(gabinet.id);

    expect(store().body?.rooms).toHaveLength(6);
    expect(totals().netCents).toBe(29_000);
  });

  it('wycena bez pomieszczen zostaje przy samej bazie', () => {
    for (const room of [...(store().body?.rooms ?? [])]) store().removeRoom(room.id);

    expect(totals().netCents).toBe(20_000);
  });

  it('zmiany pomieszczen brudza dokument, zeby autozapis je utrwalil', () => {
    store().markSaved('2026-08-01T11:00:00Z', '2026-08-01T11:00:00Z');
    expect(store().saveState).toBe('saved');

    const kuchnia = store().body?.rooms.find((room) => room.label === 'Kuchnia');
    if (!kuchnia) throw new Error('brak kuchni');
    store().updateRoom(kuchnia.id, { qty: 3 });

    expect(store().saveState).toBe('dirty');
  });
});
