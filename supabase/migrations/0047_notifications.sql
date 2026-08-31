-- =============================================================================
-- 0047_notifications.sql — powiadomienia e-mail o ruchu klienta (T-116)
--
-- ## Problem
--
-- Klient otwiera link z ofertą, akceptuje ją albo pisze uwagi — a projektant
-- dowiaduje się o tym dopiero wtedy, gdy sam włączy Toolier i zajrzy w pasek
-- „Co nowego u klientów" (0026 + `activity.repo`). Realtime niesie zdarzenie
-- do OTWARTEJ aplikacji; poza nią nie niesie go nigdzie. W praktyce znaczy to,
-- że akceptacja z piątkowego wieczoru czeka do poniedziałku.
--
-- ## Dlaczego skrzynka nadawcza, a nie wysyłka z bazy
--
-- Baza nie ma jak wysłać maila i nie powinna próbować. Gdyby RPC klienta
-- wołało HTTP (pg_net) w swojej transakcji, to:
--   • akceptacja oferty czekałaby na odpowiedź obcego serwera,
--   • awaria dostawcy poczty przewracałaby akceptację,
--   • ponowienie po błędzie nie miałoby się na czym oprzeć.
--
-- Dlatego RPC **odkłada wiersz** do `notification_outbox` (to jest część tej
-- samej transakcji, więc zdarzenie zapisane = powiadomienie zakolejkowane),
-- a wysyłką zajmuje się funkcja brzegowa `notify`, która kolejkę opróżnia.
-- Ten sam wzorzec co przy webhooku Stripe'a: baza trzyma stan, Deno gada
-- ze światem.
--
-- ⚠️ **Zakolejkowanie nigdy nie może wywrócić działania klienta.** Każde
--    wywołanie `enqueue_notification` jest opakowane w przechwycenie wyjątku:
--    brak adresata, uszkodzony JSON w ustawieniach czy błąd zapisu kończy się
--    brakiem maila, a nie brakiem akceptacji.
--
-- ## Adresata rozstrzygamy PRZY ZAKOLEJKOWANIU
--
-- Nie przy wysyłce. Powód jest praktyczny: gdyby adres czytała funkcja
-- brzegowa, zmiana adresu w ustawieniach przekierowałaby też zdarzenia
-- sprzed zmiany — a te dotyczą tego, co działo się wcześniej. Przy okazji
-- funkcja brzegowa nie musi zaglądać do schematu `auth`.
-- =============================================================================

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Te same nazwy co `ActivityKind` w `src/data/repos/activity.repo.ts`,
  -- plus brief. Rozjazd znaczyłby dwa słowniki na to samo zdarzenie.
  kind text not null check (kind in ('viewed', 'accepted', 'rejected', 'comment', 'brief')),

  quote_id uuid references public.quotes(id)        on delete cascade,
  brief_id uuid references public.client_briefs(id) on delete cascade,
  share_id uuid references public.quote_shares(id)  on delete set null,

  -- Adres wyliczony w chwili zdarzenia (patrz nagłówek).
  recipient text not null check (position('@' in recipient) > 1),

  -- Wszystko, czego potrzebuje treść maila: numer i tytuł wyceny, nazwa
  -- klienta, kto podpisał, fragment uwagi. Funkcja brzegowa NIE dopytuje
  -- bazy o kontekst — dostaje go tutaj, razem ze zdarzeniem.
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,

  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at    timestamptz
);

comment on table public.notification_outbox is
  'Skrzynka nadawcza powiadomien e-mail. Zapisuja do niej RPC strony klienta; oproznia ja funkcja brzegowa `notify`.';
comment on column public.notification_outbox.recipient is
  'Adres wyliczony w chwili zdarzenia — zmiana adresu w ustawieniach nie przekierowuje zdarzen sprzed zmiany.';
comment on column public.notification_outbox.payload is
  'Kontekst do tresci maila (numer, tytul, klient, podpis, fragment uwagi). Funkcja brzegowa nie dopytuje bazy.';

-- Po tym indeksie chodzi `claim_notifications` — jedyne zapytanie, które musi
-- być szybkie. Częściowy, bo wysłane wiersze przestają być interesujące.
create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where status in ('pending', 'sending');

