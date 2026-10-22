-- =============================================================================
-- 0051_ai_usage.sql — zużycie asystenta AI (T-135, FEATURES-AI.md §1.2)
--
-- ## Po co tabela
--
-- Każde wywołanie modelu kosztuje tokeny, a subskrypcja ma jedną cenę. Limit
-- miesięczny na workspace (`AI_MONTHLY_LIMIT` w sekretach funkcji `ai`) jest
-- jedynym hamulcem — i musi stać na czymś, co da się policzyć. Wiersz na
-- wywołanie, bez treści zapytania i odpowiedzi: liczymy, nie archiwizujemy.
--
-- ## Kto pisze, kto czyta
--
--  * INSERT: wyłącznie funkcja brzegowa `ai` przez `service_role` — użytkownik
--    nie ma jak „dopisać" ani wyzerować sobie licznika.
--  * SELECT: członek workspace'u (licznik w Ustawieniach idzie przez funkcję,
--    ale polityka zostaje — gdyby UI kiedyś czytało tabelę wprost).
--  * `anon`: nic. Lekcja z T-116 (IDEAS.md): Supabase nadaje DEFAULT
--    PRIVILEGES każdej nowej tabeli, więc odbieramy jawnie.
--
-- ## Miesiąc w UTC
--
-- `ai_usage_this_month` liczy od pierwszego dnia bieżącego miesiąca w UTC.
-- Ta sama definicja po stronie funkcji (`nextMonthStart`) wylicza datę
-- odnowienia — obie liczą w UTC, żeby „odnowi się 1 listopada" znaczyło
-- to samo w bazie i w komunikacie.
-- =============================================================================

create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  -- Te same nazwy co `AI_ACTIONS` w `src/domain/ai/schema.ts`.
  action        text not null check (
    action in ('import-library', 'brief-to-quote', 'comments-to-changes', 'polish-text')
  ),
  model         text not null,
  input_tokens  int  not null default 0 check (input_tokens >= 0),
  output_tokens int  not null default 0 check (output_tokens >= 0),
  created_at    timestamptz not null default now()
);

comment on table public.ai_usage is
  'Jedno wywołanie asystenta AI = jeden wiersz. Tylko liczby — bez treści zapytań.';

create index if not exists ai_usage_workspace_month_idx
  on public.ai_usage (workspace_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: select member" on public.ai_usage;
create policy "ai_usage: select member" on public.ai_usage
  for select to authenticated
  using (public.is_member(workspace_id));

-- Zapis tylko przez service_role (funkcja brzegowa). `authenticated` dostaje
-- SELECT z polityki wyżej i nic więcej.
revoke insert, update, delete on public.ai_usage from authenticated;
revoke all on public.ai_usage from anon;

-- -----------------------------------------------------------------------------
-- Licznik bieżącego miesiąca.
--
-- `security definer`, bo funkcja brzegowa woła ją z tokenem użytkownika, a
-- polityka SELECT i tak ogranicza do członka — sprawdzamy to jawnie, żeby
-- definer nie otworzył cudzych liczników.
-- -----------------------------------------------------------------------------
create or replace function public.ai_usage_this_month(ws uuid)
returns int
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when public.is_member(ws) then (
      select count(*)::int
        from public.ai_usage u
       where u.workspace_id = ws
         and u.created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
    )
    else 0
  end;
$$;

comment on function public.ai_usage_this_month(uuid) is
  'Liczba wywołań asystenta AI w bieżącym miesiącu (UTC) dla workspace''u, którego wołający jest członkiem.';

revoke all on function public.ai_usage_this_month(uuid) from public;
grant execute on function public.ai_usage_this_month(uuid) to authenticated, service_role;
