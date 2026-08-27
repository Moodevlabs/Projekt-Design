import { Outlet, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { WorkspaceGuard } from './WorkspaceGuard';
import { OfflineBanner } from '@/features/offline/OfflineBanner';
import { TrialDialog } from '@/features/billing/TrialDialog';
import { pl } from '@/i18n/pl';

type RouteHandle = { title?: string; hideTopbar?: boolean };

function useRouteHandle(): RouteHandle {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as RouteHandle | undefined;
    if (handle) return handle;
  }
  return {};
}

export function AppShell() {
  const handle = useRouteHandle();

  // Edytor wyceny ma własny pasek (numer, status, wskaźnik zapisu, tryb),
  // więc standardowy topbar aplikacji tylko by go dublował.
  if (handle.hideTopbar) {
    return (
      <div className="relative flex h-full min-h-0">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <OfflineBanner />
          <WorkspaceGuard>
            <Outlet />
          </WorkspaceGuard>
        </main>
        <TrialDialog />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0">
      <Sidebar />
      {/* Pas jest nieprzezroczysty (T-76), więc treść chowa się pod nim
          całkowicie — a nie prześwituje przez rozmycie jak wcześniej. */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar title={handle.title ?? pl.app.name} />
        {/* Pod pasem, nad trescia — jak ReadOnlyBanner w edytorze. */}
        <OfflineBanner />
        <main className="mx-auto w-full max-w-[1320px] px-7 pt-6 pb-12">
          <WorkspaceGuard>
            <Outlet />
          </WorkspaceGuard>
        </main>
      </div>

      {/*
        Okres próbny zgłasza się raz dziennie, oknem — a nie kartą stojącą
        na pulpicie na stałe (poprawka 6). Wisi w powłoce, nie na pulpicie:
        aplikację otwiera się czasem prosto w wycenie.
      */}
      <TrialDialog />
    </div>
  );
}
