import { useState } from 'react';
import { Check, Copy, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import {
  useBriefTemplates,
  useCreateBriefTemplate,
  useDeleteBriefTemplate,
  useUpdateBriefTemplate,
} from '@/data/queries/useBriefTemplates';
import { DEFAULT_BRIEF_TEMPLATE, type BriefTemplateRecord } from '@/domain/brief';
import { useEntitlement } from '@/features/billing/useEntitlement';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { BriefTemplateEditor } from './BriefTemplateEditor';

/**
 * Ustawienia → Brief (T-96).
 *
 * ## Dlaczego osobna karta ustawień, a nie sekcja w „Aplikacji”
 *
 * Karta „Aplikacja” to kolumna `max-w-2xl` z krótkimi ustawieniami. Edytor
 * formularza jest ekranem: dwadzieścia pytań w pięciu sekcjach, z których
 * każde ma siedem pól. Wciśnięty w tamtą kolumnę byłby nieczytelny, a przy
 * okazji przykryłby sobą wszystkie pozostałe ustawienia.
 *
 * ## Dlaczego lista szablonów, a nie jeden formularz
 *
 * Pracownia prowadzi zlecenia różnego rodzaju i pyta o różne rzeczy: brief do
 * mieszkania nie pasuje do lokalu usługowego. Jeden szablon zmuszałby do
 * przepisywania pytań przy każdej zmianie typu zlecenia.
 */
export function BriefTemplatesPage() {
  const templates = useBriefTemplates();
  const create = useCreateBriefTemplate();
  const canWrite = useEntitlement().canWrite;

  const rows = templates.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  const addTemplate = () => {
    create.mutate(
      {
        name: pl.briefTemplates.defaultName,
        sections: DEFAULT_BRIEF_TEMPLATE,
        // Pierwszy szablon w workspace zostaje domyślnym od razu — inaczej
        // trzeba by go osobno „włączyć”, żeby cokolwiek zmieniło się przy
        // wystawianiu briefu.
        isDefault: rows.length === 0,
      },
      {
        onSuccess: (record) => setSelectedId(record.id),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (templates.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (templates.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{templates.error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="max-w-prose space-y-1">
        <h2 className="text-ink text-sm font-semibold">{pl.briefTemplates.title}</h2>
        <p className="text-ink-soft text-sm">{pl.briefTemplates.intro}</p>
      </div>

      {!canWrite ? (
        <Alert>
          <AlertDescription>{pl.settings.readOnly}</AlertDescription>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={pl.briefTemplates.empty}
          description={pl.briefTemplates.emptyHint}
          action={
            canWrite ? (
              <Button type="button" onClick={addTemplate} disabled={create.isPending}>
                <Plus className="size-4" aria-hidden />
                {pl.briefTemplates.addFromDefault}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <TemplateListRow
                  key={row.id}
                  template={row}
                  active={row.id === selected?.id}
                  canWrite={canWrite}
                  onSelect={() => setSelectedId(row.id)}
                />
              ))}
            </ul>
            {canWrite ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={addTemplate}
                disabled={create.isPending}
              >
                <Plus className="size-4" aria-hidden />
                {pl.briefTemplates.add}
              </Button>
            ) : null}
          </aside>

          {selected ? (
            <BriefTemplateEditor key={selected.id} template={selected} canWrite={canWrite} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function TemplateListRow({
  template,
  active,
  canWrite,
  onSelect,
}: {
  template: BriefTemplateRecord;
  active: boolean;
  canWrite: boolean;
  onSelect: () => void;
}) {
  const update = useUpdateBriefTemplate();
  const create = useCreateBriefTemplate();
  const remove = useDeleteBriefTemplate();
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <li>
      <div
        className={cn(
          'border-hair rounded-[var(--radius-control)] border p-2.5 transition-colors',
          active && 'border-primary bg-surface-2',
        )}
      >
        <button
          type="button"
          className="text-ink w-full text-left text-sm font-medium"
          onClick={onSelect}
        >
          {template.name}
        </button>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          {template.isDefault ? (
            <span className="text-ink-soft inline-flex items-center gap-1 text-xs">
              <Check className="size-3" aria-hidden />
              {pl.briefTemplates.isDefault}
            </span>
          ) : canWrite ? (
            <button
              type="button"
              className="text-ink-soft hover:text-ink text-xs underline-offset-2 hover:underline"
              onClick={() =>
                update.mutate(
                  { id: template.id, patch: { isDefault: true } },
                  { onError: (error) => toast.error(error.message) },
                )
              }
            >
              {pl.briefTemplates.setDefault}
            </button>
          ) : (
            <span />
          )}

          {canWrite ? (
            <span className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={pl.briefTemplates.duplicate}
                onClick={() =>
                  create.mutate(
                    {
                      name: `${template.name}${pl.briefTemplates.copySuffix}`,
                      sections: template.sections,
                    },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
              >
                <Copy className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={pl.briefTemplates.remove}
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </span>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={pl.briefTemplates.remove}
        description={pl.briefTemplates.removeConfirm}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() =>
          remove.mutate(template.id, { onError: (error) => toast.error(error.message) })
        }
      />
    </li>
  );
}
