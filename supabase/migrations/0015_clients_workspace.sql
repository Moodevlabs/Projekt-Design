-- 0015_clients_workspace.sql — klienci jako oś workspace'u (K1, T-53)
--
-- Tabela `clients` istnieje od `0001` (razem z RLS z `0004`), ale bez adresu,
-- miasta i statusu — bo do tej pory nikt jej nie czytał. Ten plik dokłada
-- kolumny, których potrzebuje lista i karta klienta, oraz widok z sumami
-- liczonymi po stronie bazy.

alter table public.clients
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists status text not null default 'active',
  add column if not exists archived_at timestamptz;

alter table public.clients
  drop constraint if exists clients_status_check;
alter table public.clients
  add constraint clients_status_check check (status in ('active', 'archived'));

comment on column public.clients.address is
  'Adres inwestycji — domyslny dla projektow zakladanych u tego klienta (T-54).';

-- Miasto siedzi TU, a `quotes.city` jest jego kopią w wysłanym dokumencie.
-- Konflikt zapowiedziany w T-49 rozstrzygamy tak samo jak `client_name`:
-- źródłem jest klient, wycena trzyma snapshot w `body.client`. Drugiego
-- miejsca zapisu nie dokładamy — `saveQuote` przepisuje `body` do kolumn.
comment on column public.clients.city is
  'Miasto klienta. Zrodlo prawdy; quotes.city to kopia snapshotu z body.client.';

-- Archiwizacja (soft) chowa klienta z list, ale nie rusza jego wycen.
-- To NIE jest `deleted_at`: skasowany klient to kosz, zarchiwizowany to
-- „zamknięta współpraca". Dwa różne stany, dwie różne kolumny.
comment on column public.clients.status is
  'active | archived. Archiwizacja chowa z list, nie kasuje wycen. Kosz to deleted_at.';

-- -----------------------------------------------------------------------------
-- Backfill miasta z wycen.
--
-- Dziś nie ma wyceny z `client_id` (przypinanie wchodzi razem z tą migracją),
-- więc `update` nie ruszy ani jednego wiersza. Jest mimo to, bo migracja musi
-- działać także na bazie, która zdąży takie wiersze dostać, i jest
-- idempotentna — nadpisuje wyłącznie puste miasta.
-- -----------------------------------------------------------------------------
update public.clients c
   set city = q.city
  from (
    select distinct on (client_id) client_id, city
      from public.quotes
     where client_id is not null
       and city is not null
       and city <> ''
     order by client_id, updated_at desc
  ) q
 where q.client_id = c.id
   and (c.city is null or c.city = '');

create index if not exists clients_ws_status_idx
  on public.clients (workspace_id, status)
  where deleted_at is null;

-- Szukanie po fragmencie nazwy/e-maila/telefonu/miasta idzie przez `ilike`
-- w Postgresie (05-UI §3), więc indeks trigramowy oszczędza skan tabeli,
-- gdy klientów zrobi się kilkuset.
create extension if not exists pg_trgm;
create index if not exists clients_name_trgm_idx
  on public.clients using gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- clients_overview — klient razem z sumami z jego wycen.
--
-- Sumy liczy BAZA, nie przeglądarka (koncepcja §2 reguła 6): lista klientów ma
-- rosnąć do setek, a ściąganie wszystkich wycen tylko po to, żeby zsumować
-- zaakceptowane, byłoby tym samym błędem co liczenie totali w komponencie.
--
-- `security_invoker = true` — widok czyta pod RLS-em wołającego, więc nie
-- omija polityk z `0004`. Bez tego widok byłby dziurą w izolacji workspace'ów.
--
-- Liczby projektów tu NIE MA, bo tabela `projects` powstaje dopiero w T-54.
-- Kolumna ze stałym zerem wyglądałaby jak dana, a byłaby zaślepką.
-- -----------------------------------------------------------------------------
drop view if exists public.clients_overview;
create view public.clients_overview
with (security_invoker = true) as
select
  c.id,
  c.workspace_id,
  c.name,
  c.phone,
  c.email,
  c.address,
  c.city,
  c.notes,
  c.status,
  c.archived_at,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  coalesce(s.quotes_count, 0)::int as quotes_count,
  coalesce(s.accepted_net_cents, 0)::bigint as accepted_net_cents,
  greatest(c.updated_at, coalesce(s.last_quote_at, c.updated_at)) as last_activity_at
from public.clients c
left join lateral (
  select
    count(*)::int as quotes_count,
    sum(q.total_net_cents) filter (where q.status = 'accepted') as accepted_net_cents,
    max(q.updated_at) as last_quote_at
  from public.quotes q
  where q.client_id = c.id
    and q.deleted_at is null
) s on true;

comment on view public.clients_overview is
  'Klient + liczba wycen, wartosc zaakceptowanych i ostatnia aktywnosc. security_invoker: RLS wolajacego.';

-- Granty jawne — `0004` odbiera domyślne uprawnienia Supabase i nadaje je
-- wyliczonym obiektom. Nowy widok nie łapie się na tamto `all tables`
-- (pułapka z T-33), więc dostaje własny wpis. Tylko odczyt: zapisy idą do
-- tabeli `clients`.
grant select on public.clients_overview to authenticated;
grant select on public.clients_overview to service_role;
