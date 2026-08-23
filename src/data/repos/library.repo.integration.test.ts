/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Pracujemy na koncie z seeda i na prawdziwym RLS — dzięki temu test łapie
 * też błędy polityk, a nie tylko błędy mapowania.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  DEFAULT_CATEGORY,
  createLibraryGroup,
  createLibraryItem,
  deleteLibraryGroup,
  deleteLibraryItem,
  listLibraryCategories,
  listLibraryGroups,
  listLibraryItems,
  saveItemsToLibrary,
  updateLibraryGroup,
  updateLibraryItem,
} from './library.repo';
import { newItem } from '@/domain/quote';

const DEMO_EMAIL = 'demo@anzorge.local';
const DEMO_PASSWORD = 'demo1234';

/** Własna kategoria testowa — żeby nie mieszać się z pozycjami z seeda. */
const TEST_CATEGORY = 'Test-T06';

let workspaceId: string;
const createdItems: string[] = [];
const createdGroups: string[] = [];

beforeAll(async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error) {
    throw new Error(
      'Nie udalo sie zalogowac uzytkownikiem z seeda. Czy `pnpm db:start` dziala? ' + error.message,
    );
  }

  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  const supabase = getSupabase();
  if (createdItems.length > 0) {
    await supabase.from('library_items').delete().in('id', createdItems);
  }
  if (createdGroups.length > 0) {
    await supabase.from('library_groups').delete().in('id', createdGroups);
  }
  await supabase.auth.signOut();
});

async function makeItem(
  name: string,
  overrides: { category?: string; unitPriceCents?: number } = {},
) {
  const item = await createLibraryItem({
    workspaceId,
    name,
    category: overrides.category ?? TEST_CATEGORY,
    description: 'Opis pozycji ' + name,
    unitPriceCents: overrides.unitPriceCents ?? 12_345,
    sortOrder: 100,
  });
  createdItems.push(item.id);
  return item;
}

async function makeGroup(name: string) {
  const group = await createLibraryGroup({
    workspaceId,
    name,
    items: [
      {
        name: 'Pozycja A',
        description: 'A',
        kind: 'item',
        qty: 1,
        unitPriceCents: 10_000,
        libraryItemId: null,
      },
      {
        name: 'Rabat',
        description: '',
        kind: 'discount',
        qty: 1,
        unitPriceCents: 1_000,
        libraryItemId: null,
      },
    ],
    sortOrder: 100,
  });
  createdGroups.push(group.id);
  return group;
}

