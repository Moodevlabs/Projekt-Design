-- =============================================================================
-- rls.test.sql — izolacja workspace i twarde read-only po wygaśnięciu triala.
--
-- Uruchomienie: pnpm db:test   (=> supabase test db, pgTAP + pg_prove)
-- pg_prove kończy się kodem != 0, gdy którykolwiek assert padnie.
--
-- Konwencja: wszystkie asserty pgTAP wykonujemy jako `postgres`, a zapytania
-- „oczami użytkownika" jako rola `authenticated` z podstawionym JWT.
-- Wyniki przekładamy przez tabelę __rls_res, żeby stan pgTAP (tabele tymczasowe)
-- nigdy nie był dotykany z innej roli.
-- Cała transakcja kończy się rollbackiem — nic nie zostaje w bazie.
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(20);

-- -----------------------------------------------------------------------------
-- Przygotowanie (rola postgres — właściciel tabel, więc RLS jej nie dotyczy)
-- -----------------------------------------------------------------------------
create table public.__rls_ctx (k text primary key, v uuid);
create table public.__rls_res (k text primary key, v text);
grant select, insert, update, delete on public.__rls_ctx to authenticated;
grant select, insert, update, delete on public.__rls_res to authenticated;

-- Dwóch niezależnych użytkowników. Trigger on_auth_user_created zakłada każdemu
-- workspace, członkostwo, profil, brand kit i 14-dniowy trial.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   'authenticated', 'authenticated', 'rls-a@test.local',
   extensions.crypt('test1234', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"company":"Firma A"}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
   'authenticated', 'authenticated', 'rls-b@test.local',
   extensions.crypt('test1234', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"company":"Firma B"}'::jsonb, now(), now(), '', '', '', '');

insert into public.__rls_ctx (k, v)
select 'ws_a', id from public.workspaces where owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
insert into public.__rls_ctx (k, v)
select 'ws_b', id from public.workspaces where owner_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

insert into public.quotes (id, workspace_id, title, body, created_by)
select 'aaaaaaaa-0000-4000-8000-000000000001', v, 'Wycena A', '{"sections":[]}'::jsonb,
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  from public.__rls_ctx where k = 'ws_a';

insert into public.quotes (id, workspace_id, title, body, created_by)
select 'bbbbbbbb-0000-4000-8000-000000000001', v, 'Wycena B', '{"sections":[]}'::jsonb,
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  from public.__rls_ctx where k = 'ws_b';

insert into public.library_items (workspace_id, name)
select v, 'Pozycja B' from public.__rls_ctx where k = 'ws_b';

-- Slownik typow pomieszczen tez jest workspace'owy (T-33): ceny per typ
-- zdradzalyby konstrukcje cennika konkurencji.
insert into public.room_types (workspace_id, name, slug)
select v, 'Pracownia B', 'pracownia-b' from public.__rls_ctx where k = 'ws_b';

-- =============================================================================
-- CZĘŚĆ 1 — użytkownik A (trial aktywny)
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}';

insert into public.__rls_res (k, v)
select 'a_is_member_a', public.is_member((select v from public.__rls_ctx where k = 'ws_a'))::text;
insert into public.__rls_res (k, v)
select 'a_is_member_b', public.is_member((select v from public.__rls_ctx where k = 'ws_b'))::text;

insert into public.__rls_res (k, v)
select 'a_quotes_count', count(*)::text from public.quotes;
insert into public.__rls_res (k, v)
select 'a_sees_quote_b', count(*)::text from public.quotes
 where id = 'bbbbbbbb-0000-4000-8000-000000000001';
insert into public.__rls_res (k, v)
select 'a_workspaces_count', count(*)::text from public.workspaces;
insert into public.__rls_res (k, v)
select 'a_members_count', count(*)::text from public.workspace_members;
insert into public.__rls_res (k, v)
select 'a_library_count', count(*)::text from public.library_items;
insert into public.__rls_res (k, v)
select 'a_room_types_b_count', count(*)::text from public.room_types rt
  where rt.workspace_id = (select v from public.__rls_ctx where k = 'ws_b');
insert into public.__rls_res (k, v)
select 'a_subscriptions_count', count(*)::text from public.subscriptions;

-- Zapisy w cudzym workspace: UPDATE/DELETE mają nie ruszyć żadnego wiersza,
-- INSERT ma polecieć błędem 42501 (naruszenie polityki RLS).
do $body$
declare
  n int;
  ws_b uuid := (select v from public.__rls_ctx where k = 'ws_b');
begin
  update public.quotes set title = 'Przejęte' where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  insert into public.__rls_res (k, v) values ('a_update_b_rows', n::text);

  delete from public.quotes where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  insert into public.__rls_res (k, v) values ('a_delete_b_rows', n::text);

  begin
    insert into public.quotes (workspace_id, title, body)
    values (ws_b, 'Podrzucona', '{"sections":[]}'::jsonb);
    insert into public.__rls_res (k, v) values ('a_insert_b_sqlstate', 'BRAK BLEDU');
  exception when others then
    insert into public.__rls_res (k, v) values ('a_insert_b_sqlstate', sqlstate);
  end;

  begin
    perform public.next_quote_number(ws_b);
    insert into public.__rls_res (k, v) values ('a_numbering_b_sqlstate', 'BRAK BLEDU');
  exception when others then
    insert into public.__rls_res (k, v) values ('a_numbering_b_sqlstate', sqlstate);
  end;

  begin
    update public.subscriptions set status = 'active';
    insert into public.__rls_res (k, v) values ('a_update_sub_sqlstate', 'BRAK BLEDU');
  exception when others then
    insert into public.__rls_res (k, v) values ('a_update_sub_sqlstate', sqlstate);
  end;

  begin
    perform count(*) from public.stripe_events;
    insert into public.__rls_res (k, v) values ('a_stripe_events_sqlstate', 'BRAK BLEDU');
  exception when others then
    insert into public.__rls_res (k, v) values ('a_stripe_events_sqlstate', sqlstate);
  end;
