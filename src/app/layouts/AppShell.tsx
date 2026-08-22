import { Outlet, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
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
      <div className="bg-canvas flex h-full min-h-0">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-canvas flex h-full min-h-0">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={handle.title ?? pl.app.name} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
