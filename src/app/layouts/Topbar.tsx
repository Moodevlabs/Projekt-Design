import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <header className="border-hair bg-surface flex h-16 shrink-0 items-center gap-4 border-b px-7">
      <h1 className="text-ink truncate text-lg font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          disabled
          className="border-hair bg-surface-2 text-ink-soft flex h-9 w-56 cursor-not-allowed items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm"
          aria-label={`${pl.common.search} (${pl.common.soon})`}
        >
          <Search className="size-4" aria-hidden />
          <span>{pl.common.search}</span>
          <kbd className="border-hair bg-surface ml-auto rounded border px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>

        <Button
          onClick={() => void navigate(routes.quoteNew)}
          className="rounded-[var(--radius-control)]"
        >
          <Plus className="size-4" aria-hidden />
          {pl.quotes.new}
        </Button>
      </div>
    </header>
  );
}
