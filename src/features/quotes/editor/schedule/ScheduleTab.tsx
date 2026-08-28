import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { StageRow } from './StageRow';
import { ScheduleResultCard } from './ScheduleResultCard';
import { AddLink } from '../components/AddLink';
import { Button } from '@/components/ui/button';
import { DocLibraryPanel } from '../documents/DocLibraryPanel';
import { NumberField } from '../components/NumberField';
import { useEditorStore } from '../editor.store';
import { useStageAutoSync } from './useStageAutoSync';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import { calcSchedule, calcStageDays } from '@/domain/schedule';
import type { Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const NO_ROOMS: Room[] = [];
/** Stala referencja — `[]` w propsie odpalaloby `ensureSchedule` przy kazdym renderze. */
const EMPTY_TEMPLATE: never[] = [];

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

  const [libraryOpen, setLibraryOpen] = useState(false);
  const roomTypes = useRoomTypes();
  useEffect(() => {
    // Harmonogram zakładamy dopiero przy pierwszym wejściu na zakładkę —
    // i PUSTY (T-111): etapy dodaje się z biblioteki, jak usługi do wyceny.
    // Pre-wypełnianie szablonem dawało listę, której nikt nie czytał, bo
    // wyglądała na wynik, a nie na propozycję.
    if (editing) ensureSchedule(EMPTY_TEMPLATE);
  }, [editing, ensureSchedule]);

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

        {/*
          ZAŁOŻENIA JAKO NAZWANY BLOK (poprawka 7b, 2026-08-27).

          Cztery pola stały wcześniej luzem pod tytułem, jako pasek wersalików.
          Wyglądały na ozdobę nagłówka, a są jedynym wejściem, z którego
          wychodzą daty w podsumowaniu — więc mają własną ramkę i własne
          zdanie o tym, co robią.
        */}
        <section className="border-hair mt-6 rounded-[var(--radius-card)] border p-4">
          <h3 className="label-caps text-ink-soft">{pl.editor.scheduleAssumptions}</h3>
          <p className="text-ink-soft mt-1 text-[12.5px]">{pl.editor.scheduleAssumptionsHint}</p>

          <div className="mt-3 flex flex-wrap items-center gap-5">
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
        </section>

        {/*
          Główka nad listą etapów — ten sam wzorzec co w panelu pomieszczeń
          i nad tabelami. Bez niej „ARCH." i liczba po prawej nie mają podpisu
          w miejscu, w którym się na nie patrzy.
        */}
        <div className="text-ink-soft mt-8 flex items-center gap-2 text-[10px] tracking-[0.08em] uppercase">
          <span className="w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">{pl.editor.scheduleColumnStage}</span>
          <span className="w-[74px] shrink-0 text-center">{pl.editor.scheduleColumnOwner}</span>
          <span className="w-14 shrink-0 text-right">{pl.editor.scheduleColumnDays}</span>
          <span className="w-[22px] shrink-0" aria-hidden />
        </div>

        {schedule.stages.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-[var(--doc-ink-soft)]">
            {editing ? pl.editor.scheduleEmptyStagesEditing : pl.editor.scheduleEmptyStages}
          </p>
        ) : null}

        <ul className="flex flex-col border-t border-[var(--doc-ink)] pt-1">
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

        {/* Dwa wejscia, jak w wycenie (T-71): biblioteka albo pusty wiersz. */}
        {editing ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setLibraryOpen(true)}>
              <Plus className="size-3.5" aria-hidden />
              {pl.editor.docLibrary.open}
            </Button>
            <AddLink icon={Plus} onClick={() => addStage()} className="text-[13px]">
              {pl.editor.docLibrary.manual.schedule}
            </AddLink>
          </div>
        ) : null}

        <DocLibraryPanel
          kind="schedule"
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          // Etap wybrany z biblioteki wchodzi ZAZNACZONY. Szablon trzyma
          // `enabled: false` (lista-propozycja, 2026-08-27), ale swiadome
          // dodanie jednego etapu to juz decyzja — wylaczony wygladalby jak
          // „dodalem i nic sie nie stalo".
          onInsert={(payload) => addStage({ ...payload, enabled: true })}
        />

        {/*
          Legenda ARCH./INW. stoi POD listą, a nie tylko w karcie wyniku:
          skrót przy każdym wierszu potrzebuje rozwinięcia tam, gdzie te
          wiersze są.
        */}
        <p className="mt-5 text-[12.5px] text-[var(--doc-ink-soft)]">
          {pl.editor.scheduleOwnerLegend}
        </p>

        {rooms.length === 0 ? (
          // Etapy zalezne od pomieszczen policza wtedy sama baze — warto
          // powiedziec to wprost, zanim ktos uzna termin za zanizony.
          <p className="mt-6 text-[12.5px] text-[var(--doc-ink-soft)]">
            {pl.editor.scheduleNoRooms}
          </p>
        ) : null}

        {/*
          Dwie pulapki, ktore wygladaja jak „pomieszczenia nie dzialaja":
          wszystkie etapy odznaczone (szablon startuje tak celowo) albo zadny
          zaznaczony etap nie zalezy od pomieszczen. Mowimy, ktora to.
        */}
        {schedule.stages.length > 0 && !schedule.stages.some((stage) => stage.enabled) ? (
          <p role="status" className="mt-4 text-[12.5px] text-[var(--doc-terracotta)]">
            {pl.editor.scheduleNoneEnabled}
          </p>
        ) : rooms.length > 0 &&
          !schedule.stages.some((stage) => stage.enabled && stage.roomScope !== 'none') ? (
          <p role="status" className="mt-4 text-[12.5px] text-[var(--doc-ink-soft)]">
            {pl.editor.scheduleNoRoomStages}
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
