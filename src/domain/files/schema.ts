import { z } from 'zod';

/**
 * Pliki klienta i projektu (P1, T-55).
 *
 * Dwa światy: **metadane tutaj**, bajty w Storage. Ten moduł nie wie nic
 * o Supabase — zna tylko kształt wiersza, reguły nazw i limity.
 */

/** `upload` = wrzucone przez człowieka, `generated` = PDF z aplikacji (T-56). */
export const FileKindSchema = z.enum(['upload', 'generated']);
export type FileKind = z.infer<typeof FileKindSchema>;

/** Rodzaj wygenerowanego dokumentu — używany dopiero w T-56, kolumna już jest. */
export const DocTypeSchema = z.enum(['quote', 'schedule', 'stages', 'price_list', 'package']);
export type DocType = z.infer<typeof DocTypeSchema>;

export const FileSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().default(null),
  quoteId: z.string().uuid().nullable().default(null),
  /**
   * Zdjęcie z wizji lokalnej (T-94, poprawka 10).
   *
   * Plik zostaje zwykłym plikiem projektu — to jest tylko wskazanie, przy
   * której wizycie powstał. Skasowanie wizji zeruje pole, ale nie rusza
   * pliku: archiwum klienta trzyma bajty, nie kontekst.
   */
  siteVisitId: z.string().uuid().nullable().default(null),
  kind: FileKindSchema.default('upload'),
  docType: DocTypeSchema.nullable().default(null),
  quoteVersion: z.number().int().nullable().default(null),
  name: z.string().min(1),
  mime: z.string().default(''),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
  createdBy: z.string().uuid().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Chwila wyrzucenia do kosza; `null` = plik jest na liście (T-67). */
  deletedAt: z.string().nullable().default(null),
});
export type StoredFile = z.infer<typeof FileSchema>;

/** 25 MiB — tyle przyjmuje bucket. Sprawdzamy PRZED wysyłką (reguła 3). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** 2 GiB na workspace. Twardy limit jest w bazie; ta stała służy paskowi zużycia. */
export const DEFAULT_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

/** Od tego progu pasek zużycia ostrzega kolorem (koncepcja §3 reguła 4). */
export const QUOTA_WARN_RATIO = 0.9;

/**
 * Rozszerzenia, których nie wpuszczamy.
 *
 * Blokujemy po **rozszerzeniu, nie po MIME**: typ z przeglądarki podaje sam
 * plik i da się go ustawić dowolnie, więc `.exe` przebrany za `image/png`
 * przeszedłby filtr po MIME. Lista jest krótka i celowo dotyczy tego, co
 * system potrafi URUCHOMIĆ — nie próbujemy zgadywać „niebezpiecznych treści".
 */
export const BLOCKED_EXTENSIONS = [
  'exe',
  'msi',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'dll',
  'scr',
  'js',
  'jar',
  'com',
] as const;

/** Rozszerzenie z nazwy pliku, małymi literami. `''`, gdy go nie ma. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  // `dot <= 0` odsiewa też `.gitignore` — plik bez nazwy, sama kropka
  // i rozszerzenie, którego nie chcemy traktować jak rozszerzenia.
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

export function isAllowedExtension(name: string): boolean {
  const ext = fileExtension(name);
  return !BLOCKED_EXTENSIONS.includes(ext as (typeof BLOCKED_EXTENSIONS)[number]);
}

/** Czy plik da się pokazać w podglądzie (dialog z obrazkiem). */
export function isPreviewableImage(mime: string, name: string): boolean {
  if (mime.startsWith('image/')) return true;
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(fileExtension(name));
}

/** Powód odmowy przed wysyłką. `null` = plik przechodzi. */
export type RejectionReason = 'too_large' | 'blocked_extension' | 'empty';

export function rejectionFor(file: { name: string; size: number }): RejectionReason | null {
  if (!isAllowedExtension(file.name)) return 'blocked_extension';
  if (file.size > MAX_FILE_BYTES) return 'too_large';
  // Pusty plik przejdzie przez Storage, ale na liście wygląda jak błąd
  // i nie da się go otworzyć. Lepiej powiedzieć od razu.
  if (file.size === 0) return 'empty';
  return null;
}

/**
 * Ścieżka obiektu w buckecie: `{workspace}/{client}/{project|_}/{uuid}.{ext}`.
 *
 * Pierwszy segment MUSI być `workspace_id` — na tym stoją polityki RLS
 * bucketa (`storage_workspace_id`). Nazwa pliku w ścieżce jest losowa, a nie
 * wzięta od użytkownika: dwa „rzut.pdf" w jednym projekcie nie mogą się
 * nadpisać, a nazwę widoczną i tak trzyma kolumna `name` (i da się ją zmienić
 * bez ruszania obiektu).
 */
export function buildStoragePath(args: {
  workspaceId: string;
  clientId: string;
  projectId: string | null;
  fileId: string;
  fileName: string;
}): string {
  const ext = fileExtension(args.fileName);
  const suffix = ext ? `.${ext}` : '';
  return `${args.workspaceId}/${args.clientId}/${args.projectId ?? '_'}/${args.fileId}${suffix}`;
}

/**
 * Ile dni plik leży w koszu, zanim zniknie na dobre (T-67).
 *
 * Ta sama liczba stoi w bazie (`files_trash_days()`), bo sprzątanie musi ją
 * znać niezależnie od aplikacji. Tu jest po to, żeby interfejs mógł napisać
 * „zostanie usunięty za 12 dni" bez odpytywania bazy o stałą.
 */
export const TRASH_DAYS = 30;

/**
 * Ile dni zostało do trwałego usunięcia. `0` = plik jest po terminie
 * i zniknie przy najbliższym sprzątaniu.
 *
 * Zaokrąglamy w GÓRĘ: plik wyrzucony przed chwilą ma „30 dni", a nie 29.
 * Zaniżona liczba w komunikacie o kasowaniu danych jest gorsza niż zawyżona —
 * przy zawyżonej człowiek zdąży zareagować.
 */
export function daysLeftInTrash(deletedAt: string, now: Date = new Date()): number {
  const elapsed = now.getTime() - new Date(deletedAt).getTime();
  const left = TRASH_DAYS - elapsed / 86_400_000;
  return Math.max(0, Math.ceil(left));
}

/** Rozmiar po ludzku: „2,4 MB". Bajty tylko poniżej kilobajta. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Jedno miejsce po przecinku do 10, dalej całości — „1024,0 MB" nikomu
  // nic nie mówi, a „1,0 GB" tak.
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${String(rounded).replace('.', ',')} ${units[unit]}`;
}