describe('library.repo — pozycje', () => {
  it('tworzy pozycje i mapuje kolumny na camelCase', async () => {
    const item = await makeItem('Pozycja testowa');

    expect(item.id).toBeTruthy();
    expect(item.workspaceId).toBe(workspaceId);
    expect(item.category).toBe(TEST_CATEGORY);
    expect(item.kind).toBe('item');
    expect(item.unitPriceCents).toBe(12_345);
    expect(item.sortOrder).toBe(100);
  });

  it('wstawia pozycje bez kategorii do kategorii domyslnej', async () => {
    const item = await createLibraryItem({ workspaceId, name: 'Bez kategorii T06' });
    createdItems.push(item.id);
    expect(item.category).toBe(DEFAULT_CATEGORY);
  });

  it('filtruje po kategorii i szuka po nazwie oraz opisie', async () => {
    const item = await makeItem('Unikalna Nazwa Szukana');

    const inCategory = await listLibraryItems(workspaceId, { category: TEST_CATEGORY });
    expect(inCategory.some((row) => row.id === item.id)).toBe(true);

    const inOther = await listLibraryItems(workspaceId, { category: 'Projekt' });
    expect(inOther.some((row) => row.id === item.id)).toBe(false);

    const byName = await listLibraryItems(workspaceId, { search: 'Unikalna Nazwa' });
    expect(byName.some((row) => row.id === item.id)).toBe(true);

    const byDescription = await listLibraryItems(workspaceId, {
      search: 'Opis pozycji Unikalna',
    });
    expect(byDescription.some((row) => row.id === item.id)).toBe(true);

    const miss = await listLibraryItems(workspaceId, { search: 'zzz-nie-istnieje-zzz' });
    expect(miss.some((row) => row.id === item.id)).toBe(false);
  });

  it('sortuje po sort_order, a przy remisie po nazwie', async () => {
    const b = await makeItem('B-sort-test');
    const a = await makeItem('A-sort-test');

    const rows = await listLibraryItems(workspaceId, { category: TEST_CATEGORY });
    const indexA = rows.findIndex((row) => row.id === a.id);
    const indexB = rows.findIndex((row) => row.id === b.id);
    expect(indexA).toBeGreaterThanOrEqual(0);
    expect(indexA).toBeLessThan(indexB);
  });

  it('zwraca unikalne kategorie, w tym te z seeda', async () => {
    await makeItem('Do kategorii');

    const categories = await listLibraryCategories(workspaceId);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toContain(TEST_CATEGORY);
    expect(categories).toContain('Projekt');
  });

  it('aktualizuje wskazane pola i nie rusza pozostalych', async () => {
    const item = await makeItem('Do edycji');

    const updated = await updateLibraryItem(item.id, { unitPriceCents: 99_900, kind: 'discount' });

    expect(updated.unitPriceCents).toBe(99_900);
    expect(updated.kind).toBe('discount');
    expect(updated.name).toBe('Do edycji');
    expect(updated.category).toBe(TEST_CATEGORY);
  });

  it('kasuje miekko — pozycja znika z listy, ale wiersz zostaje', async () => {
    const item = await makeItem('Do skasowania');
    await deleteLibraryItem(item.id);

    const rows = await listLibraryItems(workspaceId, { category: TEST_CATEGORY });
    expect(rows.some((row) => row.id === item.id)).toBe(false);

    const { data } = await getSupabase()
      .from('library_items')
      .select('deleted_at')
      .eq('id', item.id)
      .limit(1);
    expect(data?.[0]?.deleted_at).not.toBeNull();
  });

  it('zapisuje pozycje wyceny hurtem i dopisuje je na koncu', async () => {
    const items = [
      newItem({ name: 'Z wyceny 1', unitPriceCents: 30_000 }),
      newItem({ name: 'Z wyceny 2', kind: 'discount', unitPriceCents: 5_000 }),
      newItem({ name: '   ' }),
    ];

    const saved = await saveItemsToLibrary(
      workspaceId,
      items.map((item) => ({ ...item, category: TEST_CATEGORY })),
    );
    saved.forEach((row) => createdItems.push(row.id));

    // Pozycja z pusta nazwa jest pomijana — nie przeszlaby walidacji biblioteki.
    expect(saved).toHaveLength(2);
    expect(saved[0]?.name).toBe('Z wyceny 1');
    expect(saved[1]?.kind).toBe('discount');
    expect(saved[0]?.sortOrder).toBeLessThan(saved[1]?.sortOrder ?? 0);
  });
});

