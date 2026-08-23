-- 0011_library_pricing_basis.sql — jednostka wpisu bibliotecznego (F2.1, T-40)
--
-- W trybie godzinowym te same kolumny (`unit_price_cents`, `pricing.baseCents`,
-- `pricing.perRoomCents`) znaczą **minuty**, nie grosze. To decyzja z arkusza
-- i jest tania w domenie — ale niebezpieczna na granicy z biblioteką.
--
-- Konkretna pułapka: pozycja „45" zapisana do biblioteki z wyceny godzinowej
-- (45 minut) wstawiona do wyceny kwotowej stałaby się **45 groszy**. Liczba
-- wygląda wiarygodnie, więc nikt by tego nie zauważył aż do wysłanej oferty.
--
-- Rozstrzygnięcie: wpis biblioteczny **sam mówi, czym są jego liczby**. Dane
-- opisują siebie, zamiast zależeć od tego, kto akurat je czyta. Alternatywa
-- (blokada kaskady między trybami) byłaby mniejszą zmianą, ale zostawiałaby
-- bibliotekę, w której nie da się odróżnić 45 minut od 45 groszy — a to samo
-- pytanie wróciłoby przy imporcie CSV, macierzy cennika i eksporcie danych.

alter table public.library_items
  add column if not exists pricing_basis text not null default 'amount'
    check (pricing_basis in ('amount', 'time'));

comment on column public.library_items.pricing_basis is
  'Czym są liczby tego wpisu: ''amount'' = grosze, ''time'' = minuty pracy. Patrz 0011.';

-- Wszystko, co powstało przed tą migracją, jest kwotowe: tryb godzinowy nie
-- istniał, więc nie ma wpisu, którego liczby znaczyłyby minuty. `default`
-- załatwia to bez osobnego UPDATE.

create index if not exists library_items_pricing_basis_idx
  on public.library_items (workspace_id, pricing_basis);
