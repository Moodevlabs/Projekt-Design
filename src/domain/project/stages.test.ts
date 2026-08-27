import { describe, expect, it } from 'vitest';

import { newScheduleBody, newStage } from '../schedule/defaults';
import type { ScheduleBody } from '../schedule/schema';
import {
  nextStage,
  parseStageProgress,
  projectStages,
  stageSummary,
  withStageStatus,
  type StageProgress,
} from './stages';

function harmonogram(stages: Parameters<typeof newStage>[0][]): ScheduleBody {
  return { ...newScheduleBody(), stages: stages.map((s) => newStage(s)) };
}

describe('projectStages', () => {
  it('bierze etapy z harmonogramu, nie z projektu', () => {
    const schedule = harmonogram([{ name: 'Etap funkcjonalny' }, { name: 'Etap wizualny' }]);
    const stages = projectStages(schedule, {});

    expect(stages.map((s) => s.name)).toEqual(['Etap funkcjonalny', 'Etap wizualny']);
    expect(stages.every((s) => s.status === 'pending')).toBe(true);
  });

  it('etap wylaczony w harmonogramie nie wchodzi — nie ma czego realizowac', () => {
    const schedule = harmonogram([{ name: 'A' }, { name: 'B', enabled: false }]);
    expect(projectStages(schedule, {}).map((s) => s.name)).toEqual(['A']);
  });

  it('brak harmonogramu daje pusta liste, a nie blad', () => {
    expect(projectStages(null, {})).toEqual([]);
  });

  it('rozpoznaje etap po stronie inwestora', () => {
    const schedule = harmonogram([{ name: 'Decyzje klienta', owner: 'client' }]);
    expect(projectStages(schedule, {})[0]!.clientSide).toBe(true);
  });

  /**
   * Slad wykonanej pracy nie moze zniknac razem z etapem usunietym
   * z harmonogramu po zmianie wyceny.
   */
  it('zapisany postep etapu, ktorego nie ma juz w harmonogramie, zostaje jako osierocony', () => {
    const progress: StageProgress = {
      'stary-etap': {
        status: 'done',
        startedAt: '2026-08-01T10:00:00Z',
        completedAt: '2026-08-05T10:00:00Z',
        name: 'Etap wizualny',
      },
    };
    const stages = projectStages(harmonogram([{ name: 'Nowy etap' }]), progress);

    expect(stages).toHaveLength(2);
    expect(stages[1]).toMatchObject({ name: 'Etap wizualny', orphaned: true, status: 'done' });
  });

  it('osierocony wpis BEZ postepu jest pomijany — to tylko smiec', () => {
    const progress: StageProgress = {
      'stary-etap': { status: 'pending', startedAt: null, completedAt: null, name: 'X' },
    };
    expect(projectStages(harmonogram([]), progress)).toEqual([]);
  });
});

