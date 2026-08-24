/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Biblioteka przykładowa (B4, T-62).
 *
 * Testujemy **prawdziwą ścieżkę**: rejestrujemy nowe konto i sprawdzamy, co
 * dostało. Wołanie `seed_library_sample` na koncie demo nic by nie dało — ma
 * już usługi, więc funkcja słusznie odmawia (i to też sprawdzamy).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  countSampleItems,
  deleteSampleLibrary,
  listLibraryItems,
  updateLibraryItem,
} from './library.repo';
import { listLibraryCategoryRows } from './library-categories.repo';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

/** Świeże konto na każdy przebieg — inaczej drugi wywaliłby się na duplikacie. */
const NEW_EMAIL = `sample-${Date.now()}@toolier.local`;
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

describe('biblioteka przykladowa na start konta', () => {
  it('nowe konto dostaje 8 grup i 38 uslug', async () => {
    // Kryterium odbioru T-62, przez prawdziwy trigger `handle_new_user`.
    const categories = await listLibraryCategoryRows(workspaceId);
    expect(categories.filter((row) => row.isSample)).toHaveLength(8);
    expect(await countSampleItems(workspaceId)).toBe(38);
  });

  it('grupy sa w kolejnosci procesu, z kodami 01–08', async () => {
    const categories = await listLibraryCategoryRows(workspaceId);
    expect(categories.map((row) => row.code)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
    expect(categories[0]?.name).toBe('Przygotowanie projektu');
  });

  it('WSZYSTKIE pozycje sa bez ceny — nie sugerujemy stawek rynkowych', async () => {
    const items = await listLibraryItems(workspaceId);
    expect(items).toHaveLength(38);
    expect(items.every((item) => item.unitPriceCents === null)).toBe(true);
  });

  it('jednostki i tryby ida z arkusza, nie z domyslu', async () => {
    const items = await listLibraryItems(workspaceId);
    const find = (name: string) => items.find((item) => item.name === name);

    // „za m² / kwota stała" → bierzemy PIERWSZA z alternatywy.
    expect(find('Pomiar wnętrza')?.unit).toBe('m2');
    expect(find('Konsultacja startowa')?.unit).toBe('hour');
    expect(find('Koncepcja funkcjonalna')?.pricing.mode).toBe('per_room');
    expect(find('Dodatkowe ujęcie')?.pricing.mode).toBe('per_frame');
    // „za panoramę" nie ma swojego kodu w enumie — idzie jako `custom`.
    expect(find('Panorama wnętrza')?.unitLabel).toBe('panorama');
    expect(find('Zabudowa kuchenna')?.unit).toBe('element');
    expect(find('Wizyta na inwestycji')?.unit).toBe('visit');
  });

  it('opisy sa przepisane DOSLOWNIE z bilbioteka.md', async () => {
    // To autorski tekst pod projektantow, a nie placeholder do poprawienia.
    const items = await listLibraryItems(workspaceId);
    expect(items.find((item) => item.name === 'Pomiar wnętrza')?.description).toBe(
      'Pomiary przestrzeni i dokumentacja stanu istniejącego.',
    );
    expect(items.find((item) => item.name === 'Plan wod.-kan.')?.description).toBe(
      'Rozmieszczenie punktów instalacji sanitarnej.',
    );
  });

  it('kazda usluga ma przypisana grupe', async () => {
    const items = await listLibraryItems(workspaceId);
    expect(items.every((item) => item.categoryId !== null)).toBe(true);
  });

  it('EDYCJA zdejmuje flage — „Usun pozostale" nie skasuje czyjejs pracy', async () => {
    const items = await listLibraryItems(workspaceId);
    const wziety = items.find((item) => item.name === 'Analiza potrzeb');
    expect(wziety?.isSample).toBe(true);

    await updateLibraryItem(wziety!.id, { unitPriceCents: 50_000 });

    const po = await listLibraryItems(workspaceId);
    expect(po.find((item) => item.id === wziety!.id)?.isSample).toBe(false);
    // Zostalo 37 nietknietych.
    expect(await countSampleItems(workspaceId)).toBe(37);
  });

  it('„Usun pozostale" kasuje 37 nietknietych i zostawia edytowana', async () => {
    const usuniete = await deleteSampleLibrary(workspaceId);
    expect(usuniete).toBe(37);

    const items = await listLibraryItems(workspaceId);
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('Analiza potrzeb');
  });

  it('puste grupy przykladowe znikaja, a ta z edytowana usluga zostaje', async () => {
    const categories = await listLibraryCategoryRows(workspaceId);
    // „Analiza potrzeb" siedzi w grupie „01 · Przygotowanie projektu".
    expect(categories).toHaveLength(1);
    expect(categories[0]?.code).toBe('01');
  });

  it('konto z wlasna biblioteka NIE dostaje demo — funkcja jest idempotentna', async () => {
    // Konto demo ma swoje 15 pozycji z cenami; dosypanie mu 38 obcych byloby
    // wtargnieciem do cudzej biblioteki.
    const supabase = getSupabase();
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });

    const demoWorkspace = (await getCurrentWorkspace()).id;
    expect(await countSampleItems(demoWorkspace)).toBe(0);

    const { error } = await supabase.rpc('seed_library_sample', { ws: demoWorkspace });
    expect(error).toBeNull();
    expect(await countSampleItems(demoWorkspace)).toBe(0);
  });
});