describe('library.repo — grupy', () => {
  it('tworzy grupe i parsuje snapshot pozycji zodem', async () => {
    const group = await makeGroup('Grupa testowa');

    expect(group.workspaceId).toBe(workspaceId);
    expect(group.items).toHaveLength(2);
    expect(group.items[0]?.name).toBe('Pozycja A');
    expect(group.items[1]?.kind).toBe('discount');
  });

  it('parsuje snapshoty grupy z seeda', async () => {
    const groups = await listLibraryGroups(workspaceId);
    const kitchen = groups.find((group) => group.name === 'Kuchnia');

    expect(kitchen).toBeDefined();
    // Bez liczby pozycji: zestawy są edytowalne z poziomu aplikacji, więc
    // asercja na „dokładnie 3" psuła się po pierwszym kliknięciu w bibliotece.
    expect(kitchen?.items.length).toBeGreaterThan(0);

    const projekt = kitchen?.items.find((item) => item.name === 'Projekt koncepcyjny wnętrza');
    expect(projekt).toBeDefined();
    // Snapshot z seeda ma nadmiarowe `id` pozycji wyceny — zod je odcina.
    expect(projekt).not.toHaveProperty('id');
    // `qty` natomiast NALEŻY do zestawu: „Kuchnia" to 14 m² projektu, nie jedna
    // sztuka. Wcześniej schemat je odcinał i wstawienie zestawu gubiło metraż.
    expect(projekt?.qty).toBe(14);
    expect(projekt?.libraryItemId).toBeTruthy();
  });

  it('regula cenowa przezywa zapis i odczyt', async () => {
    const pozycja = await makeItem('Projekt budowlany');

    const zapisana = await updateLibraryItem(pozycja.id, {
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: { 'typ-kuchnia': 5_000 },
        defaultPerRoomCents: 1_500,
        roomScope: 'technical',
      },
    });

    expect(zapisana.pricing).toEqual({
      mode: 'per_room',
      baseCents: 20_000,
      perRoomCents: { 'typ-kuchnia': 5_000 },
      defaultPerRoomCents: 1_500,
      roomScope: 'technical',
    });

    // I to samo po ponownym odczycie z bazy, nie tylko w odpowiedzi na UPDATE.
    const zListy = (await listLibraryItems(workspaceId)).find((row) => row.id === pozycja.id);
    expect(zListy?.pricing).toEqual(zapisana.pricing);
  });

  it('pozycje sprzed migracji maja regule `flat`', async () => {
    const pozycja = await makeItem('Sprzed cennika parametrycznego');

    // Kolumna ma default w migracji, ale sprawdzamy realny wiersz, a nie zod.
    expect(pozycja.pricing).toEqual({ mode: 'flat' });
  });

  it('nieczytelna regula nie wywala biblioteki — wraca `flat`', async () => {
    const pozycja = await makeItem('Zepsuta regula');

    await getSupabase()
      .from('library_items')
      .update({ pricing: { mode: 'kosmiczny' } })
      .eq('id', pozycja.id);

    const zListy = (await listLibraryItems(workspaceId)).find((row) => row.id === pozycja.id);
    // Jedna zepsuta pozycja nie moze zabrac uzytkownikowi calej biblioteki.
    expect(zListy?.pricing).toEqual({ mode: 'flat' });
    expect(zListy?.unitPriceCents).toBe(pozycja.unitPriceCents);
  });

  it('podmienia pozycje grupy', async () => {
    const group = await makeGroup('Grupa do edycji');

    const updated = await updateLibraryGroup(group.id, {
      name: 'Grupa po edycji',
      items: [
        {
          name: 'Jedyna',
          description: '',
          kind: 'item',
          qty: 1,
          unitPriceCents: 1,
          libraryItemId: null,
        },
      ],
    });

    expect(updated.name).toBe('Grupa po edycji');
    expect(updated.items).toHaveLength(1);
  });

  it('zwraca pusta liste pozycji, gdy snapshot w bazie jest uszkodzony', async () => {
    const group = await makeGroup('Grupa uszkodzona');

    // Symulujemy stary/rozjechany zapis — repo ma to przezyc, a nie wywalic apki.
    await getSupabase()
      .from('library_groups')
      .update({ items: [{ nazwa: 'brak wymaganych pol' }] })
      .eq('id', group.id);

    const groups = await listLibraryGroups(workspaceId);
    const broken = groups.find((row) => row.id === group.id);

    expect(broken).toBeDefined();
    expect(broken?.items).toEqual([]);
  });

  it('kasuje grupe miekko', async () => {
    const group = await makeGroup('Grupa do skasowania');
    await deleteLibraryGroup(group.id);

    const groups = await listLibraryGroups(workspaceId);
    expect(groups.some((row) => row.id === group.id)).toBe(false);

    const { data } = await getSupabase()
      .from('library_groups')
      .select('deleted_at')
      .eq('id', group.id)
      .limit(1);
    expect(data?.[0]?.deleted_at).not.toBeNull();
  });
});

