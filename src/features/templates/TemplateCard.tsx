import { useEffect, useRef, useState } from 'react';
import { CalendarClock, FilePlus2, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/shared';
import type { Template } from '@/data/repos/templates.repo';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Karta szablonu — nazwa z edycją w miejscu (jak w bibliotece), rozmiar
 * dokumentu i dwie akcje: utwórz wycenę, usuń.
 *
 * Szablon z uszkodzonym `body` pokazujemy, ale bez przycisku tworzenia:
 * ukrycie go zostawiłoby użytkownika z wierszem, którego nie da się ani użyć,
 * ani skasować.
 */
export function TemplateCard({
  template,
  saving,
  onRename,
  onUse,
  onDelete,
}: {
  template: Template;
  saving?: boolean;
  onRename: (name: string) => void;
  onUse: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(template.name);
  const seen = useRef(template.name);

  useEffect(() => {
    // Świeże dane wpuszczamy tylko wtedy, gdy nie kasują niezapisanej edycji.
    setName((previous) => (previous === seen.current ? template.name : previous));
    seen.current = template.name;
  }, [template.name]);

  const label = template.name || pl.templates.title;
  const dirty = name !== template.name;
  const broken = template.bodyError !== null;

  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <header className="flex items-start justify-between gap-2">
        <Input
          value={name}
          aria-label={pl.templates.nameLabel(label)}
          onChange={(event) => setName(event.target.value)}
          className="text-ink h-8 border-transparent px-2 text-sm font-semibold shadow-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={pl.templates.remove(label)}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </header>

      {broken ? (
        <p className="text-discount text-sm">{pl.templates.corrupted}</p>
      ) : (
        <div className="text-ink-soft flex items-center justify-between gap-3 text-sm">
          <span>{pl.templates.itemsCount(template.itemCount)}</span>
          <Money cents={template.totalNetCents} className="text-ink text-sm font-medium" />
        </div>
      )}

      {/* Co jeszcze niesie pakiet (T-63) — bez tego „szablon” wygląda na samą listę pozycji. */}
      {template.schedule || template.documents ? (
        <div className="text-ink-soft flex items-center gap-3 text-xs">
          {template.schedule ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden />
              {pl.templates.packageSchedule}
            </span>
          ) : null}
          {template.documents ? (
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" aria-hidden />
              {pl.templates.packageDocuments}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="text-ink-soft text-xs">{formatDate(new Date(template.updatedAt))}</p>

      {dirty ? (
        <div className="border-hair flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={pl.templates.cancel(label)}
            onClick={() => setName(template.name)}
          >
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            aria-label={pl.templates.save(label)}
            onClick={() => onRename(name)}
          >
            {pl.common.save}
          </Button>
        </div>
      ) : null}

      {!broken ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={pl.templates.use(label)}
          onClick={onUse}
          className="self-start"
        >
          <FilePlus2 className="size-4" aria-hidden />
          {pl.templates.newFromTemplate}
        </Button>
      ) : null}
    </article>
  );
}
