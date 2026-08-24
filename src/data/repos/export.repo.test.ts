import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ getSupabase: () => ({ from }) }));

const { exportFileName, exportWorkspaceData } = await import('./export.repo');

/** Zapamiętuje, o co repozytorium pytało bazę. */
interface Zapytanie {
  table: string;
  column?: string;
  value?: string;
}

const zapytania: Zapytanie[] = [];

function mockTables(rows: Record<string, unknown[]>) {
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: (column: string, value: string) => {
        zapytania.push({ table, column, value });
        return Promise.resolve({ data: rows[table] ?? [], error: null });
      },
    }),
  }));
}

beforeEach(() => {
  zapytania.length = 0;
  vi.clearAllMocks();
});

describe('exportWorkspaceData', () => {
  it('bierze wyceny RAZEM z treścią, nie same nagłówki', async () => {
    // `listQuotes` zwraca podsumowania bez `body`, bo lista ich nie potrzebuje.
    // Zrzut zbudowany na tamtej funkcji byłby spisem tytułów zamiast kopią
    // pracy — dlatego eksport idzie po surowe wiersze.
    mockTables({
      quotes: [{ id: 'q1', title: 'Wycena', body: { sections: [{ title: 'Sekcja' }] } }],
    });

    const dump = await exportWorkspaceData('ws-1');

    expect(dump.quotes).toHaveLength(1);
    expect(dump.quotes[0]).toHaveProperty('body');
    expect(JSON.stringify(dump.quotes[0])).toContain('Sekcja');
  });

  it('obejmuje wszystkie tabele workspace, w tym klientów', async () => {
    mockTables({});
    await exportWorkspaceData('ws-1');

    const odpytane = zapytania.map((z) => z.table);
    expect(odpytane).toEqual(
      expect.arrayContaining([
        'workspaces',
        'brand_kits',
        'room_types',
        'clients',
        'library_items',
        'library_groups',
        'quote_templates',
        'quotes',
      ]),
    );
  });

  it('pyta wyłącznie o jeden workspace', async () => {
    mockTables({});
    await exportWorkspaceData('ws-1');

    for (const zapytanie of zapytania) {
      expect(zapytanie.value).toBe('ws-1');
      // `workspaces` filtrujemy po `id`, resztę po `workspace_id`.
      expect(zapytanie.column).toBe(zapytanie.table === 'workspaces' ? 'id' : 'workspace_id');
    }
  });

  it('nie wynosi identyfikatorów Stripe do pliku na dysku', async () => {
    mockTables({});
    const dump = await exportWorkspaceData('ws-1');

    expect(zapytania.map((z) => z.table)).not.toContain('subscriptions');
    expect(JSON.stringify(dump)).not.toContain('stripe');
  });

  it('brak workspace daje `null`, a nie wywrotkę', async () => {
    mockTables({});
    const dump = await exportWorkspaceData('ws-1');

    expect(dump.workspace).toBeNull();
    expect(dump.brandKit).toBeNull();
    expect(dump.quotes).toEqual([]);
  });

  it('stempluje zrzut wersją formatu i datą', async () => {
    mockTables({});
    const dump = await exportWorkspaceData('ws-1', new Date('2026-08-23T10:00:00Z'));

    expect(dump.formatVersion).toBe(1);
    expect(dump.exportedAt).toBe('2026-08-23T10:00:00.000Z');
  });
});

describe('exportFileName', () => {
  it('nazywa plik datą w czasie lokalnym', () => {
    expect(exportFileName(new Date(2026, 7, 5))).toBe('toolier-dane-2026-08-05.json');
  });
});
