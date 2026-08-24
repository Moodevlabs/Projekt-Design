-- =============================================================================
-- 0018_quote_versions.sql — wersje wycen v1/v2 i status `archived` (W1, T-57)
--
-- Wersjonowanie **lekkie** (decyzja D7): linia wersji + numer kolejny, bez
-- historii zmian dokumentu. Pełna historia (diff pozycji, porównanie totali)
-- zostaje w fazie 2 jako T-22.
-- =============================================================================

alter table public.quotes
  add column if not exists lineage_id uuid,
  add column if not exists version int not null default 1;

-- Backfill: każda istniejąca wycena jest v1 własnej linii. `lineage_id = id`
-- daje to za darmo i jest idempotentne.
update public.quotes set lineage_id = id where lineage_id is null;

/*
 * Nowa wycena zakłada własną linię.
 *
 * Trigger, a nie `default gen_random_uuid()`: chcemy, żeby v1 miała
 * `lineage_id = id`, bo wtedy linię widać w danych gołym okiem i nie trzeba
 * jej nigdzie szukać. Domyślna wartość kolumny nie ma dostępu do `new.id`.
 *
 * Trigger, a nie obowiązek po stronie aplikacji: wstawiać wyceny potrafi też
 * seed i migracja, a niepodanie linii kończyłoby się błędem NOT NULL zamiast
 * sensownego zachowania.
 */
create or replace function public.quotes_set_lineage()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.lineage_id is null then
    new.lineage_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_lineage_default on public.quotes;
create trigger quotes_lineage_default
  before insert on public.quotes
  for each row execute function public.quotes_set_lineage();

alter table public.quotes alter column lineage_id set not null;

comment on column public.quotes.lineage_id is
  'Wspolny dla wszystkich wersji tej samej oferty. Duplikat zaklada NOWA linie, nowa wersja zostaje w tej samej.';

comment on column public.quotes.version is
  'Numer wersji w linii (1, 2, 3…). Do PDF trafia tylko przy showVersionOnPdf; w nazwie pliku jest zawsze.';

create index if not exists quotes_lineage_idx
  on public.quotes (lineage_id, version desc);

-- -----------------------------------------------------------------------------
-- Status `archived`.
--
-- To **status**, a nie `deleted_at` (koncepcja §4 reguła 4). Archiwalna wersja
-- dalej jest na liście projektu i w rejestrze — po prostu przestała być
-- aktualną propozycją. `deleted_at` to kosz i zostaje osobno; w UI dawna
-- „Archiwizuj" nazywa się teraz „Usuń", bo dwa różne „archiwa" to pułapka.
-- -----------------------------------------------------------------------------
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'archived'));

-- -----------------------------------------------------------------------------
-- Jedna zaakceptowana wycena na projekt.
--
-- Indeks częściowy, bo warunek dotyczy wyłącznie żywych, zaakceptowanych wycen
-- przypiętych do teczki. Wyceny bez projektu (`project_id is null`) nie mają
-- tu czego pilnować — „szybka wycena" nie należy do żadnej inwestycji.
--
-- To baza rozstrzyga wyścig dwóch równoległych akceptacji. UI ma zamienić
-- odbicie (`23505` na TYM indeksie) na zdanie po polsku z propozycją
-- zastąpienia, a nie pokazać „błąd zapisu".
-- -----------------------------------------------------------------------------
create unique index if not exists quotes_one_accepted_per_project
  on public.quotes (project_id)
  where status = 'accepted' and deleted_at is null and project_id is not null;