create index if not exists notification_outbox_workspace_idx
  on public.notification_outbox (workspace_id, created_at desc);

alter table public.notification_outbox enable row level security;

-- Właściciel workspace'u może zobaczyć, co poszło (i co się nie udało).
-- Zapisu nie ma dla nikogo poza funkcjami SECURITY DEFINER i `service_role`:
-- gdyby dało się wstawić wiersz z aplikacji, adres nadawcy Toolier stałby się
-- otwartym formularzem wysyłki maili.
drop policy if exists "notification_outbox: select member" on public.notification_outbox;
create policy "notification_outbox: select member" on public.notification_outbox
  for select to authenticated
  using (public.is_member(workspace_id));

revoke insert, update, delete on public.notification_outbox from authenticated;

/*
 * Anonim nie ma tu czego szukać — i trzeba to napisać wprost.
 *
 * 0004 §5 odebrało anonimowi wszystkie tabele, ale dotyczyło tabel, które
 * wtedy istniały. Supabase ma DEFAULT PRIVILEGES nadające `anon` komplet praw
 * do każdej NOWEJ tabeli w `public`, więc świeżo założona dostaje je z powrotem
 * (sprawdzone: `has_table_privilege('anon', …, 'select')` = true bez tej linii).
 *
 * Rzeczywistego wycieku by nie było — RLS stoi, a `anon` nie ma tu żadnej
 * polityki, więc zobaczyłby zero wierszy. Ale zasada z 0025 brzmi „anon nie
 * dostaje ANI JEDNEGO grantu tabelowego" i to ona jest zabezpieczeniem;
 * poleganie na tym, że druga warstwa i tak zatrzyma, jest dokładnie tym
 * sposobem myślenia, przez który dziury robią się ciche.
 */
revoke all on public.notification_outbox from anon;

-- =============================================================================
-- Ustawienia — czytane z `workspaces.settings->'notifications'`
--
-- Bez osobnej tabeli: to jest kilka przełączników jednego workspace'u, a
-- `settings` jest już miejscem, w którym stoją wszystkie takie rzeczy
-- (`numberPattern`, `activitySeenAt`). Kształt pilnuje zod w
-- `src/domain/notifications/schema.ts`.
-- =============================================================================

/*
 * Brak klucza = WŁĄCZONE. Powiadomienia są sensem tej zmiany, a konto sprzed
 * niej nie ma w `settings` niczego, na czym dałoby się oprzeć zgodę — więc
 * albo domyślnie działa, albo nie działa nikomu do czasu wejścia w ustawienia.
 * Adresatem jest własna skrzynka właściciela, więc nie jest to wysyłka do
 * osób trzecich.
 */
create or replace function public.notifications_enabled(p_workspace_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (w.settings -> 'notifications' ->> 'enabled') is distinct from 'false'
      and (w.settings -> 'notifications' ->> p_kind) is distinct from 'false',
    true
  )
  from public.workspaces w
  where w.id = p_workspace_id;
$$;

comment on function public.notifications_enabled(uuid, text) is
  'Czy workspace chce dostawac powiadomienia tego rodzaju. Brak ustawienia = tak.';

/*
 * Adresat: własny adres z ustawień, a jeśli go nie ma — adres konta
 * właściciela. `auth.users` jest dostępne tylko dlatego, że funkcja jest
 * SECURITY DEFINER; dlatego zwraca WYŁĄCZNIE adres tego jednego workspace'u
 * i nie jest nadana anonimowi.
 */
create or replace function public.notification_recipient(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    nullif(btrim(w.settings -> 'notifications' ->> 'email'), ''),
    u.email
  )
  from public.workspaces w
  join auth.users u on u.id = w.owner_id
  where w.id = p_workspace_id;
$$;

comment on function public.notification_recipient(uuid) is
  'Adres, na ktory ida powiadomienia workspace''u: z ustawien, a w braku — adres konta wlasciciela.';

