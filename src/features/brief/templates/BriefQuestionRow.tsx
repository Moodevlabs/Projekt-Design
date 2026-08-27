import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  BRIEF_FIELD_KINDS,
  kindUsesOptions,
  type BriefFieldKind,
  type BriefQuestion,
} from '@/domain/brief';
import { pl } from '@/i18n/pl';

export interface BriefQuestionRowProps {
  question: BriefQuestion;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (patch: Partial<Omit<BriefQuestion, 'id'>>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}

/**
 * Jedno pytanie w edytorze szablonu (T-96).
 *
 * ## Dlaczego wiersz zwija się do samej treści pytania
 *
 * Pytanie ma siedem pól, z których na co dzień zmienia się jedno. Rozwinięte
 * wszystkie naraz zamieniają blok pięciu pytań w ekran, po którym trzeba
 * przewijać, żeby zobaczyć, o co właściwie pytamy. Zwinięty wiersz pokazuje
 * to, co istotne: treść, rodzaj pola i wymagalność.
 *
 * Identyfikatora pytania nie da się tu zmienić i jest to celowe — wiąże on
 * pytanie z odpowiedziami już udzielonymi (patrz `domain/brief/editor.ts`).
 */
export function BriefQuestionRow({
  question,
  index,
  count,
  disabled,
  onChange,
  onMove,
  onRemove,
}: BriefQuestionRowProps) {
  const [open, setOpen] = useState(question.label.trim() === '');

  return (
    <li className="border-hair rounded-[var(--radius-control)] border">
      <div className="flex items-start gap-2 p-2.5">
        <Input
          value={question.label}
          disabled={disabled}
          placeholder={pl.briefTemplates.questionLabelPlaceholder}
          aria-label={pl.briefTemplates.questionLabel}
          onChange={(event) => onChange({ label: event.target.value })}
          className="flex-1"
        />

        <Select
          value={question.kind}
          disabled={disabled}
          onValueChange={(next) => onChange({ kind: next as BriefFieldKind })}
        >
          <SelectTrigger aria-label={pl.briefTemplates.kind.label} className="h-9 w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRIEF_FIELD_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {pl.briefTemplates.kind[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={pl.briefTemplates.moveUp}
          disabled={disabled || index === 0}
          onClick={() => onMove(-1)}
        >
          <ChevronUp className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={pl.briefTemplates.moveDown}
          disabled={disabled || index === count - 1}
          onClick={() => onMove(1)}
        >
          <ChevronDown className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={pl.briefTemplates.removeQuestion}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="px-2.5 pb-2.5">
        <button
          type="button"
          className="text-ink-soft hover:text-ink text-xs underline-offset-2 hover:underline"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? pl.common.close : pl.common.more}
        </button>

        {open ? (
          <div className="mt-2.5 space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${question.id}-hint`}>{pl.briefTemplates.questionHint}</Label>
                <Input
                  id={`${question.id}-hint`}
                  value={question.hint}
                  disabled={disabled}
                  placeholder={pl.briefTemplates.questionHintPlaceholder}
                  onChange={(event) => onChange({ hint: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${question.id}-placeholder`}>
                  {pl.briefTemplates.questionPlaceholder}
                </Label>
                <Input
                  id={`${question.id}-placeholder`}
                  value={question.placeholder}
                  disabled={disabled}
                  onChange={(event) => onChange({ placeholder: event.target.value })}
                />
              </div>
            </div>

            {kindUsesOptions(question.kind) ? (
              <div className="space-y-1">
                <Label htmlFor={`${question.id}-options`}>
                  {pl.briefTemplates.questionOptions}
                </Label>
                {/*
                  Opcje edytujemy jako tekst „jedna w wierszu”, a nie listę pól
                  z przyciskami: wpisanie ośmiu wariantów stylu to jedno wklejenie,
                  a nie osiem kliknięć „dodaj”.
                */}
                <Textarea
                  id={`${question.id}-options`}
                  rows={Math.min(8, Math.max(3, question.options.length + 1))}
                  value={question.options.join('\n')}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      options: event.target.value
                        .split('\n')
                        .map((option) => option.trim())
                        .filter((option) => option !== ''),
                    })
                  }
                />
                <p className="text-ink-soft text-xs">{pl.briefTemplates.questionOptionsHint}</p>
              </div>
            ) : null}

            <div className="flex items-start gap-2.5">
              <Switch
                id={`${question.id}-required`}
                checked={question.required}
                disabled={disabled}
                onCheckedChange={(checked) => onChange({ required: checked })}
              />
              <div className="space-y-0.5">
                <Label htmlFor={`${question.id}-required`}>
                  {pl.briefTemplates.questionRequired}
                </Label>
                <p className="text-ink-soft text-xs">{pl.briefTemplates.questionRequiredHint}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
