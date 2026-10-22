import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAiBriefToQuote } from '@/data/queries/useAi';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import { useLibraryCategoryList, useLibraryCategoryMap } from '@/data/queries/useLibraryCategories';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import { useTemplates } from '@/data/queries/useTemplates';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { Template } from '@/data/repos/templates.repo';
import {
  briefQuestions,
  libraryEntries,
  type BriefProposal,
  type BriefProposalRoom,
  type BriefToQuotePayload,
} from '@/domain/ai';
import type { Brief } from '@/domain/brief';
import type { QuoteBody } from '@/domain/quote';

/**
 * Propozycja wyceny z briefu (T-137) — stan arkusza.
 *
 * ## Dlaczego kopia, a nie wynik mutacji
 *
 * Odpowiedź modelu jest punktem wyjścia, nie dokumentem: projektant skreśla
 * pomieszczenia, przełącza pozycje, poprawia opis. Trzymamy więc **edytowalną
 * kopię** w stanie komponentu, a wynik `useMutation` czytamy tylko raz, przy
 * nadejściu. Dzięki temu „Spróbuj ponownie" po błędzie nie kasuje poprawek
 * z poprzedniego podejścia, dopóki nowa odpowiedź nie przyjdzie.
 *
 * ## Dlaczego wywołanie startuje samo
 *
 * Arkusz otwiera się jednym przyciskiem „Zaproponuj wycenę (AI)" — drugi
 * przycisk „Analizuj" w środku byłby pytaniem o to samo dwa razy. Wołamy
 * zatem, gdy tylko biblioteka, szablony i typy pomieszczeń są w pamięci,
 * bo bez nich ładunek byłby pusty, a model nie miałby z czego wybierać.
 *
 * ## Cykl życia = cykl życia arkusza
 *
 * Hook żyje tylko wewnątrz zamontowanego arkusza (`BriefRow` montuje go po
 * kliknięciu, jak `CommentAiAction` swój dialog). Zamknięcie = odmontowanie,
 * więc nie ma tu efektu czyszczącego: ponowne otwarcie zaczyna od zera.
 */

/** Nazwy pozycji szablonu — model dopasowuje szablon po tym, co zawiera. */
export function templateItemNames(body: QuoteBody | null): string[] {
  if (!body) return [];
  return body.sections.flatMap((section) => [
    ...section.items.map((item) => item.name),
    ...section.groups.flatMap((group) => group.items.map((item) => item.name)),
  ]);
}

/**
 * Szablony, z których da się zbudować wycenę — czyli z `body`. Szablon
 * uszkodzony (`body === null`) nie ma pozycji, po których model mógłby go
 * dopasować, a wybrany dałby wycenę z ustawień z cudzym terminem i
 * dokumentami. Lepiej, żeby model go w ogóle nie widział.
 */
export function usableTemplates(templates: readonly Template[] | undefined): Template[] {
  return (templates ?? []).filter((template) => template.body !== null);
}

