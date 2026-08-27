import { BrandKitSchema, defaultBrandKit, type BrandKit } from '@/domain/brand/schema';
import { getSupabase } from '@/data/supabase';
import type { Tables, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('brand.repo');

type BrandRow = Tables<'brand_kits'>;

/**
 * Brand kit trzymamy w kolumnach, ale kolory, font i `contacts` (jsonb) mogą
 * być starsze niż schemat zod. Parsujemy miękko — braki lecą z domyślnych,
 * zamiast blokować ustawienia i PDF (tak samo jak `workspaces.settings`).
 */
function parseBrandKit(row: BrandRow): BrandKit {
  const result = BrandKitSchema.safeParse({
    companyName: row.company_name,
    logoDarkPath: row.logo_dark_path,
    logoLightPath: row.logo_light_path,
    headerLogo: row.header_logo,
    accentColor: row.accent_color,
    bgColor: row.bg_color,
    fontFamily: row.font_family,
    contacts: row.contacts,
    address: row.address,
    taxId: row.tax_id,
    footerText: row.footer_text,
    defaultIntro: row.default_intro,
    defaultValidDays: row.default_valid_days,
    openingHours: row.opening_hours,
    signerName: row.signer_name,
    signerTitle: row.signer_title,
  });

  if (result.success) return result.data;

  log.warn('Nieprawidłowy brand kit — używam domyślnego', result.error.issues);
  return defaultBrandKit();
}

/**
 * Brand kit workspace'u. Wiersz zakłada trigger `handle_new_user()`, więc jego
 * brak oznacza uszkodzone konto — wtedy lepiej powiedzieć to wprost niż pokazać
 * ustawienia, których zapis i tak by nie przeszedł.
 */
export async function getBrandKit(workspaceId: string): Promise<BrandKit> {
  const rows = unwrap(
    await getSupabase().from('brand_kits').select('*').eq('workspace_id', workspaceId).limit(1),
    'Odczyt brand kitu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Workspace nie ma brand kitu. Zgłoś to wsparciu.');
  return parseBrandKit(row);
}

export type BrandKitPatch = Partial<BrandKit>;

export async function updateBrandKit(workspaceId: string, patch: BrandKitPatch): Promise<BrandKit> {
  // Składamy `TablesUpdate` pole po polu — inaczej `undefined` z częściowego
  // patcha wyzerowałoby kolumny, których użytkownik nie ruszał.
  const update: TablesUpdate<'brand_kits'> = {};
  if (patch.companyName !== undefined) update.company_name = patch.companyName;
  if (patch.logoDarkPath !== undefined) update.logo_dark_path = patch.logoDarkPath;
  if (patch.logoLightPath !== undefined) update.logo_light_path = patch.logoLightPath;
  if (patch.headerLogo !== undefined) update.header_logo = patch.headerLogo;
  if (patch.accentColor !== undefined) update.accent_color = patch.accentColor;
  if (patch.bgColor !== undefined) update.bg_color = patch.bgColor;
  if (patch.fontFamily !== undefined) update.font_family = patch.fontFamily;
  if (patch.contacts !== undefined) update.contacts = patch.contacts;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.taxId !== undefined) update.tax_id = patch.taxId;
  if (patch.footerText !== undefined) update.footer_text = patch.footerText;
  if (patch.defaultIntro !== undefined) update.default_intro = patch.defaultIntro;
  if (patch.openingHours !== undefined) update.opening_hours = patch.openingHours;
  if (patch.signerName !== undefined) update.signer_name = patch.signerName;
  if (patch.signerTitle !== undefined) update.signer_title = patch.signerTitle;
  if (patch.defaultValidDays !== undefined) update.default_valid_days = patch.defaultValidDays;

  const rows = unwrap(
    await getSupabase()
      .from('brand_kits')
      .update(update)
      .eq('workspace_id', workspaceId)
      .select('*'),
    'Zapis brand kitu',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać brandingu — brak uprawnień.');
  return parseBrandKit(row);
}

/** Wariant logo — ciemne na jasne tło i jasne na ciemny nagłówek PDF (04-PDF §3). */
export type LogoVariant = 'dark' | 'light';

const BUCKET = 'brand';

/**
 * Ścieżka w buckecie. Pierwszy segment MUSI być `workspace_id` — na tym stoi
 * polityka dostępu (`storage_workspace_id` w migracji 0005).
 *
 * W nazwie siedzi znacznik czasu, bo signed URL i podgląd w przeglądarce
 * cache'ują się po adresie: nadpisanie tej samej ścieżki pokazywałoby stare
 * logo do czasu wyczyszczenia cache.
 */
function imagePath(workspaceId: string, prefix: string, fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : 'png';
  return `${workspaceId}/${prefix}-${Date.now()}.${ext}`;
}

/**
 * Wgrywa obrazek marki do bucketa `brand` i zwraca jego ścieżkę.
 *
 * Ten sam bucket obsługuje logo, avatar użytkownika i avatary klientów
 * (poprawki 4 i 5 z 2026-08-27). Osobne buckety znaczyłyby trzy komplety
 * polityk RLS pilnujących dokładnie tej samej rzeczy: że pierwszy segment
 * ścieżki to `workspace_id`, do którego wolno nam zaglądać.
 *
 * Zapis ścieżki tam, gdzie ma trafić, zostawiamy wołającemu — inaczej
 * nieudany zapis zostawiłby osierocony plik bez możliwości powiązania go
 * z czymkolwiek.
 */
export async function uploadBrandImage(
  workspaceId: string,
  prefix: string,
  file: File,
): Promise<string> {
  const path = imagePath(workspaceId, prefix, file.name);

  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new RepoError('Wgranie pliku: ' + error.message, error);
  return path;
}

/**
 * Wgrywa logo i zwraca jego ścieżkę. Zapis ścieżki do brand kitu zostawiamy
 * wołającemu — inaczej nieudany zapis kolumny zostawiłby osierocony plik bez
 * możliwości powiązania go z workspace'em.
 */
export async function uploadLogo(
  workspaceId: string,
  variant: LogoVariant,
  file: File,
): Promise<string> {
  return uploadBrandImage(workspaceId, `logo-${variant}`, file);
}

/**
 * Kasuje plik logo. Błąd tylko logujemy: plik mógł już nie istnieć (podwójne
 * kliknięcie, wcześniejsze czyszczenie), a dla użytkownika liczy się to, że
 * logo zniknęło z brandingu — nie los pojedynczego obiektu w Storage.
 */
export async function removeLogo(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) log.warn('Nie udało się skasować pliku logo', { path, error: error.message });
}

/** To samo dla avatarów — ta sama zasada: liczy się, że zniknął z interfejsu. */
export const removeBrandImage = removeLogo;

/**
 * Podpisany URL do podglądu. Bucket jest prywatny, więc bez podpisu przeglądarka
 * nie pobierze pliku.
 */
export async function getLogoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    log.warn('Nie udało się podpisać URL logo', { path, error: error.message });
    return null;
  }
  return data.signedUrl;
}

/** Podpisany URL dowolnego obrazka z bucketa `brand` (logo, avatar). */
export const getBrandImageUrl = getLogoUrl;
