import { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Jeden wiersz do wyboru. Trzy pola wystarczają na wszystkie cztery miejsca,
 * w których ten picker stoi: co to jest, co o tym wiadomo, i jedna liczba
 * albo etykieta z prawej (cena, obecna grupa, liczba wpisów).
 */
export interface LibraryPickerRow {
  id: string;
  title: string;
  subtitle?: string;
  /** Prawa kolumna — cena, „obecnie: Projekt", cokolwiek jednolinijkowego. */
  meta?: string;
}

export interface LibraryPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  rows: LibraryPickerRow[];
  /** Komunikat, gdy nie ma z czego wybierać w ogóle. */
  emptyLabel: string;
  /** Komunikat, gdy szukanie nic nie znalazło. */
  noMatchLabel: string;
  /** Etykieta przycisku dodania — dostaje nazwę wiersza (czytnik ekranu). */
  addLabel: (title: string) => string;
  onAdd: (id: string) => void;
}

/**
 * Wybór z biblioteki — **panel z prawej, nie popover** (T-123).
 *
 * Do tej pory były w aplikacji dwa różne pickery. Duży, tabelaryczny
 * (`ScopePanel` / `DocLibraryPanel`) obsługiwał wstawianie do dokumentu,
 * a cztery małe popovery na 280–320 px — składanie grup i zestawów
 * w bibliotece. Ten sam gest („wybierz coś z biblioteki") wyglądał więc
 * inaczej w zależności od tego, gdzie się stało, a wąski popover musiał
 * upychać nazwę, opis i cenę jedno pod drugim.
 *
 * Zasady te same co w „Dodaj usługi": kliknięcie dodaje **od razu**, panel
 * zostaje otwarty (bo prawie nigdy nie dodaje się jednej rzeczy), licznik
 * pokazuje, co już weszło, a jedynym wyjściem jest „Gotowe".
 *
 * Świadomie BEZ kolumn `ScopeRow` (grupa · sposób wyceny · stawka): tam
 * wybiera się usługę do wyceny i te cztery pytania są na miejscu. Tutaj
 * składa się zestaw albo przypina wpis do grupy — wystarczy nazwa,
 * doprecyzowanie i jedna liczba.
 */
export function LibraryPickerSheet({
  open,
  onOpenChange,
  title,
  description,
  rows,
  emptyLabel,
  noMatchLabel,
  addLabel,
  onAdd,
}: LibraryPickerSheetProps) {
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<Record<string, number>>({});

  const visible = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    if (!phrase) return rows;
    return rows.filter((row) =>
      `${row.title} ${row.subtitle ?? ''} ${row.meta ?? ''}`.toLowerCase().includes(phrase),
    );
  }, [rows, search]);

  const finish = () => {
    onOpenChange(false);
    setAdded({});
    setSearch('');
  };

  const add = (id: string) => {
    onAdd(id);
    setAdded((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const addedTotal = Object.values(added).reduce((sum, count) => sum + count, 0);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : finish())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-hair border-b px-6 pt-6 pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="border-hair flex items-center gap-2 border-b px-6 py-3">
          <div className="relative flex-1">
            <Search
              className="text-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={pl.library.picker.search}
              aria-label={pl.library.picker.search}
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <span className="text-ink-soft tabular shrink-0 text-xs">
            {pl.library.picker.count(visible.length)}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {rows.length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">{emptyLabel}</p>
          ) : visible.length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">{noMatchLabel}</p>
          ) : (
            <ul>
              {visible.map((row) => {
                const count = added[row.id] ?? 0;
                return (
                  <li
                    key={row.id}
                    data-testid="library-picker-row"
                    className={cn(
                      'border-hair flex items-center gap-3 border-b px-3 py-2.5 transition-colors',
                      count > 0 ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-ink truncate text-sm font-medium">{row.title}</div>
                      {row.subtitle ? (
                        <div className="text-ink-soft truncate text-xs">{row.subtitle}</div>
                      ) : null}
                    </div>

                    {row.meta ? (
                      <span className="text-ink-soft tabular shrink-0 text-xs">{row.meta}</span>
                    ) : null}

                    {count > 0 ? (
                      <span className="text-ink-soft flex shrink-0 items-center gap-0.5 text-[11px]">
                        <Check className="size-3" aria-hidden />
                        {count > 1 ? `×${count}` : null}
                      </span>
                    ) : null}

                    <Button
                      type="button"
                      size="sm"
                      variant={count > 0 ? 'outline' : 'default'}
                      className="h-7 px-2.5"
                      aria-label={addLabel(row.title)}
                      onClick={() => add(row.id)}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {pl.common.add}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-hair flex items-center justify-between gap-3 border-t px-6 py-3">
          <span className="text-ink-soft text-xs">
            {addedTotal > 0 ? pl.library.picker.addedTotal(addedTotal) : null}
          </span>
          <Button type="button" onClick={finish}>
            {pl.library.picker.done}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
