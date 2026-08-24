import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { InlineText } from '../components/InlineText';
import { NumberField } from '../components/NumberField';
import { StageExtrasList } from './StageExtrasList';
import type { RoomType } from '@/data/repos/room-types.repo';
import type { ScheduleStage, StageOwner } from '@/domain/schedule';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Jeden etap harmonogramu: włącznik, nazwa, właściciel, dni bazowe
 * i — dla etapów zależnych od pomieszczeń — rozwijana macierz stawek.
 *
 * Macierz jest **zwinięta domyślnie**, tak jak reguła cenowa na karcie
 * biblioteki: większość etapów obchodzi się bez niej, a rozłożona
 * zdominowałaby tabelę.
 */
export function StageRow({
  stage,
  roomTypes,
  days,
  editing,
  onPatch,
  onRemove,
  onRemoveExtra,
  onExtraDays,
}: {
  stage: ScheduleStage;
  roomTypes: RoomType[];
  /** Ile dni wychodzi z tego etapu przy obecnych pomieszczeniach. */
  days: number;
  editing: boolean;
  onPatch: (patch: Partial<ScheduleStage>) => void;
  onRemove: () => void;
  /** Tylko dla etapu `extras` (T-64) — usuwanie i edycja pojedynczej usługi. */
  onRemoveExtra?: (extraId: string) => void;
  onExtraDays?: (extraId: string, days: number) => void;
}) {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const label = stage.name || pl.editor.newStageName;
  const zalezyOdPomieszczen = stage.roomScope !== 'none';
  /*
   * Etap zbiorczy nie ma własnych „dni bazowych" do edycji — jego liczba jest
   * sumą składników. Pole do ręcznego wpisania byłoby pułapką: przy następnym
   * dodaniu usługi i tak zostałoby przeliczone.
   */
  const zbiorczy = stage.kind === 'extras';

  return (
    <li
      className={cn(
        'border-hair flex flex-col gap-2 border-b py-2.5 last:border-b-0',
        !stage.enabled && 'opacity-55',
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={stage.enabled}
          disabled={!editing}
          aria-label={pl.editor.stageEnabled(label)}
          onChange={(event) => onPatch({ enabled: event.target.checked })}
          className="size-4 shrink-0 accent-[var(--doc-sage)]"
        />

        <InlineText
          value={stage.name}
          onCommit={(name) => onPatch({ name })}
          readOnly={!editing}
          placeholder={pl.editor.newStageName}
          ariaLabel={pl.editor.stageNameLabel(label)}
          className="inline-field min-w-0 flex-1 text-[13px]"
        />

        <OwnerToggle
          owner={stage.owner}
          label={label}
          editing={editing}
          onChange={(owner) => onPatch({ owner })}
        />

        {/* Wynik etapu obok jego ustawień — inaczej trzeba by go szukać
            w karcie podsumowania i zgadywać, który wiersz go dał. */}
        <span className="tabular text-ink-soft w-14 shrink-0 text-right text-xs">
          {pl.editor.stageDays(days)}
        </span>

        {editing ? (
          <button
            type="button"
            aria-label={pl.editor.removeStage(label)}
            onClick={onRemove}
            className="text-ink-soft hover:text-[var(--doc-terracotta)] flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <Trash2 className="size-[13px]" aria-hidden />
          </button>
        ) : null}
      </div>

      {editing && !zbiorczy ? (
        <div className="flex flex-wrap items-center gap-2 pl-6">
          <label className="text-ink-soft flex items-center gap-1.5 text-xs">
            {pl.editor.stageBaseDays}
            <NumberField
              value={stage.baseDays}
              onCommit={(baseDays) => onPatch({ baseDays })}
              min={0}
              step={0.5}
              ariaLabel={pl.editor.stageBaseDaysLabel(label)}
              className="w-16"
            />
          </label>

          <label className="text-ink-soft flex items-center gap-1.5 text-xs">
            {pl.editor.stageScope}
            <select
              value={stage.roomScope}
              aria-label={pl.editor.stageScopeLabel(label)}
              onChange={(event) =>
                onPatch({ roomScope: event.target.value as ScheduleStage['roomScope'] })
              }
              className="border-hair focus-within:border-ring rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5"
            >
              <option value="none">{pl.editor.stageScopeNone}</option>
              <option value="all">{pl.editor.stageScopeAll}</option>
              <option value="visual">{pl.editor.stageScopeVisual}</option>
              <option value="technical">{pl.editor.stageScopeTechnical}</option>
            </select>
          </label>

          {zalezyOdPomieszczen ? (
            <button
              type="button"
              aria-expanded={matrixOpen}
              onClick={() => setMatrixOpen((previous) => !previous)}
              className="text-ink-soft hover:text-ink flex items-center gap-1 text-xs"
            >
              <ChevronDown
                className={cn('size-3.5 transition-transform', matrixOpen && 'rotate-180')}
                aria-hidden
              />
              {pl.editor.stagePerRoom}
            </button>
          ) : null}
        </div>
      ) : null}

      {editing && !zbiorczy && zalezyOdPomieszczen && matrixOpen ? (
        <PerRoomMatrix stage={stage} roomTypes={roomTypes} label={label} onPatch={onPatch} />
      ) : null}

      {zbiorczy ? (
        <StageExtrasList
          extras={stage.extras}
          editing={editing}
          onRemove={(extraId) => onRemoveExtra?.(extraId)}
          onDays={(extraId, dni) => onExtraDays?.(extraId, dni)}
        />
      ) : null}
    </li>
  );
}

/** Stawki dni per typ pomieszczenia — odpowiednik macierzy cennika (T-50). */
function PerRoomMatrix({
  stage,
  roomTypes,
  label,
  onPatch,
}: {
  stage: ScheduleStage;
  roomTypes: RoomType[];
  label: string;
  onPatch: (patch: Partial<ScheduleStage>) => void;
}) {
  const setDni = (roomTypeId: string, value: string) => {
    const next = Number(value);
    const perRoomDays = { ...stage.perRoomDays };

    // Puste pole znaczy „bierz wartość domyślną", a nie „zero dni" — ta sama
    // zasada co w macierzy cennika: zero to konkretna deklaracja.
    if (value.trim() === '') delete perRoomDays[roomTypeId];
    else if (Number.isFinite(next) && next >= 0) perRoomDays[roomTypeId] = next;
    else return;

    onPatch({ perRoomDays });
  };

  return (
    <div className="border-hair ml-6 flex flex-col gap-1.5 rounded-[var(--radius-control)] border p-2">
      <label className="text-ink-soft flex items-center justify-between gap-2 text-xs">
        {pl.editor.stageDefaultPerRoom}
        <NumberField
          value={stage.defaultPerRoomDays}
          onCommit={(defaultPerRoomDays) => onPatch({ defaultPerRoomDays })}
          min={0}
          step={0.5}
          ariaLabel={pl.editor.stageDefaultPerRoomLabel(label)}
          className="w-16"
        />
      </label>

      {roomTypes.map((type) => (
        <label
          key={type.id}
          className="text-ink-soft flex items-center justify-between gap-2 text-xs"
        >
          {type.name}
          <input
            type="number"
            min={0}
            step={0.5}
            value={stage.perRoomDays[type.id] ?? ''}
            placeholder={String(stage.defaultPerRoomDays)}
            aria-label={pl.editor.stageRoomDaysLabel(label, type.name)}
            onChange={(event) => setDni(type.id, event.target.value)}
            className="border-hair focus-within:border-ring tabular w-16 rounded-[var(--radius-control)] border px-1.5 py-0.5 text-right"
          />
        </label>
      ))}

      {roomTypes.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.editor.stageNoRoomTypes}</p>
      ) : null}
    </div>
  );
}

/** ARCH. / INW. — kto zużywa czas w tym etapie. */
function OwnerToggle({
  owner,
  label,
  editing,
  onChange,
}: {
  owner: StageOwner;
  label: string;
  editing: boolean;
  onChange: (owner: StageOwner) => void;
}) {
  const provider = owner === 'provider';

  return (
    <button
      type="button"
      disabled={!editing}
      aria-label={pl.editor.stageOwnerLabel(label)}
      title={provider ? pl.editor.stageOwnerProviderFull : pl.editor.stageOwnerClientFull}
      onClick={() => onChange(provider ? 'client' : 'provider')}
      className={cn(
        'shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.04em] uppercase transition-colors',
        provider
          ? 'bg-[var(--doc-sage-light)] text-[var(--doc-sage)]'
          : 'bg-[var(--doc-surface)] text-[var(--doc-ink-soft)]',
        !editing && 'cursor-default',
      )}
    >
      {provider ? pl.editor.stageOwnerProvider : pl.editor.stageOwnerClient}
    </button>
  );
}
