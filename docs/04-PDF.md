# 04 — PDF i brand kit

## 1. Technologia
`@react-pdf/renderer` w webview. `pdf(<QuotePdfDocument/>).toBlob()` → `ArrayBuffer` → Tauri `save_file`. Generowanie w Web Workerze (`@react-pdf/renderer` wspiera) żeby nie blokować UI przy dużych wycenach.

Fonty: pliki `.ttf` w `src/pdf/fonts/` (Lato, Inter, DM Sans, Playfair Display, Source Serif 4 — warianty 400/700). `Font.register()` raz, w `register.ts`. Polskie znaki muszą działać — test snapshotu z „Zażółć gęślą jaźń".

Ikony/logo: logo pobierane z Storage (signed URL) i cache'owane jako data URL w TanStack Query (`staleTime: Infinity`, invalidacja po uploadzie).

## 2. Layout (A4, marginesy 18 mm)

Odwzorowuje wygląd `projekt.html` / obecnego `generatePdf()`, ale sterowany brand kitem:

1. **Nagłówek** (pełna szerokość, tło `accent_color`, logo jasne z lewej, po prawej „Oferta / {number}" + data). Gdy brak logo: nazwa firmy typograficznie.
2. **Tytuł + meta**: tytuł (uppercase, 22 pt), podtytuł, grid: Inwestor / Data / Telefon / E-mail / Ważność oferty.
3. **Wstęp** i **Opis projektu** (jeśli niepuste).
4. **Sekcje**: tytuł sekcji z linią dolną; grupy jako podtytuł uppercase w `accent_color`; pozycje w wierszach: nazwa (bold) + opis (szary, 9 pt) | ilość × cena (jeśli qty≠1) | cena. Pozycje wyłączone: szare + przekreślenie lub ukryte (`showDisabledItems`). Rabaty: kolor `#B9634A` (lub brand), wartość z minusem.
5. **Podsumowanie** (blok po prawej, tło `bg_color`): Suma pozycji / Rabaty / **Razem netto** / VAT x% / **Razem brutto** (VAT tylko jeśli `vatRate > 0`).
6. **Kontakt**: „Ofertę przygotował/a: {preparedBy}" + lista kontaktów z brand kitu + adres + NIP.
7. **Stopka** na każdej stronie: `footer_text` | „Strona X z Y" (`render={({pageNumber,totalPages})=>…}`).

Reguły paginacji: `wrap={false}` na pojedynczym wierszu pozycji i na bloku podsumowania; tytuł sekcji z `minPresenceAhead={80}` żeby nie zostawał sam na dole strony.

## 3. Brand kit → theme

`src/pdf/theme.ts`: `buildPdfTheme(brandKit): PdfTheme` → kolory, font, rozmiary. Kontrast: jeśli `accent_color` jest jasny (luminancja > 0.6), tekst w nagłówku ciemny i logo ciemne. Funkcja `contrastText(hex)` w `domain/brand/color.ts` z testami.

## 4. Ustawienia brandingu (UI)
Strona w dwóch kolumnach: formularz po lewej, **podgląd PDF na żywo** po prawej (`<PDFViewer>` z @react-pdf, renderowany z `debounce 500 ms`, na przykładowej wycenie). Upload logo: PNG/SVG/JPG ≤ 2 MB, podgląd na jasnym i ciemnym tle.

## 5. Eksport
- Nazwa pliku: `{number}-{client_name-slug}.pdf`.
- Po zapisie toast z „Otwórz" → `open_path`.
- „Kopiuj do schowka" — faza 2 (Tauri clipboard plugin obsługuje pliki tylko na niektórych OS; sprawdzić).
- Status wyceny `draft` → po pierwszym eksporcie pytaj „Oznaczyć jako wysłaną?".
