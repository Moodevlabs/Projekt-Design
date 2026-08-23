import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/auth-context';
import {
  activeNavIndex,
  NAV_ITEMS,
  NAV_ROW_HEIGHT,
  NAV_ROW_STEP,
  type NavItem,
} from './nav-items';
import { useSidebarExpanded } from './useSidebarExpanded';
import { TrialBar } from '@/features/billing/TrialBar';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wskaźnik aktywnej pozycji — jedna kulka przejeżdżająca między wierszami,
 * a nie siedem niezależnych teł. Dzięki temu widać ruch, a nie przeskok.
 *
 * Zwinięty pasek: kółko pod ikoną. Rozwinięty: pigułka pod całym wierszem.
 * Na ciemnej szynie kulka jest biała, więc aktywna ikona idzie w atrament.
 */
function ActiveIndicator({ index, expanded }: { index: number; expanded: boolean }) {
  const [travelling, setTravelling] = useState(false);
  const previous = useRef(index);

  useEffect(() => {
    if (previous.current === index || index < 0 || previous.current < 0) {
      previous.current = index;
      return;
    }
    previous.current = index;
    setTravelling(true);
    const timer = setTimeout(() => setTravelling(false), 520);
    return () => clearTimeout(timer);
  }, [index]);

  if (index < 0) return null;

  return (
    <span
      aria-hidden
      data-testid="nav-active-marker"
      data-index={index}
      className="nav-pill-track pointer-events-none absolute top-0 left-0"
      style={{
        transform: `translateY(${index * NAV_ROW_STEP}px)`,
        height: NAV_ROW_HEIGHT,
        width: expanded ? '100%' : NAV_ROW_HEIGHT,
      }}
    >
      <span className="nav-pill-body block" data-travelling={travelling} />
    </span>
  );
}

function SidebarLink({
  item,
  active,
  expanded,
  order,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  order: number;
}) {
  const Icon = item.icon;
  const label = item.disabled ? `${item.label} (${pl.common.soon})` : item.label;

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.disabled}
      onClick={(event) => {
        if (item.disabled) event.preventDefault();
      }}
      style={{ height: NAV_ROW_HEIGHT }}
      className={cn(
        'relative flex items-center rounded-[var(--radius-pill)] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
        expanded ? 'w-full gap-3 px-3.5' : 'w-[46px] justify-center',
        item.disabled
          ? 'cursor-not-allowed text-white/25'
          : active
            ? // Aktywna pozycja zawsze leży na jasnym tle — pigułce (pasek
              // rozwinięty) albo we wcięciu (pasek zwinięty) — więc idzie w atrament.
              'text-ink'
            : 'text-white/65 hover:text-white',
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {expanded ? (
        <span
          className="nav-label truncate text-sm font-medium"
          style={{ transitionDelay: `${40 + order * 22}ms` }}
        >
          {item.label}
        </span>
      ) : null}
    </NavLink>
  );

  // Podpowiedź ma sens tylko wtedy, gdy etykiety nie widać.
  if (expanded) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function AccountMenu({ subscriptionOk, expanded }: { subscriptionOk: boolean; expanded: boolean }) {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? '';
  const initials = email.slice(0, 2).toUpperCase() || 'AN';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={pl.settings.account}
        className={cn(
          'flex items-center rounded-[var(--radius-pill)] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
          expanded ? 'w-full gap-3 px-2 py-1.5 hover:bg-white/10' : 'justify-center',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback className="text-ink bg-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden
            className={cn(
              // Obwódka w kolorze szyny, żeby kropka „siedziała" w panelu.
              'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#131519]',
              subscriptionOk ? 'bg-white' : 'bg-white/40',
            )}
          />
        </span>
        {expanded ? (
          <span className="min-w-0 flex-1 truncate text-left text-xs text-white/55">
            {email || pl.settings.account}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-56">
        {email ? <div className="text-ink-soft truncate px-2 py-1.5 text-xs">{email}</div> : null}
        <DropdownMenuItem asChild>
          <NavLink to={routes.subscription}>{pl.billing.title}</NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to={routes.settings}>{pl.settings.title}</NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>{pl.common.logout}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar({ subscriptionOk = true }: { subscriptionOk?: boolean }) {
  const { pathname } = useLocation();
  const { expanded, toggle } = useSidebarExpanded();
  const activeIndex = activeNavIndex(pathname);

  return (
    <nav
      aria-label={pl.app.name}
      data-expanded={expanded}
      style={{ width: expanded ? 244 : 76 }}
      className={cn(
        'glass-dark relative z-10 flex shrink-0 flex-col py-5',
        expanded ? 'px-4' : 'items-center px-[15px]',
        'transition-[width] duration-[var(--dur-slide)] ease-[var(--ease-liquid)]',
      )}
    >
      <div className={cn('mb-6 flex items-center', expanded ? 'w-full gap-3 px-1' : 'flex-col')}>
        <span className="font-display text-ink flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold">
          A
        </span>
        {expanded ? (
          <span className="font-display flex-1 truncate text-[15px] font-semibold tracking-tight text-white">
            {pl.app.name}
          </span>
        ) : null}
      </div>

      <div className="relative w-full" style={{ height: NAV_ITEMS.length * NAV_ROW_STEP }}>
        <ActiveIndicator index={activeIndex} expanded={expanded} />
        <div className="relative flex flex-col" style={{ gap: NAV_ROW_STEP - NAV_ROW_HEIGHT }}>
          {NAV_ITEMS.map((item, index) => (
            <SidebarLink
              key={item.to}
              item={item}
              order={index}
              active={index === activeIndex}
              expanded={expanded}
            />
          ))}
        </div>
      </div>

      <div className={cn('mt-auto flex w-full flex-col gap-3 pt-4', expanded ? '' : 'items-center')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={expanded ? pl.nav.collapse : pl.nav.expand}
              aria-expanded={expanded}
              className={cn(
                'flex h-9 items-center rounded-[var(--radius-control)] text-white/55 transition-colors hover:text-white',
                'focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
                expanded ? 'w-full gap-3 px-2 hover:bg-white/10' : 'w-9 justify-center',
              )}
            >
              {expanded ? (
                <PanelLeftClose className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden />
              )}
              {expanded ? <span className="text-xs">{pl.nav.collapse}</span> : null}
            </button>
          </TooltipTrigger>
          {expanded ? null : (
            <TooltipContent side="right">{pl.nav.expand}</TooltipContent>
          )}
        </Tooltip>

        <TrialBar expanded={expanded} />

        <AccountMenu subscriptionOk={subscriptionOk} expanded={expanded} />
      </div>
    </nav>
  );
}
