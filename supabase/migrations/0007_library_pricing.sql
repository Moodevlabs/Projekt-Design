-- =============================================================================
-- 0007 — Reguły cenowe pozycji bibliotecznych (T-34 / FEATURES §F1.3)
--
-- Do tej pory wpis biblioteczny miał jedną cenę jednostkową. Cennik
-- parametryczny wymaga, żeby usługa mogła być opisana jako „baza + składnik za
-- każde pomieszczenie” — i żeby ten opis mieszkał w bibliotece, a nie był
-- wpisywany od nowa w każdej wycenie.
--
-- Kształt JSON-a to `PricingRule` z `domain/quote/schema.ts`; waliduje go zod
-- przy odczycie (CLAUDE.md §2), dlatego kolumna jest zwykłym `jsonb` bez CHECK-a
-- — reguła jest unią po `mode` i sprawdzanie jej w SQL rozjechałoby się
-- z domeną przy pierwszej zmianie.
-- =============================================================================

alter table public.library_items
  add column if not exists pricing jsonb not null default '{"mode":"flat"}'::jsonb;

comment on column public.library_items.pricing is
  'Reguła wyceny (PricingRule z domeny): flat | per_room | per_frame. Domyślnie flat = qty × unit_price_cents.';
