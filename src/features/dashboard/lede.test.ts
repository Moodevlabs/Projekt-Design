import { describe, expect, it } from 'vitest';
import { countWord, dashboardCounts, ledeSegments, plural, whenLabel } from './lede';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import type { ActivityEvent } from '@/data/repos/activity.repo';
import type { ProjectOverview } from '@/domain/project/schema';

// Wtorek.
const NOW = new Date('2026-09-08T12:00:00');

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
const text = (counts: ReturnType<typeof dashboardCounts>) =>
  ledeSegments(counts, NOW)
    .map((segment) => segment.text)
    .join('');

describe('plural / countWord / whenLabel', () => {
  it('odmienia po polsku', () => {
    const f = ['oferta', 'oferty', 'ofert'] as const;
    expect([1, 2, 5, 12, 22, 25].map((n) => plural(n, f))).toEqual([
      'oferta',
      'oferty',
      'ofert',
      'ofert',
      'oferty',
      'ofert',
    ]);
    expect(countWord(3, 'f')).toBe('trzy');
    expect(countWord(1, 'n')).toBe('jedno');
    expect(countWord(12, 'm')).toBe('12');
  });

  it('nazywa dzień: dziś, jutro, dzień tygodnia, za tydzień', () => {
    expect(whenLabel('2026-09-08', NOW)).toBe('dziś');
    expect(whenLabel('2026-09-09', NOW)).toBe('jutro');
    expect(whenLabel('2026-09-10', NOW)).toBe('w czwartek');
    expect(whenLabel('2026-09-15', NOW)).toBe('za tydzień');
  });
});

describe('dashboardCounts', () => {
  it('liczy wysłane, wygasające, uwagi, inne zdarzenia i projekty', () => {
    const counts = dashboardCounts({
      now: NOW,
      seenAt: '2026-09-07T00:00:00Z',
      quotes: [
        quote({ id: '1', status: 'sent', validUntil: '2026-09-10' }),
        quote({ id: '2', status: 'sent', validUntil: '2026-09-30' }),
        quote({ id: '3', status: 'sent', validUntil: '2026-09-01' }),
        quote({ id: '4', status: 'accepted', validUntil: '2026-09-09' }),
      ],
      events: [
        event({ id: 'a', at: '2026-09-08T10:00:00Z' }),
        event({ id: 'b', at: '2026-09-06T10:00:00Z' }),
        event({ id: 'c', at: '2026-09-05T10:00:00Z', kind: 'comment', unread: true }),
      ],
      projects: [project('lead'), project('in_progress'), project('done')],
    });
    expect(counts).toEqual({
      sent: 3,
      expiring: 1,
      expiringOn: '2026-09-10',
      comments: 1,
      otherNew: 1,
      projects: 2,
    });
  });
});

describe('ledeSegments', () => {
  it('oferty, wygasająca i uwagi — z odnośnikiem na ofertach', () => {
    const segments = ledeSegments(
      { sent: 3, expiring: 1, expiringOn: '2026-09-10', comments: 2, otherNew: 0, projects: 4 },
      NOW,
    );
    expect(segments.map((s) => s.text).join('')).toBe(
      'Trzy oferty czekają na decyzję inwestorów, jedna z nich wygasa w czwartek. Dwie nowe uwagi od klientów.',
    );
    expect(segments[0]?.to).toBeDefined();
  });

  it('jedna oferta i inne zdarzenia', () => {
    expect(
      text({
        sent: 1,
        expiring: 1,
        expiringOn: '2026-09-09',
        comments: 0,
        otherNew: 3,
        projects: 1,
      }),
    ).toBe(
      'Jedna oferta czeka na decyzję inwestorów, wygasa jutro. Trzy nowe zdarzenia od klientów.',
    );
  });

  it('nic nie czeka: projekty w toku', () => {
    expect(
      text({ sent: 0, expiring: 0, expiringOn: null, comments: 0, otherNew: 0, projects: 2 }),
    ).toBe('Nic nie czeka na odpowiedź. Dwa projekty w toku.');
    expect(
      text({ sent: 0, expiring: 0, expiringOn: null, comments: 0, otherNew: 0, projects: 0 }),
    ).toBe('Nic nie czeka na odpowiedź. Brak projektów w toku.');
  });
});
