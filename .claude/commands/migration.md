Utwórz nową migrację Supabase: $ARGUMENTS

1. Przeczytaj `docs/02-DATABASE.md` i ostatnią migrację w `supabase/migrations/`.
2. Utwórz plik `NNNN_<nazwa>.sql` z kolejnym numerem.
3. Każda nowa tabela: `workspace_id`, `created_at`, `updated_at` + trigger, RLS ON + polityki wg wzoru z §3, indeksy.
4. `supabase db reset` i sprawdź brak błędów.
5. `pnpm db:types` i zaktualizuj repozytoria, których to dotyczy.
6. Dopisz zmianę do `docs/02-DATABASE.md` (schemat ma być aktualny).
