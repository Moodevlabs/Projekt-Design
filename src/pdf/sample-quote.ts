import { newGroup, newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';

/**
 * Przykładowa wycena do podglądu brandingu (04-PDF §4).
 *
 * Dobrana tak, żeby **pokazywała to, co zmienia branding**, a nie żeby była
 * ładna: nagłówek z kolorem akcentu i logo, tabela z kwotami, pozycja
 * wyłączona (inny kolor), rabat i blok pomieszczenia. Podgląd na jednej,
 * ubogiej sekcji nie pokazałby połowy decyzji, które właśnie się podejmuje.
 *
 * Dane są **jawnie zmyślone** — „ul. Przykładowa", „Jan Przykładowy". Podgląd
 * z prawdziwie wyglądającym nazwiskiem kusi, żeby uznać go za czyjąś wycenę.
 */
export function sampleQuoteBody(): QuoteBody {
  const kuchnia = { id: SAMPLE_ROOM_ID, label: 'Kuchnia', qty: 1 };

  return newQuoteBody({
    title: 'Przykładowa oferta',
    subtitle: 'Tak zobaczy ją Twój klient',
    intro:
      'To podgląd wyglądu, nie prawdziwa wycena. Kolory, logo i stopka pochodzą z ustawień obok.',
    client: { name: 'Jan Przykładowy', phone: '600 000 000', email: 'jan@przyklad.pl', city: '' },
    issueDate: SAMPLE_DATE,
    preparedBy: 'Zespół projektowy',
    rooms: [{ ...kuchnia, roomTypeId: null, includedInVisual: true, includedInTechnical: true }],
    sections: [
      newSection({
        title: 'Projekt wnętrza',
        items: [
          newItem({ name: 'Koncepcja układu', unitPriceCents: 120_000 }),
          newItem({ name: 'Wizualizacja 3D', qty: 2, unitPriceCents: 35_000 }),
          // Wyłączona pozycja ma w PDF inny kolor — to widać tylko na przykładzie.
          { ...newItem({ name: 'Nadzór autorski (opcja)', unitPriceCents: 80_000 }), enabled: false },
        ],
        groups: [
          newGroup({
            name: 'Kuchnia',
            roomId: SAMPLE_ROOM_ID,
            items: [newItem({ name: 'Projekt techniczny', unitPriceCents: 45_000 })],
          }),
        ],
      }),
    ],
    discounts: [
      {
        id: SAMPLE_DISCOUNT_ID,
        name: 'Rabat za komplet',
        description: '',
        type: 'percent',
        percent: 5,
        enabled: true,
        scope: 'quote',
        sectionId: null,
        itemIds: [],
        condition: 'always',
        roundToCents: 0,
      },
    ],
  });
}

/*
 * Stałe identyfikatory: podgląd przerysowuje się przy każdej zmianie ustawień,
 * a losowe `id` znaczyłyby nowy dokument za każdym razem — i niepotrzebne
 * przeliczanie tam, gdzie nic się nie zmieniło.
 */
const SAMPLE_ROOM_ID = '00000000-0000-4000-8000-000000000001';
const SAMPLE_DISCOUNT_ID = '00000000-0000-4000-8000-000000000002';
const SAMPLE_DATE = '2026-01-15';
