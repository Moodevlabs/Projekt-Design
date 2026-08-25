# Toolier — paczka startowa dla Claude Code

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
- Domena `toolier.pl` + strona landing (osobno).

---

## Wydanie 1.0 — co trzeba mieć przed `tauri build`

Ta sekcja jest listą rzeczy **spoza kodu**. Bez nich instalator powstanie, ale
system operacyjny pokaże ostrzeżenie i część użytkowników się wycofa.

### Numer wersji

Numer stoi w **trzech** plikach i musi się zgadzać:

- `package.json` → `version`
- `src-tauri/tauri.conf.json` → `version` (stąd bierze go instalator i updater)
- `src-tauri/Cargo.toml` → `version` (Tauri użyje go, jeśli kiedyś zniknie z `tauri.conf.json`; rozjazd trudno zauważyć, bo nic się nie psuje od razu)

### Windows — podpis kodu

Bez podpisu SmartScreen pokazuje „Windows protected your PC" przy pierwszym
uruchomieniu instalatora.

- Certyfikat: **EV code signing** (token sprzętowy) albo **Azure Trusted Signing**
  (tańsze, bez tokena — wymaga konta Azure i weryfikacji firmy).
- Zmienne dla Tauri: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  (to są klucze **updatera**, osobne od certyfikatu do podpisu pliku).
- Sam podpis pliku `.exe`/`.msi` robi `signtool` albo krok Trusted Signing w CI.
- **Reputacja SmartScreen buduje się osobno dla każdego certyfikatu** — po zmianie
  certyfikatu ostrzeżenia wracają na jakiś czas.

### macOS — podpis i notaryzacja

> Krok po kroku (certyfikat, hasło dla aplikacji, weryfikacja gotowego pliku):
> **[`docs/07-BUILD-MACOS.md`](docs/07-BUILD-MACOS.md)**.

Bez notaryzacji Gatekeeper nie pozwoli uruchomić aplikacji ściągniętej z sieci.

- Konto **Apple Developer Program** (99 USD/rok).
- Certyfikat **Developer ID Application** w keychainie maszyny budującej.
- Zmienne: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
  `APPLE_ID`, `APPLE_PASSWORD` (hasło **app-specific**, nie do Apple ID), `APPLE_TEAM_ID`.
- Notaryzacja idzie automatycznie w `tauri build`, gdy te zmienne są ustawione.
- Build dla macOS musi lecieć **na macOS** — z Windowsa się nie da.

### Ikony

`src-tauri/icons/` trzyma komplet wygenerowany z jednego pliku:

```
npx tauri icon sciezka/do/logo.png
```

Źródło: kwadrat, min. 1024×1024, PNG z przezroczystym tłem.
**Zanim wyjdzie 1.0, sprawdź, czy to nie są jeszcze domyślne ikony Tauri.**

### Zanim ogłosisz wydanie

- [ ] `pnpm lint && pnpm typecheck && pnpm test` — nic czerwonego
- [ ] `pnpm tauri build` na Windows i na macOS
- [ ] Instalator uruchomiony na **czystej maszynie** (bez Node, bez Rusta, bez `.env`)
- [ ] Logowanie, utworzenie wyceny i eksport PDF przeszły na tej maszynie
- [ ] `CHANGELOG.md` ma wpisy tego wydania i numer wersji

