import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { useEntitlement } from '@/features/billing/useEntitlement';
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection';
import { AccountSection } from './AccountSection';
import { StorageUsageSection } from '@/features/files/StorageUsageSection';
import { TrashSection } from '@/features/files/TrashSection';
import { SampleLibrarySection } from './SampleLibrarySection';
import { UpdateSection } from './UpdateSection';
import { pl } from '@/i18n/pl';

/**
 * Ustawienia workspace'u i konta.
 *
 * Ustawienia dokumentu są zablokowane bez aktywnego dostępu (to zapis), ale
 * **eksport danych i zmiana hasła zostają dostępne zawsze** — jedno jest
 * odczytem własnej pracy, drugie sprawą bezpieczeństwa konta. Odcinanie ich
 * za brak płatności byłoby trzymaniem człowieka za gardło.
 */
export function SettingsPage() {
  const workspace = useWorkspace();
  const canWrite = useEntitlement().canWrite;

  if (workspace.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        <Skeleton className="h-48 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (workspace.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{workspace.error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-16">
      {!canWrite ? (
        <Alert>
          <AlertDescription>{pl.settings.readOnly}</AlertDescription>
        </Alert>
      ) : null}

      <WorkspaceSettingsSection canWrite={canWrite} />
      {/* Typy pomieszczen mieszkaja w Bibliotece → Pomieszczenia (T-73) —
          jedno miejsce do personalizacji, nie dwa. */}
      <SampleLibrarySection />
      <StorageUsageSection />
      {/* Kosz tuż pod paskiem zużycia: pliki w koszu NADAL zajmują limit,
          więc odpowiedź na „czemu pasek nie drgnął" ma być w zasięgu wzroku. */}
      <TrashSection />
      <UpdateSection />
      <AccountSection />
    </div>
  );
}
