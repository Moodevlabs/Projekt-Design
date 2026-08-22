import { NavLink, useMatch } from 'react-router-dom';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; disabled?: boolean };

const NAV: NavItem[] = [
  { to: routes.dashboard, label: pl.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: routes.quotes, label: pl.nav.quotes, icon: FileText },
  { to: routes.clients, label: pl.nav.clients, icon: Users, disabled: true },
  { to: routes.library, label: pl.nav.library, icon: Library },
  { to: routes.templates, label: pl.nav.templates, icon: LayoutTemplate },
  { to: routes.brand, label: pl.nav.brand, icon: Palette },
  { to: routes.settings, label: pl.nav.settings, icon: Settings },
];

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const label = item.disabled ? `${item.label} (${pl.common.soon})` : item.label;
  // Uwaga: `TooltipTrigger asChild` (Radix Slot) scala `className` jako string,
  // więc funkcyjny `className` NavLinka trafiłby do DOM jako tekst.
  // Stan aktywny liczymy sami przez `useMatch`.
  const isActive = useMatch({ path: item.to, end: item.end ?? false }) !== null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.to}
          end={item.end}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={item.disabled}
          onClick={(e) => {
            if (item.disabled) e.preventDefault();
          }}
          className={cn(
            'flex size-11 items-center justify-center rounded-full transition-colors',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            item.disabled
              ? 'text-ink-soft/40 cursor-not-allowed'
              : isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ subscriptionOk = true }: { subscriptionOk?: boolean }) {
  return (
    <nav
      aria-label={pl.nav.dashboard}
      className="border-hair bg-surface flex w-[72px] shrink-0 flex-col items-center gap-1 border-r py-5"
    >
      <div className="bg-primary text-primary-foreground mb-4 flex size-9 items-center justify-center rounded-full text-sm font-semibold">
        A
      </div>

      {NAV.map((item) => (
        <SidebarLink key={item.to} item={item} />
      ))}

      <div className="mt-auto flex flex-col items-center gap-3 pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to={routes.subscription} className="relative block rounded-full">
              <Avatar className="size-9">
                <AvatarFallback className="bg-surface-2 text-ink text-xs font-medium">
                  AN
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden
                className={cn(
                  'border-surface absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2',
                  subscriptionOk ? 'bg-positive' : 'bg-warning',
                )}
              />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{pl.billing.title}</TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
