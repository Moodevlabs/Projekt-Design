-- 0013_quote_documents.sql — dokumenty towarzyszące wycenie (F6.1, T-46)
--
-- Inwestor dostaje PAKIET: ofertę, termin, etapy współpracy i cennik
-- dodatkowy. Wszystkie z jednym numerem, jednym klientem i jedną stopką —
-- dlatego są częściami wyceny, a nie osobnymi encjami. Osobne tabele
-- znaczyłyby synchronizowanie numeru, klienta i brandingu między bytami,
-- czyli pracę, która zawsze gdzieś się rozjedzie.
--
-- Kolumna jest **nullable** i to jest znaczące: `null` = „ta wycena nie ma
-- dokumentów dodatkowych". Pusty obiekt oznaczałby, że ma, ale puste.

alter table public.quotes
  add column if not exists documents jsonb;

comment on column public.quotes.documents is
  'Dokumenty towarzyszące (F6): etapy współpracy, cennik dodatkowy. NULL = brak. Patrz domain/documents.';

-- Bez indeksu: dokumenty czytamy zawsze razem z wycena, po jej `id`.
-- Indeks na jsonb kosztowalby przy kazdym zapisie i nic by nie dal.
