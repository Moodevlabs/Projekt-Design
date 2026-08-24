import {
  DocKindSchema,
  QuoteStatusSchema,
  calcQuoteTotals,
  duplicateQuoteBody,
  newQuoteBody,
  parseQuoteBody,
  type DocKind,
  type QuoteBody,
  type QuoteStatus,
} from '@/domain/quote';
import { parseScheduleBody, type ScheduleBody } from '@/domain/schedule';
import { parseQuoteDocuments, type QuoteDocuments } from '@/domain/documents';
import { getSupabase } from '@/data/supabase';
import type { TablesUpdate } from '@/data/types.generated';
import { ConflictError, RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('quotes.repo');

/** Kolumny listy — bez `body`, zeby nie ciagnac calych dokumentow do tabeli. */
const LIST_COLUMNS =
  'id, workspace_id, client_id, number, title, status, total_net_cents, total_gross_cents, currency, client_name, city, internal_notes, doc_kind, valid_until, sent_at, accepted_at, created_at, updated_at';

export interface QuoteSummary {
  id: string;
  workspaceId: string;
  /** Klient z kartoteki (T-53). `null` = wycena bez klienta — dopuszczalny stan. */
  clientId: string | null;
  number: string | null;
  title: string;
  status: QuoteStatus;
  totalNetCents: number;
  totalGrossCents: number;
  currency: string;
  clientName: string | null;
  /** Kopia `body.client.city` — do kolumny i filtra rejestru (F7.1). */
  city: string | null;
  /** Notatki wewnetrzne. **Nigdy nie ida do PDF ani do duplikatu wyceny.** */
  internalNotes: string | null;
  /** Rodzaj dokumentu wyslanego inwestorowi — ustawia czlowiek, nie automat. */
  docKind: DocKind;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote extends QuoteSummary {
  /** `null`, gdy `body` w bazie nie przechodzi walidacji — patrz `bodyError`. */
  body: QuoteBody | null;
  /** Opis problemu z walidacja. UI pokazuje „wycena uszkodzona" zamiast edytora. */
  bodyError: string | null;
  /**
   * Harmonogram (F5). `null` = ta wycena go nie ma — i to jest normalny stan,
   * a nie brak danych. Pusty obiekt znaczylby harmonogram bez etapow.
   */
  schedule: ScheduleBody | null;
  /**
   * Dokumenty towarzyszace (F6): etapy wspolpracy, cennik dodatkowy.
   * `null` = ta wycena ich nie ma — normalny stan, nie brak danych.
   */
  documents: QuoteDocuments | null;
}

export type QuoteSort = 'updated_desc' | 'created_desc' | 'total_desc' | 'number_asc';

export interface QuoteFilters {
  workspaceId: string;
  search?: string;
  status?: QuoteStatus | 'all';
  /** Filtr rejestru po miescie klienta (F7.1). Pusty = wszystkie. */
  city?: string;
  /** Wyceny jednego klienta — zakladka „Wyceny" na karcie i filtr rejestru (T-53). */
  clientId?: string;
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
    clientId: (row.client_id as string | null) ?? null,
    number: (row.number as string | null) ?? null,
    title: row.title as string,
    status: QuoteStatusSchema.catch('draft').parse(row.status),
    totalNetCents: Number(row.total_net_cents ?? 0),
    totalGrossCents: Number(row.total_gross_cents ?? 0),
    currency: (row.currency as string) ?? 'PLN',
    clientName: (row.client_name as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    internalNotes: (row.internal_notes as string | null) ?? null,
    docKind: DocKindSchema.catch('offer').parse(row.doc_kind),
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
    body: parsed.ok ? parsed.body : null,
    bodyError: parsed.ok ? null : parsed.error,
    // Miekko, jak `pricing` w bibliotece: zepsuty harmonogram nie ma prawa
    // zablokowac calej wyceny. `parseScheduleBody` zwroci wtedy `null`.
    schedule: parseScheduleBody(row.schedule),
    documents: parseQuoteDocuments(row.documents),
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
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);

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

/** Wiersz rejestru do eksportu CSV (F7.1) — uklad arkusza `OFERTY`. */
export interface QuoteRegisterRow {
  number: string | null;
  createdAt: string;
  docKind: DocKind;
  clientName: string | null;
  clientPhone: string;
  clientEmail: string;
  city: string | null;
  internalNotes: string | null;
}

/**
 * Rejestr do eksportu.
 *
 * Osobne zapytanie od `listQuotes`, bo telefon i e-mail siedza w `body` —
 * na liscie ich nie ma i nie ma powodu, zeby byly. Eksport jest akcja
 * jednorazowa, wiec stac go na sciagniecie dokumentow; **lista nie ma prawa
 * ich ciagnac przy kazdym otwarciu**.
 */
export async function listQuoteRegister(filters: QuoteFilters): Promise<QuoteRegisterRow[]> {
  let query = getSupabase()
    .from('quotes')
    .select('number, created_at, doc_kind, client_name, city, internal_notes, body')
    .eq('workspace_id', filters.workspaceId);

  if (!filters.includeArchived) query = query.is('deleted_at', null);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const rows = unwrap(await query.order('created_at', { ascending: true }), 'Rejestr ofert');

  return (rows as unknown as Row[]).map((row) => {
    // Czytamy `body` defensywnie: uszkodzony dokument ma sie znalezc
    // w rejestrze z tym, co wiadomo z kolumn, a nie wywrocic caly eksport.
    const client = (row.body as { client?: { phone?: unknown; email?: unknown } } | null)?.client;

    return {
      number: (row.number as string | null) ?? null,
      createdAt: row.created_at as string,
      docKind: DocKindSchema.catch('offer').parse(row.doc_kind),
      clientName: (row.client_name as string | null) ?? null,
      clientPhone: typeof client?.phone === 'string' ? client.phone : '',
      clientEmail: typeof client?.email === 'string' ? client.email : '',
      city: (row.city as string | null) ?? null,
      internalNotes: (row.internal_notes as string | null) ?? null,
    };
  });
}

/**
 * Miasta obecne w rejestrze — do listy wyboru w filtrze.
 *
 * Postgres nie da nam `distinct` przez PostgREST, wiec sciagamy JEDNA kolumne
 * i odsiewamy duplikaty tutaj. To kilka bajtow na wiersz; ciagniecie calych
 * wierszy tylko po to, zeby poznac miasta, byloby marnotrawstwem.
 */
export async function listQuoteCities(workspaceId: string): Promise<string[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quotes')
      .select('city')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .not('city', 'is', null),
    'Miasta w rejestrze',
  );

  const miasta = new Set(
    (rows as unknown as Row[])
      .map((row) => (row.city as string | null)?.trim())
      .filter((city): city is string => Boolean(city)),
  );

  return [...miasta].sort((a, b) => a.localeCompare(b, 'pl'));
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
        // Jak w `saveQuote`: kolumny listowe to kopia snapshotu. Bez tego
        // wycena zalozona z karty klienta wpadalaby do rejestru bez miasta
        // az do pierwszego autozapisu.
        city: body.client.city || null,
      })
      .select('*'),
    'Utworzenie wyceny',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie utworzyc wyceny.');
  return mapQuote(row);
}

