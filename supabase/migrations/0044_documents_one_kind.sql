-- 0044_documents_one_kind.sql — jeden rodzaj dokumentu: teczka (T-111)
--
-- T-99…T-101 (ten sam dzień) zrobiły z `doc_kind` prawdziwy typ i pozwoliły
-- zakładać termin / etapy / cennik jako osobne wiersze. Cofnięte decyzją
-- właściciela: te trzy rzeczy są ROZDZIAŁAMI jednej oferty (termin liczy się
-- z pomieszczeń wyceny, cennik dosprzedaje do wyceny i terminu), więc osobne
-- wiersze dawały dwa miejsca na to samo.
--
-- Wiersze założone jako samodzielne dokumenty stają się zwykłą teczką: ich
-- treść (kolumny `schedule` / `documents`) zostaje dokładnie tam, gdzie była,
-- i pokaże się w swojej zakładce. Nic nie ginie.
--
-- Kolumna, check z 0042 i funkcje `next_document_number` / `seed_doc_library`
-- ZOSTAJĄ (usuwanie ich w migracji „w przód” nie daje nic poza ryzykiem);
-- aplikacja niczego już nimi nie steruje.

update public.quotes
   set doc_kind = 'offer'
 where doc_kind <> 'offer';

comment on column public.quotes.doc_kind is
  'Historyczne. Od T-111 kazdy wiersz to teczka (wycena + termin + etapy + cennik) i ma wartosc offer.';
