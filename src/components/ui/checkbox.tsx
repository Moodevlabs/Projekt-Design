import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Checkbox w palecie aplikacji — brąz `--primary` na zaznaczeniu, włos
 * `--input` na obwódce, ten sam pierścień skupienia co reszta kontrolek.
 *
 * Powstał, bo natywny `<input type="checkbox">` rysuje się systemowo: na
 * Windowsie niebieski, na macOS inny niebieski, w obu wypadkach obcy wobec
 * beżowo-brązowej powłoki (08-REDESIGN-2026). `accent-color` podmienia samo
 * wypełnienie, ale zostawia systemowy kształt, obwódkę i promień rogu.
 *
 * Ten sam `radix-ui` co `Switch` — bez nowej zależności. Radix renderuje
 * `<button role="checkbox">`, a `button` JEST elementem etykietowalnym, więc
 * `<label htmlFor>` dalej działa: kliknięcie w tekst przełącza pole.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-input focus-visible:border-ring focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary size-4 shrink-0 rounded-[4px] border bg-transparent shadow-xs transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {/* `strokeWidth` wyżej niż domyślne 2: przy 10 px ptaszek o cienkiej
            kresce robi się szary zamiast biały. */}
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
