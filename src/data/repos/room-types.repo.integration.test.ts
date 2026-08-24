/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  createRoomType,
  deleteRoomType,
  listRoomTypes,
  updateRoomType,
} from './room-types.repo';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
const created: string[] = [];

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const workspace = await getCurrentWorkspace();
  workspaceId = workspace.id;
});

afterAll(async () => {
  for (const id of created) {
    await getSupabase().from('room_types').delete().eq('id', id);
  }
  await getSupabase().auth.signOut();
});

async function makeRoomType(name: string) {
  const typ = await createRoomType({ workspaceId, name });
  created.push(typ.id);
  return typ;
}

describe('room-types.repo — slownik workspace', () => {
  it('konto zalozone przed migracja tez ma zestaw startowy', async () => {
    // Migracja 0006 backfilluje istniejace workspace'y — bez tego uzytkownik
    // z kontem sprzed wdrozenia zobaczylby pusta liste.
    const typy = await listRoomTypes(workspaceId);

    expect(typy.length).toBeGreaterThanOrEqual(14);
    expect(typy.map((typ) => typ.slug)).toContain('kuchnia');
    expect(typy.map((typ) => typ.slug)).toContain('pokoj-dzieciecy');
  });

  it('zwraca typy w kolejnosci sort_order', async () => {
    const typy = await listRoomTypes(workspaceId);
    const kolejnosc = typy.map((typ) => typ.sortOrder);
    expect([...kolejnosc].sort((a, b) => a - b)).toEqual(kolejnosc);
  });

  it('dodaje typ i sam wylicza slug z nazwy', async () => {
    const typ = await makeRoomType('Pracownia krawiecka');

    expect(typ.slug).toBe('pracownia-krawiecka');
    expect(typ.workspaceId).toBe(workspaceId);
  });

  it('zmiana nazwy NIE rusza sluga', async () => {
    // Slug jest kluczem, po ktorym reguly cenowe trafiaja w kolumne macierzy.
    // Gdyby szedl za nazwa, poprawienie literowki wyzerowaloby ceny.
    const typ = await makeRoomType('Gabinnet');
    const poPoprawce = await updateRoomType(typ.id, { name: 'Gabinet gosciny' });

    expect(poPoprawce.name).toBe('Gabinet gosciny');
    expect(poPoprawce.slug).toBe(typ.slug);
  });

  it('usuniety typ znika z listy, ale zostaje w bazie', async () => {
    const typ = await makeRoomType('Do skasowania');
    await deleteRoomType(typ.id);

    const typy = await listRoomTypes(workspaceId);
    expect(typy.map((row) => row.id)).not.toContain(typ.id);

    // Soft delete: `roomTypeId` siedzi w zapisanych wycenach i regulach
    // cenowych, wiec twarde skasowanie zerwaloby te odwolania.
    const { data } = await getSupabase()
      .from('room_types')
      .select('id, deleted_at')
      .eq('id', typ.id);
    expect(data?.[0]?.deleted_at).not.toBeNull();
  });

  it('slug mozna uzyc ponownie po usunieciu typu', async () => {
    const pierwszy = await makeRoomType('Weranda');
    await deleteRoomType(pierwszy.id);

    // Unikalnosc dotyczy tylko zywych wpisow — inaczej raz skasowana „weranda”
    // bylaby zablokowana na zawsze.
    const drugi = await makeRoomType('Weranda');
    expect(drugi.slug).toBe('weranda');
    expect(drugi.id).not.toBe(pierwszy.id);
  });

  it('nie da sie dodac dwoch zywych typow o tym samym slugu', async () => {
    await makeRoomType('Antresola');
    await expect(makeRoomType('Antresola')).rejects.toThrow();
  });
});
