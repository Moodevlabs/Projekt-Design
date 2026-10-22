import { emptyClientDraft, type Client, type ClientDraft } from '../client/schema';
import { emptyProjectDraft, type ProjectDraft } from '../project/schema';
import type { MaskedMessage } from './mask-contacts';
import type { BriefProposal, MessageProposal } from './schema';

/**
 * Wiadomość od klienta → teczka (T-140, FEATURES-AI.md §8).
 *
 * Model oddaje jedną propozycję; aplikacja rozkłada ją na trzy rzeczy, które
 * zapisuje osobno i w tej kolejności: klient, projekt, (opcjonalnie) wycena.
 * Dane kontaktowe NIE pochodzą od modelu — wyciął je `maskContacts` i tu
 * wracają z `MaskedMessage` do karty klienta.
 */

/** Karta klienta: nazwa i adres z propozycji, e-mail i telefon z maski. */
export function clientDraftFromProposal(
  proposal: MessageProposal,
  masked: Pick<MaskedMessage, 'emails' | 'phones'>,
): ClientDraft {
  return {
    ...emptyClientDraft(),
    name: proposal.client.name.trim(),
    city: proposal.client.city.trim(),
    address: proposal.client.address.trim(),
    email: masked.emails[0] ?? '',
    phone: masked.phones[0] ?? '',
  };
}

/**
 * Teczka: nazwa z propozycji albo z tytułu oferty, metraż jako tekst
 * (formularz projektu trzyma go tak samo), status `lead`, a cała wiadomość
 * w notatkach — żeby źródło zostało przy projekcie, nie w schowku.
 */
export function projectDraftFromProposal(
  proposal: MessageProposal,
  message: string,
  client?: Pick<Client, 'address' | 'city'>,
): ProjectDraft {
  const base = emptyProjectDraft(client);
  const name = proposal.project.name.trim() || proposal.title.trim() || base.name;
  return {
    ...base,
    name,
    address: proposal.client.address.trim() || base.address,
    city: proposal.client.city.trim() || base.city,
    areaM2: proposal.project.areaM2 === null ? '' : String(proposal.project.areaM2),
    kind: proposal.project.kind ?? '',
    status: 'lead',
    notes: message.trim(),
  };
}

/** Część wspólna z briefem — do `applyBriefProposal` i arkusza zakresu. */
export function briefProposalOf(proposal: MessageProposal): BriefProposal {
  return {
    title: proposal.title,
    projectDescription: proposal.projectDescription,
    templateId: proposal.templateId,
    rooms: proposal.rooms,
    items: proposal.items,
    openQuestions: proposal.openQuestions,
  };
}

/** Porównanie nazw bez wielkości liter, spacji i polskich ogonków. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Czy w bazie jest już ten klient — LOKALNIE, bez pytania modelu o listę
 * klientów (A7). Najpierw e-mail z maski, potem nazwa po normalizacji.
 */
export function matchExistingClient<T extends { id: string; name: string; email: string | null }>(
  proposal: MessageProposal,
  masked: Pick<MaskedMessage, 'emails'>,
  clients: readonly T[],
): T | null {
  const emails = new Set(masked.emails.map((email) => email.toLowerCase()));
  const byEmail = clients.find((client) => client.email && emails.has(client.email.toLowerCase()));
  if (byEmail) return byEmail;

  const wanted = normalizeName(proposal.client.name);
  if (!wanted) return null;
  return clients.find((client) => normalizeName(client.name) === wanted) ?? null;
}
