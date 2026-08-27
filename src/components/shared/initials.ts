/**
 * Skrót nazwy pod zdjęcie, którego nie ma.
 *
 * Dwie pierwsze litery dwóch pierwszych słów („Anna Kowalska" → „AK",
 * „Studio Wnętrz" → „SW"). Jedno słowo daje dwie pierwsze litery, bo pojedyncza
 * litera w kółku wygląda jak błąd, a nie jak skrót.
 *
 * Adres e-mail przycinamy do części przed `@` — „ak@studio.pl" ma dać „AK",
 * a nie „AK@".
 */
export function initialsOf(value: string, fallback = '?'): string {
  const source = value.includes('@') ? value.slice(0, value.indexOf('@')) : value;
  const words = source
    .split(/[\s._-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}
