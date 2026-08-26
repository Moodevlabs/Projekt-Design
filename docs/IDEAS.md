# Pomysły poza zakresem bieżących zadań
- Wersja web/SaaS Toolier w przeglądarce (koncepcja `nowosci.md` §15) — decyzja D6: desktop na 1.0. Kod jest przeglądarkowy; do zrobienia byłyby: sesja bez keychaina, zapis PDF przez `<a download>`, OAuth bez deep linku, hosting.
- Z koncepcji §9/§13 na później: umowa, aneks, brief (jako formularz do klienta), protokół spotkania, protokół przekazania projektu — jako kolejne `doc_type` w `quotes.documents` i archiwum (T-56).
- Ikona per usługa w bibliotece (inspiracja 1 pokazuje piktogramy) — pole `icon` z listy lucide; kosmetyka, nie weszło do T-59…T-61.
- „Minimalna wartość usługi w ofercie" jako reguła liczenia (clamp od dołu) — odrzucone w T-60 (ukryta logika); jeśli wróci, to jako jawny tryb z dopiskiem w wierszu.
- Integracja z chmurami zewnętrznymi (Drive/Dropbox) dla plików klienta — zamiast/obok Storage.
- Marketplace bibliotek pozycji per branża (projektanci, remonty, fotografia, web) — onboarding „wybierz branżę, dostaniesz 40 pozycji startowych".
- Warianty wyceny (Basic / Standard / Premium) jako 3 kolumny w PDF.
- Pozycje „opcjonalne — wybierz jedną z" (radio zamiast toggla).
- Kalkulator marży (koszt własny vs cena) widoczny tylko dla właściciela.
- Przypomnienie o wygasającej ofercie (e-mail do klienta, faza 2+).
- Integracja z fakturowaniem (Fakturownia/iFirma API) po akceptacji.
- **Import usług z CSV** (nazwa, opis, grupa, cena, jednostka) z dopasowaniem grupy do słownika i tworzeniem nieznanych. T-59 zakładał, że wystarczy rozszerzyć istniejący import — ale ten (T-50) to macierz **cennika** (nazwa + slugi pomieszczeń), nie lista usług. To osobny importer, nie zmiana w istniejącym.
- ~~**Lista usług jako tabela** (Usługa · Grupa · Sposób wyceny · Cena · Aktywna)~~ → zrobione w **T-72** jako zwijane wiersze. Zostało z 05-UI §3: przełącznik lista–siatka, „Pokaż więcej" po 50, split-button „Dodaj ▾" (Usługa / Zestaw / Import CSV).
- Pytanie „Porzucić zmiany?" przy zwijaniu wiersza usługi z niezapisanym szkicem (T-72 — dziś szkic przepada po cichu).
- ~~**Do poprawki:** `listQuotes` skleja `or(...)` bez cudzysłowów wokół wartości — szukanie po frazie z przecinkiem wraca błędem `failed to parse logic tree`.~~ → **naprawione w T-17** (2026-08-25): cytowanie wyjęte do `data/repos/postgrest-filters.ts` i podpięte we wszystkich czterech repozytoriach.

## Świadome uproszczenia względem prototypu `projekt.html` (zanotowane przy T-08)
- Prototyp miał w sekcji **dwie** listy luźnych pozycji: `items` (przed grupami) i `extra` (za grupami). Mamy jedną — przy imporcie `extra` scala się z `items` i traci pozycję na dole. Gdyby ktoś tego potrzebował, `extra` może zostać grupą bez nazwy.
- Prototyp pozwalał nadpisać dane kontaktowe stopki **per wycena**. U nas idą z brand kitu (T-12). Ewentualne „nadpisanie osoby kontaktowej dla tej wyceny" to osobny pomysł.
- Prototyp trzymał rabat jako flagę **sekcji** (`section.rabat`), przez co rabat mógł istnieć tylko w dedykowanej sekcji i nie dało się go utworzyć z UI. U nas rabat to `kind` **pozycji** — można go wstawić w dowolnym miejscu.
- Toggle grupy w prototypie miał własne pole `room.on`, którego kalkulacja i tak nigdy nie czytała. U nas stan toggle'a grupy wyliczamy z pozycji — pusta grupa nie ma więc czego włączyć.

## E-mail transakcyjny — dlaczego Resend wypadł (2026-08-26)

T-20 zakładał wysyłkę PDF-a z aplikacji przez Resend. Odrzucone, bo **rozwiązywało nie ten problem**: dowoziło klientowi martwy PDF, podczas gdy przewaga Toolier polega na tym, że klient może wycenę **przeklikać**. Link (T-25/T-26) dowozi jedno i drugie, a wysyłkę zostawia poczcie projektanta (`mailto:` z gotową treścią).

Przy okazji znika kilka kosztów, których w zadaniu nie było widać:
- **Nadawca.** Mail z `noreply@toolier.pl` jest dla inwestora obcym adresem. Ten sam link wysłany z Gmaila projektanta trafia do znajomego wątku i nie ląduje w „Oferty".
- **Deliverability jest nasza.** SPF, DKIM, DMARC, reputacja domeny, odbicia, skargi — dla całej bazy klientów naraz. Jedno studio wysyłające ofertę na listę adresów psuje dostarczalność wszystkim pozostałym.
- **RODO.** Stajemy się procesorem cudzych adresów e-mail u amerykańskiego dostawcy, z całą papierologią.
- **Załączniki.** PDF z fontami i logotypem to kilka MB; maile z załącznikami mają ostrzejszą filtrację antyspamową niż maile z linkiem.

**Gdyby e-mail transakcyjny kiedyś wrócił** (przypomnienie o wygasającej ofercie, powiadomienie o akceptacji), kolejność wyboru:
1. **Własny SMTP użytkownika** w ustawieniach (hasło aplikacji Gmaila / SMTP własnej domeny, poświadczenia w keychainie obok sesji). Mail wychodzi *naprawdę* od projektanta, koszt i ops po naszej stronie zerowe, żadnej roli procesora. Dla aplikacji desktopowej to naturalne rozwiązanie — koszt to ekran konfiguracji i obsługa błędów uwierzytelnienia.
2. **Brevo** albo **Postmark**, jeśli musi wyjść z naszej domeny: Brevo jest europejski (mniej pytań o transfer danych), Postmark ma najlepszą dostarczalność transakcyjną. Amazon SES jest najtańszy, ale sandbox i brak warstwy szablonów zjadają oszczędność.
3. **Resend** — wygodne API, ale nie daje nic, czego nie dają powyższe, a jako ostatni wybór został właśnie dlatego, że wygoda API była jedynym argumentem za nim.

## Usunięte z planów 2026-08-26 (decyzje właściciela)
- **Tryb ciemny (T-21).** Rampa `--rail-*` została po redesignie jako ciemne tło szyny — gdyby decyzja wróciła, to nowe wartości istniejących tokenów, nie przepisywanie UI.
- **Wielu użytkowników w workspace (T-27).** Tabele `workspaces` / `workspace_members` i RLS zostają — cofanie ich to ryzyko bez zysku.
- **Statystyki wyłączanych pozycji (T-28).** Wracają naturalnie razem z danymi z T-26, gdyby kiedyś były potrzebne: akceptacje online same w sobie mówią, co klient wyłączył.
- **Podpis klienta na canvasie.** Akceptacja przez link (imię + czas + IP) jest dowodem zgody; canvas wyglądałby na mocniejszy dowód, niż jest.