-- =============================================================================
-- Zakolejkowanie
-- =============================================================================
create or replace function public.enqueue_notification(
  p_workspace_id uuid,
  p_kind         text,
  p_payload      jsonb default '{}'::jsonb,
  p_quote_id     uuid  default null,
  p_share_id     uuid  default null,
  p_brief_id     uuid  default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_to text;
begin
  if p_workspace_id is null then
    return;
  end if;

  if not public.notifications_enabled(p_workspace_id, p_kind) then
    return;
  end if;

  v_to := public.notification_recipient(p_workspace_id);
  -- Konto bez adresu (teoretycznie niemożliwe — logowanie idzie mailem)
  -- kończy się brakiem wiersza, a nie wierszem bez adresata.
  if v_to is null or position('@' in v_to) < 2 then
    return;
  end if;

  insert into public.notification_outbox
    (workspace_id, kind, quote_id, share_id, brief_id, recipient, payload)
  values
    (p_workspace_id, p_kind, p_quote_id, p_share_id, p_brief_id, v_to,
     coalesce(p_payload, '{}'::jsonb));
exception
  -- Powiadomienie jest dodatkiem do zdarzenia, nie jego warunkiem. Awaria
  -- tutaj nie ma prawa cofnąć akceptacji oferty ani zapisu uwagi klienta.
  when others then
    return;
end;
$$;

comment on function public.enqueue_notification(uuid, text, jsonb, uuid, uuid, uuid) is
  'Odklada powiadomienie do skrzynki nadawczej. Cichy no-op, gdy wylaczone, brak adresata albo blad — nigdy nie przewraca transakcji wolajacego.';

-- =============================================================================
-- Opróżnianie kolejki — wyłącznie dla `service_role` (funkcja brzegowa)
-- =============================================================================

/*
 * `for update skip locked` zamiast „select, potem update": dwa równoległe
 * przebiegi funkcji brzegowej (cron i ręczne wywołanie z aplikacji) nie mogą
 * wziąć tego samego wiersza, bo klient dostałby dwa identyczne maile.
 *
 * Wiersz zajęty dłużej niż 10 minut wraca do puli — to jest odpowiedź na
 * „funkcja brzegowa padła w połowie": bez tego wiersz zostałby w `sending`
 * na zawsze. Ryzyko duplikatu przy takim odzysku jest świadome i mniejsze
 * niż powiadomienie, które nigdy nie dochodzi.
 */
create or replace function public.claim_notifications(p_limit int default 20)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  with kandydaci as (
    select o.id
      from public.notification_outbox o
     where o.status = 'pending'
        or (o.status = 'sending' and o.claimed_at < now() - interval '10 minutes')
     order by o.created_at
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  )
  update public.notification_outbox o
     set status     = 'sending',
         claimed_at = now(),
         attempts   = o.attempts + 1
    from kandydaci k
   where o.id = k.id
  returning o.*;
end;
$$;

comment on function public.claim_notifications(int) is
  'Zajmuje partie powiadomien do wyslania. Tylko service_role — to jest wejscie funkcji brzegowej.';

create or replace function public.mark_notification_sent(p_id uuid)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  update public.notification_outbox
     set status = 'sent', sent_at = now(), last_error = null
   where id = p_id;
$$;

/*
 * Nieudana wysyłka wraca do kolejki, dopóki nie wyczerpie prób. Piąta porażka
 * zamyka wiersz jako `failed` — powtarzanie w nieskończoność zamieniłoby
 * literówkę w adresie w wieczne odpytywanie dostawcy poczty.
 */
create or replace function public.mark_notification_failed(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  update public.notification_outbox
     set status     = case when attempts >= 5 then 'failed' else 'pending' end,
         last_error = left(coalesce(p_error, ''), 1000),
         claimed_at = null
   where id = p_id;
$$;

/*
 * Sprzątanie. Skrzynka nadawcza jest dziennikiem wysyłki, a nie archiwum:
 * zdarzenia i tak zostają w `quote_acceptances`, `quote_comments`
 * i `quote_shares`. Trzymamy 60 dni, żeby dało się odpowiedzieć na pytanie
 * „czy ten mail w ogóle wyszedł".
 */
create or replace function public.prune_notification_outbox()
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count int;
begin
  delete from public.notification_outbox
   where status = 'sent'
     and sent_at < now() - interval '60 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.notifications_enabled(uuid, text)        from public;
revoke all on function public.notification_recipient(uuid)             from public;
revoke all on function public.enqueue_notification(uuid, text, jsonb, uuid, uuid, uuid) from public;
revoke all on function public.claim_notifications(int)                 from public;
revoke all on function public.mark_notification_sent(uuid)             from public;
revoke all on function public.mark_notification_failed(uuid, text)     from public;
revoke all on function public.prune_notification_outbox()              from public;

-- Kolejkę obsługuje wyłącznie funkcja brzegowa (`service_role`).
-- `authenticated` NIE dostaje `enqueue_notification`: adres nadawcy Toolier
-- nie może być formularzem wysyłki maili dla zalogowanego użytkownika.
grant execute on function public.claim_notifications(int)              to service_role;
grant execute on function public.mark_notification_sent(uuid)          to service_role;
grant execute on function public.mark_notification_failed(uuid, text)  to service_role;
grant execute on function public.prune_notification_outbox()           to service_role;
grant execute on function public.notification_recipient(uuid)          to service_role;
grant execute on function public.notifications_enabled(uuid, text)     to service_role;

-- =============================================================================
-- RPC strony klienta — te same funkcje co w 0025/0033/0034, plus jedna linia
-- zakolejkowania. Odtwarzamy je w całości, bo `create or replace` wymaga
-- pełnego ciała; różnice wobec poprzedniej wersji są oznaczone `T-116`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPC 1 — odczyt oferty. Powiadamiamy o PIERWSZYM otwarciu.
--
-- Nie o każdym: klient wraca do oferty, pokazuje ją współmałżonkowi, otwiera
-- z drugiego urządzenia. Mail przy każdym wejściu zamieniłby powiadomienie
-- w szum, a szum się wyłącza. „Klient otworzył ofertę" jest informacją
-- dokładnie raz — potem liczy się już tylko decyzja.
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

  -- T-116. `v_share` pochodzi sprzed UPDATE-a powyżej, więc `first_viewed_at
  -- is null` znaczy dokładnie „to jest pierwsze otwarcie".
  if v_share.first_viewed_at is null then
    perform public.enqueue_notification(
      v_quote.workspace_id,
      'viewed',
      jsonb_build_object(
        'quoteNumber', v_quote.number,
        'quoteTitle',  v_quote.title,
        'clientName',  v_quote.client_name
      ),
      v_quote.id,
      v_share.id
    );
  end if;

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
    -- Odnośniki do wizualizacji (T-116) idą w `body.links` — też za darmo.
    'schedule',  v_quote.schedule,
    'documents', v_quote.documents,
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

-- -----------------------------------------------------------------------------
-- RPC 2 — akceptacja
-- -----------------------------------------------------------------------------
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

  -- T-116
  perform public.enqueue_notification(
    v_quote.workspace_id,
    'accepted',
    jsonb_build_object(
      'quoteNumber', v_quote.number,
      'quoteTitle',  v_quote.title,
      'clientName',  v_quote.client_name,
      'signerName',  left(v_name, 200),
      'itemCount',   coalesce(array_length(p_enabled_ids, 1), 0)
    ),
    v_quote.id,
    v_share.id
  );

  return jsonb_build_object('ok', true, 'acceptedAt', now());
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC 4 — odmowa
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
  v_reason text;
begin
  v_status := public.share_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  v_name := btrim(coalesce(p_signer_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'name_required');
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

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
     'rejected', v_reason);

  update public.quotes
     set status = 'rejected'
   where id = v_quote.id;

  -- T-116
  perform public.enqueue_notification(
    v_quote.workspace_id,
    'rejected',
    jsonb_build_object(
      'quoteNumber', v_quote.number,
      'quoteTitle',  v_quote.title,
      'clientName',  v_quote.client_name,
      'signerName',  left(v_name, 200),
      'reason',      left(coalesce(v_reason, ''), 1000)
    ),
    v_quote.id,
    v_share.id
  );

  return jsonb_build_object('ok', true, 'rejectedAt', now());
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC 3 — uwagi
-- -----------------------------------------------------------------------------
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
  v_quote   public.quotes;
  v_status  text;
  v_message text;
  v_author  text;
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

  v_author  := nullif(left(btrim(coalesce(p_author_name, '')), 200), '');
  v_message := left(v_message, 4000);

  insert into public.quote_comments (quote_id, share_id, author_name, message, author_ip)
  values (v_share.quote_id, v_share.id, v_author, v_message, public.request_ip());

  -- T-116. Treść uwagi idzie do maila w całości: to jest jedyne zdarzenie,
  -- w którym „coś się wydarzyło" nie wystarcza — projektant musi wiedzieć CO,
  -- żeby ocenić, czy odpisuje dziś, czy w poniedziałek.
  select * into v_quote from public.quotes where id = v_share.quote_id;
  perform public.enqueue_notification(
    v_quote.workspace_id,
    'comment',
    jsonb_build_object(
      'quoteNumber', v_quote.number,
      'quoteTitle',  v_quote.title,
      'clientName',  v_quote.client_name,
      'authorName',  v_author,
      'message',     v_message
    ),
    v_quote.id,
    v_share.id
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Brief — powiadamiamy o PIERWSZYM odesłaniu.
--
-- Brief wypełnia się na raty (`submit_shared_brief` można powtarzać, póki link
-- żyje), więc mail przy każdym zapisie znaczyłby kilkanaście wiadomości
-- z jednego formularza.
-- -----------------------------------------------------------------------------
create or replace function public.submit_shared_brief(
  p_token   text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_brief  public.client_briefs;
  v_status text;
  v_client text;
begin
  v_status := public.brief_status(p_token);
  if v_status <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', v_status);
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'message_required');
  end if;

  select * into v_brief from public.client_briefs where token = p_token for update;

  update public.client_briefs
     set answers      = p_answers,
         submitted_at = now()
   where id = v_brief.id;

  -- T-116
  if v_brief.submitted_at is null then
    select c.name into v_client from public.clients c where c.id = v_brief.client_id;

    perform public.enqueue_notification(
      v_brief.workspace_id,
      'brief',
      jsonb_build_object('clientName', v_client),
      null,
      null,
      v_brief.id
    );
  end if;

  return jsonb_build_object('ok', true, 'submittedAt', now());
end;
$$;

-- =============================================================================
-- Uprawnienia po odtworzeniu funkcji
--
-- `create or replace` zachowuje nadane granty, ale 0025 odbiera anonimowi
-- WSZYSTKO w schemacie `public` i oddaje wymienione z nazwy. Powtarzamy to
-- tutaj, żeby stan po tej migracji nie zależał od kolejności wykonania.
-- =============================================================================
revoke all on function public.get_shared_quote(text)                      from public;
revoke all on function public.accept_shared_quote(text, text[], text)     from public;
revoke all on function public.reject_shared_quote(text, text, text)       from public;
revoke all on function public.comment_shared_quote(text, text, text)      from public;
revoke all on function public.submit_shared_brief(text, jsonb)            from public;

grant execute on function public.get_shared_quote(text)                   to anon, authenticated;
grant execute on function public.accept_shared_quote(text, text[], text)  to anon, authenticated;
grant execute on function public.reject_shared_quote(text, text, text)    to anon, authenticated;
grant execute on function public.comment_shared_quote(text, text, text)   to anon, authenticated;
grant execute on function public.submit_shared_brief(text, jsonb)         to anon, authenticated;

-- Nowe funkcje NIE trafiają do anonima. `alter default privileges` z 0025
-- powinno tego pilnować, ale powtórzenie kosztuje jedną linię, a pomyłka
-- kosztowałaby otwarty dostęp do kolejki wysyłki.
revoke execute on function public.enqueue_notification(uuid, text, jsonb, uuid, uuid, uuid) from anon;
revoke execute on function public.claim_notifications(int)                                  from anon;
revoke execute on function public.mark_notification_sent(uuid)                              from anon;
revoke execute on function public.mark_notification_failed(uuid, text)                      from anon;
revoke execute on function public.prune_notification_outbox()                               from anon;
revoke execute on function public.notification_recipient(uuid)                              from anon;
revoke execute on function public.notifications_enabled(uuid, text)                         from anon;
