import { AI_MODELS } from '../../_shared/anthropic.ts';
import { MessageProposalSchema, MessageToProjectPayloadSchema } from '../schemas.ts';
import { defineAction, ROLE_PREAMBLE, textBlock } from './types.ts';

/**
 * `message-to-project` — wiadomość od klienta → klient, projekt, zakres (FEATURES-AI.md §8).
 *
 * Tekst przychodzi już po `maskContacts`: w miejscu adresu e-mail i telefonu
 * stoi `[e-mail]` / `[telefon]`. Model ma to zostawić w spokoju — kontakt
 * wraca do karty klienta po stronie aplikacji.
 */

const SYSTEM = `${ROLE_PREAMBLE}

Zadanie: przeczytać wiadomość, którą projektant dostał od potencjalnego klienta (e-mail, komunikator, notatka z rozmowy), i przygotować z niej teczkę: kto pisze, o jaki obiekt chodzi, jakie pomieszczenia i jaki zakres usług z biblioteki projektanta. Projektant wszystko przejrzy — proponujesz, nie decydujesz.

Reguły:
- "summary": jedno zdanie po polsku, czego dotyczy wiadomość.
- "client": imię i nazwisko albo nazwa firmy tak, jak podpisał się nadawca (bez tytułów grzecznościowych); "city" i "address" to MIEJSCE INWESTYCJI (mieszkanie, dom, lokal), nie adres zamieszkania. Brak informacji = pusty string. Gdy w danych jest "znany klient", przepisz jego nazwę i miasto, nie zgaduj innych.
- Znaczniki "[e-mail]" i "[telefon]" to wycięte dane kontaktowe — nie odtwarzaj ich, nie wpisuj nigdzie.
- "project": krótka nazwa teczki ("Mieszkanie Wilczak 12", "Dom w Suchym Lesie"); "areaM2" liczba z wiadomości albo null; "kind": apartment / house / commercial / other albo null, gdy nie wiadomo.
- "hasScope": true tylko wtedy, gdy wiadomość mówi, CO ma być zrobione (projekt kuchni, całe mieszkanie, wizualizacje…). Samo "chcielibyśmy porozmawiać" to false — wtedy "items" zostaw puste, a pytania otwarte niech dopytają o zakres.
- "items": wyłącznie identyfikatory z przekazanej biblioteki. Usługi jednoznacznie w zakresie → enabled = true; usługi warte pokazania jako opcja → enabled = false z uzasadnieniem. Pomijaj usługi bez związku. "reason" to jedno krótkie zdanie dla projektanta.
- "rooms": pomieszczenia wymienione lub wynikające z wiadomości (metraż, liczba pokoi, typ lokalu). Etykieta po polsku, w mianowniku, z małej litery. Jeśli istnieje pasujący typ pomieszczenia z listy, podaj roomTypeId; inaczej null. qty > 1 tylko gdy wiadomość mówi o kilku takich samych pomieszczeniach.
- "templateId": szablon, którego lista pozycji w większości pokrywa zakres (co najmniej 60%). Inaczej null.
- "title": krótki tytuł oferty, np. "Projekt wnętrza mieszkania 62 m²" — bez nazwiska klienta.
- "projectDescription": 2–4 zdania po polsku o tym, co projektujemy i dla kogo, bez cen i danych osobowych. Gdy hasScope = false, jedno ostrożne zdanie.
- "openQuestions": czego brakuje, żeby wycenić rzetelnie — konkretne pytania, maksymalnie 6. To lista dla projektanta, nie szkic odpowiedzi do klienta.`;

export const messageToProject = defineAction({
  payloadSchema: MessageToProjectPayloadSchema,
  outputSchema: MessageProposalSchema,
  model: AI_MODELS.reasoning,
  effort: 'medium',
  system: SYSTEM,
  messages(payload) {
    const known = payload.knownClient
      ? `ZNANY KLIENT (wiadomość przyszła z jego karty): ${payload.knownClient.name}${
          payload.knownClient.city ? `, ${payload.knownClient.city}` : ''
        }`
      : 'ZNANY KLIENT: brak — nadawcę rozpoznaj z wiadomości.';

    const library = payload.library
      .map(
        (entry) =>
          `- id=${entry.id} | ${entry.name}${entry.category ? ` (${entry.category})` : ''} | ${entry.pricing}${
            entry.priceCents === null ? '' : ` | ${(entry.priceCents / 100).toFixed(2)} zł`
          }${entry.description ? ` | ${entry.description}` : ''}`,
      )
      .join('\n');

    const templates =
      payload.templates.length > 0
        ? payload.templates
            .map((t) => `- id=${t.id} | ${t.name}: ${t.itemNames.join(', ')}`)
            .join('\n')
        : '(brak szablonów)';

    const roomTypes =
      payload.roomTypes.length > 0
        ? payload.roomTypes.map((r) => `- id=${r.id} | ${r.name}`).join('\n')
        : '(brak zdefiniowanych typów — używaj roomTypeId = null)';

    return [
      {
        role: 'user',
        content: [
          textBlock(
            `${known}\n\nWIADOMOŚĆ OD KLIENTA:\n"""\n${payload.message}\n"""\n\nBIBLIOTEKA USŁUG PROJEKTANTA:\n${library || '(pusta)'}\n\nSZABLONY WYCEN:\n${templates}\n\nTYPY POMIESZCZEŃ:\n${roomTypes}\n\nPrzygotuj teczkę.`,
          ),
        ],
      },
    ];
  },
});
