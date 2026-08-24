import {
  DocTypeSchema,
  FileKindSchema,
  buildStoragePath,
  formatBytes,
  type DocType,
  type FileKind,
  type StoredFile,
} from '@/domain/files/schema';
import { getSupabase } from '@/data/supabase';
import type { TablesInsert } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('files.repo');

/** Nazwa bucketa. Jedno miejsce, żeby literówka nie rozjechała się po repo. */
export const FILES_BUCKET = 'files';

/** Ile żyje podpisany URL do pobrania. Minuta wystarcza na kliknięcie. */
const SIGNED_URL_SECONDS = 60;

type Row = Record<string, unknown>;

function mapFile(row: Row): StoredFile {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    clientId: row.client_id as string,
    projectId: (row.project_id as string | null) ?? null,
    quoteId: (row.quote_id as string | null) ?? null,
    kind: FileKindSchema.catch('upload').parse(row.kind),
    docType: DocTypeSchema.nullable().catch(null).parse(row.doc_type ?? null),
    quoteVersion: row.quote_version === null ? null : Number(row.quote_version),
    name: row.name as string,
    mime: typeof row.mime === 'string' ? row.mime : '',
    sizeBytes: Number(row.size_bytes ?? 0),
    storagePath: row.storage_path as string,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface FileFilters {
  workspaceId: string;
  /** Pliki klienta — razem z tymi przypiętymi do jego projektów (decyzja D2). */
  clientId?: string;
  /** Pliki jednej teczki. */
  projectId?: string;
  kind?: FileKind;
}

export async function listFiles(filters: FileFilters): Promise<StoredFile[]> {
  let query = getSupabase()
    .from('files')
    .select('*')
    .eq('workspace_id', filters.workspaceId)
    .is('deleted_at', null);

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.kind) query = query.eq('kind', filters.kind);

  const rows = unwrap(await query.order('created_at', { ascending: false }), 'Lista plików');
  return (rows as unknown as Row[]).map(mapFile);
}

/**
 * Kod, po którym poznajemy przepełniony limit.
 *
 * Trigger `files_enforce_quota()` rzuca `P0001` z komunikatem
 * `STORAGE_QUOTA_EXCEEDED` i `detail` w postaci `zajęte/limit`. Rozpoznajemy
 * po treści, a nie po samym kodzie: `P0001` to ogólne `raise exception`
 * i wpadłby tu każdy inny wyjątek z bazy.
 */
export class QuotaExceededError extends RepoError {
  constructor(
    readonly usedBytes: number,
    readonly quotaBytes: number,
  ) {
    super(
      `Brak miejsca: plik nie mieści się w limicie ${formatBytes(quotaBytes)}. ` +
        `Po dodaniu zajęte byłoby ${formatBytes(usedBytes)}. Usuń niepotrzebne pliki i spróbuj ponownie.`,
    );
    this.name = 'QuotaExceededError';
  }
}

function asQuotaError(error: unknown): QuotaExceededError | null {
  // `PostgrestError` NIE jest instancją `Error` — to zwykły obiekt z polami.
  // `String(error)` dałoby tu „[object Object]" i limit przeszedłby jako
  // zwykły błąd zapisu, z angielskim komunikatem bazy zamiast wyjaśnienia.
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message !== 'string' || !message.includes('STORAGE_QUOTA_EXCEEDED')) return null;

  // `detail` przenosimy przez komunikat błędu PostgREST-a; gdy go nie ma,
  // pokazujemy sam fakt przepełnienia zamiast zgadywać liczby.
  const detail = (error as { details?: string } | null)?.details ?? '';
  const parts = detail.split('/').map((part) => Number(part.trim()));
  const liczba = (value: number | undefined) => (Number.isFinite(value) ? (value as number) : 0);
  return new QuotaExceededError(liczba(parts[0]), liczba(parts[1]));
}

export interface UploadFileInput {
  workspaceId: string;
  clientId: string;
  projectId?: string | null;
  /** Nazwa widoczna na liście — bierzemy ją od użytkownika, nie ze ścieżki. */
  name: string;
  mime?: string;
  bytes: Uint8Array;
}