export interface SaveQuoteInput {
  /**
   * Harmonogram (F5). Pomin, zeby go NIE ruszac — zapis wyceny z zakladki
   * „Wycena" nie ma prawa skasowac tego, co ktos ustawil w zakladce „Termin".
   */
  schedule?: ScheduleBody | null;
  /** Jak `schedule`: pomin, zeby NIE ruszac dokumentow towarzyszacych. */
  documents?: QuoteDocuments | null;
  id: string;
  body: QuoteBody;
  /**
   * Klient z kartoteki (T-53). Pomin, zeby NIE ruszac przypisania; `null`
   * odpina wycene od klienta. Snapshot danych i tak siedzi w `body.client`,
   * wiec odpiecie nie kasuje tresci dokumentu.
   */
  clientId?: string | null;
  /** `updated_at` ostatnio widziany przez klienta — podstawa blokady optymistycznej. */
  lastSeenUpdatedAt: string;
  status?: QuoteStatus;
  /** Numer nadaje baza, ale uzytkownik moze go nadpisac (05-UI §3). */
  number?: string;
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
        // Miasto denormalizujemy tak samo jak nazwe: lista i filtr rejestru
        // nie maja rozpakowywac JSONB kazdego wiersza.
        city: input.body.client.city || null,
        total_net_cents: totals.netCents,
        total_gross_cents: totals.grossCents,
        // Ta sama zasada co przy harmonogramie: `undefined` = „nie ruszaj",
        // `null` = „odepnij". Zapis wyceny bez tego rozroznienia odpinalby
        // klienta przy kazdym autozapisie ze starego edytora.
        ...(input.clientId !== undefined ? { client_id: input.clientId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.number !== undefined ? { number: input.number } : {}),
        // `undefined` = „nie ruszaj harmonogramu"; `null` = „skasuj go".
        // Bez tego rozroznienia zapis samej wyceny kasowalby termin.
        ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
        ...(input.documents !== undefined ? { documents: input.documents } : {}),
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

/**
 * Pola rejestru: notatki wewnetrzne i rodzaj dokumentu (F7.1).
 *
 * Bez blokady optymistycznej, jak `setQuoteStatus`: to sa dane OBOK dokumentu,
 * wiec nie moga wywolac konfliktu na `body` ani go nadpisac. Notatka zmieniona
 * z listy w trakcie edycji wyceny w drugim oknie ma po prostu zadzialac.
 */
export async function setQuoteRegisterFields(
  id: string,
  patch: { internalNotes?: string | null; docKind?: DocKind },
): Promise<QuoteSummary> {
  const update: TablesUpdate<'quotes'> = {};
  // Pusta notatka to `null`, nie `''` — inaczej filtr „ma notatke" musialby
  // znac oba zapisy tego samego.
  if (patch.internalNotes !== undefined) update.internal_notes = patch.internalNotes || null;
  if (patch.docKind !== undefined) update.doc_kind = patch.docKind;

  const rows = unwrap(
    await getSupabase().from('quotes').update(update).eq('id', id).select(LIST_COLUMNS),
    'Zapis notatek wyceny',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie zapisac notatek.');
  return mapSummary(row);
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