describe('withStageStatus', () => {
  const teraz = new Date('2026-08-27T12:00:00Z');
  const etap = { id: 'e1', name: 'Etap wizualny' };

  it('rozpoczecie ustawia date startu', () => {
    const progress = withStageStatus({}, etap, 'in_progress', teraz);
    expect(progress.e1).toMatchObject({
      status: 'in_progress',
      startedAt: '2026-08-27T12:00:00.000Z',
      completedAt: null,
      name: 'Etap wizualny',
    });
  });

  it('zakonczenie etapu, ktorego nikt nie rozpoczal, ustawia obie daty', () => {
    const progress = withStageStatus({}, etap, 'done', teraz);
    expect(progress.e1!.startedAt).toBe('2026-08-27T12:00:00.000Z');
    expect(progress.e1!.completedAt).toBe('2026-08-27T12:00:00.000Z');
  });

  it('data rozpoczecia nie jest nadpisywana przy zakonczeniu', () => {
    const start = withStageStatus({}, etap, 'in_progress', new Date('2026-08-01T09:00:00Z'));
    const koniec = withStageStatus(start, etap, 'done', teraz);

    expect(koniec.e1!.startedAt).toBe('2026-08-01T09:00:00.000Z');
    expect(koniec.e1!.completedAt).toBe('2026-08-27T12:00:00.000Z');
  });

  /** Cofniecie ma skasowac date zakonczenia, bo ta przestala byc prawda. */
  it('cofniecie z „zakonczony" na „w toku" kasuje date zakonczenia, ale zachowuje start', () => {
    const start = withStageStatus({}, etap, 'in_progress', new Date('2026-08-01T09:00:00Z'));
    const koniec = withStageStatus(start, etap, 'done', teraz);
    const cofniete = withStageStatus(koniec, etap, 'in_progress', teraz);

    expect(cofniete.e1!.startedAt).toBe('2026-08-01T09:00:00.000Z');
    expect(cofniete.e1!.completedAt).toBeNull();
  });

  it('powrot do „nierozpoczety" zeruje obie daty', () => {
    const koniec = withStageStatus({}, etap, 'done', teraz);
    const zerowanie = withStageStatus(koniec, etap, 'pending', teraz);

    expect(zerowanie.e1!.startedAt).toBeNull();
    expect(zerowanie.e1!.completedAt).toBeNull();
  });

  it('nie modyfikuje mapy wejsciowej', () => {
    const przed: StageProgress = {};
    withStageStatus(przed, etap, 'done', teraz);
    expect(przed).toEqual({});
  });
});

describe('stageSummary', () => {
  it('liczy procent po etapach zaplanowanych', () => {
    const schedule = harmonogram([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]);
    const ids = schedule.stages.map((s) => s.id);
    let progress: StageProgress = {};
    progress = withStageStatus(progress, { id: ids[0]!, name: 'A' }, 'done');
    progress = withStageStatus(progress, { id: ids[1]!, name: 'B' }, 'in_progress');

    const summary = stageSummary(projectStages(schedule, progress));
    expect(summary).toMatchObject({ total: 4, done: 1, inProgress: 1, percent: 25 });
  });

  it('brak etapow daje 0%, a nie dzielenie przez zero', () => {
    expect(stageSummary([])).toMatchObject({ total: 0, done: 0, percent: 0 });
  });

  it('etapy osierocone nie licza sie do postepu', () => {
    const progress: StageProgress = {
      stary: { status: 'done', startedAt: null, completedAt: null, name: 'Stary' },
    };
    const stages = projectStages(harmonogram([{ name: 'A' }]), progress);
    expect(stageSummary(stages)).toMatchObject({ total: 1, done: 0, percent: 0 });
  });
});

describe('nextStage', () => {
  it('wskazuje pierwszy nierozpoczety etap', () => {
    const schedule = harmonogram([{ name: 'A' }, { name: 'B' }]);
    const progress = withStageStatus({}, { id: schedule.stages[0]!.id, name: 'A' }, 'done');
    expect(nextStage(projectStages(schedule, progress))?.name).toBe('B');
  });

  it('null, gdy wszystko zrobione', () => {
    const schedule = harmonogram([{ name: 'A' }]);
    const progress = withStageStatus({}, { id: schedule.stages[0]!.id, name: 'A' }, 'done');
    expect(nextStage(projectStages(schedule, progress))).toBeNull();
  });
});

describe('parseStageProgress', () => {
  it('null i undefined daja pusta mape', () => {
    expect(parseStageProgress(null)).toEqual({});
    expect(parseStageProgress(undefined)).toEqual({});
  });

  /** Uszkodzony postep nie ma prawa zablokowac projektu. */
  it('smieci daja pusta mape zamiast wyjatku', () => {
    expect(parseStageProgress({ e1: { status: 'cokolwiek' } })).toEqual({});
    expect(parseStageProgress('nie obiekt')).toEqual({});
  });

  it('poprawny zapis przechodzi', () => {
    const raw = { e1: { status: 'done', startedAt: null, completedAt: null, name: 'A' } };
    expect(parseStageProgress(raw).e1?.status).toBe('done');
  });
});
