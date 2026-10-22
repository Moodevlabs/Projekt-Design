import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROJECT_KINDS, type ProjectKind } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';
import { Field } from './IntakeClientBlock';
import type { MessageIntakeState } from './useMessageIntake';

/** Sentinel w selekcie rodzaju — Radix nie przyjmuje pustego `value`. */
const NO_KIND = '__none__';

/**
 * Blok „Teczka": nazwa, metraż, rodzaj obiektu — te same trzy pola, które
 * `ProjectFormDialog` pokazuje jako pierwsze. Status (`lead`) i notatki
 * (oryginalna wiadomość) nie mają tu kontrolek: są konsekwencją tego, skąd
 * teczka powstaje, nie decyzją do podjęcia.
 */
export function IntakeProjectBlock({ state }: { state: MessageIntakeState }) {
  const { projectFields } = state;
  if (!projectFields) return null;

  return (
    <section className="space-y-3">
      <h3 className="label-caps text-ink-soft">{pl.ai.intake.project}</h3>
      <Field id="intake-project-name" label={pl.ai.intake.fields.projectName}>
        <Input
          id="intake-project-name"
          value={projectFields.name}
          placeholder={pl.projects.namePlaceholder}
          onChange={(event) => state.updateProject({ name: event.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field id="intake-project-area" label={pl.ai.intake.fields.areaM2}>
          <Input
            id="intake-project-area"
            inputMode="decimal"
            placeholder={pl.projects.areaPlaceholder}
            value={projectFields.areaM2}
            onChange={(event) => state.updateProject({ areaM2: event.target.value })}
            className="tabular"
          />
        </Field>
        <Field id="intake-project-kind" label={pl.ai.intake.fields.kind}>
          <Select
            value={projectFields.kind || NO_KIND}
            onValueChange={(value) =>
              state.updateProject({ kind: value === NO_KIND ? '' : (value as ProjectKind) })
            }
          >
            <SelectTrigger id="intake-project-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_KIND}>{pl.projects.kindNone}</SelectItem>
              {PROJECT_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {pl.projects.kinds[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </section>
  );
}
