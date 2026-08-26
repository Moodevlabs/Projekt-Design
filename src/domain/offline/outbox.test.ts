import { describe, expect, it } from 'vitest';

import {
  afterSend,
  countBlocked,
  countPending,
  enqueue,
  MAX_ATTEMPTS,
  needsAttention,
  pending,
  retryDelayMs,
  type OutboxEntry,
} from './outbox';

function wpis(partial: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: partial.id ?? 'e1',
    kind: 'quote.save',
    targetId: partial.targetId ?? 'q1',
    payload: partial.payload ?? { body: 'v1' },
    baseUpdatedAt: partial.baseUpdatedAt ?? '2026-08-27T10:00:00Z',
    createdAt: partial.createdAt ?? '2026-08-27T10:00:00Z',
    attempts: partial.attempts ?? 0,
    status: partial.status ?? 'pending',
    lastError: partial.lastError ?? null,
  };
}

describe('enqueue — koalescencja', () => {
  /**
   * Autozapis leci co 800 ms. Godzina pracy bez sieci to setki wpisow dla
   * JEDNEJ wyceny — a liczy sie stan koncowy.
   */
  it('drugi zapis tej samej wyceny nadpisuje pierwszy, nie dokleja sie', () => {
    let queue = enqueue([], wpis({ id: 'a', payload: { body: 'v1' } }));
    queue = enqueue(queue, wpis({ id: 'b', payload: { body: 'v2' } }));

    expect(queue).toHaveLength(1);
    expect(queue[0]!.payload).toEqual({ body: 'v2' });
  });

  /**
   * To jest stan, ktory autor FAKTYCZNIE widzial, zanim zaczal pisac bez
   * sieci. Podmiana na nowszy udawalaby, ze widzial tez cudze zmiany.
   */
  it('baseUpdatedAt zostaje z PIERWSZEGO wpisu', () => {
    let queue = enqueue([], wpis({ id: 'a', baseUpdatedAt: '2026-08-27T10:00:00Z' }));
    queue = enqueue(queue, wpis({ id: 'b', baseUpdatedAt: '2026-08-27T11:00:00Z' }));

    expect(queue[0]!.baseUpdatedAt).toBe('2026-08-27T10:00:00Z');
  });

  it('rozne wyceny to rozne wpisy', () => {
    let queue = enqueue([], wpis({ id: 'a', targetId: 'q1' }));
    queue = enqueue(queue, wpis({ id: 'b', targetId: 'q2' }));
    expect(queue).toHaveLength(2);
  });

  /** Konflikt trzeba rozwiazac swiadomie — nowy zapis nie kasuje jego sladu. */
  it('wpis w konflikcie nie jest koalescowany', () => {
    const konflikt = wpis({ id: 'a', status: 'conflict' });
    const queue = enqueue([konflikt], wpis({ id: 'b', payload: { body: 'v2' } }));

    expect(queue).toHaveLength(2);
    expect(queue[0]!.status).toBe('conflict');
  });

  it('ponowny zapis po nieudanej probie zeruje licznik prob', () => {
    const nieudany = wpis({ id: 'a', attempts: 3, status: 'pending', lastError: 'brak sieci' });
    const queue = enqueue([nieudany], wpis({ id: 'b', payload: { body: 'v2' } }));

    expect(queue[0]!.attempts).toBe(0);
    expect(queue[0]!.lastError).toBeNull();
  });
});

describe('pending', () => {
  it('zwraca najstarsze pierwsze', () => {
    const queue = [
      wpis({ id: 'b', targetId: 'q2', createdAt: '2026-08-27T12:00:00Z' }),
      wpis({ id: 'a', targetId: 'q1', createdAt: '2026-08-27T10:00:00Z' }),
    ];
    expect(pending(queue).map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('pomija konflikty i porazki — czekaja na czlowieka', () => {
    const queue = [
      wpis({ id: 'a', targetId: 'q1', status: 'pending' }),
      wpis({ id: 'b', targetId: 'q2', status: 'conflict' }),
      wpis({ id: 'c', targetId: 'q3', status: 'failed' }),
    ];
    expect(pending(queue).map((row) => row.id)).toEqual(['a']);
  });
});

describe('afterSend', () => {
  it('sukces usuwa wpis z kolejki', () => {
    expect(afterSend(wpis(), { kind: 'ok' })).toBeNull();
  });

  /**
   * Ponawianie konfliktu go nie naprawi, a kazda kolejna proba tylko oddala
   * moment, w ktorym czlowiek sie o nim dowie.
   */
  it('konflikt zatrzymuje wpis od razu, bez ponawiania', () => {
    const po = afterSend(wpis(), { kind: 'conflict', message: 'zmienione gdzie indziej' });
    expect(po?.status).toBe('conflict');
    expect(po?.lastError).toBe('zmienione gdzie indziej');
  });

  it('blad sieci zostawia wpis do ponowienia', () => {
    const po = afterSend(wpis(), { kind: 'error', message: 'brak sieci' });
    expect(po?.status).toBe('pending');
    expect(po?.attempts).toBe(1);
  });

  it('po MAX_ATTEMPTS wpis przestaje sie ponawiac, ale NIE znika', () => {
    let entry: OutboxEntry | null = wpis();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      entry = afterSend(entry!, { kind: 'error', message: 'brak sieci' });
    }
    expect(entry).not.toBeNull();
    expect(entry!.status).toBe('failed');
    expect(entry!.attempts).toBe(MAX_ATTEMPTS);
  });
});

describe('liczniki i uwaga', () => {
  it('countPending liczy oczekujace i wysylane', () => {
    const queue = [
      wpis({ id: 'a', targetId: 'q1', status: 'pending' }),
      wpis({ id: 'b', targetId: 'q2', status: 'sending' }),
      wpis({ id: 'c', targetId: 'q3', status: 'conflict' }),
    ];
    expect(countPending(queue)).toBe(2);
    expect(countBlocked(queue)).toBe(1);
  });

  it('needsAttention tylko przy konflikcie albo porazce', () => {
    expect(needsAttention([wpis({ status: 'pending' })])).toBe(false);
    expect(needsAttention([wpis({ status: 'conflict' })])).toBe(true);
    expect(needsAttention([wpis({ status: 'failed' })])).toBe(true);
  });
});

describe('retryDelayMs', () => {
  it('rosnie wykladniczo', () => {
    expect(retryDelayMs(0)).toBe(2_000);
    expect(retryDelayMs(1)).toBe(4_000);
    expect(retryDelayMs(2)).toBe(8_000);
  });

  /** Aplikacja zostawiona na noc nie ma rano czekac pol godziny na proba. */
  it('ma sufit', () => {
    expect(retryDelayMs(20)).toBe(60_000);
  });
});
