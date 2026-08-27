-- =============================================================================
-- 0025_share_links.sql — link klienta („magic link") i akceptacja online
-- T-25a / T-26. Tabele stoją od 0003; tutaj dochodzi to, co pozwala z nich
-- korzystać anonimowi: RPC z SECURITY DEFINER.
--
-- ZASADA: `anon` nie dostaje ANI JEDNEGO grantu tabelowego (0004 §5 odbiera
-- wszystko). Cały dostęp klienta końcowego idzie przez trzy funkcje poniżej,
-- a każda z nich zaczyna od sprawdzenia tokenu. Token jest jedynym sekretem,
-- więc jego wyciek = wyciek jednej wyceny i niczego więcej.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- E-podpis wypadł z planów (decyzja właściciela 2026-08-26): akceptacja to
-- imię + czas + IP, nie rysunek na canvasie. Kolumna nigdy nie była zapisywana.
-- -----------------------------------------------------------------------------
alter table public.quote_acceptances drop column if exists signature_path;

-- Wybory klienta trzymamy jako LISTĘ ID, nie jako przysłany dokument.
-- To jest zabezpieczenie, nie oszczędność: gdyby klient odsyłał całe `body`,
-- mógłby odesłać body z podmienionymi cenami i wylądowałoby ono w tabeli jako
-- „zaakceptowana oferta". Snapshot bierzemy z serwera, od klienta przyjmujemy
-- wyłącznie zbiór włączonych pozycji.
alter table public.quote_acceptances
  add column if not exists enabled_item_ids text[] not null default '{}';

comment on column public.quote_acceptances.accepted_body is
  'Snapshot quotes.body Z SERWERA w chwili akceptacji — dowód, nie referencja. Nigdy nie pochodzi od klienta.';
comment on column public.quote_acceptances.enabled_item_ids is
  'Pozycje włączone przez klienta (id z body). Kwotę liczy domain/quote/calc.ts z tych dwóch pól.';

-- -----------------------------------------------------------------------------
-- Sygnał „klient otworzył ofertę" — projektant dziś nie wie nawet tyle.
-- -----------------------------------------------------------------------------
-- Token generuje baza, nie klient. Aplikacja wylosowałaby 32 bajty równie
-- dobrze, ale wtedy siła jedynego sekretu w całym mechanizmie zależałaby od
-- tego, że nikt nigdy nie podmieni `crypto.getRandomValues` na `Math.random()`.
-- Tu nie ma jak. base64 → base64url: `+/` na `-_`, `=` wypada.
alter table public.quote_shares
  alter column token set default translate(
    encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_'
  );

alter table public.quote_shares
  add column if not exists first_viewed_at timestamptz,
  add column if not exists last_viewed_at  timestamptz,
  add column if not exists view_count      int not null default 0;

-- -----------------------------------------------------------------------------
-- quote_comments — „Mam uwagi". Alternatywa dla akceptacji, nie dodatek do niej.
-- -----------------------------------------------------------------------------
create table if not exists public.quote_comments (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  share_id    uuid references public.quote_shares(id) on delete set null,
  author_name text,
  message     text not null check (length(btrim(message)) between 1 and 4000),
  author_ip   inet,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists quote_comments_quote_id_idx
  on public.quote_comments (quote_id, created_at desc);

-- Nieprzeczytane uwagi — po tym pyta odznaka w interfejsie.
create index if not exists quote_comments_unread_idx
  on public.quote_comments (quote_id) where read_at is null;

alter table public.quote_comments enable row level security;

drop policy if exists "quote_comments: select member" on public.quote_comments;
create policy "quote_comments: select member" on public.quote_comments
  for select to authenticated
  using (public.is_quote_member(quote_id));

-- Członek może wyłącznie oznaczyć uwagę jako przeczytaną. Treść jest dowodem
-- tego, co napisał klient — gdyby dało się ją edytować, przestałaby nim być.
drop policy if exists "quote_comments: update member" on public.quote_comments;
create policy "quote_comments: update member" on public.quote_comments
  for update to authenticated
  using (public.is_quote_member(quote_id))
  with check (public.is_quote_member(quote_id));

revoke insert, delete on public.quote_comments from authenticated;

-- =============================================================================
-- Pomocnicze
-- =============================================================================

-- Adres klienta z nagłówków PostgREST-a. `x-forwarded-for` bywa listą
-- („klient, proxy1, proxy2") — bierzemy pierwszy wpis. Gdy nagłówka nie ma
-- albo nie jest adresem, zwracamy NULL zamiast wywalać transakcję: brak IP
-- nie może uniemożliwić klientowi akceptacji oferty.
create or replace function public.request_ip()
returns inet
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  raw text;
begin
  raw := btrim(split_part(
    coalesce(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ''
    ), ',', 1));

  if raw = '' then
    return null;
  end if;

  return raw::inet;
exception
  when others then
    return null;
end;
$$;

comment on function public.request_ip() is
  'IP wywołującego z x-forwarded-for; NULL, gdy nagłówka brak lub jest niepoprawny.';

-- Rozwiązuje token na wiersz share. Jedno miejsce, w którym zapisana jest
-- definicja „link jest ważny" — trzy RPC poniżej ją współdzielą, żeby nie
-- dało się wygasić linku w jednym miejscu i zapomnieć o dwóch pozostałych.
create or replace function public.resolve_share(p_token text)
returns public.quote_shares
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select s.*
    from public.quote_shares s
    join public.quotes q on q.id = s.quote_id
   where s.token = p_token
     and s.revoked_at is null
     and (s.expires_at is null or s.expires_at > now())
     and q.deleted_at is null;
$$;

comment on function public.resolve_share(text) is
  'Wiersz quote_shares dla ważnego tokenu (nieodwołany, niewygasły, wycena nieusunięta); 0 wierszy w innym wypadku.';

-- Dlaczego status jest tekstem, a nie wyjątkiem: to jest ścieżka klienta
-- końcowego. „Link wygasł 3 sierpnia" to komunikat, który da się pokazać;
-- błąd 500 z PostgREST-a nie jest. Token i tak jest jedynym sekretem, więc
-- rozróżnienie „nie ma" od „wygasł" niczego nie ujawnia.
create or replace function public.share_status(p_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select case
           when p_token is null or btrim(p_token) = '' then 'not_found'
           when not exists (select 1 from public.quote_shares where token = p_token) then 'not_found'
           when exists (select 1 from public.quote_shares where token = p_token and revoked_at is not null) then 'revoked'
           when exists (
             select 1 from public.quote_shares
              where token = p_token and expires_at is not null and expires_at <= now()
           ) then 'expired'
           when not exists (
             select 1 from public.quote_shares s join public.quotes q on q.id = s.quote_id
              where s.token = p_token and q.deleted_at is null
           ) then 'not_found'
           else 'ok'
         end;
$$;

-- =============================================================================
-- RPC 1 — odczyt wyceny po tokenie
-- =============================================================================
create or replace function public.get_shared_quote(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_share  public.quote_shares;
  v_quote  public.quotes;
  v_brand  public.brand_kits;
  v_status text;
begin
  v_status := public.share_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  select * into v_share from public.resolve_share(p_token);
  select * into v_quote from public.quotes    where id = v_share.quote_id;
  select * into v_brand from public.brand_kits where workspace_id = v_quote.workspace_id;

  -- Licznik odsłon. Świadomie BEZ osobnej transakcji: jeśli odczyt się nie uda,
  -- odsłona też się nie liczy — wolę licznik zaniżony niż mówiący o wizytach,
  -- których nie było.
  update public.quote_shares
     set view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now()
   where id = v_share.id;

  return jsonb_build_object(
    'ok', true,
    'quote', jsonb_build_object(
      'number',      v_quote.number,
      'title',       v_quote.title,
      'status',      v_quote.status,
      'currency',    v_quote.currency,
      'validUntil',  v_quote.valid_until,
      'body',        v_quote.body
    ),
    -- Brand kit bez ścieżek do logo: te wymagają osobnego signed URL,
    -- a nazwa pliku w prywatnym buckecie i tak nic anonimowi nie daje.
    'brand', jsonb_build_object(
      'companyName', coalesce(v_brand.company_name, ''),
      'accentColor', coalesce(v_brand.accent_color, '#33251E'),
      'bgColor',     coalesce(v_brand.bg_color, '#EFECE8'),
      'contacts',    coalesce(v_brand.contacts, '[]'::jsonb),
      'address',     v_brand.address,
      'footerText',  v_brand.footer_text,
      'logoPath',    v_brand.logo_dark_path
    ),
    'share', jsonb_build_object('expiresAt', v_share.expires_at),
    -- Gdy oferta jest już zamknięta, strona ma pokazać wynik, a nie formularz.
    'acceptance', (
      select jsonb_build_object('signerName', a.signer_name, 'acceptedAt', a.accepted_at)
        from public.quote_acceptances a
       where a.quote_id = v_quote.id
       order by a.accepted_at desc
       limit 1
    )
  );
end;
$$;

comment on function public.get_shared_quote(text) is
  'Wycena do wyświetlenia klientowi po tokenie. Nie zwraca workspace_id ani quote_id — token jest jedynym uchwytem.';

-- =============================================================================
-- RPC 2 — akceptacja
-- =============================================================================
create or replace function public.accept_shared_quote(
  p_token         text,
  p_enabled_ids   text[],
  p_signer_name   text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_share  public.quote_shares;
  v_quote  public.quotes;
  v_status text;
  v_name   text;
begin
  v_status := public.share_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  v_name := btrim(coalesce(p_signer_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'name_required');
  end if;

  select * into v_share from public.resolve_share(p_token);

  -- Blokada wiersza wyceny na czas decyzji: dwa równoległe kliknięcia
  -- „Akceptuję" nie mogą dać dwóch akceptacji tej samej oferty.
  select * into v_quote from public.quotes where id = v_share.quote_id for update;

  if v_quote.status = 'accepted' then
    return jsonb_build_object('ok', false, 'reason', 'already_accepted');
  end if;

  if v_quote.status = 'rejected' then
    return jsonb_build_object('ok', false, 'reason', 'already_rejected');
  end if;

  insert into public.quote_acceptances
    (quote_id, share_id, accepted_body, enabled_item_ids, signer_name, signer_ip)
  values
    (v_quote.id, v_share.id, v_quote.body, coalesce(p_enabled_ids, '{}'),
     left(v_name, 200), public.request_ip());

  update public.quotes
     set status      = 'accepted',
         accepted_at = now()
   where id = v_quote.id;

  return jsonb_build_object('ok', true, 'acceptedAt', now());
end;
$$;

comment on function public.accept_shared_quote(text, text[], text) is
  'Akceptacja oferty przez klienta. Snapshot body bierze z serwera; od klienta przyjmuje wyłącznie listę włączonych pozycji.';

-- =============================================================================
-- RPC 3 — uwagi
-- =============================================================================
create or replace function public.comment_shared_quote(
  p_token       text,
  p_author_name text,
  p_message     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_share   public.quote_shares;
  v_status  text;
  v_message text;
begin
  v_status := public.share_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  v_message := btrim(coalesce(p_message, ''));
  if v_message = '' then
    return jsonb_build_object('ok', false, 'reason', 'message_required');
  end if;

  select * into v_share from public.resolve_share(p_token);

  -- Prosty limit: 20 uwag na link. Bez tego jeden otwarty link to otwarty
  -- formularz zapisu do bazy dla każdego, kto zna adres.
  if (select count(*) from public.quote_comments where share_id = v_share.id) >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  insert into public.quote_comments (quote_id, share_id, author_name, message, author_ip)
  values (v_share.quote_id, v_share.id,
          nullif(left(btrim(coalesce(p_author_name, '')), 200), ''),
          left(v_message, 4000), public.request_ip());

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.comment_shared_quote(text, text, text) is
  'Uwagi klienta do oferty. Nie zmienia statusu wyceny — decyzję o odrzuceniu podejmuje projektant.';

-- =============================================================================
-- Uprawnienia
-- =============================================================================
revoke all on function public.request_ip()                                from public;
revoke all on function public.resolve_share(text)                         from public;
revoke all on function public.share_status(text)                          from public;
revoke all on function public.get_shared_quote(text)                      from public;
revoke all on function public.accept_shared_quote(text, text[], text)     from public;
revoke all on function public.comment_shared_quote(text, text, text)      from public;

-- resolve_share zwraca cały wiersz razem z tokenem — zostaje wewnętrzna.
grant execute on function public.resolve_share(text)                      to service_role;
grant execute on function public.request_ip()                             to anon, authenticated, service_role;
grant execute on function public.share_status(text)                       to anon, authenticated, service_role;
grant execute on function public.get_shared_quote(text)                   to anon, authenticated, service_role;
grant execute on function public.accept_shared_quote(text, text[], text)  to anon, authenticated, service_role;
grant execute on function public.comment_shared_quote(text, text, text)   to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- ZAMKNIĘCIE `anon` NA FUNKCJACH — znalezione przy testowaniu tej migracji.
--
-- 0004 §5 odbiera anonimowi wszystkie tabele, ale funkcji nie rusza. Postgres
-- domyślnie daje `EXECUTE` roli PUBLIC, a Supabase dodatkowo ustawia DEFAULT
-- PRIVILEGES nadające `EXECUTE` rolom anon/authenticated na wszystko, co
-- powstanie w `public`. Efekt: `revoke ... from public` NIE wystarcza, bo anon
-- ma grant nadany wprost.
--
-- Do dziś nie miało to znaczenia praktycznego, bo aplikacja nie miała ani
-- jednego klienta anonimowego. T-25 wprowadza pierwszy — i wtedy anon może
-- wywołać KAŻDĄ funkcję z `public`, w tym SECURITY DEFINER, czyli takie, które
-- wykonują się z prawami właściciela i omijają RLS:
--   • `files_bump_usage(ws, delta)`   — przestawienie licznika zajętości
--   • `next_quote_number(ws)`         — palenie numerów wycen
--   • `seed_library_sample(ws)`       — dosypanie pozycji do cudzej biblioteki
-- Każda wymaga zgadnięcia UUID workspace'u, co jest niepraktyczne — ale to
-- jest przeszkoda, a nie zabezpieczenie, i nie chcemy na niej stać.
--
-- Odbieramy anonimowi wszystko i oddajemy dokładnie trzy funkcje strony klienta.
-- `authenticated` zostaje nietknięty: aplikacja desktopowa działa jak dotąd.
-- -----------------------------------------------------------------------------
-- Dwa źródła uprawnienia, oba trzeba odciąć — sprawdzone empirycznie przy
-- pisaniu tej migracji. Samo `from anon` zostawiło wykonywalne m.in.
-- `seed_room_types` i wszystkie funkcje triggerowe: te miały grant na roli
-- PUBLIC (domyślny Postgresa), którego odebranie anonimowi nie rusza.
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

-- Przywracamy stan zastany dla zalogowanych: `authenticated` i tak miał
-- wszystko przez DEFAULT PRIVILEGES Supabase, więc aplikacja desktopowa nie
-- zmienia zachowania ani o krok. Odcinamy wyłącznie anonima.
grant execute on all functions in schema public to authenticated;

-- Żeby kolejna migracja nie odtworzyła dziury przy pierwszej nowej funkcji.
-- Dwa warianty, bo DEFAULT PRIVILEGES są zapisane per rola tworząca, a migracje
-- bywają odtwarzane raz jako `postgres`, raz jako `supabase_admin`.
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- Wyłącznie te trzy. `resolve_share` NIE wraca: zwraca cały wiersz razem
-- z tokenem, więc jest funkcją wewnętrzną, mimo że wywołuje ją tylko kod,
-- który token i tak zna.
grant execute on function public.share_status(text)                       to anon;
grant execute on function public.get_shared_quote(text)                   to anon;
grant execute on function public.accept_shared_quote(text, text[], text)  to anon;
grant execute on function public.comment_shared_quote(text, text, text)   to anon;

-- -----------------------------------------------------------------------------
-- Logo w buckecie `brand` dla anonima — tylko gdy workspace ma żywy link.
-- Bez tego oferta u klienta jest bezimienna. Zakres jest wąski: sam bucket
-- `brand` (nie `files` z dokumentami klientów) i tylko na czas życia linku.
-- -----------------------------------------------------------------------------
grant execute on function public.storage_workspace_id(text) to anon;

drop policy if exists "brand: select via active share" on storage.objects;
create policy "brand: select via active share" on storage.objects
  for select to anon
  using (
    bucket_id = 'brand'
    and exists (
      select 1
        from public.quote_shares s
        join public.quotes q on q.id = s.quote_id
       where q.workspace_id = public.storage_workspace_id(storage.objects.name)
         and q.deleted_at is null
         and s.revoked_at is null
         and (s.expires_at is null or s.expires_at > now())
    )
  );
