import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import type { MessageIntakeState } from './useMessageIntake';

/**
 * Blok „Klient" w arkuszu do przejrzenia.
 *
 * Trzy stany, od najcichszego:
 * - nadawca znany z karty klienta → jedno zdanie, zero pól;
 * - w bazie jest ktoś o tym e-mailu albo nazwisku → pasek z wyborem
 *   *Podepnij* / *Załóż nowego*; pola klienta pokazujemy tylko przy
 *   „nowym", bo przy podpięciu nic z nich nie trafiłoby do bazy;
 * - nikt nie pasuje → pola. E-mail i telefon są z maski, nie od modelu.
 */
export function IntakeClientBlock({ state }: { state: MessageIntakeState }) {
  const { knownClient, existingMatch, clientFields } = state;

  if (knownClient) {
    return (
      <section>
        <h3 className="label-caps text-ink-soft">{pl.ai.intake.client}</h3>
        <p className="text-ink mt-1.5 text-sm">{pl.ai.intake.knownClient(knownClient.name)}</p>
      </section>
    );
  }

  if (!clientFields) return null;
  const attach = existingMatch !== null && state.clientChoice === 'existing';

  return (
    <section className="space-y-3">
      <h3 className="label-caps text-ink-soft">{pl.ai.intake.client}</h3>

      {existingMatch ? (
        <div className="bg-surface-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-control)] px-4 py-3">
          <p className="text-ink min-w-0 flex-1 text-sm">
            {pl.ai.intake.existingClient(existingMatch.name)}
          </p>
          <div
            role="radiogroup"
            aria-label={pl.ai.intake.client}
            className="border-hair-strong inline-flex shrink-0 rounded-[var(--radius-control)] border p-0.5"
          >
            <Segment
              checked={attach}
              onClick={() => state.setClientChoice('existing')}
              label={pl.ai.intake.useExisting}
            />
            <Segment
              checked={!attach}
              onClick={() => state.setClientChoice('new')}
              label={pl.ai.intake.createNew}
            />
          </div>
        </div>
      ) : null}

      {attach ? null : (
        <div className="space-y-3">
          <Field id="intake-client-name" label={pl.ai.intake.fields.clientName}>
            <Input
              id="intake-client-name"
              value={clientFields.name}
              onChange={(event) => state.updateClient({ name: event.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Field id="intake-client-city" label={pl.ai.intake.fields.city}>
              <Input
                id="intake-client-city"
                value={clientFields.city}
                onChange={(event) => state.updateClient({ city: event.target.value })}
              />
            </Field>
            <Field id="intake-client-address" label={pl.ai.intake.fields.address}>
              <Input
                id="intake-client-address"
                value={clientFields.address}
                onChange={(event) => state.updateClient({ address: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="intake-client-email" label={pl.ai.intake.fields.email}>
              <Input
                id="intake-client-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={clientFields.email}
                onChange={(event) => state.updateClient({ email: event.target.value })}
              />
            </Field>
            <Field id="intake-client-phone" label={pl.ai.intake.fields.phone}>
              <Input
                id="intake-client-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={clientFields.phone}
                onChange={(event) => state.updateClient({ phone: event.target.value })}
              />
            </Field>
          </div>
        </div>
      )}
    </section>
  );
}

function Segment({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]',
        checked ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
