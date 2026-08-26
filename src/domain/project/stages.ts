import { z } from 'zod';

import type { ScheduleBody, ScheduleStage } from '../schedule/schema';

/**
 * Statusy realizacji etapów projektu (T-68).
 *
 * ## Skąd biorą się etapy
 *
 * **Z harmonogramu wyceny**, nie z projektu. Projekt trzyma wyłącznie postęp:
 * co zaczęte, co skończone i kiedy. Kopiowanie etapów do projektu znaczyłoby,
 * że pierwsza zmiana harmonogramu rozjeżdża dwa miejsca i nikt nie wie, które
 * jest prawdziwe.
 *
 * ## Czym to NIE jest
 *
 * To nie jest Gantt ani zarządzanie zadaniami (koncepcja §17 — świadomie poza
 * zakresem). Trzy stany na etap i data. Tyle wystarcza, żeby odpowiedzieć na
 * pytanie „na czym stoimy", i tyle nie zamienia Toolier w system
 * project-management.
 */

export const StageStatusSchema = z.enum(['pending', 'in_progress', 'done']);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const StageProgressEntrySchema = z.object({
  status: StageStatusSchema.default('pending'),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  /**
   * Kopia nazwy etapu z chwili zapisu.
   *
   * Trzymamy ją, żeby dało się pokazać „Etap wizualny — zakończony 12.08"
   * także wtedy, gdy ten etap zniknął z harmonogramu po zmianie wyceny.
   * Bez tego historia realizacji znikałaby razem z etapem.
   */
  name: z.string().default(''),
});
export type StageProgressEntry = z.infer<typeof StageProgressEntrySchema>;

export const StageProgressSchema = z.record(z.string(), StageProgressEntrySchema);
export type StageProgress = z.infer<typeof StageProgressSchema>;

/** Bezpieczny odczyt kolumny `projects.stage_progress`. */
export function parseStageProgress(raw: unknown): StageProgress {
  if (raw === null || raw === undefined) return {};
  const parsed = StageProgressSchema.safeParse(raw);
  // Uszkodzony postęp nie ma prawa zablokować projektu — pokazujemy etapy
  // jako nierozpoczęte, zamiast wywalać stronę.
  return parsed.success ? parsed.data : {};
}

export interface ProjectStage {
  id: string;
  name: string;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  /** Etap po stronie inwestora (decyzje, zbieranie materiałów). */
  clientSide: boolean;
  /**
   * `true` dla wpisu postępu, którego nie ma już w harmonogramie.
   * Pokazujemy go osobno — to jest ślad wykonanej pracy, nie plan.
   */
  orphaned: boolean;
}

const EMPTY: StageProgressEntry = {
  status: 'pending',
  startedAt: null,
  completedAt: null,
  name: '',
};

/**
 * Składa listę etapów do pokazania: harmonogram + zapisany postęp.
 *
 * Wyłączone etapy harmonogramu (`enabled: false`) **nie wchodzą** — nie są
 * częścią zlecenia, więc nie ma czego realizować. Wpisy postępu bez etapu
 * w harmonogramie lądują na końcu z flagą `orphaned`.
 */
export function projectStages(
  schedule: ScheduleBody | null,
  progress: StageProgress,
): ProjectStage[] {
  const stages: ScheduleStage[] = (schedule?.stages ?? []).filter((stage) => stage.enabled);
  const used = new Set<string>();

  const fromSchedule = stages.map((stage) => {
    used.add(stage.id);
    const entry = progress[stage.id] ?? EMPTY;
    return {
      id: stage.id,
      name: stage.name,
      status: entry.status,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
      clientSide: stage.owner === 'client',
      orphaned: false,
    };
  });

  const orphans = Object.entries(progress)
    .filter(([id, entry]) => !used.has(id) && entry.status !== 'pending')
    .map(([id, entry]) => ({
      id,
      name: entry.name || id,
      status: entry.status,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
      clientSide: false,
      orphaned: true,
    }));

  return [...fromSchedule, ...orphans];
}

/**
 * Zmiana statusu etapu.
 *
 * Daty ustawiamy **przy przejściu**, a nie przy każdym zapisie: cofnięcie
 * etapu z „zakończony" na „w toku" ma zachować datę rozpoczęcia i skasować
 * datę zakończenia, bo ta druga przestała być prawdą.
 *
 * Zwraca nową mapę — nie modyfikuje wejścia.
 */
export function withStageStatus(
  progress: StageProgress,
  stage: { id: string; name: string },
  status: StageStatus,
  now: Date = new Date(),
): StageProgress {
  const current = progress[stage.id] ?? EMPTY;
  const iso = now.toISOString();

  const next: StageProgressEntry = {
    status,
    name: stage.name,
    startedAt:
      status === 'pending'
        ? null
        : // Pierwsze wejście w „w toku" albo w „zakończony" (ktoś odhaczył
          // etap, którego nigdy nie oznaczył jako rozpoczęty) ustawia datę.
          (current.startedAt ?? iso),
    completedAt: status === 'done' ? (current.completedAt ?? iso) : null,
  };

  return { ...progress, [stage.id]: next };
}

export interface StageSummary {
  total: number;
  done: number;
  inProgress: number;
  /** 0–100. `0`, gdy nie ma żadnego etapu — a nie dzielenie przez zero. */
  percent: number;
}

export function stageSummary(stages: readonly ProjectStage[]): StageSummary {
  // Etapy osierocone nie liczą się do postępu: nie są już częścią planu,
  // więc doliczanie ich zawyżałoby albo zaniżało wynik bez powodu.
  const planned = stages.filter((stage) => !stage.orphaned);
  const done = planned.filter((stage) => stage.status === 'done').length;
  const inProgress = planned.filter((stage) => stage.status === 'in_progress').length;

  return {
    total: planned.length,
    done,
    inProgress,
    percent: planned.length === 0 ? 0 : Math.round((done / planned.length) * 100),
  };
}

/**
 * Następny etap do ruszenia — pierwszy nierozpoczęty po tych w toku.
 *
 * Do podpowiedzi „następny: Etap wizualny". `null`, gdy wszystko zrobione
 * albo nie ma czego robić.
 */
export function nextStage(stages: readonly ProjectStage[]): ProjectStage | null {
  return stages.find((stage) => !stage.orphaned && stage.status === 'pending') ?? null;
}
