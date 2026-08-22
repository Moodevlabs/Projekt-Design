Zrób przegląd kodu zmienionego od ostatniego commita (`git diff`) pod kątem zasad z `CLAUDE.md`:
- domain/ bez importów z react/supabase/tauri
- brak bezpośrednich wywołań supabase poza data/
- pieniądze w groszach (int), formatowanie tylko w prezentacji
- brak `any`, `ts-ignore`, `console.log`
- stringi UI w i18n/pl.ts
- RLS przy każdej nowej tabeli, migracja w pliku
- sekrety poza frontendem
Wypisz problemy z plikiem:linią i proponowaną poprawką. Potem je napraw, jeśli są jednoznaczne.
