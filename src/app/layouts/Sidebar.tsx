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
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wskaźnik aktywnej pozycji. Jedna „kulka" przejeżdża między wierszami
 * zamiast siedmiu niezależnych teł — dzięki temu widać ruch, a nie przeskok.
 */
function ActivePill({ index, expanded }: { index: number; expanded: boolean }) {
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
      data-testid="nav-active-pill"
      data-index={index}
      className="nav-pill-track pointer-events-none absolute left-0 top-0"
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
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        expanded ? 'w-full gap-3 px-3.5' : 'w-[46px] justify-center',
        item.disabled
          ? 'text-ink-soft/40 cursor-not-allowed'
          : active
            ? 'text-cta-fg'
            : 'text-ink-soft hover:text-ink',
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
          'focus-visible:ring-ring flex items-center rounded-[var(--radius-pill)] focus-visible:ring-2 focus-visible:outline-none',
          expanded ? 'w-full gap-3 px-2 py-1.5 hover:bg-white/50' : 'justify-center',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback className="bg-white/70 text-ink text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden
            className={cn(
              'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white',
              subscriptionOk ? 'bg-ink' : 'bg-ink/35',
            )}
          />
        </span>
        {expanded ? (
          <span className="text-ink-soft min-w-0 flex-1 truncate text-left text-xs">
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
        'glass relative z-10 flex shrink-0 flex-col py-5',
        expanded ? 'px-4' : 'items-center px-[15px]',
        'transition-[width] duration-[var(--dur-slide)] ease-[var(--ease-liquid)]',
      )}
    >
      <div className={cn('mb-6 flex items-center', expanded ? 'w-full gap-3 px-1' : 'flex-col')}>
        <span className="bg-cta text-cta-fg font-display flex size-9 shrink-0 items-center justify-center rounded-[13px] text-sm font-semibold">
          A
        </span>
        {expanded ? (
          <span className="font-display text-ink flex-1 truncate text-[15px] font-semibold tracking-tight">
            {pl.app.name}
          </span>
        ) : null}
      </div>

      <div className="relative w-full" style={{ height: NAV_ITEMS.length * NAV_ROW_STEP }}>
        <ActivePill index={activeIndex} expanded={expanded} />
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
                'text-ink-soft hover:text-ink flex h-9 items-center rounded-[var(--radius-control)] transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                expanded ? 'w-full gap-3 px-2 hover:bg-white/50' : 'w-9 justify-center',
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

        <AccountMenu subscriptionOk={subscriptionOk} expanded={expanded} />
      </div>
    </nav>
  );
}
