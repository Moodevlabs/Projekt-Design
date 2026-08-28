/** Adres strony produktu. Jedno miejsce — podpis stoi w stopce obu stron. */
const TOOLIER_URL = 'https://toolier.pl';

/**
 * Podpis „…w Toolier" w stopce strony klienta, z odnośnikiem na stronę produktu.
 *
 * To jedyne miejsce, w którym inwestor styka się z narzędziem, a nie
 * z pracownią — dlatego odnośnik jest dyskretny i podkreślany dopiero pod
 * kursorem. Otwiera się w nowej karcie: klient bywa w połowie wypełniania
 * briefu, a zabranie mu strony sprzed nosa skasowałoby niezapisane odpowiedzi.
 *
 * `rel="noreferrer"` mimo nagłówka `Referrer-Policy: no-referrer` na całej
 * domenie — nagłówek jest ustawieniem hostingu i może zniknąć przy zmianie
 * konfiguracji, a adres oferty niesie token.
 */
export function ToolierLink() {
  return (
    <a
      href={TOOLIER_URL}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-2 hover:underline"
    >
      Toolier
    </a>
  );
}
