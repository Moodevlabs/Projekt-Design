import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { StageRow } from './StageRow';
import { ScheduleResultCard } from './ScheduleResultCard';
import { AddLink } from '../components/AddLink';
import { NumberField } from '../components/NumberField';
import { useEditorStore } from '../editor.store';
import { useStageAutoSync } from './useStageAutoSync';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { calcSchedule, calcStageDays } from '@/domain/schedule';
import type { Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const NO_ROOMS: Room[] = [];

/**
 * Zakładka „Termin" (F5.2).
 *
 * Liczy się z **tych samych pomieszczeń** co wycena — dlatego harmonogram
 * mieszka w tym samym dokumencie, a nie w osobnym bycie. Zmiana pomieszczeń
 * w zakładce „Wycena" natychmiast zmienia tutejszy wynik.
 */
export function ScheduleTab({ editing }: { editing: boolean }) {
  const { schedule, rooms } = useEditorStore(
    useShallow((state) => ({
      schedule: state.schedule,
      rooms: state.body?.rooms ?? NO_ROOMS,
    })),
  );

  const ensureSchedule = useEditorStore((state) => state.ensureSchedule);
  const removeExtra = useEditorStore((state) => state.removeScheduleExtra);
  const updateExtraDays = useEditorStore((state) => state.updateScheduleExtraDays);
  const patchSchedule = useEditorStore((state) => state.patchSchedule);
  const updateStage = useEditorStore((state) => state.updateStage);
  const addStage = useEditorStore((state) => state.addStage);
  const removeStage = useEditorStore((state) => state.removeStage);

  // Podpowiedz dziala tylko wtedy, gdy jest co zmieniac.
  useStageAutoSync(editing && schedule !== null);

  const roomTypes = useRoomTypes();
  const template = useWorkspace().data?.settings.scheduleTemplate ?? null;

  useEffect(() => {
    // Harmonogram zakładamy dopiero przy pierwszym wejściu na zakładkę —
    // większość ofert obejdzie się bez terminu, a pusta kolumna w bazie jest
    // uczciwszą informacją niż domyślne jedenaście etapów w każdej wycenie.
    if (editing) ensureSchedule(template);
  }, [editing, ensureSchedule, template]);

  if (!schedule) {
    return <p className="text-ink-soft p-7 text-sm">{pl.editor.scheduleEmpty}</p>;
  }

  const result = calcSchedule(schedule, rooms);

  return (
    <div className="mx-auto grid w-full max-w-[1320px] items-start gap-7 px-7 pt-6 pb-14 lg:grid-cols-[1fr_336px]">
      <div className="quote-doc quote-sheet min-w-0 px-10 py-9">
        <h2 className="text-[22px] font-normal tracking-[-0.01em] uppercase">
          {pl.editor.scheduleTitle}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--doc-ink-soft)]">{pl.editor.scheduleIntro}</p>

        <div className="mt-6 flex flex-wrap items-center gap-5">
          <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-[0.09em] text-[var(--doc-sage)] uppercase">
            {pl.editor.scheduleStart}
            <input
              type="date"
              value={schedule.startDate ?? ''}
              disabled={!editing}
              aria-label={pl.editor.scheduleStart}
              onChange={(event) => patchSchedule({ startDate: event.target.value || null })}
              className="inline-field text-ink w-[150px] bg-transparent px-2 py-1 text-[14px] font-normal normal-case"
            />
          </label>

          <WeekField
            label={pl.editor.scheduleProviderWeek}
            value={schedule.providerWorkdaysPerWeek}
            editing={editing}
            onChange={(providerWorkdaysPerWeek) => patchSchedule({ providerWorkdaysPerWeek })}
          />
          <WeekField
            label={pl.editor.scheduleClientWeek}
            value={schedule.clientWorkdaysPerWeek}
            editing={editing}
            onChange={(clientWorkdaysPerWeek) => patchSchedule({ clientWorkdaysPerWeek })}
          />

          <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-[0.09em] text-[var(--doc-sage)] uppercase">
            {pl.editor.scheduleHolidays}
            <select
              value={schedule.holidays}
              disabled={!editing}
              aria-label={pl.editor.scheduleHolidays}
              onChange={(event) =>
                patchSchedule({ holidays: event.target.value === 'none' ? 'none' : 'PL' })
              }
              className="inline-field text-ink bg-transparent px-2 py-1 text-[14px] font-normal normal-case"
            >
              <option value="PL">{pl.editor.scheduleHolidaysPl}</option>
              <option value="none">{pl.editor.scheduleHolidaysNone}</option>
            </select>
          </label>
        </div>

        <ul className="mt-8 flex flex-col border-t border-[var(--doc-ink)] pt-1">
          {schedule.stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              roomTypes={roomTypes.data ?? []}
              days={calcStageDays(stage, rooms)}
              editing={editing}
              onPatch={(patch) => updateStage(stage.id, patch)}
              onRemove={() => removeStage(stage.id)}
              onRemoveExtra={removeExtra}
              onExtraDays={updateExtraDays}
            />
          ))}
        </ul>

        {editing ? (
          <AddLink icon={Plus} onClick={() => addStage()} className="mt-3 text-[13px]">
            {pl.editor.addStage}
          </AddLink>
        ) : null}

        {rooms.length === 0 ? (
          // Etapy zalezne od pomieszczen policza wtedy sama baze — warto
          // powiedziec to wprost, zanim ktos uzna termin za zanizony.
          <p className="mt-6 text-[12.5px] text-[var(--doc-ink-soft)]">
            {pl.editor.scheduleNoRooms}
          </p>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-6">
        <ScheduleResultCard result={result} />
      </div>
    </div>
  );
}

function WeekField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: number;
  editing: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-[0.09em] text-[var(--doc-sage)] uppercase">
      {label}
      {/* Domena trzyma 1–7; `NumberField` pozwala pole wyczyscic i wpisac od nowa. */}
      <NumberField
        value={value}
        onCommit={onChange}
        min={1}
        max={7}
        ariaLabel={label}
        disabled={!editing}
        className="text-ink w-[64px] text-[14px] font-normal normal-case"
      />
    </label>
  );
}
