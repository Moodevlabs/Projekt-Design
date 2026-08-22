# Projekt Anzorge — paczka startowa dla Claude Code

Zawartość:
- `CLAUDE.md` — zasady i stack (Claude Code czyta automatycznie)
- `docs/00…06` — PRD, architektura, baza, billing, PDF, UI, zadania
- `.claude/commands/` — `/task`, `/review`, `/migration`

Jak zacząć:
1. Wrzuć ten folder jako root nowego repo (`git init`).
2. Dodaj do repo `reference/projekt.html` (prototyp) i `reference/inspiracja.jpeg` — Claude Code może je podejrzeć przy T-08 i T-13.
3. W Claude Code: `/task` → wykona T-01. Dalej `/task` aż do T-17.
4. Przed T-14 załóż konto Stripe (test mode), produkt i ceny; przed T-03 `supabase login` + projekt w EU.

Rzeczy, które musisz ogarnąć sam (Claude nie zrobi):
- Projekt Supabase (region EU), klucze, bucket `brand`.
- Stripe: produkt, 2 ceny, Stripe Tax, Customer Portal config, webhook endpoint na URL Edge Function.
- Google OAuth client (dla logowania Google) z redirectem na Supabase.
- Certyfikaty do podpisu: Apple Developer (notarization), Windows code signing (lub Azure Trusted Signing).
- Domena `anzorge.pl` + strona landing (osobno).