export function useBriefProposal(brief: Pick<Brief, 'template' | 'answers'>) {
  const items = useAllLibraryItems();
  const categoryList = useLibraryCategoryList();
  const categories = useLibraryCategoryMap();
  const templates = useTemplates();
  const roomTypes = useRoomTypes();
  const ask = useAiBriefToQuote();

  const [proposal, setProposal] = useState<BriefProposal | null>(null);

  const activeItems = useMemo(() => (items.data ?? []).filter((item) => item.active), [items.data]);
  const libraryById = useMemo(
    () => new Map<string, LibraryItem>(activeItems.map((item) => [item.id, item])),
    [activeItems],
  );
  const templateRows = useMemo(() => usableTemplates(templates.data), [templates.data]);

  const loaded = Boolean(items.data && templates.data && roomTypes.data);
  const libraryEmpty = loaded && activeItems.length === 0;

  // Zapytania wstępne mogą paść (sieć, RLS) — wtedy `loaded` nigdy nie będzie
  // prawdą i bez tego sygnału arkusz pokazywałby szkielet w nieskończoność.
  const prerequisiteError =
    items.error ?? categoryList.error ?? templates.error ?? roomTypes.error ?? null;

  const { refetch: refetchItems } = items;
  const { refetch: refetchCategories } = categoryList;
  const { refetch: refetchTemplates } = templates;
  const { refetch: refetchRoomTypes } = roomTypes;
  const retryPrerequisites = useCallback(() => {
    void refetchItems();
    void refetchCategories();
    void refetchTemplates();
    void refetchRoomTypes();
  }, [refetchItems, refetchCategories, refetchTemplates, refetchRoomTypes]);

  // `mutate` jest stabilne między renderami; sam obiekt mutacji nie —
  // zależność od niego uruchamiałaby wywołanie ponownie w trakcie oczekiwania.
  const { mutate } = ask;

  const run = useCallback(() => {
    if (!loaded || libraryEmpty) return;
    const payload: BriefToQuotePayload = {
      brief: briefQuestions(brief),
      library: libraryEntries(activeItems, categories),
      templates: templateRows.map((template) => ({
        id: template.id,
        name: template.name,
        itemNames: templateItemNames(template.body),
      })),
      roomTypes: (roomTypes.data ?? []).map(({ id, name }) => ({ id, name })),
    };
    mutate(payload, { onSuccess: (result) => setProposal(result.data) });
  }, [loaded, libraryEmpty, brief, activeItems, categories, templateRows, roomTypes.data, mutate]);

  // Wynik czytamy TAKŻE ze stanu mutacji, nie tylko z callbacku
  // `mutate(…, { onSuccess })`: TanStack nie woła per-wywołaniowych callbacków,
  // gdy obserwator zdążył się przepiąć (StrictMode, ponowne zamontowanie) —
  // a wtedy arkusz pokazywałby „Czytam brief…" mimo gotowej odpowiedzi
  // (2026-10-22). Oba źródła ustawiają tę samą propozycję.
  const received = ask.data?.data ?? null;
  useEffect(() => {
    if (received) setProposal(received);
  }, [received]);

  // Start, gdy dane wstępne są w pamięci — raz na zamontowanie, stąd strażnik
  // w ref (dane mogą się odświeżyć i zmienić referencje, a to nie powód, żeby
  // pytać model drugi raz).
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !loaded || libraryEmpty) return;
    startedRef.current = true;
    run();
  }, [loaded, libraryEmpty, run]);

  const update = useCallback((patch: Partial<BriefProposal>) => {
    setProposal((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateRoom = useCallback((index: number, patch: Partial<BriefProposalRoom>) => {
    setProposal((current) =>
      current
        ? {
            ...current,
            rooms: current.rooms.map((room, at) => (at === index ? { ...room, ...patch } : room)),
          }
        : current,
    );
  }, []);

  const removeRoom = useCallback((index: number) => {
    setProposal((current) =>
      current ? { ...current, rooms: current.rooms.filter((_, at) => at !== index) } : current,
    );
  }, []);

  const addRoom = useCallback(() => {
    setProposal((current) =>
      current
        ? { ...current, rooms: [...current.rooms, { roomTypeId: null, label: '', qty: 1 }] }
        : current,
    );
  }, []);

  const setItemEnabled = useCallback((libraryItemId: string, enabled: boolean) => {
    setProposal((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.libraryItemId === libraryItemId ? { ...item, enabled } : item,
            ),
          }
        : current,
    );
  }, []);

  return {
    proposal,
    /** Pozycje biblioteki (aktywne) po `id` — do nazw i cen w podglądzie. */
    libraryById,
    activeItems,
    categories,
    /** Tylko szablony z `body` — te same, które dostał model. */
    templates: templateRows,
    roomTypes: roomTypes.data ?? [],
    loaded,
    libraryEmpty,
    /** Pierwszy błąd zapytań wstępnych (biblioteka, grupy, szablony, typy pomieszczeń). */
    prerequisiteError,
    retryPrerequisites,
    error: ask.error,
    retry: run,
    update,
    updateRoom,
    removeRoom,
    addRoom,
    setItemEnabled,
  };
}

export type BriefProposalState = ReturnType<typeof useBriefProposal>;
