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

### Auto-update (T-19)

Aplikacja sprawdza aktualizacje przy starcie (cicho) i na żądanie
w **Ustawieniach → Aktualizacje**. Nic nie instaluje się samo — restart
w środku przygotowywania oferty byłby gorszy niż dzień zwłoki z poprawką.

**Klucz podpisujący aktualizacje.** Para kluczy została wygenerowana
2026-08-26 (`pnpm tauri signer generate`):

- klucz **publiczny** siedzi w `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`;
- klucz **prywatny** leży w `.tauri/updater.key` i jest w `.gitignore`.

> ⚠️ **Przenieś klucz prywatny do menedżera haseł i dodaj go jako sekret
> `TAURI_SIGNING_PRIVATE_KEY` w GitHubie.** Utrata tego klucza znaczy, że
> **żadna przyszła aktualizacja nie dotrze do zainstalowanych aplikacji** —
> trzeba by wypuścić nowy instalator i poprosić wszystkich o ręczną
> reinstalację. Jego wyciek jest gorszy: pozwala podać sfałszowaną
> aktualizację każdemu użytkownikowi Toolier.
>
> Dopóki nie ma **żadnego** wydania, klucz można bezkarnie wygenerować od
> nowa (`pnpm tauri signer generate -w .tauri/updater.key -f`) i podmienić
> `pubkey`. Po pierwszym wydaniu to już nie jest możliwe bez zerwania
> aktualizacji u ludzi, którzy je zainstalowali.

**Skąd aplikacja bierze wersje.** `plugins.updater.endpoints` wskazuje na
`latest.json` w najnowszym wydaniu GitHuba. Plik generuje się sam —
`.github/workflows/release.yml` woła `tauri-action` z
`includeUpdaterJson: true`.

**Wydanie idzie tagiem:**

```
git tag v1.0.1 && git push origin v1.0.1
```

Workflow buduje macOS (arm64 + x86_64) i Windows, podpisuje i tworzy
**szkic** wydania. `latest.json` staje się widoczny dla wszystkich aplikacji
dopiero w chwili opublikowania — dlatego ten moment wybiera człowiek.

Sekrety wymagane przez workflow: `TAURI_SIGNING_PRIVATE_KEY`,
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (puste, jeśli klucz bez hasła),
komplet `APPLE_*`, oraz `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SHARE_BASE_URL`.

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

