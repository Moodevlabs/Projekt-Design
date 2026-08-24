/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Sedno: przepływ z koncepcji §11 — v1 → „Nowa wersja" → v2 zaakceptowana,
 * v1 archiwalna, jeden `accepted` w projekcie.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import { createClient } from './clients.repo';
import { createProject } from './projects.repo';
import {
  AcceptedConflictError,
  acceptReplacing,
  createQuote,
  createQuoteVersion,
  duplicateQuote,
  getQuote,
  listQuotes,
  setQuoteStatus,
} from './quotes.repo';
import { emptyClientDraft } from '@/domain/client/schema';
import { emptyProjectDraft } from '@/domain/project/schema';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';

const DEMO_EMAIL = 'demo@anzorge.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
let clientId: string;

const quotes: string[] = [];
const projects: string[] = [];
const clients: string[] = [];

const BODY = newQuoteBody({
  title: 'Wycena wersjonowana',
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
  workspaceId = (await getCurrentWorkspace()).id;

  const client = await createClient({ ...emptyClientDraft(), workspaceId, name: 'Test Wersje' });
  clientId = client.id;
  clients.push(client.id);
});

afterAll(async () => {
  const supabase = getSupabase();
  for (const id of quotes) await supabase.from('quotes').delete().eq('id', id);
  for (const id of projects) await supabase.from('projects').delete().eq('id', id);
  for (const id of clients) await supabase.from('clients').delete().eq('id', id);
  await supabase.auth.signOut();
});

async function makeProject(name: string) {
  const project = await createProject({ ...emptyProjectDraft(), workspaceId, clientId, name });
  projects.push(project.id);
  return project;
}

async function makeQuote(projectId: string | null) {
  const quote = await createQuote({ workspaceId, body: BODY, clientId, projectId });
  quotes.push(quote.id);
  return quote;
}

async function makeVersion(id: string) {
  const kopia = await createQuoteVersion(id);
  quotes.push(kopia.id);
  return kopia;
}

describe('wersje wycen — linia i numeracja', () => {
  it('nowa wycena zaklada wlasna linie: lineage_id = id, wersja 1', async () => {
    const quote = await makeQuote(null);
    expect(quote.version).toBe(1);
    expect(quote.lineageId).toBe(quote.id);
  });

  it('„Nowa wersja" ZOSTAJE w linii i podbija numer wersji', async () => {
    const v1 = await makeQuote(null);
    const v2 = await makeVersion(v1.id);

    expect(v2.lineageId).toBe(v1.lineageId);
    expect(v2.version).toBe(2);

    const v3 = await makeVersion(v2.id);
    expect(v3.lineageId).toBe(v1.lineageId);
    expect(v3.version).toBe(3);
  });

  it('nowa wersja dostaje NOWY numer wyceny — to inny dokument u klienta', async () => {
    const v1 = await makeQuote(null);
    const v2 = await makeVersion(v1.id);

    expect(v2.number).not.toBe(v1.number);
    expect(v2.number).toBeTruthy();
  });

  it('„Duplikuj" zaklada NOWA linie od v1 — to nie to samo co wersja', async () => {
    // Koncepcja §4 regula 5: duplikat to „ta sama oferta dla innego klienta".
    const v1 = await makeQuote(null);
    const kopia = await duplicateQuote(v1.id);
    quotes.push(kopia.id);

    expect(kopia.lineageId).not.toBe(v1.lineageId);
    expect(kopia.lineageId).toBe(kopia.id);
    expect(kopia.version).toBe(1);
  });

  it('poprzedni SZKIC idzie do archiwum, wyslana ZOSTAJE', async () => {
    const szkic = await makeQuote(null);
    await makeVersion(szkic.id);
    expect((await getQuote(szkic.id)).status).toBe('archived');

    const wyslana = await makeQuote(null);
    await setQuoteStatus(wyslana.id, 'sent');
    await makeVersion(wyslana.id);
    // To fakt o tym, co poszlo do inwestora — nie wolno go nadpisac.
    expect((await getQuote(wyslana.id)).status).toBe('sent');
  });

  it('wersja niesie tresc poprzedniej', async () => {
    const v1 = await makeQuote(null);
    const v2 = await makeVersion(v1.id);
    expect(v2.body?.sections[0]?.items[0]?.name).toBe('Pozycja');
  });

  it('wszystkie wersje linii da sie wylistowac jednym zapytaniem', async () => {
    const v1 = await makeQuote(null);
    const v2 = await makeVersion(v1.id);

    const linia = await listQuotes({
      workspaceId,
      lineageId: v1.lineageId,
      status: 'all',
      includeArchived: true,
    });

    expect(linia.map((row) => row.id).sort()).toEqual([v1.id, v2.id].sort());
  });
});

describe('jedna zaakceptowana wycena na projekt', () => {
  it('druga akceptacja w tym samym projekcie jest ODBIJANA PRZEZ BAZE', async () => {
    const projekt = await makeProject('Teczka z akceptacja');
    const v1 = await makeQuote(projekt.id);
    const v2 = await makeVersion(v1.id);

    await setQuoteStatus(v1.id, 'accepted');

    // Indeks czesciowy `quotes_one_accepted_per_project` — sprawdzenie w UI
    // przepuscilo by dwie rownolegle akceptacje.
    await expect(setQuoteStatus(v2.id, 'accepted')).rejects.toBeInstanceOf(AcceptedConflictError);
  });

  it('zastapienie archiwizuje poprzednia i akceptuje nowa', async () => {
    const projekt = await makeProject('Teczka z zastapieniem');
    const v1 = await makeQuote(projekt.id);
    const v2 = await makeVersion(v1.id);

    await setQuoteStatus(v1.id, 'accepted');
    await acceptReplacing(v2.id, projekt.id);

    // Pelny przeplyw z koncepcji §11.
    expect((await getQuote(v1.id)).status).toBe('archived');
    expect((await getQuote(v2.id)).status).toBe('accepted');

    const wProjekcie = await listQuotes({ workspaceId, projectId: projekt.id, status: 'accepted' });
    expect(wProjekcie).toHaveLength(1);
    expect(wProjekcie[0]?.id).toBe(v2.id);
  });

  it('wyceny BEZ projektu nie podlegaja temu ograniczeniu', async () => {
    // „Szybka wycena" nie nalezy do zadnej inwestycji — nie ma czego pilnowac.
    const a = await makeQuote(null);
    const b = await makeQuote(null);

    await setQuoteStatus(a.id, 'accepted');
    await expect(setQuoteStatus(b.id, 'accepted')).resolves.toBeTruthy();
  });

  it('rozne projekty moga miec wlasne zaakceptowane wyceny', async () => {
    const pierwszy = await makeProject('Teczka A');
    const drugi = await makeProject('Teczka B');
    const a = await makeQuote(pierwszy.id);
    const b = await makeQuote(drugi.id);

    await setQuoteStatus(a.id, 'accepted');
    await expect(setQuoteStatus(b.id, 'accepted')).resolves.toBeTruthy();
  });
});
