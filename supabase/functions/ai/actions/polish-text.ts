import { PolishedTextSchema, PolishTextPayloadSchema } from '../schemas.ts';
import { defineAction, ROLE_PREAMBLE, textBlock } from './types.ts';

/**
 * `polish-text` — dopracowanie wstępu, opisu projektu albo opisu usługi (FEATURES-AI.md §5).
 */

const SYSTEM = `${ROLE_PREAMBLE}

Zadanie: dopracować tekst, który trafi do oferty dla inwestora — tak, jak zrobiłby to redaktor pracujący dla studia. Autor tekstu to projektant; ty poprawiasz formę, nie treść.

Reguły:
- Zachowaj sens, fakty i obietnice z oryginału. Nie dodawaj cen, terminów, gwarancji ani usług, których w tekście nie było.
- PLACEHOLDERY w nawiasach klamrowych, np. {rooms}, {room}, {qty}, {frames|kadr|kadry|kadrów}, {client}, {validUntil}, {hourlyRate}, muszą zostać w tekście DOKŁADNIE w tej samej postaci (co do znaku). To są zmienne, które aplikacja podstawia. Jeśli któryś musiałbyś usunąć, nie usuwaj — przebuduj zdanie wokół niego. W "placeholdersKept" odpowiedz szczerze, czy wszystkie zostały.
- Ton: profesjonalny, ciepły, konkretny; bez marketingowej przesady ("niezapomniane", "wyjątkowe", "marzenia"), bez wykrzykników.
- Długość: nie więcej niż dwukrotność oryginału i nie więcej niż 1200 znaków. Jeśli oryginał jest pusty, napisz propozycję od zera na podstawie kontekstu (2–4 zdania).
- Pole "intro" to wstęp oferty (zwraca się do inwestora w formie grzecznościowej: "Państwo"). Pole "projectDescription" opisuje, co projektujemy. Pole "itemDescription" to opis jednej usługi w cenniku — rzeczowy, 1–3 zdania, bez zwrotów do czytelnika.
- Zwróć tylko tekst gotowy do wklejenia — bez cudzysłowów, nagłówków ani komentarzy.`;

const FIELD_WORDS: Record<'intro' | 'projectDescription' | 'itemDescription', string> = {
  intro: 'wstęp oferty',
  projectDescription: 'opis projektu w ofercie',
  itemDescription: 'opis usługi w cenniku',
};

export const polishText = defineAction({
  payloadSchema: PolishTextPayloadSchema,
  outputSchema: PolishedTextSchema,
  effort: 'low',
  system: SYSTEM,
  messages(payload) {
    const context = [
      `Studio: ${payload.context.companyName || '(bez nazwy)'}`,
      payload.context.itemName ? `Usługa: ${payload.context.itemName}` : null,
      payload.context.rooms && payload.context.rooms.length > 0
        ? `Pomieszczenia w wycenie: ${payload.context.rooms.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return [
      {
        role: 'user',
        content: [
          textBlock(
            `Pole: ${FIELD_WORDS[payload.field]}\n${context}\n\nTEKST DO DOPRACOWANIA:\n"""\n${payload.text}\n"""`,
          ),
        ],
      },
    ];
  },
});
