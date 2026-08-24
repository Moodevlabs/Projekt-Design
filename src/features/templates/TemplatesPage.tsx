import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateCard } from './TemplateCard';
import { useCreateQuote } from '@/data/queries/useQuotes';
import { scheduleFromTemplate } from '@/domain/schedule';
import {
  useDeleteTemplate,
  useRenameTemplate,
  useTemplates,
} from '@/data/queries/useTemplates';
import type { Template } from '@/data/repos/templates.repo';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Lista szablonów. Szablon to gotowy układ wyceny — stąd główna akcja karty
 * („nowa wycena z szablonu") prowadzi prosto do edytora nowego dokumentu.
 */
export function TemplatesPage() {
  const navigate = useNavigate();
  const templates = useTemplates();
  const rename = useRenameTemplate();
  const remove = useDeleteTemplate();
  const createQuote = useCreateQuote();
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);

  const rows = templates.data ?? [];

  const createFromTemplate = (template: Template) => {
    if (!template.body) return;

    createQuote.mutate(
      {
        // Kopia treści, nie referencja: od tej chwili wycena i szablon żyją
        // osobno, a późniejsza zmiana szablonu nie rusza wystawionej oferty.
        body: structuredClone(template.body),
        title: template.body.title,
        /*
         * Szablon jest pakietem (T-63): wycena z „Projektu kompleksowego"
         * ma od razu etapy i dokumenty, a nie samą listę pozycji. Data
         * startu wypada — należy do projektu, nie do szablonu.
         */
        schedule: scheduleFromTemplate(template.schedule),
        documents: template.documents ? structuredClone(template.documents) : null,
      },
      {
        onSuccess: (quote) => {
          toast.success(pl.templates.createdFrom(template.name));
          void navigate(routes.quote(quote.id));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (templates.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (templates.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{pl.templates.loadError}</AlertDescription>
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title={pl.templates.emptyTitle}
        description={pl.templates.emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* `items-start`, żeby karta nie rozciągała sąsiadek w wierszu. */}
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            saving={rename.isPending}
            onRename={(name) => rename.mutate({ id: template.id, name })}
            onUse={() => createFromTemplate(template)}
            onDelete={() => setPendingDelete(template)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pl.templates.removeTitle}
        description={
          pendingDelete ? pl.templates.removeDescription(pendingDelete.name) : undefined
        }
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
