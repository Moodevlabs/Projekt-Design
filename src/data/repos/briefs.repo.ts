import { getSupabase } from '@/data/supabase';
import {
  BriefAnswersSchema,
  BriefTemplateSchema,
  DEFAULT_BRIEF_TEMPLATE,
  expiryOrNull,
  type Brief,
  type BriefTemplate,
} from '@/domain/brief';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('briefs.repo');

type Row = Record<string, unknown>;

/**
 * Brief klienta — strona projektanta (T-93).
 *
 * Strona klienta NIE korzysta z tego pliku: ma dwa RPC (`get_shared_brief`,
 * `submit_shared_brief`) i zero dostępu do tabel. Tutaj jest widok
 * właściciela, chroniony zwykłym RLS.
 */
function mapBrief(row: Row): Brief {
  // Szablon i odpowiedzi parsujemy MIĘKKO: brief wystawiony starszą wersją
  // aplikacji ma prawo mieć inny kształt, a wyrzucenie go przy odczycie
  // zabrałoby projektantowi odpowiedzi klienta.
  const template = BriefTemplateSchema.safeParse(row.template);
  const answers = BriefAnswersSchema.safeParse(row.answers);

  if (!template.success) log.warn('Nieczytelny szablon briefu', { id: row.id });

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    clientId: row.client_id as string,
    projectId: (row.project_id as string | null) ?? null,
    token: row.token as string,
    template: template.success ? template.data : [],
    answers: answers.success ? answers.data : {},
    expiresAt: (row.expires_at as string | null) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null,
    submittedAt: (row.submitted_at as string | null) ?? null,
    firstViewedAt: (row.first_viewed_at as string | null) ?? null,
    lastViewedAt: (row.last_viewed_at as string | null) ?? null,
    viewCount: Number(row.view_count ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Briefy klienta — najnowszy pierwszy. */
export async function listBriefs(clientId: string): Promise<Brief[]> {
  const rows = unwrap(
    await getSupabase()
      .from('client_briefs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    'Odczyt briefów',
  );

  return (rows as unknown as Row[]).map(mapBrief);
}

export interface CreateBriefInput {
  workspaceId: string;
  clientId: string;
  projectId?: string | null;
  /** `null` = link bezterminowy. */
  expiryDays: number | null;
  /**
   * Zestaw pytań do zapisania w briefie (T-96). Pominięty = zestaw wbudowany,
   * co jest stanem poprawnym dla kont bez własnych szablonów.
   */
  template?: BriefTemplate;
}

/**
 * Nowy brief razem z linkiem.
 *
 * Szablon **kopiujemy do wiersza** w chwili wystawienia. To jest sedno:
 * bez snapshotu brief sprzed pół roku pokazywałby dzisiejsze pytania obok
 * wczorajszych odpowiedzi — czyli kłamał o tym, na co klient odpowiadał.
 * Od T-96 kopiowany zestaw pochodzi z szablonu pracowni; zasada się nie
 * zmienia, zmienia się wyłącznie jego źródło.
 */
export async function createBrief(input: CreateBriefInput): Promise<Brief> {
  const rows = unwrap(
    await getSupabase()
      .from('client_briefs')
      .insert({
        workspace_id: input.workspaceId,
        client_id: input.clientId,
        project_id: input.projectId ?? null,
        template:
          input.template && input.template.length > 0 ? input.template : DEFAULT_BRIEF_TEMPLATE,
        expires_at: expiryOrNull(input.expiryDays),
      })
      .select('*'),
    'Utworzenie briefu',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się utworzyć briefu.');
  return mapBrief(row);
}

/** Odwołanie linku. Odpowiedzi zostają — to dokument, nie tylko dostęp. */
export async function revokeBrief(id: string): Promise<Brief> {
  const rows = unwrap(
    await getSupabase()
      .from('client_briefs')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select('*'),
    'Odwołanie briefu',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się odwołać briefu.');
  return mapBrief(row);
}

export async function deleteBrief(id: string): Promise<void> {
  unwrap(
    await getSupabase().from('client_briefs').delete().eq('id', id).select('id'),
    'Usunięcie briefu',
  );
}