/**
 * Wrzucenie pliku: **najpierw obiekt, potem wiersz** (koncepcja §3 reguła 2).
 *
 * Odwrotna kolejność zostawiałaby w tabeli wiersz wskazujący na nic — a to
 * właśnie tabela jest źródłem listy, więc taki wpis byłby widoczny i martwy.
 * Nieudany insert (najczęściej limit) kasuje obiekt, żeby nie zostawić
 * bajtów, za które płacimy i których nikt nie zobaczy.
 */
export async function uploadFile(input: UploadFileInput): Promise<StoredFile> {
  const supabase = getSupabase();
  const fileId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    workspaceId: input.workspaceId,
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    fileId,
    fileName: input.name,
  });

  const upload = await supabase.storage.from(FILES_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.mime || 'application/octet-stream',
    upsert: false,
  });

  if (upload.error) {
    throw new RepoError(`Wysyłka pliku: ${upload.error.message}`, upload.error);
  }

  const insert: TablesInsert<'files'> = {
    id: fileId,
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    kind: 'upload',
    name: input.name,
    mime: input.mime || null,
    size_bytes: input.bytes.byteLength,
    storage_path: storagePath,
  };

  const result = await supabase.from('files').insert(insert).select('*');

  if (result.error) {
    // Sprzątamy obiekt, zanim zgłosimy błąd — inaczej limit zjadałyby bajty
    // bez wiersza, których użytkownik nie ma jak zobaczyć ani usunąć.
    const cleanup = await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
    if (cleanup.error) {
      log.error('Nie udalo sie posprzatac obiektu po nieudanym insercie', {
        storagePath,
        error: cleanup.error.message,
      });
    }

    const quota = asQuotaError(result.error);
    if (quota) throw quota;
    throw new RepoError(`Zapis pliku: ${result.error.message}`, result.error);
  }

  const row = (result.data as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać pliku.');
  return mapFile(row);
}


export interface ArchiveTarget {
  clientId: string;
  projectId?: string | null;
  quoteId?: string | null;
  /** Wersja wyceny w chwili eksportu. `null` do czasu T-57 (wersje v1/v2). */
  quoteVersion?: number | null;
}

export interface ArchivePdfInput extends ArchiveTarget {
  workspaceId: string;
  docType: DocType;
  fileName: string;
  bytes: Uint8Array;
}

/**
 * Zapisuje wygenerowany PDF w archiwum klienta (P2, T-56).
 *
 * To ten sam mechanizm co upload — obiekt, potem wiersz — z jedną różnicą:
 * `kind: 'generated'`. Dzięki temu zakładka „Dokumenty" pokazuje **zapisany
 * plik**, a nie renderuje go ponownie: otwarcie po miesiącu daje dokładnie to,
 * co poszło do inwestora, mimo późniejszych zmian w brand kicie i bibliotece
 * (koncepcja §3 reguła 7).
 *
 * Limit miejsca obowiązuje tak samo jak przy uploadzie — archiwum dokumentów
 * to też pliki i też zajmują 2 GB.
 */
export async function archiveGeneratedPdf(input: ArchivePdfInput): Promise<StoredFile> {
  const supabase = getSupabase();
  const fileId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    workspaceId: input.workspaceId,
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    fileId,
    fileName: input.fileName,
  });

  const upload = await supabase.storage.from(FILES_BUCKET).upload(storagePath, input.bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upload.error) {
    throw new RepoError(`Archiwizacja dokumentu: ${upload.error.message}`, upload.error);
  }

  const insert: TablesInsert<'files'> = {
    id: fileId,
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    quote_id: input.quoteId ?? null,
    kind: 'generated',
    doc_type: input.docType,
    quote_version: input.quoteVersion ?? null,
    name: input.fileName,
    mime: 'application/pdf',
    size_bytes: input.bytes.byteLength,
    storage_path: storagePath,
  };

  const result = await supabase.from('files').insert(insert).select('*');

  if (result.error) {
    const cleanup = await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
    if (cleanup.error) {
      log.error('Nie udalo sie posprzatac obiektu po nieudanej archiwizacji', {
        storagePath,
        error: cleanup.error.message,
      });
    }

    const quota = asQuotaError(result.error);
    if (quota) throw quota;
    throw new RepoError(`Archiwizacja dokumentu: ${result.error.message}`, result.error);
  }

  const row = (result.data as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać dokumentu w archiwum.');
  return mapFile(row);
}

