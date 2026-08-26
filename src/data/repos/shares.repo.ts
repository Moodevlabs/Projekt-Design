import { getSupabase } from '@/data/supabase';
import type { Tables } from '@/data/types.generated';
import {
  expiryFromDays,
  type Acceptance,
  type QuoteComment,
  type Share,
} from '@/domain/share/schema';
import { RepoError, unwrap } from './errors';

/**
 * Linki klienta, akceptacje i uwagi — strona projektanta (T-25c / T-26).
 *
 * Strona klienta końcowego NIE korzysta z tego pliku: ona ma trzy RPC
 * (`get_shared_quote`, `accept_shared_quote`, `comment_shared_quote`) i zero
 * dostępu do tabel. Tutaj jest widok właściciela wyceny, chroniony zwykłym RLS.
 */

type ShareRow = Tables<'quote_shares'>;
type CommentRow = Tables<'quote_comments'>;
type AcceptanceRow = Tables<'quote_acceptances'>;

function mapShare(row: ShareRow): Share {
  return {
    id: row.id,
    quoteId: row.quote_id,
    token: row.token,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: Number(row.view_count ?? 0),
  };
}

function mapComment(row: CommentRow): QuoteComment {
  return {
    id: row.id,
    quoteId: row.quote_id,
    shareId: row.share_id,
    authorName: row.author_name,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function mapAcceptance(row: AcceptanceRow): Acceptance {
  return {
    id: row.id,
    quoteId: row.quote_id,
    shareId: row.share_id,
    acceptedBody: row.accepted_body,
    enabledItemIds: row.enabled_item_ids ?? [],
    signerName: row.signer_name,
    // `inet` wraca z PostgREST-a jako string; typ generowany mówi `unknown`.
    signerIp: typeof row.signer_ip === 'string' ? row.signer_ip : null,
    acceptedAt: row.accepted_at,
  };
}

export async function listShares(quoteId: string): Promise<Share[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_shares')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false }),
    'Lista linków',
  );
  return rows.map(mapShare);
}

/**
 * Tworzy link. Token nadaje baza (`default` w migracji 0025) — dlatego insert
 * nie podaje kolumny `token` i dlatego trzeba go odczytać z powrotem.
 */
export async function createShare(quoteId: string, expiryDays: number | null): Promise<Share> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_shares')
      .insert({ quote_id: quoteId, expires_at: expiryFromDays(expiryDays) })
      .select('*'),
    'Utworzenie linku',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się utworzyć linku.');
  return mapShare(row);
}

/**
 * Odwołuje link. Nie kasujemy wiersza: liczba odsłon i data pierwszego
 * otwarcia to jedyny ślad po tym, czy klient w ogóle zajrzał do oferty.
 * Odwołany link nie da się „odwołać z powrotem" — od tego jest nowy.
 */
export async function revokeShare(shareId: string): Promise<Share> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', shareId)
      .is('revoked_at', null)
      .select('*'),
    'Odwołanie linku',
  );
  const row = rows[0];
  // Zero wierszy znaczy, że warunek `revoked_at is null` nie trafił: link był
  // już odwołany. Mówimy to wprost, zamiast udawać sukces — dwa kliknięcia
  // „Odwołaj" na tym samym linku to zwykły przypadek, nie awaria.
  if (!row) throw new RepoError('Ten link został już odwołany.');
  return mapShare(row);
}

export async function listQuoteComments(quoteId: string): Promise<QuoteComment[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_comments')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false }),
    'Uwagi klienta',
  );
  return rows.map(mapComment);
}

export async function markCommentRead(commentId: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('quote_comments')
      .update({ read_at: new Date().toISOString() })
      .eq('id', commentId)
      .is('read_at', null)
      .select('id'),
    'Oznaczenie uwagi',
  );
}

/** Najnowsza akceptacja wyceny albo `null`, gdy jej nie było. */
export async function latestAcceptance(quoteId: string): Promise<Acceptance | null> {
  const result = await getSupabase()
    .from('quote_acceptances')
    .select('*')
    .eq('quote_id', quoteId)
    .order('accepted_at', { ascending: false })
    .limit(1);

  if (result.error) throw new RepoError(`Akceptacja: ${result.error.message}`, result.error);
  const row = result.data?.[0];
  return row ? mapAcceptance(row) : null;
}
