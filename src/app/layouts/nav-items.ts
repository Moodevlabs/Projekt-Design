import {
  LayoutDashboard,
  FileText,
  Users,
  Library,
  LayoutTemplate,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  disabled?: boolean;
}

/** Wysokość wiersza i odstęp — „kulka" liczy z tego swoją pozycję. */
export const NAV_ROW_HEIGHT = 46;
export const NAV_ROW_GAP = 6;
export const NAV_ROW_STEP = NAV_ROW_HEIGHT + NAV_ROW_GAP;

/*
 * Kolejnosc z 05-UI §2: **Pulpit · Klienci · Wyceny · Biblioteka · Szablony ·
 * Ustawienia**. Klienci PRZED wycenami, bo od T-53 to oni sa osia aplikacji —
 * wycena zyje wewnatrz projektu klienta, a nie obok niego.
 *
 * Brandingu tu nie ma: wszedl do Ustawien jako pierwsza sekcja (T-58).
 * Trasa `/branding` dalej dziala jako alias, zeby nie lamac zapisanych linkow.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: routes.dashboard, label: pl.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: routes.clients, label: pl.nav.clients, icon: Users },
  { to: routes.quotes, label: pl.nav.quotes, icon: FileText },
  { to: routes.library, label: pl.nav.library, icon: Library },
  { to: routes.templates, label: pl.nav.templates, icon: LayoutTemplate },
  { to: routes.settings, label: pl.nav.settings, icon: Settings },
];

/** Indeks aktywnej pozycji dla danej ścieżki; `-1`, gdy żadna nie pasuje. */
export function activeNavIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
