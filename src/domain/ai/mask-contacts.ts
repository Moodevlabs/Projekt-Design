/**
 * Maskowanie danych kontaktowych w wklejonej wiadomości (T-140, reguła A7a).
 *
 * ## Po co
 *
 * „Z wiadomości" to jedyne miejsce, w którym do modelu poszedłby tekst
 * napisany przez klienta — razem z jego adresem e-mail i telefonem. Model
 * tych pól NIE potrzebuje: nie wpływają na zakres ani na pomieszczenia.
 * Wycinamy je więc lokalnie, zanim cokolwiek opuści aplikację, i wstawiamy
 * do karty klienta sami. Model dostaje `[e-mail]` i `[telefon]` w miejscu
 * danych — wie, że tam coś było, nie wie co.
 *
 * ## Czego nie maskujemy
 *
 * Imienia, nazwiska i adresu inwestycji — bez nich nie ma klienta ani
 * projektu, a model ma je rozpoznać w zdaniu („mieszkanie na Wilczaku 12").
 * To świadomy wyjątek od A7, zapisany w `FEATURES-AI.md §0` i w polityce
 * prywatności.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Telefony w zapisach spotykanych w polskich wiadomościach: `+48 600 100 200`,
 * `600-100-200`, `(22) 123 45 67`, `0048600100200`. Wymagamy 9–12 cyfr, bo
 * krótsze ciągi to metraże, numery mieszkań i kwoty.
 */
const PHONE = /(?:\+?\d{2}[\s-]?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{3}[\s-]?\d{2,3}[\s-]?\d{2,3}/g;

export interface MaskedMessage {
  /** Tekst z `[e-mail]` i `[telefon]` w miejscu danych. */
  text: string;
  emails: string[];
  phones: string[];
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function maskContacts(message: string): MaskedMessage {
  const emails = unique(message.match(EMAIL) ?? []);
  let text = message.replace(EMAIL, '[e-mail]');

  const phones: string[] = [];
  text = text.replace(PHONE, (match) => {
    const digits = digitsOf(match);
    // Metraż „62 m²" czy kwota „150 000" nie są telefonami.
    if (digits.length < 9 || digits.length > 12) return match;
    phones.push(match.trim());
    return '[telefon]';
  });

  return { text, emails, phones: unique(phones) };
}