end;
$body$;

reset role;

-- =============================================================================
-- CZĘŚĆ 2 — użytkownik B widzi tylko swoje
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1","role":"authenticated"}';

insert into public.__rls_res (k, v)
select 'b_quotes_count', count(*)::text from public.quotes;
insert into public.__rls_res (k, v)
select 'b_sees_quote_a', count(*)::text from public.quotes
 where id = 'aaaaaaaa-0000-4000-8000-000000000001';

reset role;

-- =============================================================================
-- CZĘŚĆ 3 — wygasły trial u A: odczyt zostaje, zapis znika (twarde read-only)
-- =============================================================================
update public.subscriptions
   set status = 'trialing', trial_ends_at = now() - interval '1 day'
 where workspace_id = (select v from public.__rls_ctx where k = 'ws_a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}';

insert into public.__rls_res (k, v)
select 'a_expired_quotes_count', count(*)::text from public.quotes;

do $body$
declare
  n int;
  ws_a uuid := (select v from public.__rls_ctx where k = 'ws_a');
begin
  update public.quotes set title = 'Zmiana po trialu'
   where id = 'aaaaaaaa-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  insert into public.__rls_res (k, v) values ('a_expired_update_rows', n::text);

  begin
    insert into public.quotes (workspace_id, title, body)
    values (ws_a, 'Nowa po trialu', '{"sections":[]}'::jsonb);
    insert into public.__rls_res (k, v) values ('a_expired_insert_sqlstate', 'BRAK BLEDU');
  exception when others then
    insert into public.__rls_res (k, v) values ('a_expired_insert_sqlstate', sqlstate);
  end;
end;
$body$;

reset role;

-- =============================================================================
-- ASSERTY (rola postgres)
-- =============================================================================
create or replace function public.__rls_val(text) returns text
  language sql stable as $fn$ select v from public.__rls_res where k = $1 $fn$;

select is(public.__rls_val('a_is_member_a'), 'true',
          'is_member() = true dla wlasnego workspace');
select is(public.__rls_val('a_is_member_b'), 'false',
          'is_member() = false dla cudzego workspace');

select is(public.__rls_val('a_quotes_count'), '1',
          'User A widzi dokladnie jedna wycene - swoja');
select is(public.__rls_val('a_sees_quote_b'), '0',
          'User A NIE widzi wyceny user B (izolacja workspace)');
select is(public.__rls_val('b_quotes_count'), '1',
          'User B widzi dokladnie jedna wycene - swoja');
select is(public.__rls_val('b_sees_quote_a'), '0',
          'User B NIE widzi wyceny user A');

select is(public.__rls_val('a_workspaces_count'), '1',
          'User A widzi tylko swoj workspace');
select is(public.__rls_val('a_members_count'), '1',
          'User A widzi tylko swoje czlonkostwo');
select is(public.__rls_val('a_library_count'), '0',
          'User A nie widzi biblioteki user B');
select is(public.__rls_val('a_room_types_b_count'), '0',
          'User A nie widzi slownika pomieszczen user B');
select is(public.__rls_val('a_subscriptions_count'), '1',
          'User A widzi tylko swoja subskrypcje');

select is(public.__rls_val('a_update_b_rows'), '0',
          'UPDATE cudzej wyceny nie rusza zadnego wiersza');
select is(public.__rls_val('a_delete_b_rows'), '0',
          'DELETE cudzej wyceny nie rusza zadnego wiersza');
select is(public.__rls_val('a_insert_b_sqlstate'), '42501',
          'INSERT do cudzego workspace odrzucony przez RLS (42501)');
select is(public.__rls_val('a_numbering_b_sqlstate'), '42501',
          'next_quote_number() dla cudzego workspace odrzucony (42501)');
select is(public.__rls_val('a_update_sub_sqlstate'), '42501',
          'Klient nie moze zmieniac subscriptions (tylko service_role)');
select is(public.__rls_val('a_stripe_events_sqlstate'), '42501',
          'Klient nie ma dostepu do stripe_events');

select is(public.__rls_val('a_expired_quotes_count'), '1',
          'Po wygasnieciu triala odczyt wlasnych wycen nadal dziala');
select is(public.__rls_val('a_expired_update_rows'), '0',
          'Po wygasnieciu triala UPDATE wlasnej wyceny nie przechodzi (read-only w bazie)');
select is(public.__rls_val('a_expired_insert_sqlstate'), '42501',
          'Po wygasnieciu triala INSERT wlasnej wyceny odrzucony (42501)');

select * from finish();
rollback;
