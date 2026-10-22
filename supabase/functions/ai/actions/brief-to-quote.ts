import { BriefProposalSchema, BriefToQuotePayloadSchema } from '../schemas.ts';
import { AI_MODELS } from '../../_shared/anthropic.ts';
import { defineAction, ROLE_PREAMBLE, textBlock } from './types.ts';

/**
 * `brief-to-quote` — brief klienta → szkic zakresu wyceny (FEATURES-AI.md §3).
 */

const SYSTEM = `${ROLE_PREAMBLE}

Zadanie: na podstawie briefu wypełnionego przez klienta zaproponować projektantowi szkic wyceny: pomieszczenia, zakres usług z JEGO biblioteki, tytuł i opis projektu. Projektant wszystko przejrzy i poprawi — proponujesz, nie decydujesz.

Reguły:
- "items": wyłącznie identyfikatory z przekazanej biblioteki. Usługi jednoznacznie w zakresie → enabled = true. Usługi, które warto POKAZAĆ klientowi jako opcję (np. wizualizacje przy napiętym budżecie, nadzór autorski, projekt oświetlenia) → enabled = false z uzasadnieniem. Pomijaj usługi, które nie mają nic wspólnego z tym projektem. "reason" to jedno krótkie zdanie dla projektanta, np. "Klient wspomina o kuchni na wymiar".
- "rooms": pomieszczenia wymienione lub wynikające z briefu (metraż, liczba pokoi, typ lokalu). Etykieta po polsku, w mianowniku, z małej litery ("salon", "łazienka", "sypialnia dziecięca"). Jeśli istnieje pasujący typ pomieszczenia z listy, podaj jego roomTypeId; inaczej null. qty > 1 tylko gdy brief mówi o kilku takich samych pomieszczeniach.
- "templateId": szablon, którego lista pozycji w większości pokrywa zakres (co najmniej 60% pozycji pasuje). W przeciwnym razie null.
- "title": krótki tytuł oferty, np. "Projekt wnętrza mieszkania 62 m²" — bez nazwiska klienta.
- "projectDescription": 2–5 zdań po polsku o tym, CO projektujemy i dla kogo (styl życia, oczekiwania), bez cen, bez danych osobowych, bez obietnic terminów. To tekst, który trafi do oferty — ma brzmieć jak napisany przez projektanta.
- "openQuestions": czego w briefie brakuje, żeby wycenić rzetelnie (np. "Czy łazienka ma być przebudowana, czy tylko odświeżona?"). Maksymalnie 6 pytań, każde konkretne.`;

export const briefToQuote = defineAction({
  payloadSchema: BriefToQuotePayloadSchema,
  outputSchema: BriefProposalSchema,
  model: AI_MODELS.reasoning,
  effort: 'medium',
  system: SYSTEM,
  messages(payload) {
    const brief = payload.brief.questions
      .map((q) => `[${q.section}] ${q.question}\n→ ${q.answer}`)
      .join('\n\n');

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
            `BRIEF KLIENTA:\n\n${brief}\n\nBIBLIOTEKA USŁUG PROJEKTANTA:\n${library}\n\nSZABLONY WYCEN:\n${templates}\n\nTYPY POMIESZCZEŃ:\n${roomTypes}\n\nZaproponuj szkic wyceny.`,
          ),
        ],
      },
    ];
  },
});
