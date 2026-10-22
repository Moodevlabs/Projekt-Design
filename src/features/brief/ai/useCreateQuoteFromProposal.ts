import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { routes } from '@/app/routes';
import { useClient } from '@/data/queries/useClients';
import { useCreateProject, useProjects } from '@/data/queries/useProjects';
import { useCreateQuote } from '@/data/queries/useQuotes';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import { useTemplates } from '@/data/queries/useTemplates';
import { useWorkspace } from '@/data/queries/useWorkspace';
import type { Quote } from '@/data/repos/quotes.repo';
import { applyBriefProposal, type BriefLibraryEntry, type BriefProposal } from '@/domain/ai';
import { clientSnapshot, type Client } from '@/domain/client/schema';
import { emptyProjectDraft } from '@/domain/project/schema';
import { fromTemplate, quoteBodyFromSettings } from '@/domain/quote';
import { scheduleFromTemplate } from '@/domain/schedule';
import { pl } from '@/i18n/pl';

/** Sentinel w selekcie projektu: „załóż nowy" zamiast istniejącej teczki. */
export const NEW_PROJECT = '__new__';

export interface WriteQuoteFromProposalInput {
  proposal: BriefProposal;
  library: readonly BriefLibraryEntry[];
  /** Klient do snapshotu w dokumencie (CLAUDE.md §14). */
  client: Client;
  /** Teczka, w której powstaje wycena — musi już istnieć. */
  projectId: string;
  /** Miasto z teczki — adres inwestycji wygrywa z kartoteką. Pusty = z klienta. */
  projectCity: string;
}

export interface WriteQuoteFromProposalResult {
  quote: Quote;
  /** Pozycje spoza biblioteki, które domena odrzuciła po cichu. */
  skipped: string[];
}

/**
 * Zapis wyceny z propozycji AI — część wspólna briefu (T-137) i „Z wiadomości"
 * (T-140).
 *
 * Powtarza DOKŁADNIE drogę ręcznej „Nowej wyceny" (`NewQuoteDialog`,
 * `useNewQuoteForProject`): baza z szablonu albo z ustawień, snapshot
 * klienta, miasto z teczki, termin i dokumenty z pakietu szablonu, numer
 * nadany w repozytorium. Jedyna różnica to `applyBriefProposal` między bazą
 * a zapisem — propozycja dokłada pomieszczenia i pozycje, nic więcej.
 *
 * Nie nawiguje i nie pokazuje toastów: wołający wie, czy wycena była
 * jedynym krokiem (brief), czy ostatnim z trzech (wiadomość), i sam mówi,
 * co się udało.
 */
export function useQuoteFromProposalWriter() {
  const workspace = useWorkspace();
  const templates = useTemplates();
  const roomTypes = useRoomTypes();
  const createQuote = useCreateQuote();

  const settings = workspace.data?.settings;
  const ready = Boolean(settings && templates.data && roomTypes.data);

  const write = useCallback(
    async (input: WriteQuoteFromProposalInput): Promise<WriteQuoteFromProposalResult> => {
      if (!settings) throw new Error(pl.ai.brief.failed);

      // Szablon bez `body` (uszkodzony) to dla nas „Bez szablonu": baza
      // z ustawień, a termin i dokumenty też nie z niego — inaczej wycena
      // dostałaby pakiet, którego pozycji nie widać.
      const chosen = templates.data?.find((row) => row.id === input.proposal.templateId);
      const template = chosen?.body ? { ...chosen, body: chosen.body } : null;
      const base = template ? fromTemplate(template.body) : quoteBodyFromSettings(settings);

      const { body, skipped } = applyBriefProposal({
        proposal: input.proposal,
        base,
        library: input.library,
        roomTypeIds: new Set((roomTypes.data ?? []).map((type) => type.id)),
      });
      body.client = clientSnapshot(input.client);
      // Adres inwestycji jest przy projekcie — teczka wygrywa z kartoteką.
      if (input.projectCity) body.client.city = input.projectCity;

      const quote = await createQuote.mutateAsync({
        body,
        clientId: input.client.id,
        projectId: input.projectId,
        schedule: scheduleFromTemplate(template?.schedule ?? null),
        documents: template?.documents ? structuredClone(template.documents) : null,
      });

      return { quote, skipped };
    },
    [settings, templates.data, roomTypes.data, createQuote],
  );

  return { write, ready, pending: createQuote.isPending };
}

/**
 * „Utwórz wycenę w projekcie" z propozycji AI (T-137).
 *
 * Nowy projekt dostaje nazwę z tytułu propozycji i adres podpowiedziany
 * z kartoteki (`emptyProjectDraft`), bo tak samo startuje formularz teczki.
 */
export function useCreateQuoteFromProposal(clientId: string) {
  const navigate = useNavigate();
  const client = useClient(clientId);
  const projects = useProjects({ clientId, status: 'all' });
  const createProject = useCreateProject();
  const writer = useQuoteFromProposalWriter();

  const ready = writer.ready && Boolean(client.data);
  const { write } = writer;

  const create = useCallback(
    async (input: {
      proposal: BriefProposal;
      library: readonly BriefLibraryEntry[];
      /** `NEW_PROJECT` = załóż teczkę o nazwie z tytułu propozycji. */
      projectId: string;
    }): Promise<void> => {
      if (!client.data) return;

      try {
        let projectId = input.projectId;
        let projectCity = projects.data?.find((row) => row.id === projectId)?.city ?? '';
        if (projectId === NEW_PROJECT) {
          const project = await createProject.mutateAsync({
            ...emptyProjectDraft(client.data),
            name: input.proposal.title.trim() || pl.ai.brief.title,
            clientId,
          });
          projectId = project.id;
          projectCity = project.city;
        }

        const { quote, skipped } = await write({
          proposal: input.proposal,
          library: input.library,
          client: client.data,
          projectId,
          projectCity,
        });

        toast.success(pl.ai.brief.created);
        // Obce `libraryItemId` odpadły po cichu w domenie — tu mówimy o tym
        // raz, bo dokument i tak powstał, a użytkownik nie widział ich na liście.
        if (skipped.length > 0) toast.message(pl.ai.brief.skipped(skipped.length));
        void navigate(routes.quote(quote.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : pl.ai.brief.failed);
      }
    },
    [client.data, projects.data, createProject, write, clientId, navigate],
  );

  return {
    create,
    ready,
    pending: writer.pending || createProject.isPending,
  };
}
