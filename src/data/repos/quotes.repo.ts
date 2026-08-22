import {
  QuoteStatusSchema,
  calcQuoteTotals,
  duplicateQuoteBody,
  newQuoteBody,
  parseQuoteBody,
  type QuoteBody,
  type QuoteStatus,
} from '@/domain/quote';
import { getSupabase } from '@/data/supabase';
import type { TablesUpdate } from '@/data/types.generated';
import { ConflictError, RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('quotes.repo');

/** Kolumny listy — bez `body`, zeby nie ciagnac calych dokumentow do tabeli. */
const LIST_COLUMNS =
  'id, workspace_id, number, title, status, total_net_cents, total_gross_cents, currency, client_name, valid_until, sent_at, accepted_at, created_at, updated_at';

export interface QuoteSummary {
  id: string;
  workspaceId: string;
  number: string | null;
  title: string;
  status: QuoteStatus;
  totalNetCents: number;
  totalGrossCents: number;
  currency: string;
  clientName: string | null;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote extends QuoteSummary {
  clientId: string | null;
  /** `null`, gdy `body` w bazie nie przechodzi walidacji — patrz `bodyError`. */
  body: QuoteBody | null;
  /** Opis problemu z walidacja. UI pokazuje „wycena uszkodzona" zamiast edytora. */
  bodyError: string | null;
}

export type QuoteSort = 'updated_desc' | 'created_desc' | 'total_desc' | 'number_asc';

export interface QuoteFilters {
  workspaceId: string;
  search?: string;
  status?: QuoteStatus | 'all';
  includeArchived?: boolean;
  sort?: QuoteSort;
}

const SORTS: Record<QuoteSort, { column: string; ascending: boolean }> = {
  updated_desc: { column: 'updated_at', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
  total_desc: { column: 'total_net_cents', ascending: false },
  number_asc: { column: 'number', ascending: true },
};

type Row = Record<string, unknown>;

function mapSummary(row: Row): QuoteSummary {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    number: (row.number as string | null) ?? null,
    title: row.title as string,
    status: QuoteStatusSchema.catch('draft').parse(row.status),
    totalNetCents: Number(row.total_net_cents ?? 0),
    totalGrossCents: Number(row.total_gross_cents ?? 0),
    currency: (row.currency as string) ?? 'PLN',
    clientName: (row.client_name as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapQuote(row: Row): Quote {
  const parsed = parseQuoteBody(row.body);
  if (!parsed.ok) {
    log.error('Uszkodzony body wyceny', { id: row.id, error: parsed.error });
  }

  return {
    ...mapSummary(row),
    clientId: (row.client_id as string | null) ?? null,
    body: parsed.ok ? parsed.body : null,
    bodyError: parsed.ok ? null : parsed.error,
  };
}

export async function listQuotes(filters: QuoteFilters): Promise<QuoteSummary[]> {
  const sort = SORTS[filters.sort ?? 'updated_desc'];

  let query = getSupabase()
    .from('quotes')
    .select(LIST_COLUMNS)
    .eq('workspace_id', filters.workspaceId);

  if (!filters.includeArchived) query = query.is('deleted_at', null);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const term = filters.search?.trim();
  if (term) {
    // Szukamy po numerze, tytule i nazwie klienta — te trzy pola widac na liscie.
    const pattern = '%' + term + '%';
    query = query.or(
      'number.ilike.' + pattern + ',title.ilike.' + pattern + ',client_name.ilike.' + pattern,
    );
  }

  const rows = unwrap(
    await query.order(sort.column, { ascending: sort.ascending, nullsFirst: false }),
    'Lista wycen',
  );
  return rows.map((row) => mapSummary(row as unknown as Row));
}

export async function getQuote(id: string): Promise<Quote> {
  const rows = unwrap(
    await getSupabase().from('quotes').select('*').eq('id', id).limit(1),
    'Odczyt wyceny',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie znaleziono wyceny.');
  return mapQuote(row);
}

/** Numer nadaje baza (atomowo), zeby dwa rownolegle zapisy nie dostaly tego samego. */
export async function nextQuoteNumber(workspaceId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('next_quote_number', { ws: workspaceId });
  if (error) throw new RepoError('Nadanie numeru wyceny: ' + error.message, error);
  return data;
}

export interface CreateQuoteInput {
  workspaceId: string;
  body?: QuoteBody;
  title?: string;
  clientId?: string | null;
  currency?: string;
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const body = input.body ?? newQuoteBody({ title: input.title ?? 'Wycena' });
  const totals = calcQuoteTotals(body);
  const number = await nextQuoteNumber(input.workspaceId);

  const rows = unwrap(
    await getSupabase()
      .from('quotes')
      .insert({
        workspace_id: input.workspaceId,
        client_id: input.clientId ?? null,
        number,
        title: body.title,
        status: 'draft',
        body,
        total_net_cents: totals.netCents,
        total_gross_cents: totals.grossCents,
        currency: input.currency ?? 'PLN',
        client_name: body.client.name || null,
      })
      .select('*'),
    'Utworzenie wyceny',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie utworzyc wyceny.');
  return mapQuote(row);
}

export interface SaveQuoteInput {
  id: string;
  body: QuoteBody;
  /** `updated_at` ostatnio widziany przez klienta — podstawa blokady optymistycznej. */
  lastSeenUpdatedAt: string;
  status?: QuoteStatus;
}

/**
 * Zapis calego dokumentu. Totale denormalizujemy tutaj (a nie w komponencie),
 * zeby lista i statystyki nie musialy parsowac `body`.
 *
 * Konflikt wykrywamy przez `.eq('updated_at', lastSeenUpdatedAt)`: jesli ktos
 * zapisal w miedzyczasie, warunek nie trafi w zaden wiersz i dostaniemy pustke.
 */
export async function saveQuote(input: SaveQuoteInput): Promise<Quote> {
  const totals = calcQuoteTotals(input.body);

  const rows = unwrap(
    await getSupabase()
      .from('quotes')
      .update({
        body: input.body,
        title: input.body.title,
        client_name: input.body.client.name || null,
        total_net_cents: totals.netCents,
        total_gross_cents: totals.grossCents,
        ...(input.status ? { status: input.status } : {}),
      })
      .eq('id', input.id)
      .eq('updated_at', input.lastSeenUpdatedAt)
      .select('*'),
    'Zapis wyceny',
  );

  const row = rows[0];
  if (!row) throw new ConflictError('Wycena zmieniona w innym miejscu — przeladuj.');
  return mapQuote(row);
}

/** Zmiana statusu nie rusza `body`, wiec nie wymaga blokady optymistycznej. */
export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<QuoteSummary> {
  const patch: TablesUpdate<'quotes'> = { status };
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  if (status === 'accepted') patch.accepted_at = new Date().toISOString();

  const rows = unwrap(
    await getSupabase().from('quotes').update(patch).eq('id', id).select(LIST_COLUMNS),
    'Zmiana statusu wyceny',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie zmienic statusu.');
  return mapSummary(row);
}

export async function duplicateQuote(id: string): Promise<Quote> {
  const source = await getQuote(id);
  if (!source.body) throw new RepoError('Nie mozna zduplikowac uszkodzonej wyceny.');

  const body = duplicateQuoteBody(source.body);
  body.title = source.body.title + ' (kopia)';

  return createQuote({
    workspaceId: source.workspaceId,
    body,
    clientId: source.clientId,
    currency: source.currency,
  });
}

/** Archiwizacja = soft delete. Danych uzytkownika nie kasujemy nieodwracalnie. */
export async function archiveQuote(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Archiwizacja wyceny',
  );
}

export async function restoreQuote(id: string): Promise<void> {
  unwrap(
    await getSupabase().from('quotes').update({ deleted_at: null }).eq('id', id).select('id'),
    'Przywrocenie wyceny',
  );
}
