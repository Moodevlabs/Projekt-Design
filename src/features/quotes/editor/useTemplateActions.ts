import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCreateTemplate, useOverwriteTemplate, useTemplates } from '@/data/queries/useTemplates';
import type { Template } from '@/data/repos/templates.repo';
import { useEditorStore } from './editor.store';
import { pl } from '@/i18n/pl';

export interface TemplateActions {
  /** Szablony do wyboru przy nadpisywaniu. */
  templates: Template[];
  saveAs: (name: string) => void;
  overwrite: (template: Template) => void;
  /** Czy jest cokolwiek do nadpisania — UI chowa wtedy pozycję menu. */
  canOverwrite: boolean;
  saving: boolean;
}

/**
 * Zapis bieżącej wyceny jako szablon.
 *
 * Wyjęte ze strony (tak jak `useSaveToLibrary`), bo tu jest jedna decyzja warta
 * testu: **szablon nie zabiera ze sobą danych klienta**. Kopiowanie ich
 * znaczyłoby, że nowa wycena z szablonu startuje z cudzym nazwiskiem
 * i telefonem — pomyłka, którą łatwo wysłać do klienta.
 */
export function useTemplateActions(): TemplateActions {
  const templates = useTemplates();
  const create = useCreateTemplate();
  const overwriteTemplate = useOverwriteTemplate();
  const [saving, setSaving] = useState(false);

  const bodyForTemplate = () => {
    const body = useEditorStore.getState().body;
    if (!body) return null;

    return {
      ...structuredClone(body),
      // Dane odbiorcy i data wystawienia należą do konkretnej oferty.
      client: { name: '', phone: '', email: '', city: '' },
      issueDate: null,
    };
  };

  const saveAs = useCallback(
    (name: string) => {
      const body = bodyForTemplate();
      if (!body) return;

      setSaving(true);
      create.mutate(
        { name, body },
        {
          onSuccess: () => toast.success(pl.templates.saveAsTemplateDone(name)),
          onError: (error) => toast.error(error.message),
          onSettled: () => setSaving(false),
        },
      );
    },
    [create],
  );

  const overwrite = useCallback(
    (template: Template) => {
      const body = bodyForTemplate();
      if (!body) return;

      setSaving(true);
      overwriteTemplate.mutate(
        { id: template.id, body },
        {
          onSuccess: () => toast.success(pl.templates.overwriteDone(template.name)),
          onError: (error) => toast.error(error.message),
          onSettled: () => setSaving(false),
        },
      );
    },
    [overwriteTemplate],
  );

  const rows = templates.data ?? [];

  return { templates: rows, saveAs, overwrite, canOverwrite: rows.length > 0, saving };
}
