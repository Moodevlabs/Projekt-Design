import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <header className="glass sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-4 px-7">
      <h1 className="font-display text-ink truncate text-[19px] font-semibold tracking-[-0.01em]">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          disabled
          aria-label={`${pl.common.search} (${pl.common.soon})`}
          className="text-ink-soft flex h-9 w-64 cursor-not-allowed items-center gap-2 rounded-[var(--radius-pill)] border border-white/60 bg-white/45 px-3.5 text-sm"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span>{pl.common.search}</span>
          <kbd className="text-ink-soft/70 ml-auto rounded-md border border-white/70 bg-white/60 px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>

        <Button
          onClick={() => void navigate(routes.quoteNew)}
          className="h-9 rounded-[var(--radius-pill)] px-4 shadow-[0_4px_14px_-4px_rgba(20,22,28,0.5)]"
        >
          <Plus className="size-4" aria-hidden />
          {pl.quotes.new}
        </Button>
      </div>
    </header>
  );
}
