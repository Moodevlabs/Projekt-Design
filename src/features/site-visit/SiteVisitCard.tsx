import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared';
import { useDeleteSiteVisit, useUpdateSiteVisit } from '@/data/queries/useSiteVisits';
import { newRoomMeasurement, newSiteCheck } from '@/data/repos/site-visits.repo';
import {
  CheckStateSchema,
  roomAreaM2,
  totalAreaM2,
  unresolvedChecks,
  type CheckState,
  type RoomMeasurement,
  type SiteCheck,
  type SiteVisit,
} from '@/domain/site-visit';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { SiteVisitPhotos } from './SiteVisitPhotos';

/**
 * Jedna wizja lokalna: nagłówek zawsze, reszta po rozwinięciu.
 *
 * ## Szkic, nie autozapis
 *
 * Karta trzyma **własny szkic** i zapisuje jawnie, tak jak branding.
 * Autozapis przy każdym znaku w polu obmiaru wysyłałby żądanie na każdą
 * cyfrę wpisywanego wymiaru — a obmiar wpisuje się seriami po kilkanaście
 * liczb.
 */
export function SiteVisitCard({
  visit,
  clientId,
  projectId,
  open,
  onToggle,
}: {
  visit: SiteVisit;
  clientId: string;
  projectId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const update = useUpdateSiteVisit(projectId);
  const remove = useDeleteSiteVisit(projectId);
  const [draft, setDraft] = useState<SiteVisit>(visit);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Świeże dane wpuszczamy tylko wtedy, gdy nie ma niezapisanych zmian —
  // odświeżenie listy w tle nie może kasować obmiaru w trakcie wpisywania.
  const dirty = JSON.stringify(draft) !== JSON.stringify(visit);
  useEffect(() => {
    if (!dirty) setDraft(visit);
    // `dirty` celowo poza zależnościami: chodzi o reakcję na NOWE dane,
    // a nie o cofanie szkicu w chwili, w której staje się brudny.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit]);

  const patch = (fields: Partial<SiteVisit>) => setDraft((prev) => ({ ...prev, ...fields }));

  const save = () => {
    update.mutate(
      {
        id: visit.id,
        patch: {
          visitedAt: draft.visitedAt,
          attendees: draft.attendees,
          rooms: draft.rooms,
          checks: draft.checks,
          notes: draft.notes,
        },
      },
      {
        onSuccess: () => toast.success(pl.siteVisit.saved),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const area = totalAreaM2(draft.rooms);
  const unresolved = unresolvedChecks(draft.checks);

  return (
    <section className="card-surface p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown
            aria-hidden
            className={cn('text-ink-soft size-4 shrink-0 transition-transform', open && 'rotate-180')}
          />
          <span className="min-w-0">
            <span className="text-ink block text-sm font-medium">
              {formatDate(visit.visitedAt)}
            </span>
            <span className="text-ink-soft block truncate text-xs">
              {[
                visit.attendees || null,
                area > 0 ? pl.siteVisit.areaTotal(area) : null,
                unresolved > 0 ? pl.siteVisit.unresolved(unresolved) : pl.siteVisit.allResolved,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={pl.siteVisit.delete}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 aria-hidden />
        </Button>
      </header>

      {open ? (
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`visit-date-${visit.id}`}>{pl.siteVisit.date}</Label>
              <Input
                id={`visit-date-${visit.id}`}
                type="date"
                value={draft.visitedAt}
                onChange={(event) => patch({ visitedAt: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`visit-people-${visit.id}`}>{pl.siteVisit.attendees}</Label>
              <Input
                id={`visit-people-${visit.id}`}
                value={draft.attendees}
                placeholder={pl.siteVisit.attendeesPlaceholder}
                onChange={(event) => patch({ attendees: event.target.value })}
              />
            </div>
          </div>

          <RoomsSection rooms={draft.rooms} onChange={(rooms) => patch({ rooms })} />

          <ChecksSection checks={draft.checks} onChange={(checks) => patch({ checks })} />

          <div className="space-y-2">
            <Label htmlFor={`visit-notes-${visit.id}`}>{pl.siteVisit.notes}</Label>
            <Textarea
              id={`visit-notes-${visit.id}`}
              rows={5}
              value={draft.notes}
              placeholder={pl.siteVisit.notesPlaceholder}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>

          <SiteVisitPhotos visitId={visit.id} clientId={clientId} projectId={projectId} />

          {/* Pasek zapisu pojawia się dopiero przy zmianach — jak w brandingu. */}
          {dirty ? (
            <div className="bg-surface border-hair sticky bottom-4 flex items-center justify-end gap-2 rounded-[var(--radius-card)] border p-3 shadow-sm">
              <Button type="button" variant="ghost" onClick={() => setDraft(visit)}>
                {pl.common.cancel}
              </Button>
              <Button type="button" disabled={update.isPending} onClick={save}>
                {pl.common.save}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={pl.siteVisit.delete}
        description={pl.siteVisit.deleteConfirm}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => remove.mutate(visit.id)}
      />
    </section>
  );
}

/** Obmiar — wymiary w centymetrach, powierzchnia liczona, nie wpisywana. */
function RoomsSection({
  rooms,
  onChange,
}: {
  rooms: RoomMeasurement[];
  onChange: (rooms: RoomMeasurement[]) => void;
}) {
  const patchRoom = (id: string, fields: Partial<RoomMeasurement>) =>
    onChange(rooms.map((room) => (room.id === id ? { ...room, ...fields } : room)));

  const total = totalAreaM2(rooms);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label-caps text-ink-soft">{pl.siteVisit.rooms}</h3>
        {total > 0 ? (
          <span className="text-ink-soft tabular text-xs">{pl.siteVisit.areaTotal(total)}</span>
        ) : null}
      </div>
      <p className="text-ink-soft max-w-prose text-xs">{pl.siteVisit.roomsHint}</p>

      {rooms.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.siteVisit.roomsEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => {
            const label = room.name || pl.siteVisit.roomName;
            const area = roomAreaM2(room);

            return (
              <li key={room.id} className="border-hair rounded-[var(--radius-control)] border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <Label className="text-xs">{pl.siteVisit.roomName}</Label>
                    <Input
                      value={room.name}
                      aria-label={`${pl.siteVisit.roomName}: ${label}`}
                      placeholder={pl.siteVisit.roomNamePlaceholder}
                      onChange={(event) => patchRoom(room.id, { name: event.target.value })}
                    />
                  </div>

                  <CmField
                    label={pl.siteVisit.roomLength}
                    room={label}
                    value={room.lengthCm}
                    onChange={(lengthCm) => patchRoom(room.id, { lengthCm })}
                  />
                  <CmField
                    label={pl.siteVisit.roomWidth}
                    room={label}
                    value={room.widthCm}
                    onChange={(widthCm) => patchRoom(room.id, { widthCm })}
                  />
                  <CmField
                    label={pl.siteVisit.roomHeight}
                    room={label}
                    value={room.heightCm}
                    onChange={(heightCm) => patchRoom(room.id, { heightCm })}
                  />

                  <div className="min-w-[64px] space-y-1">
                    <Label className="text-xs">{pl.siteVisit.roomArea}</Label>
                    {/*
                      Powierzchnia jest WYNIKIEM, nie polem. Miejsce do wpisania
                      sugerowałoby, że da się ją nadpisać — a wtedy rozjechałaby
                      się z wymiarami obok.
                    */}
                    <p className="text-ink tabular py-2 text-sm">
                      {area === null ? pl.siteVisit.noArea : `${area} m²`}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={pl.siteVisit.removeRoom(label)}
                    onClick={() => onChange(rooms.filter((item) => item.id !== room.id))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>

                <div className="mt-2 space-y-1">
                  <Label className="text-xs">{pl.siteVisit.roomNote}</Label>
                  <Input
                    value={room.note}
                    aria-label={pl.siteVisit.roomNoteLabel(label)}
                    onChange={(event) => patchRoom(room.id, { note: event.target.value })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rooms, newRoomMeasurement()])}
      >
        <Plus className="size-4" aria-hidden />
        {pl.siteVisit.addRoom}
      </Button>
    </section>
  );
}

/** Pole wymiaru. Pusty ciąg to `null` — brak pomiaru, a nie zero centymetrów. */
function CmField({
  label,
  room,
  value,
  onChange,
}: {
  label: string;
  room: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="w-[84px] space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        aria-label={`${label}: ${room}`}
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (raw === '') {
            onChange(null);
            return;
          }
          const next = Number.parseInt(raw, 10);
          if (Number.isInteger(next) && next >= 0) onChange(next);
        }}
        className="tabular"
      />
    </div>
  );
}

const STATES = CheckStateSchema.options;

/** Spis instalacji — trzy stany plus „nie ustalono". */
function ChecksSection({
  checks,
  onChange,
}: {
  checks: SiteCheck[];
  onChange: (checks: SiteCheck[]) => void;
}) {
  const patchCheck = (id: string, fields: Partial<SiteCheck>) =>
    onChange(checks.map((check) => (check.id === id ? { ...check, ...fields } : check)));

  const unresolved = unresolvedChecks(checks);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label-caps text-ink-soft">{pl.siteVisit.checks}</h3>
        <span className="text-ink-soft text-xs">
          {unresolved > 0 ? pl.siteVisit.unresolved(unresolved) : pl.siteVisit.allResolved}
        </span>
      </div>
      <p className="text-ink-soft max-w-prose text-xs">{pl.siteVisit.checksHint}</p>

      <ul className="space-y-2">
        {checks.map((check) => {
          const label = check.label || pl.siteVisit.checks;

          return (
            <li key={check.id} className="border-hair rounded-[var(--radius-control)] border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={check.label}
                  aria-label={label}
                  onChange={(event) => patchCheck(check.id, { label: event.target.value })}
                  className="min-w-[180px] flex-1"
                />

                <select
                  value={check.state}
                  aria-label={`${label}: ${pl.siteVisit.state[check.state]}`}
                  onChange={(event) =>
                    patchCheck(check.id, { state: event.target.value as CheckState })
                  }
                  className="border-hair focus-within:border-ring h-9 rounded-[var(--radius-control)] border bg-transparent px-2 text-sm outline-none"
                >
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {pl.siteVisit.state[state]}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={pl.siteVisit.removeCheck(label)}
                  onClick={() => onChange(checks.filter((item) => item.id !== check.id))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>

              {/*
                Uwaga pokazuje się dopiero przy stanie innym niż „OK": przy
                czternastu pozycjach czternaście pustych pól tekstowych
                przykryłoby to, co naprawdę wymaga opisu.
              */}
              {check.state !== 'ok' ? (
                <Input
                  value={check.note}
                  aria-label={pl.siteVisit.checkNoteLabel(label)}
                  placeholder={pl.siteVisit.checkNote}
                  onChange={(event) => patchCheck(check.id, { note: event.target.value })}
                  className="mt-2"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...checks, newSiteCheck()])}
      >
        <Plus className="size-4" aria-hidden />
        {pl.siteVisit.addCheck}
      </Button>
    </section>
  );
}
