import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { env } from '@/lib/env';
import { pl } from '@/i18n/pl';

/**
 * Zatrzymuje aplikację, gdy nie da się wczytać workspace'u.
 *
 * Bez tego awaria była **niema**: hooki danych mają `enabled: Boolean(workspaceId)`,
 * więc przy braku workspace'u po prostu się nie uruchamiały, a każdy ekran
 * renderował swój stan pusty. Użytkownik widział „nie ma danych" zamiast
 * „nie udało się ich pobrać" — i nie miał jak zgadnąć, że aplikacja wskazuje
 * na pustą bazę albo na inny projekt.
 */
export function WorkspaceGuard({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();

  if (!workspace.isError) return <>{children}</>;

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <Alert variant="destructive" className="max-w-xl">
        <AlertTriangle className="size-4" aria-hidden />
        <AlertTitle>{pl.errors.workspaceTitle}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{pl.errors.workspaceHint}</p>
          <p className="text-xs opacity-80">{pl.errors.connectedTo(env.supabaseUrl)}</p>
          <p className="text-xs opacity-80">{workspace.error.message}</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
