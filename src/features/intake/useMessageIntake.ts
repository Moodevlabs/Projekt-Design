import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAiMessageToProject } from '@/data/queries/useAi';
import { useClients } from '@/data/queries/useClients';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import { useLibraryCategoryList, useLibraryCategoryMap } from '@/data/queries/useLibraryCategories';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import { useTemplates } from '@/data/queries/useTemplates';
import type { LibraryItem } from '@/data/repos/library.repo';
import {
  libraryEntries,
  maskContacts,
  matchExistingClient,
  type BriefProposalRoom,
  type MaskedMessage,
  type MessageProposal,
  type MessageToProjectPayload,
} from '@/domain/ai';
import type { Client } from '@/domain/client/schema';
import { parseArea, type ProjectKind } from '@/domain/project/schema';
import { templateItemNames, usableTemplates } from '@/features/brief/ai/useBriefProposal';

/** Limit długości wiadomości — ten sam, co `MessageToProjectPayloadSchema` w Deno. */
export const MESSAGE_LIMIT = 20_000;

/** Pola klienta, które użytkownik może poprawić przed zapisem. */
export interface IntakeClientFields {
  name: string;
  city: string;
  address: string;
  /** Z maski, nie od modelu (A7a). */
  email: string;
  phone: string;
}

/** Pola teczki — metraż jako tekst, bo tak trzyma go formularz projektu. */
export interface IntakeProjectFields {
  name: string;
  areaM2: string;
  kind: ProjectKind | '';
}

export type IntakeClientChoice = 'existing' | 'new';

/**
 * Stan dialogu „Z wiadomości" (T-140, FEATURES-AI.md §8).
 *
 * ## Dwa kroki, jeden stan
 *
 * Krok 1 to sam tekst (`source`); krok 2 to edytowalna kopia odpowiedzi
 * modelu (`proposal`) plus to, czego model NIE dostał: e-mail i telefon
 * z `maskContacts`. Maskowanie dzieje się TUTAJ, przed zbudowaniem
 * ładunku — do mutacji idzie `masked.text`, a oryginał zostaje w `original`
 * i trafi do notatek teczki (to nasza baza, nie model).
 *
 * ## Dlaczego kopia, a nie wynik mutacji
 *
 * Tak jak w `useBriefProposal`: projektant poprawia nazwę klienta, skreśla
 * pomieszczenia, wyłącza pozycje. Wynik mutacji czytamy przy nadejściu —
 * z callbacku I ze stanu (`ask.data`), bo TanStack nie woła per-wywołaniowych
 * callbacków po przepięciu obserwatora (StrictMode).
 *
 * Dopasowanie do istniejącego klienta jest lokalne (`matchExistingClient`):
 * model listy klientów nie widzi.
 */
