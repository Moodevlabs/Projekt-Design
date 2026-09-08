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
    <nav
      aria-labelledby="onboarding-title"
      className="border-hair bg-surface flex flex-col overflow-hidden rounded-[var(--radius-control)] border sm:flex-row"
    >
      {/* Pasek, nie karta (T-133): trzy kroki w jednym rzędzie z tytułem
          po lewej. Na pulpicie z treścią checklista jest przypomnieniem,
          a nie blokiem, który konkuruje z pracą. */}
      <div className="border-hair flex items-center gap-3 border-b px-4 py-2.5 sm:border-r sm:border-b-0">
        <h2 id="onboarding-title" className="text-ink text-[13px] font-semibold whitespace-nowrap">
          {pl.onboarding.title}
        </h2>
        <span className="text-ink-soft text-xs tabular-nums">
          {pl.onboarding.progress(zrobione, steps.length)}
        </span>
      </div>

      <ol className="flex flex-1 flex-col sm:flex-row">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="border-hair flex-1 border-b last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <Link
              to={step.to}
              className={cn(
                'hover:bg-surface-2 flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors',
                step.done ? 'text-ink-soft' : 'text-ink',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  // `--primary`, nie `--doc-sage`: to jest pasek PULPITU, a paleta
                  // `--doc-*` należy do kartki wyceny i jest nadpisywana brand
                  // kitem klienta.
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : 'border-hair-strong text-ink-soft border',
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-3" /> : index + 1}
              </span>
              <span className="min-w-0 truncate">{pl.onboarding.steps[step.key].title}</span>
              {step.done ? (
                <span className="text-ink-faint ml-auto text-xs">{pl.onboarding.done}</span>
              ) : (
                <ArrowRight className="text-ink-faint ml-auto size-3.5 shrink-0" aria-hidden />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
