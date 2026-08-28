-- =============================================================================
-- 0041 — Znak pracowni na stronie klienta: właściwy wariant i zapas
--
-- ## Co było nie tak
--
-- `get_shared_quote` i `get_shared_brief` zwracały na sztywno `logo_dark_path`.
-- Miało to sens, dopóki strona klienta pokazywała znak na jasnym tle strony.
-- Od tego wydania oferta i brief otwierają się **pasem w kolorze marki**,
-- tak samo jak dokument PDF — a o wariancie znaku na takim pasie decyduje
-- ustawienie „Znak na nagłówku dokumentu" (`header_logo`, migracja 0039).
-- Bez tej zmiany pracownia, która wybrała znak jasny pod ciemny pas, dostawała
-- na stronie klienta znak ciemny: niewidoczny.
--
-- ## Zapas, a nie pustka
--
-- `coalesce` sięga po drugi wariant, gdy wskazanego nie wgrano. Pracownia,
-- która ma tylko jeden plik, zobaczy go zamiast samej nazwy firmy — a brak
-- znaku był właśnie zgłaszany jako „brief wygląda jak spam". Gdy nie ma
-- żadnego pliku, `logoPath` jest `null` i strona pokazuje nazwę pracowni;
-- ta ścieżka zostaje bez zmian.
--
-- ⚠️ Odczyt pliku z bucketa `brand` przez anonima wymaga polityki z migracji
--    0040. Bez niej `createSignedUrl` odmówi i znak nie pojawi się mimo
--    poprawnej ścieżki zwróconej tutaj.
--
-- ⚠️ Ciała obu funkcji są DOSŁOWNĄ kopią wersji z migracji 0033 i 0034 —
--    zmieniona jest w nich wyłącznie jedna linia, ta wyliczająca `logoPath`.
--    `create or replace` nadpisuje całą definicję, więc każda inna różnica
--    po cichu cofnęłaby którąś z wcześniejszych poprawek.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Wariant znaku wg ustawienia, z zapasem. Jedna funkcja dla obu RPC — dwie
-- kopie tej reguły rozjechałyby się przy pierwszej zmianie i oferta
-- pokazywałaby inny znak niż brief tej samej pracowni.
-- -----------------------------------------------------------------------------
create or replace function public.brand_shared_logo_path(p_brand public.brand_kits)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select coalesce(
    case p_brand.header_logo
      when 'light' then p_brand.logo_light_path
      else p_brand.logo_dark_path
    end,
    p_brand.logo_dark_path,
    p_brand.logo_light_path
  );
$$;

comment on function public.brand_shared_logo_path(public.brand_kits) is
  'Sciezka do znaku na pas naglowka strony klienta: wariant z header_logo, a gdy go brak — ten drugi.';

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
      'logoPath',    public.brand_shared_logo_path(v_brand)
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

create or replace function public.get_shared_brief(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_brief  public.client_briefs;
  v_brand  public.brand_kits;
  v_status text;
begin
  v_status := public.brief_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  select * into v_brief from public.client_briefs where token = p_token;
  select * into v_brand from public.brand_kits where workspace_id = v_brief.workspace_id;

  update public.client_briefs
     set view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now()
   where id = v_brief.id;

  return jsonb_build_object(
    'ok', true,
    'brief', jsonb_build_object(
      'template',    v_brief.template,
      'answers',     v_brief.answers,
      'submittedAt', v_brief.submitted_at
    ),
    -- Ten sam okrojony brand kit co przy ofercie: klient ma zobaczyć, że
    -- formularz jest od TEJ pracowni, a nie od anonimowego narzędzia.
    'brand', jsonb_build_object(
      'companyName', coalesce(v_brand.company_name, ''),
      'accentColor', coalesce(v_brand.accent_color, '#33251E'),
      'bgColor',     coalesce(v_brand.bg_color, '#EFECE8'),
      'contacts',    coalesce(v_brand.contacts, '[]'::jsonb),
      'address',     v_brand.address,
      'footerText',  v_brand.footer_text,
      'logoPath',    public.brand_shared_logo_path(v_brand)
    ),
    'share', jsonb_build_object('expiresAt', v_brief.expires_at)
  );
end;
$$;

-- `create or replace` gubi uprawnienia tylko przy zmianie sygnatury; te sa bez
-- zmian, ale powtarzamy grant, zeby migracja byla samowystarczalna przy
-- odtwarzaniu bazy od zera.
revoke all on function public.get_shared_quote(text) from public;
revoke all on function public.get_shared_brief(text) from public;
grant execute on function public.get_shared_quote(text) to anon, authenticated;
grant execute on function public.get_shared_brief(text) to anon, authenticated;
