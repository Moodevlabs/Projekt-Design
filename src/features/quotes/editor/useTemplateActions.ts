import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCreateTemplate, useOverwriteTemplate, useTemplates } from '@/data/queries/useTemplates';
import type { Template } from '@/data/repos/templates.repo';
import { useEditorStore } from './editor.store';
import { pl } from '@/i18n/pl';
import { scheduleHasContent } from '@/domain/schedule';
import { documentsHaveContent } from '@/domain/documents';

/** Co wycena ma do zaoferowania szablonowi — steruje checkboxami w dialogu. */
export interface TemplateAvailable {
  schedule: boolean;
  documents: boolean;
}

/** Co użytkownik zaznaczył w dialogu. */
export interface TemplateSelection {
  schedule: boolean;
  documents: boolean;
}

export interface TemplateActions {
  /** Szablony do wyboru przy nadpisywaniu. */
  templates: Template[];
  /** Czego wycena w ogóle ma — brak = checkbox ukryty (zasada z T-48). */
  available: TemplateAvailable;
  saveAs: (name: string, selection: TemplateSelection) => void;
  overwrite: (template: Template, selection: TemplateSelection) => void;
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

  /**
   * Termin i dokumenty do szablonu — albo `null`, gdy checkbox odznaczony.
   *
   * `startDate` zerujemy **przy zapisie**, nie przy odczycie: data startu
   * należy do konkretnego projektu, a szablon zapisany w marcu z marcową datą
   * byłby pułapką, której nikt nie zauważy przed wysłaniem oferty.
   */
  const packageFor = (selection: TemplateSelection) => {
    const state = useEditorStore.getState();
    return {
      schedule:
        selection.schedule && scheduleHasContent(state.schedule) && state.schedule
          ? { ...structuredClone(state.schedule), startDate: null }
          : null,
      documents:
        selection.documents && documentsHaveContent(state.documents) && state.documents
          ? structuredClone(state.documents)
          : null,
    };
  };

  const saveAs = useCallback(
    (name: string, selection: TemplateSelection) => {
      const body = bodyForTemplate();
      if (!body) return;

      setSaving(true);
      create.mutate(
        { name, body, ...packageFor(selection) },
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
    (template: Template, selection: TemplateSelection) => {
      const body = bodyForTemplate();
      if (!body) return;

      setSaving(true);
      overwriteTemplate.mutate(
        { id: template.id, body, ...packageFor(selection) },
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
  /*
   * Subskrypcja, nie `getState()`: checkbox ma się pojawić w tej samej chwili,
   * w której użytkownik doda pierwszy etap w zakładce „Termin" — bez czekania
   * na przypadkowe przerenderowanie strony.
   */
  // Po treści, nie po istnieniu (T-115): pusta powłoka zakładki nie jest
  // pakietem i nie ma trafić do szablonu jako „termin" czy „etapy".
  const hasSchedule = useEditorStore((state) => scheduleHasContent(state.schedule));
  const hasDocuments = useEditorStore((state) => documentsHaveContent(state.documents));
  const available: TemplateAvailable = { schedule: hasSchedule, documents: hasDocuments };

  return {
    templates: rows,
    available,
    saveAs,
    overwrite,
    canOverwrite: rows.length > 0,
    saving,
  };
}
