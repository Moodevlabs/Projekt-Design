import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared';
import type { BriefQuestion, BriefSection } from '@/domain/brief';
import { pl } from '@/i18n/pl';

import { BriefQuestionRow } from './BriefQuestionRow';

export interface BriefSectionCardProps {
  section: BriefSection;
  index: number;
  count: number;
  disabled: boolean;
  onSectionChange: (patch: Partial<Omit<BriefSection, 'id' | 'questions'>>) => void;
  onSectionMove: (delta: number) => void;
  onSectionRemove: () => void;
  onQuestionAdd: () => void;
  onQuestionChange: (questionId: string, patch: Partial<Omit<BriefQuestion, 'id'>>) => void;
  onQuestionMove: (questionId: string, delta: number) => void;
  onQuestionRemove: (questionId: string) => void;
}

/**
 * Jedna sekcja szablonu — tytuł, opis i lista pytań (T-96).
 *
 * Sekcje odpowiadają blokom, w jakich brief czyta się w praktyce (obiekt,
 * ludzie, zakres, estetyka, warunki). Zachowujemy ten podział w edytorze, bo
 * płaska lista dwudziestu pytań nie daje się ani czytać, ani porządkować.
 */
export function BriefSectionCard({
  section,
  index,
  count,
  disabled,
  onSectionChange,
  onSectionMove,
  onSectionRemove,
  onQuestionAdd,
  onQuestionChange,
  onQuestionMove,
  onQuestionRemove,
}: BriefSectionCardProps) {
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <section className="border-hair space-y-3 rounded-[var(--radius-card)] border p-4">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${section.id}-title`}>{pl.briefTemplates.sectionTitleLabel}</Label>
            <Input
              id={`${section.id}-title`}
              value={section.title}
              disabled={disabled}
              onChange={(event) => onSectionChange({ title: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${section.id}-hint`}>{pl.briefTemplates.sectionHintLabel}</Label>
            <Input
              id={`${section.id}-hint`}
              value={section.hint}
              disabled={disabled}
              placeholder={pl.briefTemplates.sectionHintPlaceholder}
              onChange={(event) => onSectionChange({ hint: event.target.value })}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.briefTemplates.moveUp}
            disabled={disabled || index === 0}
            onClick={() => onSectionMove(-1)}
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.briefTemplates.moveDown}
            disabled={disabled || index === count - 1}
            onClick={() => onSectionMove(1)}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.briefTemplates.removeSection}
            disabled={disabled}
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ink-soft text-xs">
          {pl.briefTemplates.questionCount(section.questions.length)}
        </p>
      </div>

      {section.questions.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.briefTemplates.emptySection}</p>
      ) : (
        <ul className="space-y-2">
          {section.questions.map((question, questionIndex) => (
            <BriefQuestionRow
              key={question.id}
              question={question}
              index={questionIndex}
              count={section.questions.length}
              disabled={disabled}
              onChange={(patch) => onQuestionChange(question.id, patch)}
              onMove={(delta) => onQuestionMove(question.id, delta)}
              onRemove={() => onQuestionRemove(question.id)}
            />
          ))}
        </ul>
      )}

      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onQuestionAdd}>
        <Plus className="size-4" aria-hidden />
        {pl.briefTemplates.addQuestion}
      </Button>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={pl.briefTemplates.removeSection}
        description={pl.briefTemplates.removeSectionConfirm}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={onSectionRemove}
      />
    </section>
  );
}
