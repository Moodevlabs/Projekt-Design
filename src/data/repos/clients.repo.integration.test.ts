/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  createClient,
  deleteClient,
  getClientOverview,
  listClients,
  setClientStatus,
  updateClient,
} from './clients.repo';
import { createQuote, saveQuote, setQuoteStatus } from './quotes.repo';
import { emptyClientDraft } from '@/domain/client/schema';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
const clients: string[] = [];
const quotes: string[] = [];

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const workspace = await getCurrentWorkspace();
  workspaceId = workspace.id;
});

afterAll(async () => {
  for (const id of quotes) {
    await getSupabase().from('quotes').delete().eq('id', id);
  }
  for (const id of clients) {
    await getSupabase().from('clients').delete().eq('id', id);
  }
  await getSupabase().auth.signOut();
});

async function makeClient(name: string, extra: Partial<ReturnType<typeof emptyClientDraft>> = {}) {
  const client = await createClient({ ...emptyClientDraft(), workspaceId, name, ...extra });
  clients.push(client.id);
  return client;
}

describe('clients.repo — kartoteka', () => {
  it('dodaje klienta i zapisuje puste pola jako null, nie pusty tekst', async () => {
    const client = await makeClient('Test Pusty');

    // Jedna reprezentacja pustki w bazie — filtr „ma telefon" nie musi znać dwóch.
    const { data } = await getSupabase()
      .from('clients')
      .select('phone, email, city')
      .eq('id', client.id)
      .single();

    expect(data?.phone).toBeNull();
    expect(data?.email).toBeNull();
    // Repozytorium mapuje `null` z bazy na `''` — tego dotyczy warstwa domeny.
    expect(client.phone).toBe('');
  });

  it('nowy klient jest aktywny', async () => {
    const client = await makeClient('Test Aktywny');
    expect(client.status).toBe('active');
    expect(client.archivedAt).toBeNull();
  });

  it('szuka po fragmencie e-maila PO STRONIE BAZY', async () => {
    await makeClient('Test Szukanie', { email: 'szukajka-integracja@example.com' });

    // Kryterium odbioru T-53. `listClients` przekazuje frazę do `ilike`,
    // więc trafienie znaczy, że filtruje Postgres, a nie przeglądarka.
    const found = await listClients({ workspaceId, search: 'szukajka-integ' });
    expect(found.map((client) => client.name)).toContain('Test Szukanie');
  });

  it('szuka po fragmencie miasta i telefonu', async () => {
    await makeClient('Test Miasto', { city: 'Świebodzin', phone: '600 111 222' });

    expect((await listClients({ workspaceId, search: 'wiebodz' })).length).toBeGreaterThan(0);
    expect((await listClients({ workspaceId, search: '111 222' })).length).toBeGreaterThan(0);
  });

  it('fraza z przecinkiem nie rozsypuje zapytania', async () => {
    await makeClient('Kowalski, Jan (integracja)');

    // `,` rozdziela warunki w `or(...)` PostgREST-a — bez escape'owania
    // to zapytanie wróciłoby błędem albo cudzymi wierszami.
    const found = await listClients({ workspaceId, search: 'Kowalski, Jan' });
    expect(found.map((client) => client.name)).toContain('Kowalski, Jan (integracja)');
  });

  it('archiwizacja chowa z aktywnych, ale zostawia rekord', async () => {
    const client = await makeClient('Test Archiwum');
    await setClientStatus(client.id, 'archived');

    const active = await listClients({ workspaceId, status: 'active' });
    expect(active.map((row) => row.id)).not.toContain(client.id);

    const archived = await listClients({ workspaceId, status: 'archived' });
    const found = archived.find((row) => row.id === client.id);
    expect(found?.archivedAt).not.toBeNull();

    // Przywrócenie zeruje datę — inaczej klient wracałby z datą sprzed roku.
    const restored = await setClientStatus(client.id, 'active');
    expect(restored.archivedAt).toBeNull();
  });

  it('usuniety klient znika z listy (soft delete)', async () => {
    const client = await makeClient('Test Kosz');
    await deleteClient(client.id);

    const all = await listClients({ workspaceId, status: 'all' });
    expect(all.map((row) => row.id)).not.toContain(client.id);
  });

  it('widok liczy wyceny i wartosc zaakceptowanych W BAZIE', async () => {
    const client = await makeClient('Test Sumy');

    const body = newQuoteBody({
      title: 'Wycena integracyjna',
      sections: [
        newSection({
          title: 'Sekcja',
          items: [newItem({ name: 'Pozycja', qty: 1, unitPriceCents: 100_000 })],
        }),
      ],
    });

    const zaakceptowana = await createQuote({ workspaceId, body, clientId: client.id });
    quotes.push(zaakceptowana.id);
    await setQuoteStatus(zaakceptowana.id, 'accepted');

    const szkic = await createQuote({ workspaceId, body, clientId: client.id });
    quotes.push(szkic.id);

    const overview = await getClientOverview(client.id);
    expect(overview.quotesCount).toBe(2);
    // Do wartości wchodzą wyłącznie zaakceptowane.
    expect(overview.acceptedNetCents).toBe(100_000);
  });

  it('edycja klienta NIE zmienia danych w wyslanej wycenie', async () => {
    const client = await makeClient('Test Snapshot', { phone: '600 100 200' });

    const body = newQuoteBody({ title: 'Wycena snapshotowa' });
    body.client = { name: client.name, phone: client.phone, email: '', city: '' };

    const quote = await createQuote({ workspaceId, body, clientId: client.id });
    quotes.push(quote.id);

    await updateClient(client.id, { phone: '999 888 777' });

    // Kryterium odbioru T-53 (CLAUDE.md §14): dokument to snapshot.
    const { data } = await getSupabase().from('quotes').select('body').eq('id', quote.id).single();
    const zapisany = data?.body as { client?: { phone?: string } };
    expect(zapisany.client?.phone).toBe('600 100 200');
  });

  it('zapis wyceny bez pola `clientId` nie odpina klienta', async () => {
    const client = await makeClient('Test Przypiecie');
    const quote = await createQuote({
      workspaceId,
      body: newQuoteBody({ title: 'Wycena przypieta' }),
      clientId: client.id,
    });
    quotes.push(quote.id);

    // `undefined` = „nie ruszaj". Bez tego rozróżnienia każdy autozapis
    // ze starszej ścieżki zerowałby `client_id`.
    const saved = await saveQuote({
      id: quote.id,
      body: quote.body!,
      lastSeenUpdatedAt: quote.updatedAt,
    });

    expect(saved.clientId).toBe(client.id);
  });
});
