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
- **Do poprawki:** `listQuotes` (`quotes.repo`) skleja `or(...)` bez cudzysłowów wokół wartości, więc szukanie wyceny po frazie z przecinkiem („Kowalski, Jan") wraca błędem `failed to parse logic tree`. W `clients.repo` naprawione w T-53 (`ilikeFilter`) — ten sam zabieg trzeba przenieść do wycen i biblioteki. Poza zakresem T-53, bo dotyka ścieżki, której to zadanie nie zmieniało.

## Świadome uproszczenia względem prototypu `projekt.html` (zanotowane przy T-08)
- Prototyp miał w sekcji **dwie** listy luźnych pozycji: `items` (przed grupami) i `extra` (za grupami). Mamy jedną — przy imporcie `extra` scala się z `items` i traci pozycję na dole. Gdyby ktoś tego potrzebował, `extra` może zostać grupą bez nazwy.
- Prototyp pozwalał nadpisać dane kontaktowe stopki **per wycena**. U nas idą z brand kitu (T-12). Ewentualne „nadpisanie osoby kontaktowej dla tej wyceny" to osobny pomysł.
- Prototyp trzymał rabat jako flagę **sekcji** (`section.rabat`), przez co rabat mógł istnieć tylko w dedykowanej sekcji i nie dało się go utworzyć z UI. U nas rabat to `kind` **pozycji** — można go wstawić w dowolnym miejscu.
- Toggle grupy w prototypie miał własne pole `room.on`, którego kalkulacja i tak nigdy nie czytała. U nas stan toggle'a grupy wyliczamy z pozycji — pusta grupa nie ma więc czego włączyć.
