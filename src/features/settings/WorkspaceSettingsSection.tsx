import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateWorkspaceSettings, useWorkspace } from '@/data/queries/useWorkspace';
import { WorkspaceSettingsSchema, type WorkspaceSettings } from '@/domain/brand/schema';
import { DEFAULT_NUMBER_PATTERN, generateQuoteNumber } from '@/domain/numbering';
import { pl } from '@/i18n/pl';

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const;

/**
 * Ustawienia workspace'u.
 *
 * Formularz trzyma **własny szkic i zapisuje jawnie**, tak jak brand kit:
 * te wartości wchodzą do każdej nowej wyceny, więc zapis przy każdym
 * naciśnięciu klawisza znaczyłby, że w połowie wpisywania „2" w stawce VAT
 * ktoś ma workspace ze stawką 2%.
 */
export function WorkspaceSettingsSection({ canWrite }: { canWrite: boolean }) {
  const workspace = useWorkspace();
  const update = useUpdateWorkspaceSettings();
  const zapisane = workspace.data?.settings;

  const [draft, setDraft] = useState<WorkspaceSettings | null>(null);

  useEffect(() => {
    // Świeże dane wpuszczamy tylko wtedy, gdy nie ma niezapisanych zmian.
    if (zapisane && draft === null) setDraft(zapisane);
  }, [zapisane, draft]);

  if (!draft) return null;

  const patch = (fields: Partial<WorkspaceSettings>) =>
    setDraft((previous) => (previous ? { ...previous, ...fields } : previous));

  const valid = WorkspaceSettingsSchema.safeParse(draft).success;
  const dirty = JSON.stringify(draft) !== JSON.stringify(zapisane);

  const save = () => {
    update.mutate(draft, {
      onSuccess: () => toast.success(pl.settings.saved),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section className="card-surface space-y-4 p-5">
      <h2 className="text-ink text-sm font-semibold">{pl.settings.sectionQuotes}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">{pl.settings.currency}</Label>
          <Select
            value={draft.currency}
            onValueChange={(value) => patch({ currency: value })}
            disabled={!canWrite}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vatRate">{pl.settings.vatRate}</Label>
          <Input
            id="vatRate"
            type="number"
            min={0}
            max={100}
            step={1}
            disabled={!canWrite}
            value={draft.vatRate}
            onChange={(event) => patch({ vatRate: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pricesInclude">{pl.settings.pricesInclude}</Label>
        <Select
          value={draft.pricesInclude}
          onValueChange={(value) =>
            patch({ pricesInclude: value === 'gross' ? 'gross' : 'net' })
          }
          disabled={!canWrite}
        >
          <SelectTrigger id="pricesInclude">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net">{pl.settings.pricesNet}</SelectItem>
            <SelectItem value="gross">{pl.settings.pricesGross}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-ink-soft text-xs">{pl.settings.pricesIncludeHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="numberPattern">{pl.settings.numberPattern}</Label>
        <Input
          id="numberPattern"
          disabled={!canWrite}
          value={draft.numberPattern}
          onChange={(event) => patch({ numberPattern: event.target.value })}
        />
        {/*
          Podgląd na żywo, bo wzorzec to składnia z tokenami — bez pokazania
          wyniku człowiek dowiaduje się, co wpisał, dopiero przy następnej
          wycenie, a wtedy numer jest już nadany.
        */}
        <p className="text-ink-soft text-xs">
          {pl.settings.numberPatternPreview}:{' '}
          <span className="text-ink font-medium">
            {generateQuoteNumber(draft.numberPattern, PREVIEW_SEQ)}
          </span>
        </p>
        <p className="text-ink-soft text-xs">{pl.settings.numberPatternHint}</p>
        {draft.numberPattern !== DEFAULT_NUMBER_PATTERN ? (
          <button
            type="button"
            disabled={!canWrite}
            className="text-ink-soft hover:text-ink text-xs underline disabled:no-underline disabled:opacity-50"
            onClick={() => patch({ numberPattern: DEFAULT_NUMBER_PATTERN })}
          >
            {pl.settings.numberPatternReset}
          </button>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="showDisabledItems">{pl.settings.showDisabledItems}</Label>
          <p className="text-ink-soft text-xs">{pl.settings.showDisabledItemsHint}</p>
        </div>
        <Switch
          id="showDisabledItems"
          disabled={!canWrite}
          checked={draft.showDisabledItems}
          onCheckedChange={(checked) => patch({ showDisabledItems: checked })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={!canWrite || !dirty || !valid || update.isPending} onClick={save}>
          {pl.common.save}
        </Button>
        {dirty ? <span className="text-ink-soft text-xs">{pl.settings.unsaved}</span> : null}
      </div>
    </section>
  );
}

/** Numer w podglądzie — dowolny, byle widać było dopełnienie zerami. */
const PREVIEW_SEQ = 42;
