import { CommentChangesSchema, CommentsToChangesPayloadSchema } from '../schemas.ts';
import { defineAction, ROLE_PREAMBLE, textBlock } from './types.ts';

/**
 * `comments-to-changes` — uwagi inwestora → lista zmian w pozycjach (FEATURES-AI.md §4).
 */

const SYSTEM = `${ROLE_PREAMBLE}

Zadanie: przełożyć uwagi, które inwestor zostawił pod ofertą, na konkretne zmiany w pozycjach wyceny. Projektant zobaczy listę i zatwierdzi wybrane — proponujesz, nie decydujesz.

Dozwolone rodzaje zmian ("changes"):
- "disable" — wyłącz pozycję (zostaje w ofercie jako opcja niewliczona do sumy). Używaj, gdy klient rezygnuje z czegoś.
- "enable" — włącz pozycję wyłączoną. Gdy klient chce dołożyć coś, co w ofercie już jest jako opcja.
- "remove" — usuń pozycję. WYŁĄCZNIE dla pozycji, które są już wyłączone (enabled = false). Włączoną pozycję wolno ci tylko wyłączyć.
- "add" — dodaj usługę z biblioteki (libraryItemId) do wskazanej sekcji (sectionId). Tylko gdy klient prosi o coś, czego w ofercie nie ma, a biblioteka to ma. Wybierz sekcję, która najlepiej pasuje tematycznie.
- "qty" — zmień ilość ("zamiast 3 wizualizacji poproszę 5").

Czego NIE robisz:
- Nie zmieniasz cen ani nie proponujesz rabatów. Uwagi o cenie ("za drogo", "czy da się taniej") trafiają do "unresolved".
- Nie dodajesz usług spoza biblioteki. Jeśli klient prosi o coś, czego biblioteka nie ma, wpisz to w "unresolved".
- Nie zgadujesz: gdy uwaga jest niejednoznaczna, opisz ją w "unresolved" zamiast wybierać pozycję na siłę.

"summary": jedno zdanie po polsku o tym, czego klient chce. "reason" przy zmianie: krótko, cytując sens uwagi ("klient rezygnuje z 3D sypialni").`;

function itemLine(item: {
  id: string;
  name: string;
  enabled: boolean;
  qty: number;
  amount: string;
  roomLabel: string | null;
}): string {
  const state = item.enabled ? 'WŁĄCZONA' : 'wyłączona';
  const room = item.roomLabel ? ` [${item.roomLabel}]` : '';
  const qty = item.qty !== 1 ? ` ×${item.qty}` : '';
  return `    - id=${item.id} | ${item.name}${room}${qty} | ${state} | ${item.amount}`;
}

export const commentsToChanges = defineAction({
  payloadSchema: CommentsToChangesPayloadSchema,
  outputSchema: CommentChangesSchema,
  effort: 'medium',
  system: SYSTEM,
  messages(payload) {
    const sections = payload.quote.sections
      .map((section) => {
        const own = section.items.map(itemLine).join('\n');
        const groups = section.groups
          .map(
            (group) =>
              `  grupa id=${group.id} | ${group.name}\n${group.items.map(itemLine).join('\n')}`,
          )
          .join('\n');
        return `sekcja id=${section.id} | ${section.title}\n${[own, groups].filter(Boolean).join('\n')}`;
      })
      .join('\n\n');

    const rooms =
      payload.quote.rooms.length > 0
        ? payload.quote.rooms
            .map((room) => `- ${room.label}${room.qty > 1 ? ` ×${room.qty}` : ''}`)
            .join('\n')
        : '(brak)';

    const library = payload.library
      .map(
        (entry) =>
          `- id=${entry.id} | ${entry.name}${entry.category ? ` (${entry.category})` : ''} | ${entry.pricing}`,
      )
      .join('\n');

    return [
      {
        role: 'user',
        content: [
          textBlock(
            `UWAGI INWESTORA:\n"""\n${payload.comment}\n"""\n\nWYCENA — POMIESZCZENIA:\n${rooms}\n\nWYCENA — POZYCJE:\n${sections}\n\nBIBLIOTEKA USŁUG (do "add"):\n${library}\n\nPrzełóż uwagi na zmiany.`,
          ),
        ],
      },
    ];
  },
});
