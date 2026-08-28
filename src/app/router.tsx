import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from '@/app/RootLayout';
import { AppShell } from '@/app/layouts/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { routes } from '@/app/routes';
import { AuthGate } from '@/features/auth/AuthGate';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { NewPasswordPage } from '@/features/auth/NewPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { QuotesListPage } from '@/features/quotes/list/QuotesListPage';
import { QuoteEditorPage } from '@/features/quotes/editor/QuoteEditorPage';
import { ClientsPage } from '@/features/clients/ClientsPage';
import { ClientPage } from '@/features/clients/ClientPage';
import { ProjectPage } from '@/features/projects/ProjectPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { LibraryItemPage } from '@/features/library/items/LibraryItemPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { BrandSettingsPage } from '@/features/brand/BrandSettingsPage';
import { SettingsAppPage } from '@/features/settings/SettingsAppPage';
import { SettingsAccountPage } from '@/features/settings/SettingsAccountPage';
import { BriefTemplatesPage } from '@/features/brief/templates/BriefTemplatesPage';
import { TrashPage } from '@/features/files/TrashPage';
import { SettingsLayout } from '@/features/settings/SettingsLayout';
import { SubscriptionPage } from '@/features/billing/SubscriptionPage';
import { HelpPage } from '@/features/help/HelpPage';
import { pl } from '@/i18n/pl';

/** `handle.title` trafia do Topbara (patrz AppShell). */
const routeTree = [
  {
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: routes.login, element: <LoginPage /> },
      { path: routes.register, element: <RegisterPage /> },
      { path: routes.resetPassword, element: <ResetPasswordPage /> },
      { path: routes.newPassword, element: <NewPasswordPage /> },
      {
        element: <AuthGate />,
        children: [
          {
            path: routes.dashboard,
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage />, handle: { title: pl.dashboard.title } },
              {
                path: 'kalendarz',
                element: <CalendarPage />,
                handle: { title: pl.calendar.title },
              },
              {
                path: 'dokumenty',
                element: <QuotesListPage />,
                handle: { title: pl.quotes.title },
              },
              // Stary adres rejestru sprzed T-100 — zapisane linki maja dalej dzialac.
              { path: 'wyceny', element: <Navigate to={routes.quotes} replace /> },
              {
                path: 'wyceny/nowa',
                element: <QuoteEditorPage />,
                handle: { title: pl.quotes.new, hideTopbar: true },
              },
              {
                path: 'wyceny/:id',
                element: <QuoteEditorPage />,
                handle: { title: pl.quotes.title, hideTopbar: true },
              },
              { path: 'klienci', element: <ClientsPage />, handle: { title: pl.nav.clients } },
              {
                path: 'klienci/:id',
                element: <ClientPage />,
                handle: { title: pl.nav.clients },
              },
              {
                path: 'klienci/:id/projekty/:projectId',
                element: <ProjectPage />,
                handle: { title: pl.projects.title },
              },
              { path: 'biblioteka', element: <LibraryPage />, handle: { title: pl.library.title } },
              {
                /*
                 * Pełnoekranowy edytor usługi (T-61). `/nowa` stoi PRZED
                 * `/:id`, inaczej „nowa" wpadłoby jako identyfikator usługi
                 * i strona szukałaby wpisu o tym id.
                 */
                path: 'biblioteka/uslugi/nowa',
                element: <LibraryItemPage />,
                handle: { title: pl.library.title },
              },
              {
                path: 'biblioteka/uslugi/:id',
                element: <LibraryItemPage />,
                handle: { title: pl.library.title },
              },
              {
                path: 'szablony',
                element: <TemplatesPage />,
                handle: { title: pl.templates.title },
              },
              {
                path: 'szablony/:templateId',
                element: <QuoteEditorPage />,
                handle: { title: pl.templates.title, hideTopbar: true },
              },
              {
                /*
                 * Alias sprzed T-58: Branding byl osobna pozycja sidebara.
                 * Zostaje, zeby zapisane linki i stare testy dalej dzialaly.
                 */
                path: 'branding',
                element: <SettingsLayout />,
                handle: { title: pl.settings.title },
                children: [{ index: true, element: <BrandSettingsPage /> }],
              },
              {
                path: 'ustawienia',
                element: <SettingsLayout />,
                handle: { title: pl.settings.title },
                children: [
                  { index: true, element: <SettingsAppPage /> },
                  { path: 'branding', element: <BrandSettingsPage /> },
                  { path: 'brief', element: <BriefTemplatesPage /> },
                  { path: 'konto', element: <SettingsAccountPage /> },
                ],
              },
              { path: 'kosz', element: <TrashPage />, handle: { title: pl.files.trashPageTitle } },
              { path: 'pomoc', element: <HelpPage />, handle: { title: pl.nav.help } },
              {
                path: 'subskrypcja',
                element: <SubscriptionPage />,
                handle: { title: pl.billing.title },
              },
              { path: '*', element: <NotFoundPage />, handle: { title: pl.errors.notFound } },
            ],
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routeTree);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
