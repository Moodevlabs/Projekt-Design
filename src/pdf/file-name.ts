/**
 * Nazwa pliku PDF (04-PDF §5): `{numer}-{klient}.pdf`.
 *
 * Osobny plik, bo to czysta funkcja z kilkoma pułapkami: numer wyceny zawiera
 * ukośniki (`WYC/2026/08/0001`), których nie wolno wstawić do nazwy pliku,
 * a nazwisko klienta bywa z polskimi znakami i spacjami.
 */

const POLISH: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (znak) => POLISH[znak] ?? znak)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function quoteFileName(number: string | null, clientName: string): string {
  // Ukośniki z numeru zamieniamy na myślniki — inaczej system uznałby je za
  // ścieżkę i zapis padłby (albo, co gorsza, trafił w inny katalog).
  const numberPart = number ? slug(number) : 'wycena';
  const clientPart = slug(clientName);

  const base = clientPart ? `${numberPart}-${clientPart}` : numberPart;
  return `${base}.pdf`;
}

/**
 * Nazwa pliku dokumentu „Szacowany termin" (F5.3).
 *
 * Osobny przyrostek, bo pakiet dla jednego inwestora to kilka plików o tym
 * samym numerze — bez rozróżnienia drugi zapis nadpisałby pierwszy.
 */
export function scheduleFileName(number: string | null): string {
  const numberPart = number ? slug(number) : 'wycena';
  return `${numberPart}-termin.pdf`;
}

/**
 * Nazwa pliku dokumentu „Etapy współpracy" (F6.1).
 *
 * Ta sama zasada co przy terminie: przyrostek odróżnia plik w pakiecie,
 * w którym wszystkie dokumenty niosą ten sam numer wyceny.
 */
export function stagesFileName(number: string | null): string {
  const numberPart = number ? slug(number) : 'wycena';
  return `${numberPart}-etapy.pdf`;
}
