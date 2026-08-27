import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/features/search/CommandPalette';
import { NewQuoteDialog } from '@/features/quotes/list/NewQuoteDialog';
import { pl } from '@/i18n/pl';

export function Topbar({ title }: { title: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);

  /*
   * `⌘/Ctrl+K` otwiera paletę (05-UI §5).
   *
   * Przechwytujemy na `window`, a nie na przycisku: skrót ma działać
   * z dowolnego miejsca strony, a nie tylko wtedy, gdy fokus stoi akurat
   * na wyszukiwarce.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="surface-band sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-4 px-7">
      {/*
        Tytuł strony wersalikami w kroju display — jedyne miejsce w powłoce,
        gdzie Faculty Glyphic stoi w większym stopniu (makieta: „PULPIT").
        Światło międzyliterowe DODATNIE: wersaliki bez rozstrzelenia zbijają
        się w blok, a krój glificzny potrzebuje powietrza między szeryfami.
      */}
      <h1 className="font-display text-ink truncate text-[19px] tracking-[0.06em] uppercase">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label={pl.search.open}
          className="text-ink-soft hover:text-ink border-hair-strong bg-surface flex h-9 w-64 items-center gap-2 rounded-[var(--radius-control)] border px-3.5 text-sm transition-colors"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span>{pl.common.search}</span>
          <kbd className="text-ink-faint border-hair bg-surface-2 ml-auto rounded-[4px] border px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/*
          „Nowa wycena" pyta o klienta i projekt (koncepcja §2 K3), zamiast
          zakładać dokument bez przypisania. Bez klienta też można — ale to
          teraz decyzja, a nie domyślny efekt kliknięcia.
        */}
        <Button variant="frame" onClick={() => setNewQuoteOpen(true)} className="h-9 gap-2.5 px-4">
          <Plus className="size-4" aria-hidden />
          {pl.quotes.new}
        </Button>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NewQuoteDialog open={newQuoteOpen} onOpenChange={setNewQuoteOpen} />
    </header>
  );
}
