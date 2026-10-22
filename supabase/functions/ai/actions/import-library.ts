import type Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import { ImportLibraryPayloadSchema, LibraryImportProposalSchema } from '../schemas.ts';
import { defineAction, ROLE_PREAMBLE, textBlock } from './types.ts';

/**
 * `import-library` — cennik z pliku → lista usług do biblioteki (FEATURES-AI.md §2).
 */

const SYSTEM = `${ROLE_PREAMBLE}

Zadanie: odczytać cennik usług projektanta (tekst, PDF albo zdjęcie dokumentu) i przełożyć go na listę usług do biblioteki Toolier.

Reguły mapowania:
- Jedna usługa = jeden wiersz wyniku. Pomijaj wiersze, które nie są usługami: sumy, uwagi ogólne, dane kontaktowe, nagłówki stron, warunki płatności. To, co pominąłeś i dlaczego, wpisz w "warnings".
- Nazwa: po polsku, bez numeracji z dokumentu, do 120 znaków. Opis tylko wtedy, gdy dokument go zawiera (nie dopisuj własnych).
- Kwoty w GROSZACH jako liczby całkowite: "2 500 zł" → 250000, "150,50 zł" → 15050. Kwoty netto/brutto przepisujesz tak, jak są; nie przeliczasz VAT-u.
- "od 2 000 zł" → minPriceCents = 200000, unitPriceCents = null.
- Widełki "2 000–3 000 zł" → minPriceCents = 200000, unitPriceCents = null, confidence = "low".
- "wycena indywidualna", "do ustalenia", "zapytaj" albo brak ceny → pricingChoice = "individual", unitPriceCents = null.
- Sposób wyceny (pricingChoice):
  • "flat_lump" — jedna kwota za usługę (ryczałt). Domyślny, gdy dokument nie mówi inaczej.
  • "flat_m2" — cena za m² ("120 zł/m²").
  • "per_room" — cena zależna od liczby pomieszczeń ("za pomieszczenie", "za pokój"). Nie podawaj stawek per pomieszczenie — wpisz kwotę za jedno pomieszczenie w unitPriceCents, jeśli dokument ją podaje.
  • "per_frame" — cena za kadr / ujęcie wizualizacji ("za widok", "za rendering").
  • "flat_hour" — za godzinę. "flat_visit" — za wizytę / spotkanie / nadzór. "flat_element" — za element / sztukę mebla / detal.
  • "flat_custom" — inna jednostka ("za rysunek", "za arkusz", "za mb"); wtedy unitLabel = ta jednostka w mianowniku, np. "rysunek".
  • "individual" — bez ceny.
- Grupy (categoryName): jeśli dokument ma nagłówki działów lub etapów, użyj ich. Jeśli nazwa pasuje znaczeniowo do istniejącej grupy z listy, użyj DOKŁADNIE tej istniejącej nazwy. Nowe nazwy grup wypisz też w "newCategories". Bez nagłówków → categoryName = null.
- Duplikaty (ta sama usługa dwa razy) scal w jeden wiersz.
- confidence: "high" gdy nazwa i cena są jednoznaczne, "medium" gdy coś interpretowałeś, "low" gdy zgadujesz sposób wyceny albo cena jest widełkami.
- sourceNote: krótko, skąd wiersz ("wiersz 14", "tabela 2, Projekt koncepcyjny").`;

function sourceBlocks(
  source: (typeof ImportLibraryPayloadSchema)['_output']['source'],
): Anthropic.Beta.BetaContentBlockParam[] {
  switch (source.kind) {
    case 'text':
      return [textBlock(`Dokument (tekst):\n\n${source.text}`)];
    case 'pdf':
      return [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: source.base64 },
        },
      ];
    case 'image':
      return [
        {
          type: 'image',
          source: { type: 'base64', media_type: source.mediaType, data: source.base64 },
        },
      ];
  }
}

export const importLibrary = defineAction({
  payloadSchema: ImportLibraryPayloadSchema,
  outputSchema: LibraryImportProposalSchema,
  effort: 'medium',
  system: SYSTEM,
  messages(payload) {
    const categories =
      payload.categories.length > 0
        ? payload.categories.map((name) => `- ${name}`).join('\n')
        : '(brak — biblioteka nie ma jeszcze grup)';
    const existing =
      payload.existingNames.length > 0
        ? payload.existingNames
            .slice(0, 300)
            .map((name) => `- ${name}`)
            .join('\n')
        : '(brak)';

    return [
      {
        role: 'user',
        content: [
          textBlock(
            `Istniejące grupy w bibliotece:\n${categories}\n\nUsługi już w bibliotece (dla orientacji — importuj mimo to, aplikacja sama oznaczy duplikaty):\n${existing}\n\nPrzełóż poniższy dokument na listę usług.`,
          ),
          ...sourceBlocks(payload.source),
        ],
      },
    ];
  },
});
