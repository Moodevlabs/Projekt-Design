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
    accentColor: row.accent_color,
    bgColor: row.bg_color,
    fontFamily: row.font_family,
    contacts: row.contacts,
    address: row.address,
    taxId: row.tax_id,
    footerText: row.footer_text,
    defaultIntro: row.default_intro,
    defaultValidDays: row.default_valid_days,
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
  if (patch.accentColor !== undefined) update.accent_color = patch.accentColor;
  if (patch.bgColor !== undefined) update.bg_color = patch.bgColor;
  if (patch.fontFamily !== undefined) update.font_family = patch.fontFamily;
  if (patch.contacts !== undefined) update.contacts = patch.contacts;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.taxId !== undefined) update.tax_id = patch.taxId;
  if (patch.footerText !== undefined) update.footer_text = patch.footerText;
  if (patch.defaultIntro !== undefined) update.default_intro = patch.defaultIntro;
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