/** Zmiana nazwy widocznej. Obiektu w Storage NIE ruszamy — ścieżka jest kluczem. */
export async function renameFile(id: string, name: string): Promise<StoredFile> {
  const trimmed = name.trim();
  if (!trimmed) throw new RepoError('Nazwa pliku nie może być pusta.');

  const rows = unwrap(
    await getSupabase().from('files').update({ name: trimmed }).eq('id', id).select('*'),
    'Zmiana nazwy pliku',
  );
  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zmienić nazwy pliku.');
  return mapFile(row);
}

/**
 * Usunięcie: soft delete w tabeli **i natychmiastowe skasowanie obiektu**.
 *
 * Kosza na pliki nie ma w 1.0 (koncepcja §3 reguła 5) — trzymanie bajtów
 * „na wszelki wypadek" zjadałoby limit, którego użytkownik nie widzi. Wiersz
 * zostaje jako ślad (kto, kiedy, jak się nazywał), bajty znikają.
 *
 * Kolejność odwrotna niż przy uploadzie: **najpierw wiersz**. Gdyby najpierw
 * poleciał obiekt, a `update` się nie udał, lista pokazywałaby plik, którego
 * nie da się już pobrać.
 */
export async function deleteFile(file: Pick<StoredFile, 'id' | 'storagePath'>): Promise<void> {
  unwrap(
    await getSupabase()
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', file.id)
      .select('id'),
    'Usunięcie pliku',
  );

  const removal = await getSupabase().storage.from(FILES_BUCKET).remove([file.storagePath]);
  if (removal.error) {
    // Wiersz jest już oznaczony jako usunięty, więc z punktu widzenia
    // użytkownika plik zniknął. Osierocony obiekt to nasz problem, nie jego —
    // logujemy i nie straszymy błędem.
    log.error('Nie udalo sie skasowac obiektu po soft delete', {
      storagePath: file.storagePath,
      error: removal.error.message,
    });
  }
}

/** Podpisany URL do pobrania. Ważny minutę — tyle trzeba na kliknięcie. */
export async function getDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(FILES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (error) throw new RepoError(`Pobranie pliku: ${error.message}`, error);
  if (!data?.signedUrl) throw new RepoError('Plik niedostępny.');
  return data.signedUrl;
}

/** Bajty pliku — do zapisu na dysk i do podglądu obrazów. */
export async function downloadFile(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await getSupabase().storage.from(FILES_BUCKET).download(storagePath);
  if (error) throw new RepoError(`Pobranie pliku: ${error.message}`, error);
  if (!data) throw new RepoError('Plik niedostępny.');
  return new Uint8Array(await data.arrayBuffer());
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

/**
 * Zużycie miejsca — czytane z kolumn workspace'u, nie liczone `sum()`.
 *
 * Licznik utrzymuje trigger, więc odczyt jest jednym wierszem niezależnie od
 * tego, ile plików ma konto.
 */
export async function getStorageUsage(workspaceId: string): Promise<StorageUsage> {
  const rows = unwrap(
    await getSupabase()
      .from('workspaces')
      .select('storage_used_bytes, storage_quota_bytes')
      .eq('id', workspaceId)
      .limit(1),
    'Zużycie miejsca',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie znaleziono workspace.');
  return {
    usedBytes: Number(row.storage_used_bytes ?? 0),
    quotaBytes: Number(row.storage_quota_bytes ?? 0),
  };
}
