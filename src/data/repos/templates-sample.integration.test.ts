/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Szablony startowe (T-114, migracja 0045).
 *
 * Jak przy bibliotece przykładowej: rejestrujemy nowe konto i sprawdzamy,
 * co dostało przez prawdziwy trigger `handle_new_user`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { calcQuoteTotals } from '@/domain/quote';
import { getCurrentWorkspace } from './workspace.repo';
import { listLibraryItems } from './library.repo';
import { listTemplates } from './templates.repo';

const NEW_EMAIL = `templates-${Date.now()}@toolier.local`;
const NEW_PASSWORD = 'demo1234';

let workspaceId: string;

beforeAll(async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signUp({ email: NEW_EMAIL, password: NEW_PASSWORD });
  if (error) throw new Error(`Rejestracja testowa: ${error.message}`);

  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  await getSupabase().auth.signOut();
});

describe('szablony startowe na nowe konto', () => {
  it('nowe konto dostaje 5 szablonow, kazdy czyta sie bez bledu', async () => {
    const templates = await listTemplates(workspaceId);
    expect(templates.map((t) => t.name).sort((a, b) => a.localeCompare(b, 'pl'))).toEqual([
      'Dom jednorodzinny',
      'Kuchnia lub łazienka',
      'Lokal komercyjny',
      'Mieszkanie od dewelopera',
      'Remont mieszkania',
    ]);
    expect(templates.every((t) => t.body !== null && t.bodyError === null)).toBe(true);
  });

  it('WSZYSTKIE pozycje sa bez ceny — suma szablonu to 0 (D4)', async () => {
    const templates = await listTemplates(workspaceId);
    for (const template of templates) {
      expect(template.itemCount).toBeGreaterThan(10);
      expect(calcQuoteTotals(template.body!).netCents).toBe(0);
    }
  });

  it('pozycje sa podpiete do uslug biblioteki przykladowej po nazwie', async () => {
    const items = await listLibraryItems(workspaceId);
    const byId = new Map(items.map((item) => [item.id, item.name]));

    const templates = await listTemplates(workspaceId);
    for (const template of templates) {
      for (const section of template.body!.sections) {
        for (const item of section.items) {
          expect(item.libraryItemId).not.toBeNull();
          expect(byId.get(item.libraryItemId!)).toBe(item.name);
        }
      }
    }
  });

  it('pozycje opcjonalne startuja WYLACZONE — widac mechanike TAK/NIE', async () => {
    const templates = await listTemplates(workspaceId);
    const apartment = templates.find((t) => t.name === 'Mieszkanie od dewelopera')!;
    const items = apartment.body!.sections.flatMap((section) => section.items);
    expect(items.find((item) => item.name === 'Koncepcja funkcjonalna')?.enabled).toBe(true);
    expect(items.find((item) => item.name === 'Dodatkowe ujęcie')?.enabled).toBe(false);
    expect(items.find((item) => item.name === 'Wizyta na inwestycji')?.enabled).toBe(false);
  });

  it('ponowne wywolanie nic nie dosypuje', async () => {
    const { error } = await getSupabase().rpc('seed_quote_templates', { ws: workspaceId });
    expect(error).toBeNull();
    expect(await listTemplates(workspaceId)).toHaveLength(5);
  });
});
