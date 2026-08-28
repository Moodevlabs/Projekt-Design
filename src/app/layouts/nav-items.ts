import {
  CalendarDays,
  LayoutDashboard,
  FileText,
  Users,
  Library,
  LayoutTemplate,
  LifeBuoy,
  Settings,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** `main` = obszary pracy; `system` = pomoc i konfiguracja, oddzielone kreską. */
export type NavGroup = 'main' | 'system';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  end?: boolean;
  disabled?: boolean;
  /** Inne prefiksy sciezek, przy ktorych pozycja ma sie podswietlac (np. edytor dokumentu). */
  aliases?: string[];
}

/** Wysokość wiersza i odstęp — „kulka" liczy z tego swoją pozycję. */
export const NAV_ROW_HEIGHT = 46;
export const NAV_ROW_GAP = 6;
export const NAV_ROW_STEP = NAV_ROW_HEIGHT + NAV_ROW_GAP;

/*
 * Kolejnosc: **Pulpit · Kalendarz · Klienci · Dokumenty · Biblioteka · Szablony**,
 * a pod kreska **Pomoc · Ustawienia**. Klienci PRZED wycenami, bo od T-53 to
 * oni sa osia aplikacji — wycena zyje wewnatrz projektu klienta.
 *
 * Ustawienia sa oddzielone od funkcji (T-73): to nie obszar pracy, tylko
 * konfiguracja, do ktorej wraca sie raz na kilka miesiecy. Pomoc stoi nad
 * nimi — poradnik ma byc pod reka, ale nie udawac kolejnego modulu.
 *
 * Kosz stoi NAD Pomoca (2026-08-27). Byl sekcja Ustawien, ktora znikala,
 * gdy byl pusty — czyli czlowiek szukajacy skasowanego pliku nie mial gdzie
 * zajrzec i nie dowiadywal sie nawet, ze kosz istnieje. Jest pod kreska,
 * a nie wsrod obszarow pracy, bo sie do niego ZAGLADA, a nie w nim pracuje.
 *
 * Brandingu tu nie ma: wszedl do Ustawien jako pierwsza sekcja (T-58).
 * Trasa `/branding` dalej dziala jako alias, zeby nie lamac zapisanych linkow.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: routes.dashboard,
    label: pl.nav.dashboard,
    icon: LayoutDashboard,
    end: true,
    group: 'main',
  },
  // Kalendarz DRUGI, zaraz pod Pulpitem (decyzja właściciela 2026-08-28):
  // to pierwsza rzecz, na którą patrzy się rano, zanim wejdzie się w klienta.
  { to: routes.calendar, label: pl.nav.calendar, icon: CalendarDays, group: 'main' },
  { to: routes.clients, label: pl.nav.clients, icon: Users, group: 'main' },
  // „Dokumenty" (T-100): rejestr wycen, terminow, etapow i cennikow. Edytor
  // zostal pod `/wyceny/:id`, wiec podswietlamy pozycje takze tam.
  {
    to: routes.quotes,
    label: pl.nav.quotes,
    icon: FileText,
    group: 'main',
    aliases: [routes.quotesLegacy],
  },
  { to: routes.library, label: pl.nav.library, icon: Library, group: 'main' },
  { to: routes.templates, label: pl.nav.templates, icon: LayoutTemplate, group: 'main' },
  { to: routes.trash, label: pl.nav.trash, icon: Trash2, group: 'system' },
  { to: routes.help, label: pl.nav.help, icon: LifeBuoy, group: 'system' },
  { to: routes.settings, label: pl.nav.settings, icon: Settings, group: 'system' },
];

export const NAV_GROUPS: NavGroup[] = ['main', 'system'];

export function navItemsOf(group: NavGroup): NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === group);
}

/** Indeks aktywnej pozycji (w całej liście) dla danej ścieżki; `-1`, gdy żadna nie pasuje. */
export function activeNavIndex(pathname: string): number {
  const matches = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return NAV_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : matches(item.to) || (item.aliases ?? []).some(matches),
  );
}
