import { getSupabase } from '@/data/supabase';
import { unwrap } from './errors';

/**
 * Co się wydarzyło po stronie klienta — dla paska „na bieżąco" na pulpicie
 * (poprawka 6, 2026-08-27).
 *
 * ## Po co osobne repozytorium
 *
 * `shares.repo` odpowiada na pytania o JEDNĄ wycenę („czy ta oferta została
 * przyjęta"). Pulpit zadaje pytanie odwrotne: „czy gdziekolwiek coś się
 * wydarzyło, o czym jeszcze nie wiem". To inny kształt zapytania — po całym
 * workspace, przez wszystkie wyceny — i wciskanie go w hooki per-wycena
 * znaczyłoby N zapytań zamiast trzech.
 *
 * ## Dlaczego trzy zapytania, a nie jeden widok
 *
 * Zdarzenia mają różne źródła (akceptacje, uwagi, pierwsze wyświetlenie
 * linku) i różne kolumny czasu. Widok scalający je w bazie musiałby zgadywać
 * kolejność przy równych znacznikach i utrudniałby dołożenie czwartego
 * rodzaju. Trzy lekkie selecty z limitem, złączone i posortowane w pamięci,
 * są tańsze niż to brzmi: każdy zwraca najwyżej `limit` wierszy.
 */

/** Rodzaj zdarzenia. `rejected` obsługujemy od T-90 (odrzucenie oferty). */
export type ActivityKind = 'accepted' | 'rejected' | 'comment' | 'viewed';

export interface ActivityEvent {
  /** Klucz listy — identyfikator wiersza źródłowego, nie wyceny. */
  id: string;
  kind: ActivityKind;
  at: string;
  quoteId: string;
  quoteNumber: string | null;
  quoteTitle: string;
  clientId: string | null;
  clientName: string | null;
  /** Kto podpisał albo kto zostawił uwagę. */
  who: string | null;
  /** Treść uwagi — tylko dla `comment`. */
  message: string | null;
  /**
   * Czy to jeszcze czeka na człowieka.
   *
   * Uwaga: dla `comment` to `read_at is null`. Dla akceptacji i odrzuceń
   * zawsze `false` — te odhacza się decyzją w wycenie, a nie kliknięciem
   * w powiadomienie.
   */
  unread: boolean;
}

type Row = Record<string, unknown>;

/** Wycena osadzona w wierszu zdarzenia. */
interface QuoteRef {
  id: string;
  number: string | null;
  title: string;
  client_id: string | null;
  client_name: string | null;
}

const QUOTE_EMBED = 'quotes!inner(id, number, title, client_id, client_name, workspace_id)';

function quoteOf(row: Row): QuoteRef | null {
  const quote = row.quotes as QuoteRef | QuoteRef[] | null | undefined;
  if (!quote) return null;
  // PostgREST zwraca osadzenie jako obiekt przy relacji do-jednego, ale
  // starsze wersje potrafią oddać tablicę jednoelementową.
  return Array.isArray(quote) ? (quote[0] ?? null) : quote;
}

function base(quote: QuoteRef) {
  return {
    quoteId: quote.id,
    quoteNumber: quote.number,
    quoteTitle: quote.title,
    clientId: quote.client_id,
    clientName: quote.client_name,
  };
}

export async function listWorkspaceActivity(
  workspaceId: string,
  limit = 8,
): Promise<ActivityEvent[]> {
  const supabase = getSupabase();

  const [acceptances, comments, views] = await Promise.all([
    supabase
      .from('quote_acceptances')
      .select(`id, quote_id, signer_name, accepted_at, ${QUOTE_EMBED}`)
      .eq('quotes.workspace_id', workspaceId)
      .order('accepted_at', { ascending: false })
      .limit(limit),
    supabase
      .from('quote_comments')
      .select(`id, quote_id, author_name, message, created_at, read_at, ${QUOTE_EMBED}`)
      .eq('quotes.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('quote_shares')
      .select(`id, quote_id, first_viewed_at, ${QUOTE_EMBED}`)
      .eq('quotes.workspace_id', workspaceId)
      .not('first_viewed_at', 'is', null)
      .order('first_viewed_at', { ascending: false })
      .limit(limit),
  ]);

  const events: ActivityEvent[] = [];

  for (const row of unwrap(acceptances, 'Odczyt akceptacji') as unknown as Row[]) {
    const quote = quoteOf(row);
    if (!quote) continue;
    events.push({
      id: `acceptance-${row.id as string}`,
      kind: 'accepted',
      at: row.accepted_at as string,
      who: (row.signer_name as string | null) ?? null,
      message: null,
      unread: false,
      ...base(quote),
    });
  }

  for (const row of unwrap(comments, 'Odczyt uwag klienta') as unknown as Row[]) {
    const quote = quoteOf(row);
    if (!quote) continue;
    events.push({
      id: `comment-${row.id as string}`,
      kind: 'comment',
      at: row.created_at as string,
      who: (row.author_name as string | null) ?? null,
      message: (row.message as string | null) ?? null,
      unread: row.read_at === null,
      ...base(quote),
    });
  }

  for (const row of unwrap(views, 'Odczyt wyswietlen linku') as unknown as Row[]) {
    const quote = quoteOf(row);
    if (!quote) continue;
    events.push({
      id: `view-${row.id as string}`,
      kind: 'viewed',
      at: row.first_viewed_at as string,
      who: null,
      message: null,
      unread: false,
      ...base(quote),
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
