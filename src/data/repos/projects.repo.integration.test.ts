/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import { createClient } from './clients.repo';
import { getClientOverview } from './clients.repo';
import {
  createProject,
  deleteProject,
  getProjectOverview,
  listProjects,
  moveQuoteToProject,
  setProjectStatus,
} from './projects.repo';
import { createQuote, getQuote, listQuotes, setQuoteStatus } from './quotes.repo';
import { emptyClientDraft } from '@/domain/client/schema';
import { emptyProjectDraft } from '@/domain/project/schema';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
let clientId: string;
const projects: string[] = [];
const quotes: string[] = [];
const clients: string[] = [];

const BODY = newQuoteBody({
  title: 'Wycena integracyjna',
  sections: [
    newSection({
      title: 'Sekcja',
      items: [newItem({ name: 'Pozycja', qty: 1, unitPriceCents: 100_000 })],
    }),
  ],
});

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const workspace = await getCurrentWorkspace();
  workspaceId = workspace.id;

  const client = await createClient({
    ...emptyClientDraft(),
    workspaceId,
    name: 'Test Projekty',
    address: 'ul. Testowa 1',
    city: 'Testowo',
  });
  clientId = client.id;
  clients.push(client.id);
});

afterAll(async () => {
  for (const id of quotes) await getSupabase().from('quotes').delete().eq('id', id);
  for (const id of projects) await getSupabase().from('projects').delete().eq('id', id);
  for (const id of clients) await getSupabase().from('clients').delete().eq('id', id);
  await getSupabase().auth.signOut();
});

async function makeProject(name: string, extra: Partial<ReturnType<typeof emptyProjectDraft>> = {}) {
  const project = await createProject({
    ...emptyProjectDraft(),
    workspaceId,
    clientId,
    name,
    ...extra,
  });
  projects.push(project.id);
  return project;
}

async function makeQuote(projectId: string | null) {
  const quote = await createQuote({
    workspaceId,
    body: BODY,
    clientId,
    projectId,
  });
  quotes.push(quote.id);
  return quote;
}

