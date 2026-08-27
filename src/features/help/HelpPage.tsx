import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  History,
  Keyboard,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  Ruler,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { helpPl, type HelpSection } from '@/i18n/help.pl';
import { HelpBlockView } from './HelpBlocks';
import { cn } from '@/lib/utils';

/*
 * Te same ikony, ktore uzytkownik widzi w aplikacji: pasek boczny (Pulpit,
 * Klienci, Wyceny, Biblioteka, Szablony, Ustawienia), Subskrypcja, „Dodaj
 * pliki", eksport, zegar pracochlonnosci. Poradnik ma byc mapa do ekranow,
 * a nie osobnym zestawem piktogramow do nauczenia.
 */
const ICONS: Record<HelpSection['icon'], LucideIcon> = {
  start: LayoutDashboard,
  clients: Users,
  // Brief i wizja lokalna (poprawki 9 i 10).
  brief: ClipboardList,
  visit: Ruler,
  // Kalendarz terminow (T-98) — ta sama ikona co w pasku nawigacji.
  calendar: CalendarDays,
  quote: FileText,
  status: History,
  schedule: Clock,
  documents: FolderOpen,
  pdf: Download,
  library: Library,
  templates: LayoutTemplate,
  files: Upload,
  settings: Settings,
  billing: CreditCard,
  keys: Keyboard,
  faq: CircleHelp,
};

/** Numer sekcji jak na stronie usługi: „01", „02"… */
const number = (index: number) => String(index + 1).padStart(2, '0');

/**
 * Poradnik (T-73) — jedna długa strona ze spisem treści po lewej.
 *
 * Jedna strona, nie zakładki: poradnik czyta się od góry albo skacze
 * kotwicą, a szukanie Ctrl+F ma znajdować wszystko naraz. Spis treści jest
 * przyklejony i podświetla sekcję, która jest akurat na ekranie.
 */
export function HelpPage() {
  const [current, setCurrent] = useState<string>(helpPl.sections[0]?.id ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    for (const section of helpPl.sections) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrent(id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
      {/*
        Spis tresci jest przyklejony. Owijka rozciaga sie na cala wysokosc
        kolumny (domyslne `stretch` gridu) — `sticky` liczy sie wzgledem
        rodzica, wiec przy `items-start` komorka miala wysokosc samego spisu
        i nie bylo w czym sie „kleic".
      */}
      <div className="lg:self-stretch">
        <nav aria-label={helpPl.tocLabel} className="card-surface p-3 lg:sticky lg:top-6">
          <p className="label-caps text-ink-soft px-2 pt-1 pb-2">{helpPl.tocLabel}</p>
          <ol className="flex flex-col gap-0.5">
            {helpPl.sections.map((section, index) => {
              const Icon = ICONS[section.icon];
              const active = current === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={active ? 'location' : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      jump(section.id);
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-[13px] transition-colors',
                      // Ta sama para co aktywna pozycja paska bocznego i pigulki.
                      active
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{section.title}</span>
                    <span
                      className={cn(
                        'tabular ml-auto text-[10.5px]',
                        active ? 'text-primary-foreground/70' : 'text-ink-soft/70',
                      )}
                    >
                      {number(index)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex min-w-0 flex-col gap-5 pb-16">
        <header className="card-surface p-7">
          <p className="label-caps text-ink-soft">{helpPl.eyebrow}</p>
          <h1 className="font-display text-ink mt-2 text-[28px]">{helpPl.heading}</h1>
          <p className="text-ink-soft mt-3 max-w-[640px] text-[14.5px] leading-[1.65]">
            {helpPl.intro}
          </p>

          <p className="label-caps text-ink-soft mt-6">{helpPl.quickTitle}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {helpPl.quick.map((link) => (
              <li key={link.target}>
                <button
                  type="button"
                  onClick={() => jump(link.target)}
                  className="border-hair text-ink hover:bg-primary hover:text-primary-foreground hover:border-primary flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                >
                  {link.label}
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </header>

        {helpPl.sections.map((section, index) => {
          const Icon = ICONS[section.icon];
          return (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="card-surface scroll-mt-6 p-7"
            >
              <div className="flex items-start gap-4">
                <span className="bg-surface-2 text-ink flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="label-caps text-ink-soft tabular">{number(index)}</p>
                  <h2
                    id={`${section.id}-title`}
                    className="font-display text-ink mt-0.5 text-[20px]"
                  >
                    {section.title}
                  </h2>
                  <p className="text-ink-soft mt-1.5 text-[14px] leading-[1.6]">{section.lead}</p>
                </div>
              </div>

              <div className="border-hair mt-5 flex flex-col gap-4 border-t pt-5">
                {section.blocks.map((block, blockIndex) => (
                  <HelpBlockView key={blockIndex} block={block} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-ink-soft px-2 text-[12.5px]">{helpPl.footer}</p>
      </div>
    </div>
  );
}
