import { createClient } from '@supabase/supabase-js';

import {
  ShareActionResultSchema,
  SharedQuotePayloadSchema,
  type ShareActionResult,
  type SharedQuotePayload,
} from '@/domain/share/schema';

import {
  BriefSubmitResultSchema,
  SharedBriefPayloadSchema,
  type BriefAnswers,
  type BriefSubmitResult,
  type SharedBriefPayload,
} from '@/domain/brief';

export { tokenFromPath } from '@/domain/share/schema';
export { briefTokenFromPath } from '@/domain/brief';
import type { Database } from '@/data/types.generated';

/**
 * Dostęp do danych strony klienta (T-25b).
 *
 * Osobny klient Supabase, celowo NIE ten z `src/data/supabase.ts`:
 * tamten trzyma sesję w keychainie przez most Tauri, którego tutaj nie ma,
 * a strona klienta ma być bezstanowa. Żadnego logowania, żadnego zapisu
 * w przeglądarce — jedyny „klucz" to token w adresie.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Odpowiedzi RPC przepuszczamy przez zod, mimo że pisaliśmy je sami.
 *
 * Powód nie jest formalny: gdy funkcja w bazie zmieni kształt, chcemy pustego
 * ekranu z komunikatem, a nie strony, która renderuje `undefined` jako cenę.
 */
export async function fetchSharedQuote(token: string): Promise<SharedQuotePayload> {
  const { data, error } = await client.rpc('get_shared_quote', { p_token: token });
  if (error) throw new Error(error.message);
  return SharedQuotePayloadSchema.parse(data);
}

export async function acceptSharedQuote(
  token: string,
  enabledIds: string[],
  signerName: string,
): Promise<ShareActionResult> {
  const { data, error } = await client.rpc('accept_shared_quote', {
    p_token: token,
    p_enabled_ids: enabledIds,
    p_signer_name: signerName,
  });
  if (error) throw new Error(error.message);
  return ShareActionResultSchema.parse(data);
}

/**
 * Odmowa (poprawka 7a, 2026-08-27).
 *
 * Powód jest opcjonalny — wymuszanie uzasadnienia przy „nie" zamienia jedno
 * kliknięcie w rozmowę, której klient może nie chcieć prowadzić. Wtedy nie
 * odpowie wcale, a projektant zostanie z ciszą zamiast z odpowiedzią.
 */
export async function rejectSharedQuote(
  token: string,
  signerName: string,
  reason: string,
): Promise<ShareActionResult> {
  const { data, error } = await client.rpc('reject_shared_quote', {
    p_token: token,
    p_signer_name: signerName,
    /*
     * `undefined`, nie `null` — wyszło przy odświeżeniu `types.generated.ts`
     * w T-121. W SQL argument ma `default null`, a generator mapuje taki
     * argument na OPCJONALNY (`p_reason?: string`) i nie umie wyrazić
     * „nullowalny". Pominięty klucz nie trafia do JSON-a, więc PostgREST
     * bierze wartość domyślną funkcji — czyli dokładnie ten sam NULL.
     */
    p_reason: reason.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return ShareActionResultSchema.parse(data);
}

export async function commentSharedQuote(
  token: string,
  authorName: string,
  message: string,
): Promise<ShareActionResult> {
  const { data, error } = await client.rpc('comment_shared_quote', {
    p_token: token,
    p_author_name: authorName,
    p_message: message,
  });
  if (error) throw new Error(error.message);
  return ShareActionResultSchema.parse(data);
}

/**
 * Brief klienta (T-93, poprawka 9) — ta sama zasada co przy ofercie: dwa RPC
 * i zero dostępu do tabel. Token jest jedynym uchwytem.
 */
export async function fetchSharedBrief(token: string): Promise<SharedBriefPayload> {
  const { data, error } = await client.rpc('get_shared_brief', { p_token: token });
  if (error) throw new Error(error.message);
  return SharedBriefPayloadSchema.parse(data);
}

export async function submitSharedBrief(
  token: string,
  answers: BriefAnswers,
): Promise<BriefSubmitResult> {
  const { data, error } = await client.rpc('submit_shared_brief', {
    p_token: token,
    p_answers: answers,
  });
  if (error) throw new Error(error.message);
  return BriefSubmitResultSchema.parse(data);
}

/**
 * Podpisany adres logo z prywatnego bucketa `brand`.
 *
 * Polityka z migracji 0025 wpuszcza anonima do tego bucketa tylko wtedy, gdy
 * workspace ma żywy link. Gdy się nie uda — zwracamy `null` i strona pokazuje
 * nazwę firmy tekstem. Brak logo nie może wywrócić oferty.
 */
export async function signedLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage.from('brand').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
