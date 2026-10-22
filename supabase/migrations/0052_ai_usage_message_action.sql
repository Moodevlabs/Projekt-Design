-- =============================================================================
-- 0052_ai_usage_message_action.sql — piąta akcja asystenta (T-140)
--
-- `ai_usage.action` ma ograniczenie CHECK z listą akcji (0051). „Z wiadomości"
-- (`message-to-project`) dochodzi do listy; bez tego funkcja brzegowa nie
-- zapisze zużycia tej akcji (zaloguje błąd, odpowiedź i tak dojdzie), a limit
-- miesięczny nie będzie jej liczył.
-- =============================================================================

alter table public.ai_usage drop constraint if exists ai_usage_action_check;

alter table public.ai_usage
  add constraint ai_usage_action_check check (
    action in (
      'import-library',
      'brief-to-quote',
      'comments-to-changes',
      'polish-text',
      'message-to-project'
    )
  );
