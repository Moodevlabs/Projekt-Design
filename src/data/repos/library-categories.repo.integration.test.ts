/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  createLibraryCategory,
  deleteLibraryCategory,
  listLibraryCategoryRows,
  reorderLibraryCategories,
  updateLibraryCategory,
} from './library-categories.repo';
import { createLibraryItem, listLibraryItems } from './library.repo';

const DEMO_EMAIL = 'demo@anzorge.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
const categories: string[] = [];
const items: string[] = [];

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  const supabase = getSupabase();
  for (const id of items) await supabase.from('library_items').delete().eq('id', id);
  for (const id of categories) await supabase.from('library_categories').delete().eq('id', id);
  await supabase.auth.signOut();
});

async function makeCategory(name: string, sortOrder = 0) {
  const category = await createLibraryCategory({ workspaceId, name, sortOrder });
  categories.push(category.id);
  return category;
}

async function makeItem(name: string, categoryId: string | null) {
  const item = await createLibraryItem({ workspaceId, name, categoryId });
  items.push(item.id);
  return item;
}

describe('library_categories — slownik grup', () => {
  it('seed demo ma grupy w kolejnosci procesu, nie alfabetycznie', async () => {
    const rows = await listLibraryCategoryRows(workspaceId);
    const demo = rows.filter((row) => ['Projekt', 'Nadzór', 'Dodatki'].includes(row.name));

    // Alfabetycznie byloby „Dodatki, Nadzór, Projekt" — a proces idzie inaczej.
    expect(demo.map((row) => row.name)).toEqual(['Projekt', 'Nadzór', 'Dodatki']);
    expect(demo.map((row) => row.code)).toEqual(['01', '02', '03']);
  });

  it('seedowane uslugi maja przypisana grupe ze slownika', async () => {
    const rows = await listLibraryCategoryRows(workspaceId);
    const projekt = rows.find((row) => row.name === 'Projekt');
    expect(projekt).toBeDefined();

    const wGrupie = await listLibraryItems(workspaceId, { categoryId: projekt!.id });
    expect(wGrupie.length).toBeGreaterThan(0);
    expect(wGrupie.every((item) => item.categoryId === projekt!.id)).toBe(true);
  });

  it('kolor spoza palety wraca jako brak koloru', async () => {
    const category = await makeCategory('Test Kolor', 90);
    await getSupabase()
      .from('library_categories')
      .update({ color: '#ff0000' })
      .eq('id', category.id);

    // Dowolny hex w bazie (np. z ręcznej edycji) nie ma prawa wyciec do UI —
    // pigułka w losowym kolorze bywa nieczytelna na tle karty.
    const rows = await listLibraryCategoryRows(workspaceId);
    expect(rows.find((row) => row.id === category.id)?.color).toBeNull();
  });

  it('kolor z palety przechodzi', async () => {
    const category = await makeCategory('Test Paleta', 91);
    const po = await updateLibraryCategory(category.id, { color: 'sage' });
    expect(po.color).toBe('sage');
  });

  it('USUNIECIE GRUPY NIE KASUJE USLUG — ladują w „Bez grupy"', async () => {
    const category = await makeCategory('Test Do Usuniecia', 92);
    const item = await makeItem('Usluga w grupie', category.id);

    await deleteLibraryCategory(category.id);

    // Kryterium odbioru T-59 i regula 6 koncepcji: sprzatanie dzialu nie
    // kasuje pracy, ktora w nim lezala.
    const bezGrupy = await listLibraryItems(workspaceId, { categoryId: 'none' });
    expect(bezGrupy.map((row) => row.id)).toContain(item.id);

    const slownik = await listLibraryCategoryRows(workspaceId);
    expect(slownik.map((row) => row.id)).not.toContain(category.id);
  });

  it('kolejnosc zapisuje sie calym przebiegiem, bez dziur', async () => {
    const a = await makeCategory('Test A', 80);
    const b = await makeCategory('Test B', 81);
    const c = await makeCategory('Test C', 82);

    await reorderLibraryCategories([c.id, a.id, b.id]);

    const rows = await listLibraryCategoryRows(workspaceId);
    const kolejnosc = new Map(rows.map((row) => [row.id, row.sortOrder]));
    expect(kolejnosc.get(c.id)).toBe(0);
    expect(kolejnosc.get(a.id)).toBe(1);
    expect(kolejnosc.get(b.id)).toBe(2);
  });

  it('filtr po grupie chodzi w bazie', async () => {
    const category = await makeCategory('Test Filtr', 93);
    const item = await makeItem('Usluga filtrowana', category.id);
    await makeItem('Usluga poza grupa', null);

    const wGrupie = await listLibraryItems(workspaceId, { categoryId: category.id });
    expect(wGrupie.map((row) => row.id)).toEqual([item.id]);
  });
});