describe('projects.repo — teczki inwestycji', () => {
  it('seed ma klienta z DWOMA projektami', async () => {
    // Kryterium odbioru T-54 zaczyna się od danych demo: bez dwóch teczek
    // u jednego klienta nie da się zobaczyć, po co ten byt w ogóle jest.
    const kowalscy = await listProjects({
      workspaceId,
      clientId: '1f000000-0000-4000-8000-000000000001',
    });
    expect(kowalscy.length).toBe(2);
  });

  it('nowy projekt startuje jako zapytanie i bez metrazu', async () => {
    const project = await makeProject('Teczka pusta');
    expect(project.status).toBe('lead');
    expect(project.areaM2).toBeNull();
  });

  it('metraz z przecinka zapisuje sie jako liczba', async () => {
    const project = await makeProject('Teczka z metrazem', { areaM2: '164,5' });
    expect(project.areaM2).toBe(164.5);

    // `numeric` wraca z PostgREST-a jako string — bez konwersji sortowanie
    // i porownania robilyby sie leksykalnie.
    expect(typeof project.areaM2).toBe('number');
  });

  it('klient z dwoma projektami widzi DWIE OSOBNE listy wycen', async () => {
    const pierwszy = await makeProject('Teczka A');
    const drugi = await makeProject('Teczka B');

    const a1 = await makeQuote(pierwszy.id);
    await makeQuote(pierwszy.id);
    const b1 = await makeQuote(drugi.id);

    const wA = await listQuotes({ workspaceId, projectId: pierwszy.id, status: 'all' });
    const wB = await listQuotes({ workspaceId, projectId: drugi.id, status: 'all' });

    expect(wA.map((q) => q.id).sort()).toContain(a1.id);
    expect(wA.length).toBe(2);
    expect(wB.map((q) => q.id)).toEqual([b1.id]);
  });

  it('przeniesienie wyceny zmienia TYLKO project_id', async () => {
    const zrodlo = await makeProject('Teczka zrodlowa');
    const cel = await makeProject('Teczka docelowa');
    const quote = await makeQuote(zrodlo.id);

    const przed = await getQuote(quote.id);
    await moveQuoteToProject(quote.id, cel.id);
    const po = await getQuote(quote.id);

    expect(po.projectId).toBe(cel.id);
    // Kryterium odbioru: klient, tresc i totale bez zmian.
    expect(po.clientId).toBe(przed.clientId);
    expect(po.totalNetCents).toBe(przed.totalNetCents);
    expect(JSON.stringify(po.body)).toBe(JSON.stringify(przed.body));
  });

  it('wycena bez projektu dalej dziala i da sie ja wciagnac do teczki', async () => {
    const luzna = await makeQuote(null);
    expect(luzna.projectId).toBeNull();

    const cel = await makeProject('Teczka dla luznej');
    await moveQuoteToProject(luzna.id, cel.id);
    expect((await getQuote(luzna.id)).projectId).toBe(cel.id);

    // I z powrotem — wyjecie z teczki zostawia ja przy kliencie.
    await moveQuoteToProject(luzna.id, null);
    const po = await getQuote(luzna.id);
    expect(po.projectId).toBeNull();
    expect(po.clientId).toBe(clientId);
  });

  it('widok liczy wyceny i wartosc zaakceptowanych W BAZIE', async () => {
    const project = await makeProject('Teczka z sumami');
    const zaakceptowana = await makeQuote(project.id);
    await setQuoteStatus(zaakceptowana.id, 'accepted');
    await makeQuote(project.id);

    const overview = await getProjectOverview(project.id);
    expect(overview.quotesCount).toBe(2);
    expect(overview.acceptedNetCents).toBe(100_000);
    // Widok dokleja nazwe klienta, zeby rejestr nie musial robic drugiego zapytania.
    expect(overview.clientName).toBe('Test Projekty');
  });

  it('karta klienta liczy jego projekty', async () => {
    const przed = await getClientOverview(clientId);
    await makeProject('Teczka do licznika');
    const po = await getClientOverview(clientId);

    expect(po.projectsCount).toBe(przed.projectsCount + 1);
  });

  it('usuniety projekt znika z listy, ale jego wyceny zostaja', async () => {
    const project = await makeProject('Teczka do kosza');
    const quote = await makeQuote(project.id);

    await deleteProject(project.id);

    const lista = await listProjects({ workspaceId, clientId, status: 'all' });
    expect(lista.map((row) => row.id)).not.toContain(project.id);

    // Soft delete: wycena dalej wskazuje na teczke i da sie ja odzyskac.
    expect((await getQuote(quote.id)).projectId).toBe(project.id);
  });

  it('status przestawia sie po jednym wywolaniu', async () => {
    const project = await makeProject('Teczka statusowa');
    const po = await setProjectStatus(project.id, 'in_progress');
    expect(po.status).toBe('in_progress');
  });

  it('filtr po statusie chodzi w bazie', async () => {
    const project = await makeProject('Teczka anulowana');
    await setProjectStatus(project.id, 'canceled');

    const anulowane = await listProjects({ workspaceId, clientId, status: 'canceled' });
    expect(anulowane.map((row) => row.id)).toContain(project.id);

    const zapytania = await listProjects({ workspaceId, clientId, status: 'lead' });
    expect(zapytania.map((row) => row.id)).not.toContain(project.id);
  });

  it('szukanie po fragmencie nazwy i po nazwie klienta idzie po stronie bazy', async () => {
    await makeProject('Poddasze nad garazem');

    expect(
      (await listProjects({ workspaceId, search: 'oddasze nad' })).map((row) => row.name),
    ).toContain('Poddasze nad garazem');

    // Widok niesie `client_name`, wiec da sie znalezc teczke po inwestorze.
    expect(
      (await listProjects({ workspaceId, search: 'Test Projekty' })).length,
    ).toBeGreaterThan(0);
  });
});
