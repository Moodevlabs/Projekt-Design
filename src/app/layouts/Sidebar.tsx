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
import { Sygnet } from '@/assets/brand/Sygnet';
import { Wordmark } from '@/assets/brand/Wordmark';
import {
  activeNavIndex,
  NAV_GROUPS,
  NAV_ITEMS,
  NAV_ROW_HEIGHT,
  NAV_ROW_STEP,
  navItemsOf,
  type NavItem,
} from './nav-items';
import { useSidebarExpanded } from './useSidebarExpanded';
import { TrialBar } from '@/features/billing/TrialBar';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wskaźnik aktywnej pozycji — jeden blok przejeżdżający między wierszami,
 * a nie siedem niezależnych teł. Dzięki temu widać ruch, a nie przeskok.
 *
 * Zwinięty pasek: kwadrat pod ikoną. Rozwinięty: blok pod całym wierszem.
 * Na brązowej szynie blok jest beżowy, więc aktywna ikona idzie w brąz.
 */
function ActiveIndicator({ index, expanded }: { index: number; expanded: boolean }) {
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
      <span className="nav-pill-body block" />
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
        'relative flex items-center rounded-[6px] transition-colors',
        'focus-visible:ring-rail-ink/70 focus-visible:ring-2 focus-visible:outline-none',
        expanded ? 'w-full gap-3 px-3.5' : 'w-[46px] justify-center',
        item.disabled
          ? 'text-rail-ink/25 cursor-not-allowed'
          : active
            ? // Aktywna pozycja zawsze leży na jasnym bloku — beżowym
              // (pasek rozwinięty) albo we wcięciu (zwinięty) — więc idzie w brąz.
              'text-rail-pill-ink'
            : 'text-rail-ink-soft hover:text-rail-ink',
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {expanded ? (
        // Wersaliki ze światłem — język makiety (KLIENCI · WYCENY · BIBLIOTEKA).
        // Ten sam wzorzec co główki tabel i „oczka" nad listami.
        <span
          className="nav-label label-caps truncate"
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
          'focus-visible:ring-rail-ink/70 flex items-center rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:outline-none',
          expanded ? 'hover:bg-rail-ink/10 w-full gap-3 px-2 py-1.5' : 'justify-center',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback className="bg-rail-ink text-rail-pill-ink text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden
            className={cn(
              // Obwódka w kolorze szyny, żeby kropka „siedziała" w panelu.
              'border-rail absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2',
              subscriptionOk ? 'bg-rail-ink' : 'bg-rail-ink/40',
            )}
          />
        </span>
        {expanded ? (
          <span className="text-rail-ink-soft min-w-0 flex-1 truncate text-left text-xs">
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
        'rail relative z-10 flex shrink-0 flex-col py-5',
        expanded ? 'px-4' : 'items-center px-[15px]',
        'transition-[width] duration-[var(--dur-slide)] ease-[var(--ease-liquid)]',
      )}
    >
      {/*
        Zwinięta szyna dostaje sygnet, rozwinięta — sam napis. Pełny lockup
        (napis + „WEB STUDIO FOR YOUR ATELIER" + rok) stoi WYŁĄCZNIE na ekranie
        logowania: szyna zwęża się animacją do 76 px, w której trzywierszowy
        tagline nie miałby prawa być czytelny. Hasło marki ma sens tam, gdzie
        widzi je ktoś, kto jeszcze nie jest w aplikacji. (08-REDESIGN D-2)
      */}
      {/*
        `justify-center` obowiązuje w OBU stanach. Wcześniej stan rozwinięty
        miał samo `w-full px-1`, więc wordmark był dosunięty do lewej krawędzi.

        Wyśrodkowanie ramki wystarcza, żeby wyśrodkować litery: wordmark ma
        ~17% pustego marginesu z każdej strony `viewBox`, ale symetrycznie.
        Ten sam margines sprawia, że ramka jest zauważalnie większa niż to,
        co widać — stąd `h-8` daje w rzeczywistości ~20 px wysokości liter.
      */}
      <div className="mb-6 flex h-10 w-full items-center justify-center">
        {expanded ? (
          <Wordmark title={pl.app.name} className="text-rail-ink h-8 w-auto" />
        ) : (
          <Sygnet title={pl.app.name} className="text-rail-ink h-7 w-auto" />
        )}
      </div>

      {/*
        Dwie grupy oddzielone kreska (T-73): obszary pracy i — nizej — Pomoc
        z Ustawieniami. Kazda grupa ma WLASNA kulke: jedna wspolna musialaby
        przeskakiwac przez separator, a jej pozycja liczy sie z indeksu wiersza.
      */}
      {NAV_GROUPS.map((group, groupIndex) => {
        const items = navItemsOf(group);
        const offset = NAV_ITEMS.findIndex((item) => item.group === group);
        const localActive = activeIndex >= 0 ? activeIndex - offset : -1;
        const inGroup = localActive >= 0 && localActive < items.length;

        return (
          <div
            key={group}
            className={cn(
              'relative w-full',
              groupIndex > 0 && 'border-rail-hair mt-4 border-t pt-4',
            )}
          >
            <div className="relative w-full" style={{ height: items.length * NAV_ROW_STEP }}>
              <ActiveIndicator index={inGroup ? localActive : -1} expanded={expanded} />
              <div className="relative flex flex-col" style={{ gap: NAV_ROW_STEP - NAV_ROW_HEIGHT }}>
                {items.map((item, index) => (
                  <SidebarLink
                    key={item.to}
                    item={item}
                    order={offset + index}
                    active={offset + index === activeIndex}
                    expanded={expanded}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className={cn('mt-auto flex w-full flex-col gap-3 pt-4', expanded ? '' : 'items-center')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={expanded ? pl.nav.collapse : pl.nav.expand}
              aria-expanded={expanded}
              className={cn(
                'text-rail-ink-soft hover:text-rail-ink flex h-9 items-center rounded-[var(--radius-control)] transition-colors',
                'focus-visible:ring-rail-ink/70 focus-visible:ring-2 focus-visible:outline-none',
                expanded ? 'hover:bg-rail-ink/10 w-full gap-3 px-2' : 'w-9 justify-center',
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
