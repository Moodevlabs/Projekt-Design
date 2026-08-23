-- 0012_quote_schedule.sql — harmonogram w wycenie (F5.1, T-43)
--
-- Harmonogram żyje **w wycenie**, a nie jako osobna encja. Powód jest
-- praktyczny: liczy się z tych samych `rooms`, co cennik parametryczny,
-- a wszystkie cztery dokumenty dla inwestora (oferta, termin, etapy, cennik
-- dodatkowy) mają dzielić jeden numer, jednego klienta i jedną stopkę.
-- Osobna tabela znaczyłaby synchronizowanie pomieszczeń między bytami —
-- czyli dokładnie ten rodzaj pracy, który zawsze gdzieś się rozjedzie.
--
-- Kolumna jest **nullable** i to jest znaczące: `null` = „ta wycena nie ma
-- jeszcze harmonogramu". Pusty obiekt oznaczałby harmonogram bez etapów,
-- czyli coś innego.

alter table public.quotes
  add column if not exists schedule jsonb;

comment on column public.quotes.schedule is
  'Harmonogram wyceny (F5). NULL = brak harmonogramu; patrz domain/schedule.';

-- Bez indeksu: harmonogram czytamy zawsze razem z wycena, po jej `id`.
-- Indeks na jsonb kosztowalby przy kazdym zapisie dokumentu i nic by nie dal.
