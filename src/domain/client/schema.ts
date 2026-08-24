import { z } from 'zod';
import type { QuoteClient } from '../quote/schema';

/**
 * Klient studia — parytet z tabelą `clients` (02-DATABASE §1 + migracja 0015).
 *
 * Hierarchia z koncepcji: STUDIO → KLIENT → PROJEKT → wycena. Klient jest
 * **źródłem** danych inwestora; wycena trzyma ich kopię w `body.client`
 * (patrz `clientSnapshot`), więc edycja klienta nie zmienia wysłanej oferty.
 */

/**
 * `archived` to zamknięta współpraca, a nie kosz. Skasowanie ma własną
 * kolumnę (`deleted_at`) i własne znaczenie — mylenie tych dwóch stanów
 * kończy się „archiwizacją", po której nie da się już nic odzyskać.
 */
export const ClientStatusSchema = z.enum(['active', 'archived']);
export type ClientStatus = z.infer<typeof ClientStatusSchema>;

/**
 * Puste pola trzymamy jako `''`, a nie `null`.
 *
 * W bazie kolumny są nullable (i `null` z bazy mapujemy na `''` w repozytorium),
 * ale formularz i snapshot w wycenie operują na stringach. Jedna reprezentacja
 * pustki po stronie aplikacji znaczy, że nikt nie musi pamiętać, czy „brak
 * telefonu" to `null`, `undefined` czy `''`.
 */
export const ClientSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().default(''),
  email: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  notes: z.string().default(''),
  status: ClientStatusSchema.default('active'),
  archivedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Client = z.infer<typeof ClientSchema>;

/** Klient z sumami liczonymi w bazie (widok `clients_overview`). */
export const ClientOverviewSchema = ClientSchema.extend({
  quotesCount: z.number().int().nonnegative().default(0),
  projectsCount: z.number().int().nonnegative().default(0),
  acceptedNetCents: z.number().int().nonnegative().default(0),
  lastActivityAt: z.string(),
});
export type ClientOverview = z.infer<typeof ClientOverviewSchema>;

/**
 * Dane z formularza. E-mail waliduje się **tylko wtedy, gdy ktoś go wpisał** —
 * połowa klientów kontaktuje się wyłącznie telefonicznie i wymuszanie adresu
 * blokowałoby zapis rekordu, który jest kompletny.
 */
export const ClientDraftSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę klienta'),
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Nieprawidłowy adres e-mail',
    }),
  address: z.string().trim(),
  city: z.string().trim(),
  notes: z.string(),
});
export type ClientDraft = z.infer<typeof ClientDraftSchema>;

/**
 * Pusty formularz.
 *
 * Pola formularza są **wymaganymi stringami**, a nie `.default('')` — inaczej
 * typ wejściowy schematu (z opcjonalnymi polami) rozjeżdżałby się z wyjściowym
 * i `react-hook-form` nie zgodziłby się na resolver. Pustkę podaje ta funkcja.
 */
export function emptyClientDraft(): ClientDraft {
  return { name: '', phone: '', email: '', address: '', city: '', notes: '' };
}

/** Formularz wypełniony istniejącym klientem. */
export function clientToDraft(client: Client): ClientDraft {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    city: client.city,
    notes: client.notes,
  };
}

/**
 * Snapshot klienta do `body.client`.
 *
 * To **kopia w chwili wykonania**, nie referencja (CLAUDE.md §14). Wycena
 * wysłana inwestorowi ma zostać taka, jaka poszła — poprawienie telefonu
 * w kartotece nie może zmieniać dokumentu sprzed miesiąca. Odświeżenie jest
 * jawną akcją użytkownika („Odśwież dane klienta"), nie efektem ubocznym.
 *
 * Adresu tu nie ma: `QuoteClient` go nie zna, a dokładanie pola do `body`
 * podbijałoby `bodyVersion` bez powodu (§9.5).
 */
export function clientSnapshot(client: Client): QuoteClient {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email,
    city: client.city,
  };
}

/**
 * Czy snapshot w wycenie rozjechał się z kartoteką.
 *
 * Po to, żeby „Odśwież dane klienta" dało się pokazać tylko wtedy, gdy jest co
 * odświeżać — przycisk, który zawsze wygląda tak samo, nie mówi nic o tym, czy
 * dokument jest aktualny.
 */
export function clientSnapshotDiffers(snapshot: QuoteClient, client: Client): boolean {
  const fresh = clientSnapshot(client);
  return (
    fresh.name !== snapshot.name ||
    fresh.phone !== snapshot.phone ||
    fresh.email !== snapshot.email ||
    fresh.city !== snapshot.city
  );
}
