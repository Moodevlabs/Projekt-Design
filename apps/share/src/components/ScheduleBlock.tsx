import { calcSchedule, type ScheduleBody } from '@/domain/schedule';
import type { Room } from '@/domain/quote/schema';

/**
 * Termin w linku klienta (poprawka 7a, 2026-08-27).
 *
 * Do tej pory magic link niósł samą wycenę. Harmonogram leżał w tej samej
 * kolumnie wiersza i trzeba go było wysyłać osobnym plikiem obok — czyli
 * klient akceptował coś innego, niż widział.
 *
 * Pokazujemy **wynik**, nie arkusz: ile dni po której stronie, kiedy koniec
 * i z jakich etapów to się składa. Macierz „dni za pomieszczenie" zostaje
 * w aplikacji — inwestorowi nie jest potrzebna do niczego poza zdziwieniem.
 */
export function ScheduleBlock({
  schedule,
  rooms,
  currency: _currency,
}: {
  schedule: ScheduleBody;
  rooms: Room[];
  currency?: string;
}) {
  const result = calcSchedule(schedule, rooms);
  const stages = result.perStage.filter((stage) => stage.days > 0);

  if (stages.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg tracking-tight">Termin</h2>

      <dl className="border-hair mt-3 grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-soft text-xs">Po stronie pracowni</dt>
          <dd className="tabular mt-0.5">{dni(result.providerDays)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft text-xs">Po stronie inwestora</dt>
          <dd className="tabular mt-0.5">{dni(result.clientDays)}</dd>
        </div>
        {result.endLatest ? (
          <div>
            <dt className="text-ink-soft text-xs">Przewidywany koniec</dt>
            <dd className="tabular mt-0.5">{formatDate(result.endLatest)}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-ink-soft text-xs">Łącznie w dniach kalendarzowych</dt>
            <dd className="tabular mt-0.5">około {result.calendarDaysLatest} dni</dd>
          </div>
        )}
      </dl>

      <ul className="mt-4 space-y-1.5">
        {stages.map((stage) => (
          <li key={stage.stageId} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0">
              {stage.name}
              {/*
                Kto zużywa czas. Bez tego termin wygląda na obietnicę pracowni,
                a część dni to decyzje i akceptacje po stronie inwestora — i to
                właśnie te dni najczęściej się rozciągają.
              */}
              {stage.owner === 'client' ? (
                <span className="text-ink-soft ml-2 text-xs">(po stronie inwestora)</span>
              ) : null}
            </span>
            <span className="tabular text-ink-soft shrink-0 text-xs">{dni(stage.days)}</span>
          </li>
        ))}
      </ul>

      {schedule.startDate ? (
        <p className="text-ink-soft mt-3 text-xs">
          Liczone od {formatDate(schedule.startDate)}, w dniach roboczych.
        </p>
      ) : (
        <p className="text-ink-soft mt-3 text-xs">
          Termin liczony w dniach roboczych od startu prac — data startu ustala się przy podpisaniu
          umowy.
        </p>
      )}
    </section>
  );
}

/** Polska odmiana „dzień/dni" — liczba bez odmiany czyta się jak błąd. */
function dni(count: number): string {
  return count === 1 ? '1 dzień roboczy' : `${count} dni roboczych`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pl-PL');
}
