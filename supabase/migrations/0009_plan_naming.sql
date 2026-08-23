-- =============================================================================
-- 0009 — Nazewnictwo okresu rozliczeniowego (korekta produktowa)
--
-- `subscriptions.plan` trzymał wartości `pro_monthly` / `pro_yearly`, co
-- sugerowało istnienie planu „Pro", a więc i wersji darmowej. Tak nie jest:
-- aplikacja jest płatna w całości, a jedyny wybór to **częstotliwość
-- płatności**. Stąd `monthly` / `yearly`.
--
-- Kolumna nie ma CHECK-a, więc zmiana jest wyłącznie danymi i komentarzem —
-- ale to komentarz czyta następna osoba pisząca webhook, a nie dokumentacja.
-- =============================================================================

update public.subscriptions
   set plan = case plan
                when 'pro_monthly' then 'monthly'
                when 'pro_yearly'  then 'yearly'
                else plan
              end
 where plan in ('pro_monthly', 'pro_yearly');

comment on column public.subscriptions.plan is
  'Okres rozliczeniowy: monthly | yearly. NIE jest to plan/pakiet — aplikacja nie ma wersji darmowej, opłata dotyczy dostępu.';
