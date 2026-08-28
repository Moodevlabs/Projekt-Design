-- 0042_document_kinds.sql — `doc_kind` staje się prawdziwym typem dokumentu (T-99)
--
-- Do tej migracji `quotes.doc_kind` (0014) było ręczną etykietą rejestru:
-- „oferta / sam termin / sam cennik" — informacją dla człowieka, którą nic
-- w aplikacji nie czytało. Od Fazy 5 wycena jest JEDNYM z czterech rodzajów
-- dokumentu (wycena · termin · etapy współpracy · cennik dodatkowy), a rodzaj
-- decyduje o tym, co edytor pokazuje i który PDF wychodzi.
--
-- Dokument nadal jest wierszem w `quotes`. Numer, klient (snapshot), projekt,
-- status, wersje, archiwum PDF i autozapis są zbudowane na tej tabeli —
-- osobna tabela `documents` znaczyłaby drugi raz to samo z tymi samymi
-- pułapkami. Kolumny `schedule` / `documents` (0012, 0013) dalej niosą treść;
-- `doc_kind` mówi tylko, która z nich jest „tym dokumentem".

-- 1. Nowy zbiór wartości. Stare etykiety mapujemy, a nie kasujemy: „sam
--    termin" znaczył dokładnie to, co dziś znaczy `schedule`.
alter table public.quotes
  drop constraint if exists quotes_doc_kind_check;

update public.quotes set doc_kind = 'schedule'   where doc_kind = 'schedule_only';
update public.quotes set doc_kind = 'price_list' where doc_kind = 'price_list_only';

alter table public.quotes
  add constraint quotes_doc_kind_check
  check (doc_kind in ('offer', 'schedule', 'stages', 'price_list'));

comment on column public.quotes.doc_kind is
  'Rodzaj dokumentu (T-99): offer | schedule | stages | price_list. Decyduje o widoku edytora i PDF.';

-- Rejestr filtruje po rodzaju w obrębie workspace'u — cztery zakładki, każda
-- to osobne zapytanie.
create index if not exists quotes_ws_kind_updated_idx
  on public.quotes (workspace_id, doc_kind, updated_at desc)
  where deleted_at is null;

-- 2. Numeracja per rodzaj, WSPÓLNY licznik.
--
-- Termin dostaje `TER/…`, etapy `ETP/…`, cennik `CEN/…`; wycena zostaje przy
-- `settings.numberPattern` (`WYC/…`). Wzorce własne siedzą w
-- `settings.numberPatterns.{schedule|stages|price_list}`. Licznik jest jeden
-- (`workspaces.quote_seq`), więc numery czterech rejestrów nigdy się nie
-- zderzą w indeksie `quotes_ws_number_uidx` — kosztem „dziur" w numeracji
-- każdego rodzaju z osobna, co jest tańsze niż cztery liczniki i cztery
-- ścieżki blokowania.
create or replace function public.next_document_number(ws uuid, kind text)
returns text
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  seq int;
  pattern text;
  fallback text;
begin
  if not public.is_member(ws) then
    raise exception 'Brak dostępu do workspace %', ws using errcode = '42501';
  end if;

  if not public.workspace_can_write(ws) then
    raise exception 'Workspace % jest w trybie tylko do odczytu', ws using errcode = '42501';
  end if;

  fallback := case kind
    when 'schedule'   then 'TER/{YYYY}/{MM}/{seq}'
    when 'stages'     then 'ETP/{YYYY}/{MM}/{seq}'
    when 'price_list' then 'CEN/{YYYY}/{MM}/{seq}'
    else 'WYC/{YYYY}/{MM}/{seq}'
  end;

  -- UPDATE ... RETURNING bierze blokadę wiersza — jak w next_quote_number.
  update public.workspaces w
     set quote_seq = w.quote_seq + 1
   where w.id = ws
   returning
     w.quote_seq,
     case
       when kind = 'offer' then coalesce(w.settings->>'numberPattern', fallback)
       else coalesce(w.settings->'numberPatterns'->>kind, fallback)
     end
    into seq, pattern;

  if seq is null then
    raise exception 'Workspace % nie istnieje', ws using errcode = 'P0002';
  end if;

  return replace(
           replace(
             replace(pattern, '{YYYY}', to_char(now(), 'YYYY')),
             '{MM}', to_char(now(), 'MM')),
           '{seq}', lpad(seq::text, 4, '0'));
end;
$$;

comment on function public.next_document_number(uuid, text) is
  'Atomowo podbija workspaces.quote_seq i zwraca numer wg wzorca dla rodzaju dokumentu (T-99).';

revoke all on function public.next_document_number(uuid, text) from public;
grant execute on function public.next_document_number(uuid, text) to authenticated, service_role;
