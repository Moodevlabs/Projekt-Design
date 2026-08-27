-- =============================================================================
-- 0033 — Decyzja klienta: także ODMOWA, i pełen komplet w jednym linku
--        (T-90 / poprawka 7a z 2026-08-27)
--
-- ## Trzy rzeczy naraz, bo to jedna zmiana modelu
--
-- 1. **Klient może odrzucić ofertę.** Do tej pory strona klienta miała dwie
--    drogi wyjścia: „Akceptuję" i „Mam uwagi". Brak trzeciej był decyzją
--    świadomą (komentarz w `DecisionPanel`), ale okazała się zła: bez niej
--    status `rejected` mógł ustawić WYŁĄCZNIE projektant, ręcznie — czyli
--    system zapisywał jego domysł, a nie odpowiedź klienta.
--
-- 2. **`quote_acceptances` przestaje być tabelą samych akceptacji.** Zamiast
--    zakładać drugą, bliźniaczą tabelę odmów, dokładamy kolumnę `decision`.
--    Jedna wycena = jedna decyzja klienta i jeden wiersz, który ją opisuje;
--    dwie tabele znaczyłyby dwa miejsca do sprawdzenia przy każdym pytaniu
--    „co klient odpowiedział".
--
-- 3. **Magic link niesie komplet.** Klient dostawał samą wycenę, choć w tej
--    samej kolumnie wiersza leży harmonogram i dokumenty towarzyszące.
--    Wysyłanie terminu osobnym plikiem obok linku znaczyło, że klient
--    akceptuje coś innego, niż widzi.
--
-- ⚠️ `enabled_item_ids` przy odmowie zostaje puste — nie ma zakresu, na który
--    ktokolwiek się umówił. Snapshot `accepted_body` zapisujemy MIMO odmowy:
--    bez niego nie dałoby się później odpowiedzieć, którą wersję oferty
--    klient odrzucił.
-- =============================================================================

alter table public.quote_acceptances
  add column if not exists decision text not null default 'accepted',
  add column if not exists reason text;

alter table public.quote_acceptances
  drop constraint if exists quote_acceptances_decision_check;

alter table public.quote_acceptances
  add constraint quote_acceptances_decision_check
  check (decision in ('accepted', 'rejected'));

comment on column public.quote_acceptances.decision is
  'Co klient odpowiedzial: accepted albo rejected. Domyslnie accepted — wiersze sprzed 0033 sa akceptacjami.';
comment on column public.quote_acceptances.reason is
  'Powod odmowy, wpisany przez klienta. NULL przy akceptacji.';

-- -----------------------------------------------------------------------------
-- RPC 4 — odmowa
--
-- Lustro `accept_shared_quote`: ta sama blokada wiersza, te same odmowy
-- („juz zaakceptowana", „juz odrzucona"), ten sam snapshot. Powod jest
-- OPCJONALNY: wymuszanie uzasadnienia przy „nie" zamienia jedno klikniecie
-- w rozmowe, ktorej klient moze nie chciec prowadzic — a wtedy nie odpowie
-- wcale i projektant zostanie z cisza zamiast z odpowiedzia.
-- -----------------------------------------------------------------------------
create or replace function public.reject_shared_quote(
  p_token       text,
  p_signer_name text,
  p_reason      text default null
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
  select * into v_quote from public.quotes where id = v_share.quote_id for update;

  if v_quote.status = 'accepted' then
    return jsonb_build_object('ok', false, 'reason', 'already_accepted');
  end if;

  if v_quote.status = 'rejected' then
    return jsonb_build_object('ok', false, 'reason', 'already_rejected');
  end if;

  insert into public.quote_acceptances
    (quote_id, share_id, accepted_body, enabled_item_ids, signer_name, signer_ip,
     decision, reason)
  values
    (v_quote.id, v_share.id, v_quote.body, '{}',
     left(v_name, 200), public.request_ip(),
     'rejected', nullif(btrim(coalesce(p_reason, '')), ''));

  update public.quotes
     set status = 'rejected'
   where id = v_quote.id;

  return jsonb_build_object('ok', true, 'rejectedAt', now());
end;
$$;

comment on function public.reject_shared_quote(text, text, text) is
  'Odmowa oferty przez klienta. Powod opcjonalny; snapshot body zapisujemy, zeby bylo wiadomo, KTORA wersje odrzucono.';

revoke all on function public.reject_shared_quote(text, text, text) from public;
grant execute on function public.reject_shared_quote(text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC 1 (odtworzony) — wycena RAZEM z terminem i dokumentami
-- -----------------------------------------------------------------------------
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
    -- Termin i dokumenty towarzyszące (poprawka 7a). Leżą w tym samym
    -- wierszu, więc nie kosztują ani jednego zapytania więcej.
    'schedule',  v_quote.schedule,
    'documents', v_quote.documents,
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
    -- Od 0033 wynikiem może być też odmowa, stąd `decision` w odpowiedzi.
    'acceptance', (
      select jsonb_build_object(
               'signerName', a.signer_name,
               'acceptedAt', a.accepted_at,
               'decision',   a.decision,
               'reason',     a.reason
             )
        from public.quote_acceptances a
       where a.quote_id = v_quote.id
       order by a.accepted_at desc
       limit 1
    )
  );
end;
$$;

comment on function public.get_shared_quote(text) is
  'Wycena, termin i dokumenty do wyswietlenia klientowi po tokenie. Nie zwraca workspace_id ani quote_id — token jest jedynym uchwytem.';
