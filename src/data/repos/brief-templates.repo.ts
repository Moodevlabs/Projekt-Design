import { getSupabase } from '@/data/supabase';
import {
  BriefTemplateSchema,
  DEFAULT_BRIEF_TEMPLATE,
  type BriefTemplate,
  type BriefTemplateRecord,
} from '@/domain/brief';
import type { TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('brief-templates.repo');

type Row = Record<string, unknown>;

/**
 * Szablony briefu — edytowalne zestawy pytań pracowni (T-96).
 *
 * Odpowiada wyłącznie za FORMULARZ. Dokument, czyli brief z odpowiedziami
 * klienta, obsługuje `briefs.repo`; kopia szablonu trafia tam w chwili
 * wystawienia linku i od tego momentu żyje własnym życiem.
 */
function mapTemplate(row: Row): BriefTemplateRecord {
  // Sekcje parsujemy miękko — dokładnie z tego samego powodu co w `briefs.repo`:
  // szablon zapisany nowszą wersją aplikacji ma być czytelny, a nie odrzucony.
  const sections = BriefTemplateSchema.safeParse(row.sections);
  if (!sections.success) log.warn('Nieczytelny szablon briefu', { id: row.id });

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: (row.name as string) ?? '',
    sections: sections.success ? sections.data : [],
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Szablony workspace'u — od najstarszego, czyli w kolejności zakładania. */
export async function listBriefTemplates(): Promise<BriefTemplateRecord[]> {
  const rows = unwrap(
    await getSupabase()
      .from('brief_templates')
      .select('*')
      .order('created_at', { ascending: true }),
    'Odczyt szablonów briefu',
  );

  return (rows as unknown as Row[]).map(mapTemplate);
}

export interface CreateBriefTemplateInput {
  workspaceId: string;
  name: string;
  /** Pominięte = kopia zestawu wbudowanego. */
  sections?: BriefTemplate;
  isDefault?: boolean;
}

/**
 * Nowy szablon.
 *
 * Domyślną zawartością jest **kopia zestawu wbudowanego**, a nie pusty
 * formularz: praktyka pokazuje, że pracownia usuwa i przeredagowuje pytania
 * znacznie chętniej, niż pisze cały brief od zera.
 */
export async function createBriefTemplate(
  input: CreateBriefTemplateInput,
): Promise<BriefTemplateRecord> {
  const rows = unwrap(
    await getSupabase()
      .from('brief_templates')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        sections: input.sections ?? DEFAULT_BRIEF_TEMPLATE,
        is_default: input.isDefault ?? false,
      })
      .select('*'),
    'Utworzenie szablonu briefu',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się utworzyć szablonu briefu.');
  return mapTemplate(row);
}

export interface BriefTemplatePatch {
  name?: string;
  sections?: BriefTemplate;
  isDefault?: boolean;
}

export async function updateBriefTemplate(
  id: string,
  patch: BriefTemplatePatch,
): Promise<BriefTemplateRecord> {
  // Typowany `update()` nie przyjmuje luźnego obiektu — składamy `TablesUpdate`
  // pole po polu, tak jak w pozostałych repozytoriach.
  const update: TablesUpdate<'brief_templates'> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.sections !== undefined) update.sections = patch.sections;
  // Zdjęcie flagi z pozostałych szablonów robi wyzwalacz z migracji 0037 —
  // aplikacja nie ma prawa zostawić workspace'u bez szablonu domyślnego.
  if (patch.isDefault !== undefined) update.is_default = patch.isDefault;

  const rows = unwrap(
    await getSupabase().from('brief_templates').update(update).eq('id', id).select('*'),
    'Zapis szablonu briefu',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać szablonu — brak uprawnień.');
  return mapTemplate(row);
}

export async function deleteBriefTemplate(id: string): Promise<void> {
  unwrap(
    await getSupabase().from('brief_templates').delete().eq('id', id).select('id'),
    'Usunięcie szablonu briefu',
  );
}

/**
 * Zestaw pytań do wystawienia linku.
 *
 * Kolejność szukania: wskazany szablon → domyślny → pierwszy z listy →
 * zestaw wbudowany. Ostatni krok jest istotny: konto założone przed T-96 nie
 * ma żadnego szablonu w bazie i wystawienie briefu ma mimo to zadziałać.
 */
export function resolveTemplateSections(
  templates: readonly BriefTemplateRecord[],
  templateId?: string | null,
): BriefTemplate {
  const chosen =
    (templateId ? templates.find((template) => template.id === templateId) : undefined) ??
    templates.find((template) => template.isDefault) ??
    templates[0];

  if (!chosen || chosen.sections.length === 0) return DEFAULT_BRIEF_TEMPLATE;
  return chosen.sections;
}
