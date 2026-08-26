import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import {
  acceptReplacing,
  archiveQuote,
  createQuote,
  createQuoteVersion,
  duplicateQuote,
  getQuote,
  listQuotes,
  listQuoteCities,
  listQuoteRegister,
  saveQuote,
  setQuoteRegisterFields,
  setQuoteStatus,
  type CreateQuoteInput,
  type Quote,
  type QuoteFilters,
  type QuoteSummary,
} from '@/data/repos/quotes.repo';
import { ConflictError } from '@/data/repos/errors';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspace, useWorkspaceId } from './useWorkspace';
import type { DocKind, QuoteStatus } from '@/domain/quote';
import { createLogger } from '@/lib/logger';

const log = createLogger('useQuotes');

/** Filtry listy bez `workspaceId` — ten dokłada hook z `useWorkspace()`. */
export type QuoteListFilters = Omit<QuoteFilters, 'workspaceId'>;

/**
 * `['quotes']` jest prefiksem także dla detalu `['quotes','detail',id]`.
 * Operacje na listach muszą detale wykluczyć — inaczej `setQueriesData`
 * próbowałoby przemapować pojedynczą wycenę tak, jakby była tablicą.
 */
const listQueries = {
  queryKey: queryKeys.quotes(),
  predicate: (query: Query) => query.queryKey[1] !== 'detail',
};

export function useQuotesList(filters: QuoteListFilters = {}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.quotes({ workspaceId, ...filters }),
    queryFn: () => listQuotes({ ...filters, workspaceId: requireWorkspaceId(workspaceId) }),
    enabled: Boolean(workspaceId),
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: queryKeys.quote(id),
    queryFn: () => getQuote(id),
    enabled: Boolean(id),
  });
}

export type CreateQuoteVars = Omit<CreateQuoteInput, 'workspaceId'>;

/**
 * Nowa wycena.
 *
 * **Walutę dobiera ten hook, a nie miejsca wywołania** (T-24). Wycenę zakłada
 * się z pięciu ekranów; gdyby każdy musiał pamiętać o przekazaniu waluty,
 * pierwszy zapomniany dałby ofertę w złotych w studiu rozliczającym się
 * w euro — i wyszłoby to dopiero na dokumencie u klienta.
 *
 * Wartość jest **snapshotem**: przestawienie domyślnej waluty w ustawieniach
 * nie rusza wycen, które już powstały.
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const workspace = useWorkspace();

  return useMutation({
    mutationFn: (vars: CreateQuoteVars) =>
      createQuote({
        currency: workspace.data?.settings.currency,
        ...vars,
        workspaceId: requireWorkspaceId(workspaceId),
      }),
    onSuccess: (quote) => {
      // Wrzucamy detal do cache, żeby przejście do edytora nie czekało na fetch.
      queryClient.setQueryData<Quote>(queryKeys.quote(quote.id), quote);
      void queryClient.invalidateQueries(listQueries);
    },
  });
}

/**
 * Zapis całego dokumentu z blokadą optymistyczną (`lastSeenUpdatedAt`).
 *
 * Przy `ConflictError` **nie** cofamy ani nie odświeżamy cache po cichu:
 * edytor ma pokazać „Wycena zmieniona w innym miejscu — przeładuj" (T-08),
 * a użytkownik decyduje, czy nadpisać. Podmiana danych pod jego palcami
 * skasowałaby zmiany, których jeszcze nie widział.
 */
export function useSaveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveQuote,
    onSuccess: (quote) => {
      queryClient.setQueryData<Quote>(queryKeys.quote(quote.id), quote);
      void queryClient.invalidateQueries(listQueries);
    },
    onError: (error, vars) => {
      if (error instanceof ConflictError) {
        log.warn('Konflikt zapisu wyceny — zostawiam cache nietknięty', { id: vars.id });
      }
      // Błąd leci dalej (stan mutacji / odrzucone `mutateAsync`) — obsługuje go edytor.
    },
  });
}

export function useDuplicateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => duplicateQuote(id),
    onSuccess: (copy) => {
      queryClient.setQueryData<Quote>(queryKeys.quote(copy.id), copy);
      void queryClient.invalidateQueries(listQueries);
    },
  });
}

/**
 * „Nowa wersja" — kolejna propozycja w tej samej linii (T-57).
 *
 * Rozni sie od `useDuplicateQuote` tym, co zostaje: tutaj `lineage_id`,
 * tam nowa linia. Oba przyciski istnieja swiadomie i maja rozne zastosowania
 * (koncepcja §4 regula 5).
 */
export function useCreateQuoteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => createQuoteVersion(id),
    onSuccess: (kopia) => {
      queryClient.setQueryData<Quote>(queryKeys.quote(kopia.id), kopia);
      void queryClient.invalidateQueries(listQueries);
      // Poprzednia wersja mogla zmienic status na `archived` — jej detal
      // w cache jest juz nieaktualny.
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes() });
    },
  });
}

