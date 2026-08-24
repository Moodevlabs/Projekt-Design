import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  key: 'brand' | 'library' | 'quote';
  done: boolean;
  to: string;
}

/**
 * Trzy kroki pierwszego uruchomienia (T-17): logo → biblioteka → wycena.
 *
 * To jest **kolejność, w której te rzeczy się opłacają**, a nie lista życzeń:
 * logo trafia do każdego PDF-a, więc wgrane raz oszczędza poprawianie ofert
 * później; biblioteka sprawia, że pierwsza wycena składa się z klikania,
 * a nie z przepisywania; wycena jest celem.
 *
 * Lista **znika, gdy wszystkie kroki są zrobione** — i nie da się jej odhaczyć
 * ręcznie. Checklist, który zostaje po wykonaniu, zamienia się w ozdobę,
 * a odhaczenie kroku, którego się nie zrobiło, tylko okłamuje właściciela.
 */
export function OnboardingChecklist({ hasQuotes }: { hasQuotes: boolean }) {
  const brandKit = useBrandKit();
  const library = useAllLibraryItems();

  // Dopoki nie wiemy, co jest zrobione, NIE pokazujemy nic. Lista, ktora
  // najpierw mowi „nie masz logo", a chwile pozniej sie rozmysla, jest
  // gorsza niz lista pojawiajaca sie sekunde pozniej.
  if (!brandKit.isSuccess || !library.isSuccess) return null;

  const kit = brandKit.data;
  const steps: OnboardingStep[] = [
    {
      key: 'brand',
      done: Boolean(kit?.logoLightPath ?? kit?.logoDarkPath),
      to: routes.brand,
    },
    {
      key: 'library',
      /*
       * Liczą się pozycje BEZ flagi „Przykładowa" (§9.11, rozstrzygnięcie
       * T-62). Od kiedy nowe konto dostaje 38 usług demo, warunek „istnieje
       * jakakolwiek pozycja" byłby odhaczony w chwili rejestracji — a krok ma
       * mówić „masz swoją bibliotekę", nie „dostałeś naszą".
       *
       * Edycja dowolnej usługi przykładowej zdejmuje jej flagę, więc pierwsza
       * poprawiona cena zalicza ten krok — i to jest dokładnie ten moment,
       * w którym biblioteka staje się czyjaś.
       */
      done: (library.data ?? []).some((item) => !item.isSample),
      to: routes.library,
    },
    { key: 'quote', done: hasQuotes, to: routes.quoteNew },
  ];

  if (steps.every((step) => step.done)) return null;

  const zrobione = steps.filter((step) => step.done).length;

  return (
    <section className="card-surface mb-6 px-7 py-6" aria-labelledby="onboarding-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="onboarding-title" className="text-ink text-base font-semibold tracking-tight">
          {pl.onboarding.title}
        </h2>
        <span className="text-ink-soft text-xs tabular-nums">
          {pl.onboarding.progress(zrobione, steps.length)}
        </span>
      </div>
      <p className="text-ink-soft mt-1 text-sm">{pl.onboarding.lead}</p>

      <ol className="mt-5 flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className={cn(
                'border-hair group flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                step.done ? 'opacity-60' : 'hover:border-[var(--doc-sage)]',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  step.done
                    ? 'bg-[var(--doc-sage)] text-white'
                    : 'border-hair text-ink-soft border',
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-3" /> : steps.indexOf(step) + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="text-ink block text-sm font-medium">
                  {pl.onboarding.steps[step.key].title}
                </span>
                <span className="text-ink-soft block text-xs">
                  {pl.onboarding.steps[step.key].hint}
                </span>
              </span>

              {step.done ? (
                <span className="text-ink-soft text-xs">{pl.onboarding.done}</span>
              ) : (
                <ArrowRight
                  className="text-ink-soft size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
