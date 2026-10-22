import { describe, expect, it } from 'vitest';

import {
  briefProposalOf,
  clientDraftFromProposal,
  matchExistingClient,
  normalizeName,
  projectDraftFromProposal,
} from './apply-message-proposal';
import { MessageProposalSchema, type MessageProposal } from './schema';

const proposal: MessageProposal = MessageProposalSchema.parse({
  title: 'Projekt wnętrza mieszkania 62 m²',
  projectDescription: 'Mieszkanie dla pary.',
  templateId: null,
  rooms: [{ roomTypeId: null, label: 'kuchnia', qty: 1 }],
  items: [{ libraryItemId: 'a', enabled: true, reason: '' }],
  openQuestions: ['Czy łazienka też?'],
  summary: 'Para prosi o projekt kuchni i salonu.',
  client: { name: 'Anna Kowalska', city: 'Poznań', address: 'ul. Wilczak 12' },
  project: { name: 'Mieszkanie Wilczak', areaM2: 62.04, kind: 'apartment' },
  hasScope: true,
});

describe('clientDraftFromProposal', () => {
  it('bierze nazwę i adres od modelu, a kontakt z maski', () => {
    const draft = clientDraftFromProposal(proposal, {
      emails: ['anna@example.com'],
      phones: ['+48 600 100 200'],
    });
    expect(draft).toMatchObject({
      name: 'Anna Kowalska',
      city: 'Poznań',
      address: 'ul. Wilczak 12',
      email: 'anna@example.com',
      phone: '+48 600 100 200',
    });
  });
});

describe('projectDraftFromProposal', () => {
  it('nazwa z projektu, metraż jako tekst, status lead, wiadomość w notatkach', () => {
    const draft = projectDraftFromProposal(proposal, '  treść maila  ');
    expect(draft).toMatchObject({
      name: 'Mieszkanie Wilczak',
      areaM2: '62',
      kind: 'apartment',
      status: 'lead',
      notes: 'treść maila',
      city: 'Poznań',
    });
  });

  it('bez nazwy projektu bierze tytuł oferty; nieznany rodzaj → pusty', () => {
    const bare = MessageProposalSchema.parse({
      ...proposal,
      project: { name: '', areaM2: -5, kind: 'castle' },
    });
    const draft = projectDraftFromProposal(bare, 'x');
    expect(draft.name).toBe('Projekt wnętrza mieszkania 62 m²');
    expect(draft.areaM2).toBe('');
    expect(draft.kind).toBe('');
  });
});

describe('briefProposalOf', () => {
  it('oddaje tylko pola briefu', () => {
    expect(Object.keys(briefProposalOf(proposal))).toEqual([
      'title',
      'projectDescription',
      'templateId',
      'rooms',
      'items',
      'openQuestions',
    ]);
  });
});

describe('matchExistingClient', () => {
  const clients = [
    { id: '1', name: 'Anna Kowalska', email: 'ANNA@example.com' },
    { id: '2', name: 'Jan Nowak', email: null },
  ];

  it('najpierw po e-mailu z maski', () => {
    expect(matchExistingClient(proposal, { emails: ['anna@example.com'] }, clients)?.id).toBe('1');
  });

  it('potem po nazwie bez ogonków i wielkości liter', () => {
    const other = { ...proposal, client: { ...proposal.client, name: '  JAN  NOWAK ' } };
    expect(matchExistingClient(other, { emails: [] }, clients)?.id).toBe('2');
    expect(normalizeName('Łukasz  Żółć')).toBe('lukasz zolc');
  });

  it('brak dopasowania → null', () => {
    const other = { ...proposal, client: { ...proposal.client, name: 'Nikt Taki' } };
    expect(matchExistingClient(other, { emails: ['x@y.pl'] }, clients)).toBeNull();
  });
});