describe('warianty pozycji (F1.4)', () => {
  it('wariant wskazuje na lidera i wraca z odczytu', async () => {
    const lider = await makeItem('Wizualizacja 3D');
    const wariant = await makeItem('Wizualizacja 360');
    const zapisany = await updateLibraryItem(wariant.id, { variantOf: lider.id });

    expect(zapisany.variantOf).toBe(lider.id);

    const rows = await listLibraryItems(workspaceId, { category: TEST_CATEGORY });
    expect(rows.find((row) => row.id === wariant.id)?.variantOf).toBe(lider.id);
    expect(rows.find((row) => row.id === lider.id)?.variantOf).toBeNull();
  });

  it('BAZA odrzuca wariant wariantu — grupa ma zostac plaska', async () => {
    // Gdyby wariant mogl wskazywac na wariant, „rodzenstwo" zalezaloby od tego,
    // od ktorego wpisu zaczac liczyc. UI tez tego nie proponuje, ale to baza
    // jest tu granica.
    const lider = await makeItem('Baza wariantow');
    const wariant = await makeItem('Wariant pierwszy');
    await updateLibraryItem(wariant.id, { variantOf: lider.id });

    const kolejny = await makeItem('Wariant drugiego poziomu');
    // Sprawdzamy TRESC bledu, nie sam fakt wyjatku: `updateLibraryItem` rzuca
    // takze wtedy, gdy update nie zwroci wiersza, wiec goly `toThrow()`
    // przeszedlby rowniez bez wyzwalacza.
    await expect(updateLibraryItem(kolejny.id, { variantOf: wariant.id })).rejects.toThrow(
      /pozycję główną/,
    );
  });

  it('BAZA odrzuca pozycje bedaca wariantem samej siebie', async () => {
    const item = await makeItem('Sama dla siebie');
    await expect(updateLibraryItem(item.id, { variantOf: item.id })).rejects.toThrow(
      /wariantem samej siebie/,
    );
  });

  it('odpiecie od grupy zostawia pozycje samodzielna', async () => {
    const lider = await makeItem('Lider do odpiecia');
    const wariant = await makeItem('Wariant do odpiecia');
    await updateLibraryItem(wariant.id, { variantOf: lider.id });

    const odpiety = await updateLibraryItem(wariant.id, { variantOf: null });
    expect(odpiety.variantOf).toBeNull();
  });

  it('nowa pozycja domyslnie NIE jest niczyim wariantem', async () => {
    const item = await makeItem('Zwykla pozycja');
    expect(item.variantOf).toBeNull();
  });
});

describe('jednostka wpisu bibliotecznego (F2.1)', () => {
  it('nowy wpis jest KWOTOWY', async () => {
    // Tryb godzinowy nie istnial przed migracja 0011, wiec nie ma wpisu,
    // ktorego liczby znaczylyby minuty.
    const item = await makeItem('Domyslna jednostka');
    expect(item.pricingBasis).toBe('amount');
  });

  it('wpis moze byc godzinowy i wraca taki z odczytu', async () => {
    const item = await makeItem('Wpis godzinowy');
    const zapisany = await updateLibraryItem(item.id, { pricingBasis: 'time' });
    expect(zapisany.pricingBasis).toBe('time');

    const rows = await listLibraryItems(workspaceId, { category: TEST_CATEGORY });
    expect(rows.find((row) => row.id === item.id)?.pricingBasis).toBe('time');
  });

  it('BAZA odrzuca jednostke spoza slownika', async () => {
    // Bez CHECK-a literowka w zapisie zamienilaby wpis w cos, czego zadna
    // strona nie umie zinterpretowac — a liczby dalej wygladalyby wiarygodnie.
    const item = await makeItem('Zla jednostka');
    const { error } = await getSupabase()
      .from('library_items')
      .update({ pricing_basis: 'minuty' })
      .eq('id', item.id);

    expect(error).not.toBeNull();
  });
});
