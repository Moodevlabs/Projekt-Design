import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { pl } from '@/i18n/pl';

/** Szkielety kart na czas pierwszego wczytania — układ nie skacze po danych. */
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card-surface flex flex-col gap-3 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {pl.library.loadError}{' '}
        <button type="button" onClick={onRetry} className="underline underline-offset-4">
          {pl.common.retry}
        </button>
      </AlertDescription>
    </Alert>
  );
}
