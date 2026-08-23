import { calcQuoteTotals, parseQuoteBody, type QuoteBody } from '@/domain/quote';
import { getSupabase } from '@/data/supabase';
import type { Tables } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('templates.repo');

type TemplateRow = Tables<'quote_templates'>;

/** Dane, które karta szablonu pokazuje bez otwierania dokumentu (05-UI §3). */
export interface TemplateSummary {
  /** Wszystkie pozycje w dokumencie — także wyłączone; to miara „rozmiaru" szablonu. */
  itemCount: number;
  /** Suma netto liczona `calcQuoteTotals` — czyli tylko z pozycji włączonych. */
  totalNetCents: number;
}

export interface Template extends TemplateSummary {
  id: string;
  workspaceId: string;
  name: string;
  /** `null`, gdy `body` w bazie nie przechodzi walidacji — patrz `bodyError`. */
  body: QuoteBody | null;
  /** Opis problemu z walidacją. UI pokazuje „szablon uszkodzony" zamiast go otwierać. */
  bodyError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Podsumowanie szablonu. `quote_templates` nie ma zdenormalizowanych totali
 * (szablonów są dziesiątki, nie tysiące), więc liczymy je z `body` przy odczycie.
 */
export function templateSummary(body: QuoteBody | null): TemplateSummary {
  if (!body) return { itemCount: 0, totalNetCents: 0 };

  const itemCount = body.sections.reduce(
    (sum, section) =>
      sum +
      section.items.length +
      section.groups.reduce((acc, group) => acc + group.items.length, 0),
    0,
  );

  return { itemCount, totalNetCents: calcQuoteTotals(body).netCents };
}

function mapTemplate(row: TemplateRow): Template {
  const parsed = parseQuoteBody(row.body);
  if (!parsed.ok) {
    log.error('Uszkodzony body szablonu', { id: row.id, error: parsed.error });
  }
  const body = parsed.ok ? parsed.body : null;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    body,
    bodyError: parsed.ok ? null : parsed.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...templateSummary(body),
  };
}

/**
 * Lista szablonów. Ciągniemy `body`, bo karta pokazuje liczbę pozycji i sumę,
 * a bez zdenormalizowanych kolumn nie ma skąd ich wziąć.
 */
export async function listTemplates(workspaceId: string): Promise<Template[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false }),
    'Lista szablonów',
  );
  return rows.map(mapTemplate);
}

export async function getTemplate(id: string): Promise<Template> {
  const rows = unwrap(
    await getSupabase().from('quote_templates').select('*').eq('id', id).limit(1),
    'Odczyt szablonu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie znaleziono szablonu.');
  return mapTemplate(row);
}

export interface CreateTemplateInput {
  workspaceId: string;
  name: string;
  body: QuoteBody;
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const rows = unwrap(
    await getSupabase()
      .from('quote_templates')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        body: input.body,
      })
      .select('*'),
    'Zapis szablonu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać szablonu.');
  return mapTemplate(row);
}

/**
 * „Nadpisz bieżącym" — podmienia treść, zostawia nazwę i datę utworzenia.
 * Bez blokady optymistycznej: szablon edytuje jedna osoba i świadomie go nadpisuje.
 */
export async function overwriteTemplate(id: string, body: QuoteBody): Promise<Template> {
  const rows = unwrap(
    await getSupabase().from('quote_templates').update({ body }).eq('id', id).select('*'),
    'Nadpisanie szablonu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się nadpisać szablonu.');
  return mapTemplate(row);
}

/** Zmiana samej nazwy — treść zostaje nietknięta. */
export async function renameTemplate(id: string, name: string): Promise<Template> {
  const rows = unwrap(
    await getSupabase().from('quote_templates').update({ name }).eq('id', id).select('*'),
    'Zmiana nazwy szablonu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać nazwy szablonu.');
  return mapTemplate(row);
}

/**
 * Twarde delete — szablon to narzędzie pracy, a nie dane klienta: nie ma czego
 * przywracać ani do czego się odwoływać (wyceny trzymają własną kopię `body`).
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await getSupabase().from('quote_templates').delete().eq('id', id);
  if (error) throw new RepoError('Usunięcie szablonu: ' + error.message, error);
}
