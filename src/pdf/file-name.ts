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

/**
 * Przyrostek wersji w nazwie pliku (T-57).
 *
 * W nazwie wersja jest **zawsze**, nawet gdy świadomie nie trafia na sam
 * dokument (`showVersionOnPdf`): dwa pliki tej samej oferty nie mogą się
 * nadpisać w folderze Pobrane — zasada z T-45. v1 pomijamy, bo to domyślny
 * przypadek i „-v1" w każdej nazwie byłoby szumem.
 */
function versionPart(version: number | undefined): string {
  return version && version > 1 ? `-v${version}` : '';
}

export function quoteFileName(number: string | null, clientName: string, version?: number): string {
  // Ukośniki z numeru zamieniamy na myślniki — inaczej system uznałby je za
  // ścieżkę i zapis padłby (albo, co gorsza, trafił w inny katalog).
  const numberPart = number ? slug(number) : 'wycena';
  const clientPart = slug(clientName);

  const base = clientPart ? `${numberPart}-${clientPart}` : numberPart;
  return `${base}${versionPart(version)}.pdf`;
}

/**
 * Nazwa pliku dokumentu „Szacowany termin" (F5.3).
 *
 * Osobny przyrostek, bo pakiet dla jednego inwestora to kilka plików o tym
 * samym numerze — bez rozróżnienia drugi zapis nadpisałby pierwszy.
 */
export function scheduleFileName(number: string | null, version?: number): string {
  const numberPart = number ? slug(number) : 'wycena';
  return `${numberPart}${versionPart(version)}-termin.pdf`;
}

/**
 * Nazwa pliku dokumentu „Etapy współpracy" (F6.1).
 *
 * Ta sama zasada co przy terminie: przyrostek odróżnia plik w pakiecie,
 * w którym wszystkie dokumenty niosą ten sam numer wyceny.
 */
export function stagesFileName(number: string | null, version?: number): string {
  const numberPart = number ? slug(number) : 'wycena';
  return `${numberPart}${versionPart(version)}-etapy.pdf`;
}

/** Nazwa pliku dokumentu „Cennik usług dodatkowych" (F6.2). */
export function priceListFileName(number: string | null, version?: number): string {
  const numberPart = number ? slug(number) : 'wycena';
  return `${numberPart}${versionPart(version)}-cennik.pdf`;
}
