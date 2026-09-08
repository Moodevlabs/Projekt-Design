import type { ReactNode } from 'react';

/**
 * Nagłówek bloku pulpitu (T-133): tytuł 13 px półgrubym i kreska pod spodem.
 *
 * Świadomie NIE `.label-caps`: wersalikowe „oczko" nad każdym blokiem było
 * tym, przez co pulpit się zlewał — cztery identyczne etykiety w tym samym
 * miejscu. Tytuł w normalnym stopniu pisma czyta się jak nazwę listy,
 * a kreska w `--hair-strong` daje blokowi górną krawędź bez karty.
 */
export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="border-hair-strong flex items-baseline justify-between gap-4 border-b pb-2.5">
      <h2 className="text-ink text-[13px] font-semibold">{title}</h2>
      {action}
    </header>
  );
}
