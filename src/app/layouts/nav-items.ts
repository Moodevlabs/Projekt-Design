import {
  LayoutDashboard,
  FileText,
  Users,
  Library,
  LayoutTemplate,
  Palette,
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

export const NAV_ITEMS: NavItem[] = [
  { to: routes.dashboard, label: pl.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: routes.quotes, label: pl.nav.quotes, icon: FileText },
  { to: routes.clients, label: pl.nav.clients, icon: Users, disabled: true },
  { to: routes.library, label: pl.nav.library, icon: Library },
  { to: routes.templates, label: pl.nav.templates, icon: LayoutTemplate },
  { to: routes.brand, label: pl.nav.brand, icon: Palette },
  { to: routes.settings, label: pl.nav.settings, icon: Settings },
];

/** Indeks aktywnej pozycji dla danej ścieżki; `-1`, gdy żadna nie pasuje. */
export function activeNavIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
