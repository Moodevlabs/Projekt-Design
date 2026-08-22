# Pomysły poza zakresem bieżących zadań
- Marketplace bibliotek pozycji per branża (projektanci, remonty, fotografia, web) — onboarding „wybierz branżę, dostaniesz 40 pozycji startowych".
- Warianty wyceny (Basic / Standard / Premium) jako 3 kolumny w PDF.
- Pozycje „opcjonalne — wybierz jedną z" (radio zamiast toggla).
- Kalkulator marży (koszt własny vs cena) widoczny tylko dla właściciela.
- Przypomnienie o wygasającej ofercie (e-mail do klienta, faza 2+).
- Integracja z fakturowaniem (Fakturownia/iFirma API) po akceptacji.

## Świadome uproszczenia względem prototypu `projekt.html` (zanotowane przy T-08)
- Prototyp miał w sekcji **dwie** listy luźnych pozycji: `items` (przed grupami) i `extra` (za grupami). Mamy jedną — przy imporcie `extra` scala się z `items` i traci pozycję na dole. Gdyby ktoś tego potrzebował, `extra` może zostać grupą bez nazwy.
- Prototyp pozwalał nadpisać dane kontaktowe stopki **per wycena**. U nas idą z brand kitu (T-12). Ewentualne „nadpisanie osoby kontaktowej dla tej wyceny" to osobny pomysł.
- Prototyp trzymał rabat jako flagę **sekcji** (`section.rabat`), przez co rabat mógł istnieć tylko w dedykowanej sekcji i nie dało się go utworzyć z UI. U nas rabat to `kind` **pozycji** — można go wstawić w dowolnym miejscu.
- Toggle grupy w prototypie miał własne pole `room.on`, którego kalkulacja i tak nigdy nie czytała. U nas stan toggle'a grupy wyliczamy z pozycji — pusta grupa nie ma więc czego włączyć.
