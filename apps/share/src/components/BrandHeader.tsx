/**
 * Pas nagłówka ze znakiem pracowni — ten sam na ofercie i na briefie.
 *
 * ## Dlaczego pas, a nie samo logo nad treścią
 *
 * Dokument PDF otwiera pas wypełniony kolorem marki, ze znakiem po lewej.
 * Strona, którą inwestor dostaje linkiem, pokazywała do tej pory nagi obrazek
 * na tle strony — czyli to samo pismo w dwóch różnych papeteriach. Pas
 * domyka tę niespójność i robi jeszcze jedną rzecz: nadaje stronie nadawcę
 * w pierwszej sekundzie, zanim ktokolwiek przeczyta choć słowo. Formularz bez
 * widocznego nadawcy wygląda jak spam i tak bywa traktowany.
 *
 * ## Wariant znaku
 *
 * Plik dobiera baza wg ustawienia „Znak na nagłówku dokumentu" — tego samego,
 * które rządzi nagłówkiem PDF. Tło pasa to kolor marki w obu miejscach, więc
 * jeden wybór obsługuje oba i nie ma jak się rozjechać. Gdy wskazanego
 * wariantu nie wgrano, baza podaje ten drugi; gdy nie ma żadnego, zostaje
 * nazwa pracowni — pas jest wtedy nadal pasem, tylko z napisem.
 */
export function BrandHeader({
  companyName,
  logoUrl,
  aside,
}: {
  companyName: string;
  /** Podpisany adres znaku; `null`, gdy pracownia go nie wgrała albo nie udało się pobrać. */
  logoUrl: string | null;
  /** Prawa strona pasa — na ofercie stoi tam jej numer. */
  aside?: React.ReactNode;
}) {
  return (
    <header className="bg-accent mb-6 flex min-h-[72px] flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[var(--accent-ink)]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={companyName}
          /* `max-h` zamiast sztywnej wysokości: znaki bywają i kwadratowe,
             i bardzo szerokie, a rozciąganie logo pracowni to ostatnia rzecz,
             jaką wolno zrobić na dokumencie wychodzącym do inwestora. */
          className="max-h-12 w-auto max-w-[240px] object-contain"
        />
      ) : (
        <span className="font-display text-lg tracking-tight">{companyName}</span>
      )}
      {aside ? <span className="tabular text-xs opacity-80">{aside}</span> : null}
    </header>
  );
}
