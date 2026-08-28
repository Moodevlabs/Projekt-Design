-- =============================================================================
-- 0039 — Koniec automatycznego doboru wariantu logo (poprawka z 2026-08-28)
--
-- Migracja 0030 dała trzy wartości: `auto`, `light`, `dark`. `auto` liczyło
-- kontrast z koloru marki i miało być rozsądną wartością domyślną. W praktyce
-- odpowiadało na złe pytanie: kontrast pasa nagłówka nie mówi nic o znaku,
-- który ma własne tło albo kilka barw, a użytkownik poznawał wybór programu
-- dopiero po wygenerowaniu dokumentu. Wybór wraca więc do człowieka.
--
-- Wiersze z `auto` przeliczamy TĄ SAMĄ regułą, którą stosował program, żeby
-- dokument wygenerowany po aktualizacji wyglądał tak jak ten sprzed niej.
-- Podmiana znaku w ofercie bez wiedzy właściciela byłaby gorsza niż sam
-- automat, który usuwamy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Luminancja względna wg WCAG 2.1 — odpowiednik `relativeLuminance`
-- z `src/domain/brand/color.ts`. Ta sama formuła, bo to ta sama decyzja:
-- gdyby migracja liczyła jaśniejsze/ciemniejsze inaczej niż aplikacja, część
-- workspace'ów dostałaby po aktualizacji inny znak niż miała.
--
-- Najpierw korekta gamma jednej składowej sRGB (0–1) — odpowiednik `channel()`
-- zagnieżdżonego w `relativeLuminance`.
-- -----------------------------------------------------------------------------
create or replace function public.brand_srgb_channel(p_value double precision)
returns double precision
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when p_value <= 0.03928 then p_value / 12.92
    else power((p_value + 0.055) / 1.055, 2.4)
  end;
$$;

create or replace function public.brand_relative_luminance(p_hex text)
returns double precision
language sql
immutable
set search_path = public, pg_catalog
as $$
  -- Zapis, którego nie rozumiemy, daje 0 (czerń) — dokładnie tak jak
  -- `parseHex` w aplikacji, po którym `relativeLuminance` zwraca zero.
  select case
    when lower(btrim(coalesce(p_hex, ''))) ~ '^#[0-9a-f]{6}$' then
        0.2126 * public.brand_srgb_channel(
          ('x' || substr(lower(btrim(p_hex)), 2, 2))::bit(8)::int / 255.0)
      + 0.7152 * public.brand_srgb_channel(
          ('x' || substr(lower(btrim(p_hex)), 4, 2))::bit(8)::int / 255.0)
      + 0.0722 * public.brand_srgb_channel(
          ('x' || substr(lower(btrim(p_hex)), 6, 2))::bit(8)::int / 255.0)
    else 0
  end;
$$;

comment on function public.brand_relative_luminance(text) is
  'Luminancja wzgledna wg WCAG 2.1 dla zapisu #RRGGBB. Odpowiednik relativeLuminance z src/domain/brand/color.ts.';

-- -----------------------------------------------------------------------------
-- Kontrast dwóch kolorów wg WCAG — odpowiednik `contrastRatio`.
--
-- Jaśniejszy zawsze w liczniku, stąd `greatest`/`least`, a nie ustalona
-- kolejność argumentów: kolor marki bywa ciemniejszy od atramentu dokumentu
-- i wtedy odwrócony ułamek dałby wynik poniżej jedności, czyli nieporównywalny
-- z drugą stroną nierówności.
-- -----------------------------------------------------------------------------
create or replace function public.brand_contrast_ratio(p_a text, p_b text)
returns double precision
language sql
immutable
set search_path = public, pg_catalog
as $$
  select (greatest(public.brand_relative_luminance(p_a), public.brand_relative_luminance(p_b)) + 0.05)
       / (least(public.brand_relative_luminance(p_a), public.brand_relative_luminance(p_b)) + 0.05);
$$;

comment on function public.brand_contrast_ratio(text, text) is
  'Kontrast dwoch kolorow #RRGGBB wg WCAG 2.1. Odpowiednik contrastRatio z src/domain/brand/color.ts.';

-- -----------------------------------------------------------------------------
-- Przeliczenie zastanych wierszy.
--
-- Aplikacja wybierała kolor napisu przez PORÓWNANIE KONTRASTU z prawie czernią
-- (#21201C) i bielą (#FFFFFF), a nie przez próg luminancji — i tu robimy tak
-- samo. `isLightBackground` = „wygrywa ciemny atrament", czyli tło jest jasne,
-- więc na nagłówek idzie znak ciemny.
-- -----------------------------------------------------------------------------
update public.brand_kits
   set header_logo = case
         when public.brand_contrast_ratio(accent_color, '#21201c')
              >= public.brand_contrast_ratio(accent_color, '#ffffff')
           then 'dark'
         else 'light'
       end
 where header_logo = 'auto';

-- Cokolwiek innego niż dwie dozwolone wartości (ręczna edycja, stary seed)
-- sprowadzamy do `dark` — pas nagłówka startuje w jasnym beżu marki.
update public.brand_kits
   set header_logo = 'dark'
 where header_logo not in ('light', 'dark');

alter table public.brand_kits
  drop constraint if exists brand_kits_header_logo_check;

alter table public.brand_kits
  alter column header_logo set default 'dark';

alter table public.brand_kits
  add constraint brand_kits_header_logo_check
  check (header_logo in ('light', 'dark'));

comment on column public.brand_kits.header_logo is
  'Ktory wariant logo klasc na pasie naglowka PDF: light (znak jasny, na ciemny pas) albo dark (znak ciemny, na jasny pas). Wybor uzytkownika — program go nie dobiera.';
