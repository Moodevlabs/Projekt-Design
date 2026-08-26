import { NavLink, Outlet } from 'react-router-dom';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Ustawienia z sekcjami (05-UI §3, T-58).
 *
 * Branding wszedł tu jako **pierwsza sekcja** i zniknął z sidebara: to nie
 * jest osobny obszar pracy, tylko konfiguracja, do której wraca się raz na
 * kilka miesięcy. Trasa `/branding` została jako alias — zapisane linki
 * i testy sprzed T-58 mają dalej działać.
 *
 * Sekcje są osobnymi TRASAMI, a nie zakładkami w stanie komponentu: branding
 * to pełnoekranowy formularz z podglądem PDF-a i wciśnięcie go w kolumnę
 * `max-w-2xl` reszty ustawień zjadłoby ten podgląd.
 */
const SECTIONS = [
  { to: routes.settingsBranding, label: pl.nav.brand },
  { to: routes.settings, label: pl.settings.general, end: true },
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