/**
 * Akceptacja zastepujaca poprzednia zaakceptowana wycene w projekcie.
 *
 * Osobna mutacja, a nie flaga w `useSetQuoteStatus`: zastapienie to decyzja
 * czlowieka podjeta w dialogu, a nie wariant zwyklej zmiany statusu.
 */
export function useAcceptReplacing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      acceptReplacing(id, projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes() });
    },
  });
}

export function useArchiveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveQuote(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries(listQueries);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote(id) });
    },
  });
}

export interface SetQuoteStatusVars {
  id: string;
  status: QuoteStatus;
}

interface StatusRollback {
  lists: [readonly unknown[], QuoteSummary[] | undefined][];
  detail: Quote | undefined;
}

/**
 * Zmiana statusu z optimistic update — toggle statusu ma odpowiadać natychmiast,
 * a nie po round-tripie do Supabase.
 *
 * `onMutate` przerywa trwające pobrania (inaczej odpowiedź „w locie" wróciłaby
 * ze starym statusem już PO naszej podmianie i skasowałaby ją), robi snapshot
 * i podmienia status w każdej liście oraz w detalu.
 *
 * `onError` cofa się do snapshotu. Bez tego przy odrzuconym zapisie — a taki
 * jest realny, RLS blokuje zapis po wygasłym trialu (03-BILLING) — UI zostałby
 * ze statusem „wysłana", którego baza nigdy nie przyjęła, i użytkownik byłby
 * przekonany, że oferta poszła do klienta.
 *
 * `onSettled` unieważnia i tak, bo serwer dokłada `sent_at`/`accepted_at`,
 * których optymistyczna podmiana nie zna.
 */
export function useSetQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation<QuoteSummary, Error, SetQuoteStatusVars, StatusRollback>({
    mutationFn: ({ id, status }) => setQuoteStatus(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries(listQueries);
      await queryClient.cancelQueries({ queryKey: queryKeys.quote(id) });

      const lists = queryClient.getQueriesData<QuoteSummary[]>(listQueries);
      const detail = queryClient.getQueryData<Quote>(queryKeys.quote(id));

      queryClient.setQueriesData<QuoteSummary[]>(listQueries, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      if (detail) {
        queryClient.setQueryData<Quote>(queryKeys.quote(id), { ...detail, status });
      }

      return { lists, detail };
    },

    onError: (_error, { id }, rollback) => {
      if (!rollback) return;
      for (const [key, rows] of rollback.lists) {
        queryClient.setQueryData(key, rows);
      }
      if (rollback.detail) {
        queryClient.setQueryData<Quote>(queryKeys.quote(id), rollback.detail);
      }
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries(listQueries);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote(id) });
    },
  });
}

export interface RegisterFieldsVars {
  id: string;
  internalNotes?: string | null;
  docKind?: DocKind;
}

/**
 * Notatki wewnetrzne i rodzaj dokumentu (F7.1).
 *
 * Optymistycznie, jak status: to sa pola OBOK dokumentu, wiec nie moga
 * wywolac konfliktu na `body`. Notatka ma sie pojawic w chwili wpisania,
 * a nie po powrocie z serwera.
 */
export function useSetQuoteRegisterFields() {
  const queryClient = useQueryClient();

  return useMutation<QuoteSummary, Error, RegisterFieldsVars, StatusRollback>({
    mutationFn: ({ id, internalNotes, docKind }) =>
      setQuoteRegisterFields(id, { internalNotes, docKind }),

    onMutate: async ({ id, internalNotes, docKind }) => {
      await queryClient.cancelQueries(listQueries);

      const lists = queryClient.getQueriesData<QuoteSummary[]>(listQueries);
      const patch = {
        ...(internalNotes === undefined ? {} : { internalNotes: internalNotes || null }),
        ...(docKind === undefined ? {} : { docKind }),
      };

      queryClient.setQueriesData<QuoteSummary[]>(listQueries, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );

      return { lists, detail: undefined };
    },

    onError: (_error, _vars, rollback) => {
      if (!rollback) return;
      for (const [key, rows] of rollback.lists) {
        queryClient.setQueryData(key, rows);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries(listQueries);
    },
  });
}

/**
 * Rejestr do eksportu — pobierany NA ZADANIE, nie razem z lista.
 *
 * Ciagnie `body` kazdej wyceny (telefon i e-mail siedza w dokumencie), wiec
 * nie ma prawa chodzic przy kazdym otwarciu listy.
 */
export function useQuoteRegisterExport() {
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (filters: QuoteListFilters) =>
      listQuoteRegister({ workspaceId: requireWorkspaceId(workspaceId), ...filters }),
  });
}

/** Miasta do filtra rejestru (F7.1). */
export function useQuoteCities() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.quotes({ workspaceId, kind: 'cities' }),
    queryFn: () => listQuoteCities(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}
