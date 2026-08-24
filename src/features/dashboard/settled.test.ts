import { describe, expect, it } from 'vitest';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { calcSettledCounts } from './settled';

const NOW = new Date('2026-08-22T12:00:00');

function quote(partial: Partial<QuoteSummary>): QuoteSummary {
  return {
    id: 'q',
    workspaceId: 'ws',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    number: null,
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 100_000,
    totalGrossCents: 123_000,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    ...partial,
  };
}

describe('calcSettledCounts', () => {
  it('liczy zaakceptowane i odrzucone z bieżącego miesiąca', () => {
    const result = calcSettledCounts(
      [
        quote({ id: 'a', status: 'accepted' }),
        quote({ id: 'b', status: 'accepted' }),
        quote({ id: 'c', status: 'rejected' }),
      ],
      NOW,
    );
    expect(result).toEqual({ accepted: 2, rejected: 1, settled: 3 });
  });

  it('ignoruje szkice, wysłane i wygasłe — to nie są rozstrzygnięcia', () => {
    const result = calcSettledCounts(
      [
        quote({ id: 'a', status: 'draft' }),
        quote({ id: 'b', status: 'sent' }),
        quote({ id: 'c', status: 'expired' }),
      ],
      NOW,
    );
    expect(result).toEqual({ accepted: 0, rejected: 0, settled: 0 });
  });

  it('ignoruje rozstrzygnięcia z innych miesięcy', () => {
    const result = calcSettledCounts(
      [
        quote({ id: 'a', status: 'accepted', createdAt: '2026-07-30T10:00:00Z' }),
        quote({ id: 'b', status: 'rejected', createdAt: '2025-08-10T10:00:00Z' }),
      ],
      NOW,
    );
    expect(result).toEqual({ accepted: 0, rejected: 0, settled: 0 });
  });

  it('pusta lista daje same zera', () => {
    expect(calcSettledCounts([], NOW)).toEqual({ accepted: 0, rejected: 0, settled: 0 });
  });
});
