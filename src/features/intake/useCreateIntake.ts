import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { routes } from '@/app/routes';
import { useCreateClient } from '@/data/queries/useClients';
import { useCreateProject } from '@/data/queries/useProjects';
import {
  briefProposalOf,
  clientDraftFromProposal,
  projectDraftFromProposal,
  type BriefLibraryEntry,
  type MaskedMessage,
  type MessageProposal,
} from '@/domain/ai';
import type { Client } from '@/domain/client/schema';
import { useQuoteFromProposalWriter } from '@/features/brief/ai/useCreateQuoteFromProposal';
import { pl } from '@/i18n/pl';

export interface CreateIntakeInput {
  /** Propozycja z poprawkami użytkownika. */
  proposal: MessageProposal;
  /** Oryginalna wiadomość (z kontaktami) — do notatek teczki. */
  original: string;
  masked: MaskedMessage;
  /** Istniejący klient (znany z karty albo dopasowany) — `null` = załóż nowego. */
  existingClient: Client | null;
  /** E-mail i telefon po poprawkach — nadpisują te z maski. */
  contact: { email: string; phone: string };
  withQuote: boolean;
  library: readonly BriefLibraryEntry[];
}

/**
 * „Utwórz teczkę" (T-140): klient → projekt → (opcjonalnie) wycena.
 *
 * Kolejność jest nienegocjowalna, bo każdy krok potrzebuje `id` z poprzedniego.
 * Gdy wycena padnie po udanym projekcie, NIE udajemy, że nic nie powstało:
 * użytkownik dostaje toast o błędzie i ląduje na stronie nowej teczki, gdzie
 * widzi klienta i projekt, a wycenę może założyć ręcznie. Sierota bez
 * informacji byłaby gorsza niż niepełny sukces.
 */
export function useCreateIntake() {
  const navigate = useNavigate();
  const createClient = useCreateClient();
  const createProject = useCreateProject();
  const writer = useQuoteFromProposalWriter();
  const [pending, setPending] = useState(false);

  const { write } = writer;

  const create = useCallback(
    async (input: CreateIntakeInput): Promise<void> => {
      setPending(true);
      let client: Client | null = input.existingClient;
      let projectId: string | null = null;

      try {
        if (!client) {
          const draft = clientDraftFromProposal(input.proposal, input.masked);
          client = await createClient.mutateAsync({
            ...draft,
            email: input.contact.email.trim(),
            phone: input.contact.phone.trim(),
          });
        }

        const project = await createProject.mutateAsync({
          ...projectDraftFromProposal(input.proposal, input.original, client),
          clientId: client.id,
        });
        projectId = project.id;

        if (!input.withQuote) {
          toast.success(pl.ai.intake.created);
          void navigate(routes.project(client.id, project.id));
          return;
        }

        const { quote, skipped } = await write({
          proposal: briefProposalOf(input.proposal),
          library: input.library,
          client,
          projectId: project.id,
          projectCity: project.city,
        });
        toast.success(pl.ai.intake.createdWithQuote);
        if (skipped.length > 0) toast.message(pl.ai.brief.skipped(skipped.length));
        void navigate(routes.quote(quote.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : pl.ai.intake.failed);
        // Klient i teczka już są — pokazujemy je, zamiast zostawiać w ciszy.
        if (client && projectId) void navigate(routes.project(client.id, projectId));
      } finally {
        setPending(false);
      }
    },
    [createClient, createProject, write, navigate],
  );

  return { create, ready: writer.ready, pending };
}
