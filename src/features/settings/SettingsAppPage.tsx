import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { useEntitlement } from '@/features/billing/useEntitlement';
import { StorageUsageSection } from '@/features/files/StorageUsageSection';
import { pl } from '@/i18n/pl';

import { SampleLibrarySection } from './SampleLibrarySection';
import { UpdateSection } from './UpdateSection';
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection';

/**
 * Ustawienia → Aplikacja.
 *
 * To, co dotyczy **narzędzia i dokumentów**, a nie osoby: domyślne wartości
 * nowych wycen, biblioteka przykładowa, miejsce na pliki, aktualizacje.
 *
 * Kosza tu nie ma (2026-08-27) — dostał własny ekran w szynie. Kosz to nie
 * ustawienie, tylko miejsce, w którym leżą czyjeś pliki; sekcja znikająca,
 * gdy jest pusty, znaczyła, że człowiek szukający skasowanego pliku nie miał
 * gdzie zajrzeć.
 */
export function SettingsAppPage() {
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
      <p className="text-ink-soft text-sm">{pl.settings.appIntro}</p>

      {/*
        Ostrzeżenie o trybie tylko do odczytu stoi WYŁĄCZNIE tutaj.
        Na karcie „Konto" byłoby mylące: eksport danych i zmiana hasła
        działają zawsze, także po wygaśnięciu dostępu (patrz AccountSection).
      */}
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
      <UpdateSection />
    </div>
  );
}
