-- =============================================================================
-- 0002_billing.sql — subskrypcje Stripe (docs/03-BILLING.md)
-- Zapis do tych tabel wyłącznie przez Edge Functions (service_role).
-- Klient czyta subscriptions i liczy entitlement — parytet z workspace_can_write().
-- =============================================================================

create table if not exists public.subscriptions (
  workspace_id           uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text not null default 'trialing'
                           check (status in ('trialing','active','past_due','canceled',
                                             'incomplete','unpaid','paused')),
  plan                   text,                 -- 'pro_monthly' | 'pro_yearly'
  -- Trial jest NASZ, nie Stripe'owy: nadawany przy signup (handle_new_user).
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Stan subskrypcji workspace. Źródło prawdy: webhook Stripe. Klient tylko czyta.';

create index if not exists subscriptions_status_idx on public.subscriptions (status);

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- stripe_events — idempotencja webhooków. Wstawienie evt_... przed obsługą;
-- konflikt = event już przetworzony, zwracamy 200 i kończymy.
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,       -- evt_...
  type         text not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_processed_at_idx
  on public.stripe_events (processed_at desc);
