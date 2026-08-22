import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LibraryPage } from '@/features/library/LibraryPage';
import { pl } from '@/i18n/pl';

/**
 * Biblioteka otwierana **z wnętrza edytora**.
 *
 * To nie jest wygoda, tylko warunek działania kaskady. Przejście na stronę
 * `/biblioteka` odmontowuje edytor, a ten przy odmontowaniu czyści wycenę ze
 * store'u i wyłącza autozapis — czyli nie ma już „otwartej wyceny", do której
 * cokolwiek mogłoby skaskadować. W prototypie biblioteka też była modalem nad
 * wyceną i to jest właśnie ten powód.
 *
 * Strona biblioteki jest samodzielna, więc używamy jej tu bez zmian.
 */
export function LibrarySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{pl.library.title}</SheetTitle>
          <SheetDescription>{pl.library.sheetHint}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          <LibraryPage />
        </div>
      </SheetContent>
    </Sheet>
  );
}
