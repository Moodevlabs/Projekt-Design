-- =============================================================================
-- 0003_acceptances.sql — linki dla klienta i akceptacje online (faza 3, T-25/T-26).
-- Tworzone od razu, bo tanie; RLS w 0004 (dostęp tylko dla członków workspace
-- właściciela wyceny; anon dostanie osobne RPC po tokenie w fazie 3).
-- =============================================================================

create table if not exists public.quote_shares (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  token      text not null unique,     -- 32 bajty, base64url
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quote_shares_quote_id_idx on public.quote_shares (quote_id);

create table if not exists public.quote_acceptances (
  id             uuid primary key default gen_random_uuid(),
  quote_id       uuid not null references public.quotes(id) on delete cascade,
  share_id       uuid references public.quote_shares(id) on delete set null,
  -- Snapshot body z wyborami klienta w momencie akceptacji (dowód, nie referencja).
  accepted_body  jsonb not null,
  signer_name    text,
  signer_ip      inet,
  signature_path text,
  accepted_at    timestamptz not null default now()
);

create index if not exists quote_acceptances_quote_id_idx
  on public.quote_acceptances (quote_id, accepted_at desc);
