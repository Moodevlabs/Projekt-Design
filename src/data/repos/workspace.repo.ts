import {
  WorkspaceSettingsSchema,
  defaultWorkspaceSettings,
  type WorkspaceSettings,
} from '@/domain/brand/schema';
import { getSupabase } from '@/data/supabase';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('workspace.repo');

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  settings: WorkspaceSettings;
  quoteSeq: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ustawienia siedzą w `workspaces.settings` jako jsonb, więc mogą być stare
 * albo niekompletne. Parsujemy miękko: brakujące pola lecą z domyślnych,
 * zamiast wywalać całą aplikację.
 */
function parseSettings(raw: unknown): WorkspaceSettings {
  const result = WorkspaceSettingsSchema.safeParse(raw);
  if (result.success) return result.data;
  log.warn('Nieprawidłowe workspaces.settings — używam domyślnych', result.error.issues);
  return defaultWorkspaceSettings();
}

/**
 * Workspace bieżącego użytkownika. W fazach 1–2 jedno konto = jeden workspace,
 * więc RLS i tak zwróci dokładnie jeden wiersz; bierzemy najstarszy, żeby wynik
 * był deterministyczny, gdyby kiedyś było ich więcej (faza 3).
 */
export async function getCurrentWorkspace(): Promise<Workspace> {
  const rows = unwrap(
    await getSupabase()
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1),
    'Odczyt workspace',
  );

  const row = rows[0];
  if (!row) {
    throw new RepoError('Konto nie ma workspace. Wyloguj się i zaloguj ponownie.');
  }

  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    settings: parseSettings(row.settings),
    quoteSeq: row.quote_seq,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  settings: WorkspaceSettings,
): Promise<WorkspaceSettings> {
  const rows = unwrap(
    await getSupabase()
      .from('workspaces')
      .update({ settings })
      .eq('id', workspaceId)
      .select('settings'),
    'Zapis ustawień workspace',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać ustawień — brak uprawnień.');
  return parseSettings(row.settings);
}

export async function renameWorkspace(workspaceId: string, name: string): Promise<void> {
  unwrap(
    await getSupabase().from('workspaces').update({ name }).eq('id', workspaceId).select('id'),
    'Zmiana nazwy workspace',
  );
}
