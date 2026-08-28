import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '../components/MoneyInput';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

/**
 * Formularz wpisu biblioteki dokumentów — pola zależne od rodzaju (T-102).
 *
 * Trzy warianty w jednym pliku, bo wspólna jest rama (nazwa, opis, przyciski)
 * i sposób zapisu; różnią się tylko środkiem. Osobne komponenty per rodzaj
 * dublowałyby tę ramę trzy razy.
 */
export function DocEntryForm<K extends DocLibraryKind>({
  kind,
  initial,
  saving,
  onSave,
  onCancel,
}: {
  kind: K;
  initial: DocLibraryPayloadByKind[K];
  saving: boolean;
  onSave: (payload: DocLibraryPayloadByKind[K]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DocLibraryPayloadByKind[K]>(initial);
  const patch = (partial: Partial<DocLibraryPayloadByKind[K]>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const f = pl.library.docs.fields;
  const idBase = `doc-${kind}`;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        onSave(draft);
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idBase}-name`}>{f.name}</Label>
        <Input
          id={`${idBase}-name`}
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value } as Partial<typeof draft>)}
          required
        />
      </div>

      {kind === 'schedule' ? (
        <ScheduleFields
          draft={draft as DocLibraryPayloadByKind['schedule']}
          idBase={idBase}
          onPatch={(partial) => patch(partial as Partial<typeof draft>)}
        />
      ) : null}
      {kind === 'stages' ? (
        <StagesFields
          draft={draft as DocLibraryPayloadByKind['stages']}
          idBase={idBase}
          onPatch={(partial) => patch(partial as Partial<typeof draft>)}
        />
      ) : null}
      {kind === 'price_list' ? (
        <PriceListFields
          draft={draft as DocLibraryPayloadByKind['price_list']}
          idBase={idBase}
          onPatch={(partial) => patch(partial as Partial<typeof draft>)}
        />
      ) : null}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {pl.common.cancel}
        </Button>
        <Button type="submit" disabled={saving || !draft.name.trim()}>
          {pl.common.save}
        </Button>
      </div>
    </form>
  );
}

function ScheduleFields({
  draft,
  idBase,
  onPatch,
}: {
  draft: DocLibraryPayloadByKind['schedule'];
  idBase: string;
  onPatch: (partial: Partial<DocLibraryPayloadByKind['schedule']>) => void;
}) {
  const f = pl.library.docs.fields;
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-owner`}>{f.owner}</Label>
        <Select
          value={draft.owner}
          onValueChange={(value) => onPatch({ owner: value === 'client' ? 'client' : 'provider' })}
        >
          <SelectTrigger id={`${idBase}-owner`} aria-label={f.owner}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="provider">{f.ownerProvider}</SelectItem>
            <SelectItem value="client">{f.ownerClient}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-base`}>{f.baseDays}</Label>
        <Input
          id={`${idBase}-base`}
          type="number"
          min={0}
          step={0.5}
          value={draft.baseDays}
          onChange={(event) => onPatch({ baseDays: Math.max(0, Number(event.target.value) || 0) })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-scope`}>{f.roomScope}</Label>
        <Select
          value={draft.roomScope}
          onValueChange={(value) =>
            onPatch({ roomScope: value as DocLibraryPayloadByKind['schedule']['roomScope'] })
          }
        >
          <SelectTrigger id={`${idBase}-scope`} aria-label={f.roomScope}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{f.roomScopeNone}</SelectItem>
            <SelectItem value="visual">{f.roomScopeVisual}</SelectItem>
            <SelectItem value="technical">{f.roomScopeTechnical}</SelectItem>
            <SelectItem value="all">{f.roomScopeAll}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.roomScope !== 'none' ? (
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-per-room`}>{f.defaultPerRoomDays}</Label>
          <Input
            id={`${idBase}-per-room`}
            type="number"
            min={0}
            step={0.5}
            value={draft.defaultPerRoomDays}
            onChange={(event) =>
              onPatch({ defaultPerRoomDays: Math.max(0, Number(event.target.value) || 0) })
            }
          />
          <p className="text-ink-soft text-xs">{f.defaultPerRoomDaysHint}</p>
        </div>
      ) : null}
      {draft.roomScope !== 'none' ? (
        <PerRoomTypeDays draft={draft} idBase={idBase} onPatch={onPatch} />
      ) : null}
    </>
  );
}

/**
 * Dni per TYP pomieszczenia — odpowiednik macierzy z wiersza etapu w terminie
 * (`StageRow`). Bez niej wpis biblioteki umiałby tylko jedną stawkę „za
 * pomieszczenie", a sedno terminu liczonego z pomieszczeń jest w tym, że
 * kuchnia kosztuje więcej dni niż korytarz. Puste pole = stawka domyślna;
 * zero to konkretna deklaracja — ta sama zasada co w cenniku.
 */
function PerRoomTypeDays({
  draft,
  idBase,
  onPatch,
}: {
  draft: DocLibraryPayloadByKind['schedule'];
  idBase: string;
  onPatch: (partial: Partial<DocLibraryPayloadByKind['schedule']>) => void;
}) {
  const roomTypes = useRoomTypes();
  const f = pl.library.docs.fields;
  const types = roomTypes.data ?? [];

  const setDays = (roomTypeId: string, value: string) => {
    const perRoomDays = { ...draft.perRoomDays };
    if (value.trim() === '') delete perRoomDays[roomTypeId];
    else {
      const next = Number(value);
      if (!Number.isFinite(next) || next < 0) return;
      perRoomDays[roomTypeId] = next;
    }
    onPatch({ perRoomDays });
  };

  return (
    <fieldset className="border-hair rounded-[var(--radius-control)] border p-3 sm:col-span-2">
      <legend className="text-ink px-1 text-sm font-medium">{f.perRoomDays}</legend>
      <p className="text-ink-soft mb-2 text-xs">{f.perRoomDaysHint}</p>
      {types.length === 0 ? (
        <p className="text-ink-soft text-xs">{f.perRoomDaysNoTypes}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map((type) => (
            <label
              key={type.id}
              className="text-ink-soft flex items-center justify-between gap-2 text-xs"
            >
              {type.name}
              <Input
                id={`${idBase}-room-${type.id}`}
                type="number"
                min={0}
                step={0.5}
                className="w-20 text-right"
                value={draft.perRoomDays[type.id] ?? ''}
                placeholder={String(draft.defaultPerRoomDays)}
                aria-label={`${f.perRoomDays}: ${type.name}`}
                onChange={(event) => setDays(type.id, event.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function StagesFields({
  draft,
  idBase,
  onPatch,
}: {
  draft: DocLibraryPayloadByKind['stages'];
  idBase: string;
  onPatch: (partial: Partial<DocLibraryPayloadByKind['stages']>) => void;
}) {
  const f = pl.library.docs.fields;
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-section`}>{f.sectionLabel}</Label>
        <Input
          id={`${idBase}-section`}
          value={draft.sectionLabel}
          onChange={(event) => onPatch({ sectionLabel: event.target.value })}
        />
        <p className="text-ink-soft text-xs">{f.sectionLabelHint}</p>
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Switch
          id={`${idBase}-included`}
          checked={draft.included}
          onCheckedChange={(included) => onPatch({ included })}
        />
        <Label htmlFor={`${idBase}-included`}>{f.included}</Label>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idBase}-desc`}>{f.description}</Label>
        <Textarea
          id={`${idBase}-desc`}
          rows={2}
          value={draft.description}
          onChange={(event) => onPatch({ description: event.target.value })}
        />
      </div>
    </>
  );
}

function PriceListFields({
  draft,
  idBase,
  onPatch,
}: {
  draft: DocLibraryPayloadByKind['price_list'];
  idBase: string;
  onPatch: (partial: Partial<DocLibraryPayloadByKind['price_list']>) => void;
}) {
  const f = pl.library.docs.fields;
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-section`}>{f.sectionLabel}</Label>
        <Input
          id={`${idBase}-section`}
          value={draft.sectionLabel}
          onChange={(event) => onPatch({ sectionLabel: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-unit`}>{f.unit}</Label>
        <Input
          id={`${idBase}-unit`}
          value={draft.unit}
          placeholder={f.unitPlaceholder}
          onChange={(event) => onPatch({ unit: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>{f.priceMin}</Label>
        <MoneyInput
          cents={draft.priceMinCents}
          onChange={(priceMinCents) => onPatch({ priceMinCents })}
          ariaLabel={f.priceMin}
        />
      </div>
      <div className="space-y-1">
        <Label>{f.priceMax}</Label>
        <MoneyInput
          cents={draft.priceMaxCents ?? 0}
          onChange={(cents) => onPatch({ priceMaxCents: cents > 0 ? cents : null })}
          ariaLabel={f.priceMax}
        />
        <p className="text-ink-soft text-xs">{f.priceMaxHint}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-lead`}>{f.leadTime}</Label>
        <Input
          id={`${idBase}-lead`}
          value={draft.leadTime}
          placeholder={f.leadTimePlaceholder}
          onChange={(event) => onPatch({ leadTime: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-days`}>{f.addedDays}</Label>
        <Input
          id={`${idBase}-days`}
          type="number"
          min={0}
          value={draft.addedDays ?? ''}
          onChange={(event) =>
            onPatch({
              addedDays:
                event.target.value === ''
                  ? null
                  : Math.max(0, Math.trunc(Number(event.target.value))),
            })
          }
        />
        <p className="text-ink-soft text-xs">{f.addedDaysHint}</p>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idBase}-desc`}>{f.description}</Label>
        <Textarea
          id={`${idBase}-desc`}
          rows={2}
          value={draft.description}
          onChange={(event) => onPatch({ description: event.target.value })}
        />
      </div>
    </>
  );
}
