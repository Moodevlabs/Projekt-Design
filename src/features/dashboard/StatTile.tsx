import { Skeleton } from '@/components/ui/skeleton';

export function StatTile({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="card-surface p-5">
      <p className="text-ink-soft text-xs font-medium">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="text-ink mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      )}
      {hint ? <p className="text-ink-soft mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
