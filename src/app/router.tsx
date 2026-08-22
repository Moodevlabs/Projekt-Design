import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { routes } from '@/app/routes';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { QuotesListPage } from '@/features/quotes/list/QuotesListPage';
import { QuoteEditorPage } from '@/features/quotes/editor/QuoteEditorPage';
import { ClientsPage } from '@/features/clients/ClientsPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { BrandSettingsPage } from '@/features/brand/BrandSettingsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SubscriptionPage } from '@/features/billing/SubscriptionPage';
import { pl } from '@/i18n/pl';

/** `handle.title` trafia do Topbara (patrz AppShell). */
const router = createBrowserRouter([
  {
    path: routes.dashboard,
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <DashboardPage />, handle: { title: pl.dashboard.title } },
      { path: 'wyceny', element: <QuotesListPage />, handle: { title: pl.quotes.title } },
      { path: 'wyceny/nowa', element: <QuoteEditorPage />, handle: { title: pl.quotes.new } },
      { path: 'wyceny/:id', element: <QuoteEditorPage />, handle: { title: pl.quotes.title } },
      { path: 'klienci', element: <ClientsPage />, handle: { title: pl.nav.clients } },
      { path: 'biblioteka', element: <LibraryPage />, handle: { title: pl.library.title } },
      { path: 'szablony', element: <TemplatesPage />, handle: { title: pl.templates.title } },
      { path: 'branding', element: <BrandSettingsPage />, handle: { title: pl.brand.title } },
      { path: 'ustawienia', element: <SettingsPage />, handle: { title: pl.settings.title } },
      { path: 'subskrypcja', element: <SubscriptionPage />, handle: { title: pl.billing.title } },
      { path: '*', element: <NotFoundPage />, handle: { title: pl.errors.notFound } },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
