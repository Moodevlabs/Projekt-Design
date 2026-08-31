-- =============================================================================
-- notifications-cron.sql — cykliczne opróżnianie skrzynki powiadomień (T-116)
--
-- ⚠️ **To NIE jest migracja i nie leży w `supabase/migrations/`.** Uruchamia
--    się to RĘCZNIE, raz, w SQL Editorze projektu w chmurze — bo zawiera
--    adres projektu i sekret, których w repozytorium być nie może (CLAUDE.md
--    §10). Migracja z wpisanym sekretem byłaby sekretem w repozytorium.
--
-- ## Co to robi
--
-- `pg_cron` co minutę woła funkcję brzegową `notify` z akcją `drain`.
-- Funkcja bierze partię wierszy z `notification_outbox` i wysyła je Resendem.
-- Bez tego kroku powiadomienia będą się poprawnie kolejkować i nigdy nie
-- wyjdą — kolejka bez konsumenta jest tylko dziennikiem zdarzeń.
--
-- ## Zanim to uruchomisz
--
--  1. Wdróż funkcję:  `supabase functions deploy notify --no-verify-jwt`
--  2. Ustaw sekrety:  `supabase secrets set RESEND_API_KEY=re_… RESEND_FROM='Toolier <powiadomienia@toolier.pl>' NOTIFY_SECRET=<długi losowy ciąg>`
--  3. Zweryfikuj domenę nadawcy w Resendzie (SPF + DKIM). Bez tego Resend
--     odrzuci wysyłkę, a powód wyląduje w `notification_outbox.last_error`.
--
-- ## Podstaw swoje wartości
--
--   <PROJECT_REF>    — identyfikator projektu Supabase (z adresu panelu)
--   <NOTIFY_SECRET>  — ta sama wartość, którą ustawiłeś w sekretach funkcji
-- =============================================================================

create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- Ponowne uruchomienie tego pliku nie zdubluje zadania.
select cron.unschedule('toolier-notify-drain')
 where exists (select 1 from cron.job where jobname = 'toolier-notify-drain');

select cron.schedule(
  'toolier-notify-drain',
  '* * * * *',
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify',
      headers := jsonb_build_object(
                   'Content-Type',     'application/json',
                   'x-notify-secret',  '<NOTIFY_SECRET>'
                 ),
      body    := jsonb_build_object('action', 'drain'),
      timeout_milliseconds := 20000
    );
  $$
);

-- -----------------------------------------------------------------------------
-- Sprawdzenie
-- -----------------------------------------------------------------------------
-- Czy zadanie stoi:
--   select jobname, schedule, active from cron.job;
--
-- Czy przebiegi się udają (ostatnie 10):
--   select status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'toolier-notify-drain')
--    order by start_time desc limit 10;
--
-- Co stoi w kolejce i dlaczego nie wyszło:
--   select kind, status, attempts, last_error, created_at
--     from public.notification_outbox
--    order by created_at desc limit 20;
--
-- Wyłączenie wysyłki bez kasowania zadania:
--   select cron.alter_job(
--            (select jobid from cron.job where jobname = 'toolier-notify-drain'),
--            active := false
--          );
-- -----------------------------------------------------------------------------
