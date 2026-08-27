import { useMemo, useState } from 'react';
import { Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared';
import { useUpdateBriefTemplate } from '@/data/queries/useBriefTemplates';
import type { BriefTemplateRecord } from '@/domain/brief';
import {
  addQuestion,
  createSection,
  DEFAULT_BRIEF_TEMPLATE,
  moveQuestion,
  moveSection,
  removeQuestion,
  removeSection,
  templateProblems,
  updateQuestion,
  updateSection,
  type BriefTemplate,
} from '@/domain/brief';
import { pl } from '@/i18n/pl';

import { BriefSectionCard } from './BriefSectionCard';

export interface BriefTemplateEditorProps {
  template: BriefTemplateRecord;
  canWrite: boolean;
}

/**
 * Edytor jednego szablonu briefu (T-96).
 *
 * ## Dlaczego szkic w stanie, a nie zapis przy każdym znaku
 *
 * Reszta aplikacji zapisuje na bieżąco i słusznie — tam edytuje się jedno
 * pole. Tutaj edytuje się FORMULARZ: przestawienie sekcji, skasowanie pytania,
 * przeredagowanie trzech innych. Zapis po każdej zmianie oznaczałby, że
 * w połowie pracy szablon jest w stanie, którego nikt nie chciał wystawić —
 * a wystawić go można w każdej chwili z drugiego ekranu.
 *
 * Zapis blokujemy, dopóki formularz ma usterki uniemożliwiające wypełnienie
 * (pytanie bez treści, wybór z jedną opcją). Lista usterek jest widoczna,
 * a nie zwinięta w komunikat „popraw formularz”.
 */
export function BriefTemplateEditor({ template, canWrite }: BriefTemplateEditorProps) {
  const update = useUpdateBriefTemplate();

  const [name, setName] = useState(template.name);
  const [sections, setSections] = useState<BriefTemplate>(template.sections);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [loadedId, setLoadedId] = useState(template.id);

  /*
   * Przełączenie na inny szablon z listy obok musi wymienić szkic — inaczej
   * edytor pokazywałby pytania poprzedniego szablonu pod nową nazwą.
   *
   * Warunek stoi na `id`, a NIE na zawartości: `useEffect` porównujący
   * `template.sections` kasowałby niezapisane zmiany przy każdym odświeżeniu
   * zapytania w tle (TanStack zwraca wtedy nową tablicę o tej samej treści).
   */
  if (loadedId !== template.id) {
    setLoadedId(template.id);
    setName(template.name);
    setSections(template.sections);
  }

  const problems = useMemo(() => templateProblems(sections), [sections]);
  const dirty =
    name !== template.name || JSON.stringify(sections) !== JSON.stringify(template.sections);
  const disabled = !canWrite || update.isPending;

  const save = () => {
    if (problems.length > 0) return;
    update.mutate(
      { id: template.id, patch: { name: name.trim() || pl.briefTemplates.defaultName, sections } },
      {
        onSuccess: () => toast.success(pl.briefTemplates.saved),
        onError: (error) => toast.error(error.message || pl.briefTemplates.saveFailed),
      },
    );
  };

  const revert = () => {
    setName(template.name);
    setSections(template.sections);
  };

  return (
    <div className="space-y-4">
      <section className="card-surface space-y-4 p-5">
        <div className="space-y-1">
          <Label htmlFor="brief-template-name">{pl.briefTemplates.nameLabel}</Label>
          <Input
            id="brief-template-name"
            value={name}
            disabled={disabled}
            placeholder={pl.briefTemplates.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-ink-soft text-xs">{pl.briefTemplates.nameHint}</p>
        </div>
      </section>

      {problems.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{pl.briefTemplates.problemsTitle}</AlertTitle>
          <AlertDescription>
            <p>{pl.briefTemplates.problemsHint}</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <BriefSectionCard
            key={section.id}
            section={section}
            index={index}
            count={sections.length}
            disabled={disabled}
            onSectionChange={(patch) =>
              setSections((current) => updateSection(current, section.id, patch))
            }
            onSectionMove={(delta) =>
              setSections((current) => moveSection(current, section.id, delta))
            }
            onSectionRemove={() => setSections((current) => removeSection(current, section.id))}
            onQuestionAdd={() => setSections((current) => addQuestion(current, section.id))}
            onQuestionChange={(questionId, patch) =>
              setSections((current) => updateQuestion(current, section.id, questionId, patch))
            }
            onQuestionMove={(questionId, delta) =>
              setSections((current) => moveQuestion(current, section.id, questionId, delta))
            }
            onQuestionRemove={(questionId) =>
              setSections((current) => removeQuestion(current, section.id, questionId))
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => setSections((current) => [...current, createSection(current)])}
        >
          <Plus className="size-4" aria-hidden />
          {pl.briefTemplates.addSection}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => setRestoreOpen(true)}
        >
          <RotateCcw className="size-4" aria-hidden />
          {pl.briefTemplates.restoreDefaults}
        </Button>
      </div>

      {/*
        Pasek zapisu stoi na dole i przykleja się do krawędzi okna: edytor jest
        długi, a decyzja „zapisz / odrzuć” musi być dostępna z każdej jego
        wysokości.
      */}
      {canWrite ? (
        <div className="bg-surface/95 border-hair sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 py-3 backdrop-blur">
          <p className="text-ink-soft text-xs">{dirty ? pl.briefTemplates.unsaved : ''}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={!dirty || disabled} onClick={revert}>
              {pl.briefTemplates.revert}
            </Button>
            <Button
              type="button"
              disabled={!dirty || disabled || problems.length > 0}
              onClick={save}
            >
              <Save className="size-4" aria-hidden />
              {pl.briefTemplates.save}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={pl.briefTemplates.restoreDefaults}
        description={pl.briefTemplates.restoreDefaultsConfirm}
        onConfirm={() => setSections(DEFAULT_BRIEF_TEMPLATE)}
      />
    </div>
  );
}
