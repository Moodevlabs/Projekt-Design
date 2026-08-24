# Build macOS — podpisany i notaryzowany `.dmg`

Cel: plik, który druga osoba otwiera **podwójnym kliknięciem**, bez „nie można
otworzyć, bo pochodzi od niezidentyfikowanego dewelopera".

Warunek: **opłacone Apple Developer Program**. Bez tego da się zbudować dmg,
ale na cudzym Macu go nie otworzysz — patrz „Bez podpisu" na końcu.

---

## 0. Kod na Maca

Repozytorium jest lokalne (bez remote'a). Albo załóż prywatne repo:

```bash
# na Windowsie
gh repo create toolier --private --source=. --push
```

albo skopiuj folder — **bez** `node_modules/`, `src-tauri/target/` i `dist/`.

## 1. Narzędzia

Xcode musi mieć narzędzia wiersza poleceń i zaakceptowaną licencję:

```bash
xcode-select --install
sudo xcodebuild -license accept
```

pnpm w wersji z `package.json`:

```bash
corepack enable
corepack prepare pnpm@10.12.3 --activate
```

## 2. Certyfikat Developer ID

**To musi być „Developer ID Application"** — nie „Apple Development" ani
„Mac App Distribution". Tamte podpisują aplikacje do App Store'a i na własne
urządzenia; do rozdawania pliku poza App Storem służy wyłącznie Developer ID.

Najprościej przez Xcode:

**Xcode → Settings → Accounts → (zaloguj się) → Manage Certificates → `+` →
Developer ID Application**

Sprawdź, czy certyfikat wylądował w keychainie:

```bash
security find-identity -v -p codesigning
```

Szukasz wiersza w rodzaju:

```
1) A1B2C3... "Developer ID Application: Imie Nazwisko (AB12CD34EF)"
```

Ten ciąg w cudzysłowie to Twoje `APPLE_SIGNING_IDENTITY`, a `AB12CD34EF`
w nawiasie to **Team ID** (jest też na developer.apple.com → Membership).

## 3. Hasło do notaryzacji

Notaryzacja to osobny krok od podpisu: Apple skanuje plik i wystawia
poświadczenie. Potrzebne jest **hasło dla aplikacji**, nie hasło do Apple ID:

**appleid.apple.com → Sign-In and Security → App-Specific Passwords → `+`**

Dostaniesz ciąg w formacie `abcd-efgh-ijkl-mnop`. Zapisz go — pokazuje się raz.

## 4. Zmienne środowiskowe

W tej samej sesji terminala, w której będziesz budował:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Imie Nazwisko (AB12CD34EF)"
export APPLE_ID="twoj@mail.pl"
export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"   # hasło DLA APLIKACJI
export APPLE_TEAM_ID="AB12CD34EF"
```

Tauri notaryzuje automatycznie, gdy widzi komplet `APPLE_ID` +
`APPLE_PASSWORD` + `APPLE_TEAM_ID`. Bez nich tylko podpisze.

> **Nie myl tego z `TAURI_SIGNING_PRIVATE_KEY`.** Tamto podpisuje paczki
> aktualizacji dla updatera i z Apple nie ma nic wspólnego.

Tych zmiennych **nie wrzucaj do repo ani do `.env`** — hasło dla aplikacji daje
dostęp do konta dewelopera.

## 5. `.env` z konfiguracją aplikacji

To osobna sprawa od podpisu. `.env` jest w `.gitignore`, więc nie przyjedzie
z repo — stwórz go w katalogu głównym:

```
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_APP_ENV=production
```

Vite **wkleja te wartości na sztywno** do zbudowanego pliku, więc cokolwiek tam
wpiszesz, trafi do aplikacji u odbiorcy. Tylko klucze `anon` i `publishable` —
`service_role` i sekret webhooka Stripe nigdy tutaj.

## 6. Build

```bash
pnpm install
pnpm tauri build
```

Pierwszy `cargo build` zejdzie 5–10 minut. Notaryzacja dokłada zwykle 2–5 minut
czekania na odpowiedź Apple — to normalne, że build „stoi" na tym kroku.

Wynik:

```
src-tauri/target/release/bundle/dmg/Toolier_0.1.0_aarch64.dmg
src-tauri/target/release/bundle/macos/Toolier.app
```

Jeden plik dla Apple Silicon **i** Intela:

```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
pnpm tauri build --target universal-apple-darwin
```

→ `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`

## 7. Sprawdź, ZANIM wyślesz

To jest krok, którego nie pomijaj — inaczej dowiesz się od wspólnika.

```bash
cd src-tauri/target/release/bundle

# podpis obecny i to ten właściwy
codesign -dv --verbose=4 macos/Toolier.app 2>&1 | grep Authority

# Gatekeeper akceptuje
spctl -a -vvv -t install macos/Toolier.app

# poświadczenie przyklejone do pliku
xcrun stapler validate macos/Toolier.app
xcrun stapler validate dmg/Toolier_0.1.0_aarch64.dmg
```

Chcesz zobaczyć `accepted` i `source=Notarized Developer ID`.

**Jeśli `stapler validate` na samym `.dmg` mówi, że nie ma poświadczenia**,
a `.app` w środku jest w porządku — przyklej je ręcznie:

```bash
xcrun stapler staple dmg/Toolier_0.1.0_aarch64.dmg
```

Bez tego wspólnik musi być online przy pierwszym uruchomieniu (Gatekeeper
pyta wtedy serwer Apple). Ze stapled dmg działa też bez sieci.

### Test na czysto

Najlepszy test: wyślij dmg sobie samemu przez internet (np. na dysk w chmurze),
ściągnij i otwórz. Plik skopiowany lokalnie **nie ma atrybutu kwarantanny**,
więc otworzy się nawet wtedy, gdy u odbiorcy by się nie otworzył.

## 8. Gdy coś nie zadziała

**`No signing identity found`** — certyfikat jest nie tego typu albo nie ma go
w keychainie tego użytkownika. Sprawdź `security find-identity -v -p codesigning`.

**Notaryzacja odrzucona** — zobacz powód:

```bash
xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID"
xcrun notarytool log <ID-z-historii> --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID"
```

**Build pada w pierwszych sekundach** — to nie Tauri, tylko TypeScript:
`pnpm build` odpala najpierw `tsc --noEmit`.

## Bez podpisu (tylko dla siebie)

Da się zbudować bez certyfikatu, ale plik otworzysz **wyłącznie na własnym
Macu**: prawy klik → Otwórz, albo

```bash
xattr -dr com.apple.quarantine /Applications/Toolier.app
```

Do wysłania komukolwiek to nie wystarczy — dlatego powyżej jest podpis.

---

## Zanim wyślesz wspólnikowi

- [ ] Migracje z `supabase/migrations/` są w chmurze (`supabase db push`) —
      inaczej aplikacja wstanie, ale zakładka „Dokumenty" i kolumna „Miasto"
      uderzą w nieistniejące kolumny
- [ ] `.env` wskazuje na **chmurowy** Supabase, nie na `127.0.0.1:54321`
- [ ] `spctl` i `stapler validate` przechodzą na `.dmg`
- [ ] dmg przeszedł test „ściągnięty z internetu", a nie tylko skopiowany
- [ ] wersja w `package.json` i `src-tauri/tauri.conf.json` się zgadza
