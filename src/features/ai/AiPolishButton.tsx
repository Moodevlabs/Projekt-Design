import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAiPolishText } from '@/data/queries/useAi';
import { applyPolishedText, type PolishField, type PolishTextPayload } from '@/domain/ai';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import { AiErrorNote } from './AiErrorNote';
import { AiPolishPreview } from './AiPolishPreview';
import { AiWorking } from './AiWorking';

export interface AiPolishButtonProps {
  field: PolishField;
  /** Bieżąca treść pola — to ona jedzie do modelu i to z nią porównujemy wynik. */
  text: string;
  context: PolishTextPayload['context'];
  /** Wpisuje tekst do pola. Zapis idzie zwykłą ścieżką (autosave / zapis usługi). */
  onApply: (text: string) => void;
  /**
   * Limit znaków POLA, do którego tekst trafi (np. 500 dla opisu usługi).
   * Podgląd pokazuje tekst już przycięty i mówi o tym — `onApply` dostaje
   * dokładnie to, co widać. Domyślnie limit z FEATURES-AI.md §5.
   */
  maxLength?: number;
  disabled?: boolean;
  /** `icon` — sama ikona (obok `PlaceholderMenu`); `sm` — ikona z etykietą. */
  size?: 'sm' | 'icon';
  className?: string;
}

/**
 * „Dopracuj tekst (AI)" — jedno kliknięcie, podgląd „było / będzie", decyzja
 * (T-139, FEATURES-AI.md §5).
 *
 * Klik od razu woła model i otwiera popover — nie ma pośredniego „czy na
 * pewno?", bo koszt pomyłki to jedno wywołanie z puli, a odpowiedź i tak
 * jest tylko propozycją. Popover żyje przy polu (origin od przycisku), żeby
 * tekst w podglądzie stał obok tekstu, którego dotyczy.
 *
 * Odpowiedź modelu przechodzi przez `applyPolishedText`: zgubiony placeholder
 * (`{rooms}`, `{client}` …) odrzuca propozycję, zanim człowiek zdąży ją
 * zatwierdzić — polecenie w promptcie to prośba, sprawdzenie w domenie
 * to gwarancja.
 */
export function AiPolishButton({
  field,
  text,
  context,
  onApply,
  maxLength = 1200,
  disabled = false,
  size = 'icon',
  className,
}: AiPolishButtonProps) {
  const polish = useAiPolishText();
  const [open, setOpen] = useState(false);

  const run = () => {
    polish.mutate({ field, text, context });
    setOpen(true);
  };

  // Zamknięcie zapomina odpowiedź: następne otwarcie ma wołać model dla
  // AKTUALNEJ treści pola, a nie pokazywać propozycję do tekstu sprzed chwili.
  const close = () => {
    setOpen(false);
    polish.reset();
  };

  const proposal = polish.data?.data.text ?? null;
  const outcome = proposal !== null ? applyPolishedText(text, proposal, maxLength) : null;
  // `applyPolishedText` oddaje tekst już przycięty — porównanie długości
  // mówi, czy limit pola coś uciął. Podgląd ma to powiedzieć, zanim człowiek
  // zatwierdzi tekst urwany w pół zdania.
  const truncatedTo =
    outcome && proposal !== null && outcome.text.length < proposal.trim().length ? maxLength : null;

  const apply = () => {
    if (!outcome?.ok) return;
    onApply(outcome.text);
    close();
  };

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size === 'icon' ? 'icon-xs' : 'sm'}
          aria-label={pl.ai.text.action}
          title={pl.ai.text.action}
          disabled={disabled || polish.isPending}
          // Radix przełącza popover PO naszym handlerze: gdy jest otwarty,
          // klik w przycisk ma go tylko zamknąć, a nie wołać model drugi raz.
          onClick={() => {
            if (!open) run();
          }}
          className={cn(
            'text-ink-soft hover:text-ink shrink-0 transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98]',
            className,
          )}
        >
          <Sparkles
            className={cn('size-3.5', polish.isPending && 'motion-safe:animate-pulse')}
            aria-hidden
          />
          {size === 'sm' ? pl.ai.text.action : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[400px] max-w-[calc(100vw-32px)] p-0 duration-200 ease-out"
      >
        {polish.isPending ? (
          <AiWorking label={pl.ai.text.working} rows={2} className="p-4" />
        ) : polish.error ? (
          <div className="space-y-3 p-3">
            <AiErrorNote error={polish.error} onRetry={run} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={close}>
                {pl.common.close}
              </Button>
            </div>
          </div>
        ) : outcome ? (
          outcome.ok ? (
            <AiPolishPreview
              before={text}
              after={outcome.text}
              truncatedTo={truncatedTo}
              onApply={apply}
              onDiscard={close}
            />
          ) : (
            <div className="space-y-3 p-4">
              <p className="text-ink text-sm" role="status">
                {outcome.lost.length > 0
                  ? pl.ai.text.lostPlaceholders(outcome.lost.join(', '))
                  : pl.ai.text.empty}
              </p>
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={close}>
                  {pl.common.close}
                </Button>
              </div>
            </div>
          )
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
