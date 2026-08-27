import { NavLink, Outlet } from 'react-router-dom';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Ustawienia — trzy karty (05-UI §3, przeprojektowane 2026-08-27).
 *
 * ## Co było nie tak
 *
 * Do 2026-08-27 „Ustawienia" były jedną kolumną, w której jedno pod drugim
 * stały: domyślne wartości wycen, biblioteka przykładowa, miejsce na pliki,
 * **kosz**, aktualizacje, hasło, eksport danych i kasowanie konta. Żeby
 * cokolwiek znaleźć, trzeba było przewinąć wszystko — a „zmień hasło"
 * i „ustaw stawkę VAT" wyglądały tak samo.
 *
 * ## Podział
 *
 * Trzy pytania, trzy karty:
 *  - **Aplikacja** — jak zachowuje się narzędzie i nowe dokumenty;
 *  - **Branding** — jak wygląda to, co widzi inwestor;
 *  - **Konto** — kim jestem i co mogę zrobić ze swoim dostępem.
 *
 * Kosz wyszedł stąd całkiem: dostał własny ekran w szynie, bo nie jest
 * ustawieniem, tylko miejscem z czyimiś plikami.
 *
 * Sekcje są osobnymi TRASAMI, a nie zakładkami w stanie komponentu: branding
 * to pełnoekranowy formularz z podglądem PDF-a i wciśnięcie go w kolumnę
 * `max-w-2xl` reszty ustawień zjadłoby ten podgląd. Przy okazji każda karta
 * ma własny adres, więc da się do niej wysłać link.
 *
 * `/ustawienia` zostaje **Aplikacją**, a nie Kontem: to jest odpowiedź na
 * pytanie, które ludzie zadają, klikając „Ustawienia".
 */
const SECTIONS = [
  { to: routes.settings, label: pl.settings.tabApp, end: true },
  { to: routes.settingsBranding, label: pl.nav.brand },
  // Brief (T-96) — treść formularza, który dostaje inwestor. Stoi obok
  // Brandingu, bo jedno i drugie odpowiada na pytanie „co widzi klient”.
  { to: routes.settingsBrief, label: pl.briefTemplates.tab },
  { to: routes.settingsAccount, label: pl.settings.tabAccount },
] as const;

export function SettingsLayout() {
  return (
    <div className="space-y-5">
      <nav
        aria-label={pl.settings.title}
        className="border-hair flex flex-wrap items-center gap-1 border-b"
      >
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={'end' in section ? section.end : false}
            className={({ isActive }) =>
              cn(
                'relative -mb-px px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'text-ink border-primary border-b-2 font-semibold'
                  : 'text-ink-soft hover:text-ink border-b-2 border-transparent',
              )
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