export function useMessageIntake(knownClient: Client | null = null) {
  const items = useAllLibraryItems();
  const categoryList = useLibraryCategoryList();
  const categories = useLibraryCategoryMap();
  const templates = useTemplates();
  const roomTypes = useRoomTypes();
  // Lista do dopasowania — tylko gdy nadawca nie jest znany z góry.
  const clients = useClients({ status: 'all' });
  const ask = useAiMessageToProject();

  const [source, setSource] = useState('');
  const [original, setOriginal] = useState('');
  const [masked, setMasked] = useState<MaskedMessage | null>(null);
  const [proposal, setProposal] = useState<MessageProposal | null>(null);
  const [clientFields, setClientFields] = useState<IntakeClientFields | null>(null);
  const [projectFields, setProjectFields] = useState<IntakeProjectFields | null>(null);
  const [clientChoice, setClientChoice] = useState<IntakeClientChoice>('existing');
  const [withQuote, setWithQuote] = useState(false);

  const activeItems = useMemo(() => (items.data ?? []).filter((item) => item.active), [items.data]);
  const libraryById = useMemo(
    () => new Map<string, LibraryItem>(activeItems.map((item) => [item.id, item])),
    [activeItems],
  );
  const templateRows = useMemo(() => usableTemplates(templates.data), [templates.data]);

  const loaded = Boolean(items.data && templates.data && roomTypes.data);
  // Pusta biblioteka NIE blokuje: klient i teczka powstaną i tak, model
  // po prostu nie ma z czego proponować zakresu (`hasScope` bez pozycji).
  const libraryEmpty = loaded && activeItems.length === 0;
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

  const chars = source.length;
  const tooLong = chars > MESSAGE_LIMIT;
  const canAnalyze = loaded && !tooLong && source.trim().length > 0 && !ask.isPending;

  const { mutate, reset: resetAsk } = ask;

  // Odpowiedź modelu → edytowalna kopia + pola z maski. Jedno miejsce dla
  // obu źródeł (callback i `ask.data`).
  const receive = useCallback(
    (received: MessageProposal, maskedMessage: MaskedMessage) => {
      setProposal(received);
      setClientFields({
        name: knownClient?.name ?? received.client.name,
        city: knownClient?.city ?? received.client.city,
        address: received.client.address || knownClient?.address || '',
        email: maskedMessage.emails[0] ?? '',
        phone: maskedMessage.phones[0] ?? '',
      });
      setProjectFields({
        name: received.project.name.trim() || received.title.trim(),
        areaM2: received.project.areaM2 === null ? '' : String(received.project.areaM2),
        kind: received.project.kind ?? '',
      });
      setClientChoice('existing');
      setWithQuote(received.hasScope && received.items.length > 0);
    },
    [knownClient],
  );

  const run = useCallback(() => {
    if (!loaded || tooLong || !source.trim()) return;
    const maskedMessage = maskContacts(source);
    setOriginal(source);
    setMasked(maskedMessage);

    const payload: MessageToProjectPayload = {
      message: maskedMessage.text,
      knownClient: knownClient ? { name: knownClient.name, city: knownClient.city } : null,
      library: libraryEntries(activeItems, categories),
      templates: templateRows.map((template) => ({
        id: template.id,
        name: template.name,
        itemNames: templateItemNames(template.body),
      })),
      roomTypes: (roomTypes.data ?? []).map(({ id, name }) => ({ id, name })),
    };
    mutate(payload, { onSuccess: (result) => receive(result.data, maskedMessage) });
  }, [
    loaded,
    tooLong,
    source,
    knownClient,
    activeItems,
    categories,
    templateRows,
    roomTypes.data,
    mutate,
    receive,
  ]);

  const received = ask.data?.data ?? null;
  useEffect(() => {
    if (received && masked && !proposal) receive(received, masked);
  }, [received, masked, proposal, receive]);

  /** „Wróć" — do kroku 1 z zachowanym tekstem. */
  const back = useCallback(() => {
    setProposal(null);
    setClientFields(null);
    setProjectFields(null);
    setMasked(null);
    resetAsk();
  }, [resetAsk]);

  const existingMatch = useMemo(() => {
    if (knownClient || !proposal || !masked) return null;
    return matchExistingClient(proposal, masked, clients.data ?? []);
  }, [knownClient, proposal, masked, clients.data]);

  // Model nie znalazł zakresu → wycena nie ma z czego powstać; checkbox jest
  // zablokowany, a stan trzymamy jawnie na `false`, nie tylko w UI.
  const hasScope = Boolean(proposal?.hasScope && (proposal?.items.length ?? 0) > 0);
  const setWithQuoteGuarded = useCallback(
    (value: boolean) => setWithQuote(hasScope ? value : false),
    [hasScope],
  );

  /** Propozycja z poprawkami użytkownika — to ONA idzie do zapisu. */
  const effectiveProposal = useMemo<MessageProposal | null>(() => {
    if (!proposal || !clientFields || !projectFields) return null;
    return {
      ...proposal,
      client: {
        name: clientFields.name,
        city: clientFields.city,
        address: clientFields.address,
      },
      project: {
        name: projectFields.name,
        areaM2: parseArea(projectFields.areaM2),
        kind: projectFields.kind || null,
      },
    };
  }, [proposal, clientFields, projectFields]);

  const updateClient = useCallback((patch: Partial<IntakeClientFields>) => {
    setClientFields((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateProject = useCallback((patch: Partial<IntakeProjectFields>) => {
    setProjectFields((current) => (current ? { ...current, ...patch } : current));
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
    step: proposal ? ('review' as const) : ('source' as const),
    source,
    setSource,
    chars,
    tooLong,
    canAnalyze,
    analyzing: ask.isPending,
    error: ask.error,
    loaded,
    libraryEmpty,
    prerequisiteError,
    retryPrerequisites,
    run,
    back,
    original,
    masked,
    proposal,
    effectiveProposal,
    clientFields,
    projectFields,
    knownClient,
    existingMatch,
    clientChoice,
    setClientChoice,
    hasScope,
    withQuote,
    setWithQuote: setWithQuoteGuarded,
    libraryById,
    activeItems,
    categories,
    updateClient,
    updateProject,
    updateRoom,
    removeRoom,
    addRoom,
    setItemEnabled,
  };
}

export type MessageIntakeState = ReturnType<typeof useMessageIntake>;
