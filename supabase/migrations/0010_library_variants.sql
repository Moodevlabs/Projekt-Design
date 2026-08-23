-- 0010_library_variants.sql — warianty pozycji bibliotecznych (F1.4, T-52)
--
-- Wariant („Wizualizacja 3D" / „Wizualizacja 360") to OSOBNY wpis biblioteczny
-- wskazujący na lidera grupy, a nie lista schowana w jednym wpisie. Powody:
--
--  * wariant różni się dokładnie tymi polami, które wpis biblioteczny już ma
--    (nazwa, opis, cena, reguła cenowa) — lista w jsonb byłaby drugą kopią
--    tego samego modelu, z własnym parsowaniem i własną migracją;
--  * wycena wiąże się z biblioteką przez `libraryItemId`, więc zmiana wariantu
--    to przepięcie tego jednego pola. Kaskada zmian z biblioteki i licznik
--    „ile pozycji używa tego wpisu" działają bez zmian; przy liście wariantów
--    każde z tych miejsc potrzebowałoby drugiego klucza;
--  * macierz cennika i import CSV (T-50) operują na WIERSZACH — warianty jako
--    wiersze pojawiają się tam same z siebie, warianty w jsonb byłyby dla nich
--    niewidoczne.
--
-- Lider grupy ma `variant_of = null`. Wariant wskazuje na lidera.
-- Grupa = lider + wszystkie wiersze z `variant_of = lider.id`.

alter table public.library_items
  add column if not exists variant_of uuid references public.library_items(id) on delete set null;

comment on column public.library_items.variant_of is
  'Lider grupy wariantów (null = wpis samodzielny albo sam lider). Patrz 0010.';

-- `on delete set null`, nie `cascade`: skasowanie lidera ma zostawić warianty
-- jako samodzielne pozycje. Kaskada skasowałaby razem z „Wizualizacją 3D"
-- także „Wizualizację 360" — czyli cudzy cennik przy okazji sprzątania jednego
-- wpisu.

-- Wariant wariantu dałby drzewo zamiast grupy: wtedy „rodzeństwo" zależałoby
-- od tego, od którego wpisu zacząć. Trzymamy płaską, jednopoziomową grupę.
create or replace function public.library_variant_leader_is_flat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.variant_of is null then
    return new;
  end if;

  if new.variant_of = new.id then
    raise exception 'Pozycja nie może być wariantem samej siebie.';
  end if;

  if exists (
    select 1 from public.library_items
     where id = new.variant_of
       and variant_of is not null
  ) then
    raise exception 'Wariant może wskazywać tylko na pozycję główną.';
  end if;

  return new;
end;
$$;

comment on function public.library_variant_leader_is_flat() is
  'Pilnuje, że grupa wariantów jest płaska: wariant wskazuje wyłącznie na lidera.';

drop trigger if exists library_items_variant_flat on public.library_items;
create trigger library_items_variant_flat
  before insert or update of variant_of on public.library_items
  for each row execute function public.library_variant_leader_is_flat();

-- Lidera szukamy przy każdym wyświetleniu biblioteki.
create index if not exists library_items_variant_of_idx
  on public.library_items (variant_of)
  where variant_of is not null;
