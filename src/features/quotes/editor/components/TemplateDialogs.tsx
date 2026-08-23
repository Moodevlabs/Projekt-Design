import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Template } from '@/data/repos/templates.repo';
import { pl } from '@/i18n/pl';

/** Zapis bieżącej wyceny jako nowy szablon — pyta wyłącznie o nazwę. */
export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  defaultName,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  saving: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Przy każdym otwarciu startujemy od tytułu bieżącej wyceny, a nie od
        // tego, co ktoś wpisał i porzucił poprzednim razem.
        if (next) setName(defaultName);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pl.templates.saveAsTemplateTitle}</DialogTitle>
          <DialogDescription>{pl.templates.saveAsTemplateDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="template-name">{pl.templates.saveAsTemplateName}</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim().length > 0) {
                onSave(name.trim());
                onOpenChange(false);
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={saving || name.trim().length === 0}
            onClick={() => {
              onSave(name.trim());
              onOpenChange(false);
            }}
          >
            {pl.templates.saveAsTemplateConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Nadpisanie istniejącego szablonu. Wybór z listy plus potwierdzenie w jednym
 * kroku — nadpisania nie da się cofnąć, więc nazwa celu musi być widoczna
 * w chwili kliknięcia.
 */
export function OverwriteTemplateDialog({
  open,
  onOpenChange,
  templates,
  saving,
  onOverwrite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  saving: boolean;
  onOverwrite: (template: Template) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pl.templates.overwriteTitle}</DialogTitle>
          <DialogDescription>
            {selected ? pl.templates.overwriteDescription(selected.name) : pl.templates.overwriteEmpty}
          </DialogDescription>
        </DialogHeader>

        {templates.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="template-target">{pl.templates.title}</Label>
            <select
              id="template-target"
              value={selected?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className="border-hair focus-within:border-ring w-full rounded-[var(--radius-control)] border bg-transparent px-2 py-1.5 text-sm outline-none"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving || selected === null}
            onClick={() => {
              if (selected) onOverwrite(selected);
              onOpenChange(false);
            }}
          >
            {pl.templates.overwrite}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
