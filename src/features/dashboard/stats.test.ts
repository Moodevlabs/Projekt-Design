import { describe, expect, it } from 'vitest';
import { calcDashboardStats } from './stats';
import type { QuoteSummary } from '@/data/repos/quotes.repo';

const NOW = new Date('2026-08-15T12:00:00Z');

function quote(partial: Partial<QuoteSummary> & { createdAt: string }): QuoteSummary {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    workspaceId: 'ws',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    number: null,
    title: 'Wycena',
    status: partial.status ?? 'draft',
    totalNetCents: partial.totalNetCents ?? 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    ...partial,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt ?? partial.createdAt,
  };
}

describe('calcDashboardStats', () => {
  it('zwraca zera dla pustej listy', () => {
    const stats = calcDashboardStats([], NOW);
    expect(stats).toEqual({
      quotesThisMonth: 0,
      sentValueCents: 0,
      acceptanceRate: null,
      averageValueCents: 0,
    });
  });

  it('liczy tylko biezacy miesiac', () => {
    const stats = calcDashboardStats(
      [
        quote({ createdAt: '2026-08-01T09:00:00Z', totalNetCents: 100_000 }),
        quote({ createdAt: '2026-08-30T10:00:00Z', totalNetCents: 100_000 }),
        quote({ createdAt: '2026-07-20T10:00:00Z', totalNetCents: 999_000 }),
        quote({ createdAt: '2025-08-15T12:00:00Z', totalNetCents: 999_000 }),
      ],
      NOW,
    );
    expect(stats.quotesThisMonth).toBe(2);
    expect(stats.averageValueCents).toBe(100_000);
    // Uwaga: daty w tescie sa celowo z dala od granicy miesiaca. `created_at`
    // jest w UTC, a miesiac liczymy w strefie uzytkownika, wiec np.
    // 2026-08-31T23:00Z to juz wrzesien w Polsce — i tak ma byc.
  });

  it('do wartosci wyslanych bierze sent i accepted, pomija szkice i odrzucone', () => {
    const stats = calcDashboardStats(
      [
        quote({ createdAt: '2026-08-02T10:00:00Z', status: 'sent', totalNetCents: 300_000 }),
        quote({ createdAt: '2026-08-03T10:00:00Z', status: 'accepted', totalNetCents: 200_000 }),
        quote({ createdAt: '2026-08-04T10:00:00Z', status: 'draft', totalNetCents: 500_000 }),
        quote({ createdAt: '2026-08-05T10:00:00Z', status: 'rejected', totalNetCents: 500_000 }),
      ],
      NOW,
    );
    expect(stats.sentValueCents).toBe(500_000);
  });

  it('liczy akceptacje tylko z rozstrzygnietych', () => {
    const stats = calcDashboardStats(
      [
        quote({ createdAt: '2026-08-02T10:00:00Z', status: 'accepted' }),
        quote({ createdAt: '2026-08-03T10:00:00Z', status: 'rejected' }),
        // Ponizsze nie moga wplynac na wskaznik — jeszcze nic nie rozstrzygnely.
        quote({ createdAt: '2026-08-04T10:00:00Z', status: 'sent' }),
        quote({ createdAt: '2026-08-05T10:00:00Z', status: 'draft' }),
      ],
      NOW,
    );
    expect(stats.acceptanceRate).toBe(0.5);
  });

  it('zwraca null dla akceptacji, gdy nic nie jest rozstrzygniete', () => {
    const stats = calcDashboardStats(
      [quote({ createdAt: '2026-08-02T10:00:00Z', status: 'sent' })],
      NOW,
    );
    expect(stats.acceptanceRate).toBeNull();
  });

  it('zaokragla srednia do pelnych groszy', () => {
    const stats = calcDashboardStats(
      [
        quote({ createdAt: '2026-08-02T10:00:00Z', totalNetCents: 100 }),
        quote({ createdAt: '2026-08-03T10:00:00Z', totalNetCents: 101 }),
        quote({ createdAt: '2026-08-04T10:00:00Z', totalNetCents: 101 }),
      ],
      NOW,
    );
    expect(stats.averageValueCents).toBe(101);
    expect(Number.isInteger(stats.averageValueCents)).toBe(true);
  });
});
