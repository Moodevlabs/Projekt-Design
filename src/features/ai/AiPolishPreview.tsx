import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { AiBadge } from './AiBadge';

/**
 * Podgląd „było / będzie" dopracowanego tekstu (T-139, reguła A3).
 *
 * Dwa bloki różnią się MATERIAŁEM, nie kolorem: stary tekst leży na
 * wgłębionym beżu (`--surface-2`, panel zagnieżdżony), nowy stoi na białej
 * karcie z włosem i cieniem — tej samej, na której leży wycena. Oko czyta
 * od razu, który z nich jest „na wierzchu", bez strzałek i etykiet „nowe".
 *
 * Pusty oryginał (model pisał od zera) nie dostaje pustego panelu „Było":
 * pokazywanie pustki jako jednej z dwóch opcji byłoby mylące.
 */
export function AiPolishPreview({
  before,
  after,
  truncatedTo = null,
  onApply,
  onDiscard,
}: {
  before: string;
  after: string;
  /** Limit pola, do którego przycięto propozycję; `null` = nic nie ucięto. */
  truncatedTo?: number | null;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const applyRef = useRef<HTMLButtonElement>(null);

  // „Zastosuj" jest domyślną odpowiedzią — Enter zaraz po przeczytaniu.
  // Radix sam skupiłby pierwszy przycisk w DOM, czyli „Odrzuć".
  useEffect(() => {
    applyRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3.5 p-4">
      <p className="text-ink text-sm font-semibold">{pl.ai.text.title}</p>

      {before.trim().length > 0 ? (
        <section>
          <p className="label-caps text-ink-faint">{pl.ai.text.before}</p>
          <p className="bg-surface-2 text-ink-soft mt-1.5 max-h-32 overflow-y-auto rounded-[var(--radius-control)] px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">
            {before}
          </p>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-3">
          <p className="label-caps text-ink-faint">{pl.ai.text.after}</p>
          <AiBadge />
        </div>
        <div className="card-surface mt-1.5 max-h-56 overflow-y-auto px-3.5 py-3">
          <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{after}</p>
        </div>
        {/* Cicha linijka, nie ostrzeżenie: tekst da się zastosować, ale człowiek
            ma wiedzieć, że model napisał więcej, niż pole zmieści. */}
        {truncatedTo !== null ? (
          <p className="text-ink-faint mt-1.5 text-xs" role="status">
            {pl.ai.text.truncated(truncatedTo)}
          </p>
        ) : null}
      </section>

      <div className="flex justify-end gap-2 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDiscard}
          className="active:scale-[0.98]"
        >
          {pl.ai.text.discard}
        </Button>
        <Button
          ref={applyRef}
          type="button"
          size="sm"
          onClick={onApply}
          className="active:scale-[0.98]"
        >
          {pl.ai.text.apply}
        </Button>
      </div>
    </div>
  );
}
