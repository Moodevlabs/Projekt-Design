-- 0014_quotes_register_fields.sql — pola rejestru ofert z arkusza `OFERTY` (F7.1, T-49)
--
-- Arkusz `OFERTY` jest u klienta **rejestrem**: LP, data, numer, rodzaj,
-- inwestor, telefon, e-mail, miasto, notatki. Trzy z tych kolumn nie mają
-- u nas odpowiednika.

alter table public.quotes
  add column if not exists city text,
  add column if not exists internal_notes text,
  add column if not exists doc_kind text not null default 'offer';

-- `city` to KOPIA `body.client.city`, dokładnie na tej samej zasadzie co
-- `client_name`: lista i filtr nie mają rozpakowywać JSONB każdego wiersza.
-- Źródłem prawdy jest dokument, nie ta kolumna.
--
-- Miasto siedzi przy wycenie, a nie przy kliencie (`clients.city`), bo tabela
-- klientów to dopiero T-18. Duplikacja jest tu ŚWIADOMA i odnotowana
-- w `06-TASKS.md` — przy T-18 trzeba będzie zdecydować, które z tych dwóch
-- miejsc wygrywa.
comment on column public.quotes.city is
  'Kopia miasta klienta z body.client.city — do kolumny i filtra na liscie. Zrodlem prawdy jest body.';

-- Notatki NIE idą do `body` i to jest znaczące: są wewnętrzne, nigdy nie
-- trafiają do PDF, a `body` bywa kopiowane do szablonu i duplikatu wyceny.
-- Notatka „klient marudzi przy każdej zmianie" powielona do szablonu to
-- wypadek, którego nie da się cofnąć.
comment on column public.quotes.internal_notes is
  'Notatki wewnetrzne (F7.1). Nigdy nie trafiaja do PDF ani do duplikatu/szablonu.';

-- Rodzaj dokumentu do filtra rejestru. Nie wyliczamy go z `documents`:
-- wycena, ktora ma cennik dodatkowy, nie jest „samym cennikiem" — o tym,
-- co poszlo do inwestora, wie tylko czlowiek.
alter table public.quotes
  drop constraint if exists quotes_doc_kind_check;
alter table public.quotes
  add constraint quotes_doc_kind_check
  check (doc_kind in ('offer', 'schedule_only', 'price_list_only'));

comment on column public.quotes.doc_kind is
  'Rodzaj dokumentu wyslanego inwestorowi (F7.1): offer | schedule_only | price_list_only.';

-- Filtr rejestru po miescie chodzi zawsze w obrebie workspace'u.
create index if not exists quotes_ws_city_idx
  on public.quotes (workspace_id, city)
  where city is not null;
