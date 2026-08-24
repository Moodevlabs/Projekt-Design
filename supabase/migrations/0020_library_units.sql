-- =============================================================================
-- 0020_library_units.sql — jednostki, cena „od", „indywidualnie", aktywna
-- (B2, T-60)
--
-- Sedno: **jednostka to etykieta ilości, a tryb liczenia to osobna rzecz**
-- (koncepcja §5 reguła 1). Osiem przycisków „sposób wyceny" z inspiracji
-- mapuje się na trzy istniejące tryby (`flat`/`per_room`/`per_frame`) plus
-- jednostkę. `calcItemCents` się NIE zmienia — nie dokładamy trybów liczenia.
-- =============================================================================

alter table public.library_items
  add column if not exists unit text not null default 'lump',
  add column if not exists unit_label text,
  add column if not exists min_price_cents bigint,
  add column if not exists active boolean not null default true,
  add column if not exists is_sample boolean not null default false;

alter table public.library_items drop constraint if exists library_items_unit_check;
alter table public.library_items
  add constraint library_items_unit_check
  check (unit in ('lump', 'piece', 'm2', 'mb', 'hour', 'visit', 'element', 'frame', 'custom'));

comment on column public.library_items.unit is
  'Etykieta ilosci: lump|piece|m2|mb|hour|visit|element|frame|custom. Tryb liczenia siedzi w `pricing`.';

comment on column public.library_items.unit_label is
  'Wlasna nazwa jednostki — tylko dla unit = custom.';

comment on column public.library_items.min_price_cents is
  'Cena „od" pokazywana na liscie. INFORMACJA, nie regula liczenia — clamp od dolu byłby ukryta logika.';

comment on column public.library_items.active is
  'false = usluga znika z pickera i z „Rozpisz na pomieszczenia", ale zostaje w wycenach, ktore ja maja.';

-- -----------------------------------------------------------------------------
-- Cena `null` = „wycena indywidualna".
--
-- To zmiana KSZTAŁTU pozycji (`int` → `int | null`), więc po stronie domeny
-- idzie z nią `bodyVersion + 1`. Tutaj wystarczy zdjąć `not null`: istniejące
-- wpisy mają liczby i nic ich nie rusza.
--
-- Domyślna wartość zostaje (`0`), żeby stary kod, który nie podaje ceny,
-- dalej zapisywał zero zamiast wpadać w „indywidualnie" przez przypadek.
-- -----------------------------------------------------------------------------
alter table public.library_items alter column unit_price_cents drop not null;

comment on column public.library_items.unit_price_cents is
  'Cena jednostkowa w groszach. NULL = wycena indywidualna (nie wchodzi do sumy).';

create index if not exists library_items_active_idx
  on public.library_items (workspace_id, active)
  where deleted_at is null;
