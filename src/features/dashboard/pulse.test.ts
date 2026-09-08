import { describe, expect, it } from 'vitest';
import { pulseNumbers } from './pulse';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import type { ActivityEvent } from '@/data/repos/activity.repo';
import type { ProjectOverview } from '@/domain/project/schema';

const NOW = new Date('2026-09-08T12:00:00Z');

function quote(partial: Partial<QuoteSummary>): QuoteSummary {
  return {
    id: 'q',
    workspaceId: 'ws',
    clientId: null,
    projectId: null,
    lineageId: 'l',
    version: 1,
    number: null,
    title: 'x',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer',
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...partial,
  };
}

function event(partial: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'e',
    kind: 'viewed',
    at: '2026-09-08T10:00:00Z',
    quoteId: 'q',
    quoteNumber: null,
    quoteTitle: 'x',
    clientId: null,
    clientName: null,
    who: null,
    message: null,
    unread: false,
    ...partial,
  };
}

const project = (status: ProjectOverview['status']) => ({ status }) as ProjectOverview;

describe('pulseNumbers', () => {
  it('liczy wysłane, wygasające w 7 dni i projekty w toku', () => {
    const numbers = pulseNumbers({
      now: NOW,
      seenAt: null,
      events: [],
      quotes: [
        quote({ id: '1', status: 'sent', validUntil: '2026-09-10' }), // za 2 dni
        quote({ id: '2', status: 'sent', validUntil: '2026-09-30' }), // za 22 dni
        quote({ id: '3', status: 'sent', validUntil: '2026-09-01' }), // już wygasła
        quote({ id: '4', status: 'accepted', validUntil: '2026-09-09' }), // nie „wysłana"
        quote({ id: '5', status: 'draft' }),
      ],
      projects: [project('lead'), project('in_progress'), project('done'), project('canceled')],
    });
    expect(numbers).toEqual({ events: 0, sent: 3, expiring: 1, projects: 2 });
  });

  it('nowe zdarzenia: po znaczniku „przejrzane" albo nieprzeczytana uwaga', () => {
    const numbers = pulseNumbers({
      now: NOW,
      seenAt: '2026-09-07T00:00:00Z',
      events: [
        event({ id: 'a', at: '2026-09-08T10:00:00Z' }), // nowe
        event({ id: 'b', at: '2026-09-06T10:00:00Z' }), // przejrzane
        event({ id: 'c', at: '2026-09-05T10:00:00Z', kind: 'comment', unread: true }), // uwaga
      ],
      quotes: [],
      projects: [],
    });
    expect(numbers.events).toBe(2);
  });
});
