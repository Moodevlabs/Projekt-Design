import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared';
import { useCountUp } from './useCountUp';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Pusty pulpit = zaproszenie: tytuł, jedno zdanie o sednie produktu
 * i miniaturowa wycena-demo. Demo jest BIAŁĄ kartą (dokument), na szkle
 * chromu — a jego suma osiada raz, pokazując podpis produktu bez słów.
 */
export function DashboardEmptyState() {
  return (
    <section className="card-surface flex flex-col items-center px-8 py-14 text-center">
      <h2 className="text-ink text-2xl font-semibold tracking-tight">{pl.dashboard.emptyTitle}</h2>
      <p className="text-ink-soft mt-3 max-w-md text-sm leading-relaxed">
        {pl.dashboard.emptyLead}
      </p>

      <DemoQuote />

      <Button size="lg" className="mt-8" asChild>
        <Link to={routes.quoteNew}>
          <Plus className="size-4" aria-hidden />
          {pl.quotes.new}
        </Link>
      </Button>
    </section>
  );
}

/** Suma pozycji z włączonym TAK: 3 200 zł + 1 800 zł. */
const DEMO_TOTAL_CENTS = 500_000;

function DemoQuote() {
  const total = useCountUp(DEMO_TOTAL_CENTS);

  return (
    <div
      aria-hidden
      className="card-surface mt-8 w-full max-w-sm p-5 text-left"
    >
      <DemoRow name={pl.dashboard.demoItemConcept} cents={320_000} on />
      <DemoRow name={pl.dashboard.demoItemViz} cents={180_000} on />
      <DemoRow name={pl.dashboard.demoItemSupervision} cents={90_000} on={false} />
      <div className="mt-3 flex items-baseline justify-between border-t border-[rgba(20,22,28,0.18)] pt-3">
        <span className="text-ink-soft text-xs">{pl.dashboard.demoTotal}</span>
        <Money
          cents={Math.round(total)}
          className="text-ink text-lg font-semibold tracking-tight"
        />
      </div>
    </div>
  );
}

function DemoRow({ name, cents, on }: { name: string; cents: number; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {/* Wyłączona pozycja tylko blednie — NIE jest przekreślana. Tak samo
          zachowuje się prawdziwy edytor (jest na to test w ItemRow), a demo
          nie może uczyć innego języka niż sam produkt. */}
      <span className={on ? 'text-ink text-sm' : 'text-ink-soft text-sm'}>{name}</span>
      <span className="flex items-center gap-3">
        <span
          className={
            on
              ? 'bg-cta text-cta-fg rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-semibold tracking-wide'
              : 'border-hair text-ink-soft rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-semibold tracking-wide'
          }
        >
          {on ? pl.dashboard.demoYes : pl.dashboard.demoNo}
        </span>
        <Money
          cents={cents}
          className={on ? 'text-ink text-sm' : 'text-ink-soft/60 text-sm'}
        />
      </span>
    </div>
  );
}
