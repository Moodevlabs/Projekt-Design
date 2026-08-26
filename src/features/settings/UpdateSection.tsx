import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageSection } from '@/components/shared';
import { pl } from '@/i18n/pl';

import { relaunchApp, useAppUpdate } from './useAppUpdate';

/**
 * „Aktualizacje" w Ustawieniach (T-19).
 *
 * Sekcja **znika w przeglądarce** (`pnpm dev`): tam nie ma czego aktualizować,
 * a przycisk, który zawsze kończy się błędem, jest gorszy niż jego brak.
 */
export function UpdateSection() {
  const { state, check, install, supported } = useAppUpdate();

  if (!supported) return null;

  return (
    <PageSection title={pl.update.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink-soft text-sm">{describe(state)}</p>
          {state.kind === 'available' && state.notes ? (
            <p className="text-ink-faint mt-1 text-xs whitespace-pre-line">{state.notes}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {state.kind === 'available' || state.kind === 'downloading' ? (
            <Button onClick={() => void install()} disabled={state.kind === 'downloading'}>
              <Download className="size-4" aria-hidden />
              {state.kind === 'downloading' ? pl.update.downloading : pl.update.install}
            </Button>
          ) : null}

          {state.kind === 'ready' ? (
            <Button
              onClick={() => {
                void relaunchApp().catch(() => toast.error(pl.update.relaunchFailed));
              }}
            >
              {pl.update.relaunch}
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => void check()}
            disabled={state.kind === 'checking' || state.kind === 'downloading'}
          >
            <RefreshCw className="size-4" aria-hidden />
            {pl.update.check}
          </Button>
        </div>
      </div>
    </PageSection>
  );
}

function describe(state: ReturnType<typeof useAppUpdate>['state']): string {
  switch (state.kind) {
    case 'idle':
      return pl.update.idle;
    case 'checking':
      return pl.update.checking;
    case 'current':
      return pl.update.current;
    case 'available':
      return pl.update.available(state.version);
    case 'downloading':
      return state.percent === null
        ? pl.update.downloading
        : pl.update.downloadingPercent(state.percent);
    case 'ready':
      return pl.update.ready;
    case 'error':
      return state.message;
  }
}
