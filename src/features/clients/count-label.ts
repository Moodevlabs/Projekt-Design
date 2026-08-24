/**
 * Licznik wyników nad listą klientów (05-UI §3a.1).
 *
 * Polska odmiana: 1 klient · 2–4 klienci · 5+ klientów, z wyjątkiem nastek
 * („12 klientów", nie „12 klienci"). Osobny plik, żeby `ClientsToolbar`
 * eksportował wyłącznie komponenty — inaczej Fast Refresh przestaje działać
 * dla całego modułu.
 */
export function clientsCountLabel(count: number): string {
  if (count === 1) return '1 klient';
  const last = count % 10;
  const teens = count % 100;
  const few = last >= 2 && last <= 4 && !(teens >= 12 && teens <= 14);
  return `${count} ${few ? 'klienci' : 'klientów'}`;
}
