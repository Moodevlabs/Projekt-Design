/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import { createClient } from './clients.repo';
import { createProject } from './projects.repo';
import {
  FILES_BUCKET,
  QuotaExceededError,
  deleteFile,
  downloadFile,
  getDownloadUrl,
  getStorageUsage,
  listFiles,
  renameFile,
  uploadFile,
} from './files.repo';
import { emptyClientDraft } from '@/domain/client/schema';
import { emptyProjectDraft } from '@/domain/project/schema';

const DEMO_EMAIL = 'demo@anzorge.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
let clientId: string;
let projectId: string;

const files: { id: string; storagePath: string }[] = [];
const clients: string[] = [];
const projects: string[] = [];

function bytes(size: number, fill = 7): Uint8Array {
  return new Uint8Array(size).fill(fill);
}

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const workspace = await getCurrentWorkspace();
  workspaceId = workspace.id;

  const client = await createClient({ ...emptyClientDraft(), workspaceId, name: 'Test Pliki' });
  clientId = client.id;
  clients.push(client.id);

  const project = await createProject({
    ...emptyProjectDraft(),
    workspaceId,
    clientId,
    name: 'Teczka z plikami',
  });
  projectId = project.id;
  projects.push(project.id);
});

afterAll(async () => {
  const supabase = getSupabase();
  for (const file of files) {
    await supabase.storage.from(FILES_BUCKET).remove([file.storagePath]);
    await supabase.from('files').delete().eq('id', file.id);
  }
  for (const id of projects) await supabase.from('projects').delete().eq('id', id);
  for (const id of clients) await supabase.from('clients').delete().eq('id', id);
  // Licznik zużycia utrzymuje trigger, ale twarde `delete` wierszy z pominięciem
  // soft delete zostawiłoby go podbitego — zerujemy, żeby kolejne przebiegi
  // testów startowały z czystym limitem.
  await supabase.from('workspaces').update({ storage_used_bytes: 0 }).eq('id', workspaceId);
  await supabase.auth.signOut();
});

async function put(name: string, size = 1024, target: { projectId?: string | null } = {}) {
  const file = await uploadFile({
    workspaceId,
    clientId,
    projectId: target.projectId ?? null,
    name,
    mime: 'application/octet-stream',
    bytes: bytes(size),
  });
  files.push({ id: file.id, storagePath: file.storagePath });
  return file;
}

describe('files.repo — archiwum klienta', () => {
  it('wrzucony plik ma wiersz i obiekt pod ta sama sciezka', async () => {
    const file = await put('rzut.pdf', 2048);

    expect(file.sizeBytes).toBe(2048);
    expect(file.storagePath.startsWith(`${workspaceId}/${clientId}/`)).toBe(true);

    // Wiersz to jedno, bajty to drugie — sprawdzamy oba.
    const pobrane = await downloadFile(file.storagePath);
    expect(pobrane.byteLength).toBe(2048);
  });

  it('plik wrzucony w projekcie widac TAKZE u klienta', async () => {
    const file = await put('rzut-teczki.pdf', 512, { projectId });

    const wProjekcie = await listFiles({ workspaceId, projectId });
    expect(wProjekcie.map((row) => row.id)).toContain(file.id);

    // Decyzja D2: karta klienta pokazuje wszystko, projekt zawęża.
    const uKlienta = await listFiles({ workspaceId, clientId });
    expect(uKlienta.map((row) => row.id)).toContain(file.id);
  });

  it('licznik zuzycia rosnie po wrzuceniu i MALEJE po usunieciu', async () => {
    const przed = await getStorageUsage(workspaceId);
    const file = await put('do-skasowania.bin', 4096);

    const po = await getStorageUsage(workspaceId);
    expect(po.usedBytes).toBe(przed.usedBytes + 4096);

    await deleteFile(file);

    // Soft delete zwalnia miejsce od razu, bo obiekt kasujemy w tej samej
    // operacji — kosza na pliki nie ma w 1.0 (koncepcja §3 reguła 5).
    const poUsunieciu = await getStorageUsage(workspaceId);
    expect(poUsunieciu.usedBytes).toBe(przed.usedBytes);
  });

  it('usuniety plik znika z listy, a jego obiekt z bucketa', async () => {
    const file = await put('znika.bin', 256);
    await deleteFile(file);

    const lista = await listFiles({ workspaceId, clientId });
    expect(lista.map((row) => row.id)).not.toContain(file.id);

    await expect(downloadFile(file.storagePath)).rejects.toThrow();
  });

  it('zmiana nazwy NIE rusza obiektu — sciezka jest kluczem', async () => {
    const file = await put('stara-nazwa.pdf', 128);
    const po = await renameFile(file.id, 'nowa-nazwa.pdf');

    expect(po.name).toBe('nowa-nazwa.pdf');
    expect(po.storagePath).toBe(file.storagePath);
    // Bajty dalej są tam, gdzie były.
    expect((await downloadFile(file.storagePath)).byteLength).toBe(128);
  });

  it('podpisany URL prowadzi do pliku', async () => {
    const file = await put('podpisany.bin', 64);
    const url = await getDownloadUrl(file.storagePath);

    expect(url).toContain('/storage/v1/');
    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect((await response.arrayBuffer()).byteLength).toBe(64);
  });

  it('LIMIT odbija baza, a nie UI — i sprzata obiekt po sobie', async () => {
    const supabase = getSupabase();
    const przed = await getStorageUsage(workspaceId);

    // Zaciskamy limit tuż nad obecnym zużyciem, żeby nie wgrywać 2 GB.
    await supabase
      .from('workspaces')
      .update({ storage_quota_bytes: przed.usedBytes + 1000 })
      .eq('id', workspaceId);

    try {
      await expect(
        uploadFile({
          workspaceId,
          clientId,
          projectId: null,
          name: 'za-duzy-na-limit.bin',
          mime: 'application/octet-stream',
          bytes: bytes(5000),
        }),
      ).rejects.toBeInstanceOf(QuotaExceededError);

      // Sedno reguły 2: nieudany insert nie zostawia bajtów bez wiersza.
      const { data } = await supabase.storage
        .from(FILES_BUCKET)
        .list(`${workspaceId}/${clientId}/_`);
      const osierocone = (data ?? []).filter((obiekt) => obiekt.name.endsWith('.bin'));
      // Wszystkie `.bin` w tym katalogu mają swój wiersz w tabeli.
      const wiersze = await listFiles({ workspaceId, clientId });
      for (const obiekt of osierocone) {
        const sciezka = `${workspaceId}/${clientId}/_/${obiekt.name}`;
        expect(wiersze.some((row) => row.storagePath === sciezka)).toBe(true);
      }

      // Limit nie został naruszony.
      const po = await getStorageUsage(workspaceId);
      expect(po.usedBytes).toBe(przed.usedBytes);
    } finally {
      await supabase
        .from('workspaces')
        .update({ storage_quota_bytes: 2147483648 })
        .eq('id', workspaceId);
    }
  });

  it('RLS odmawia wgladu w pliki cudzego workspace', async () => {
    const supabase = getSupabase();
    await put('moj.bin', 128);

    // Wylogowanie zabiera rolę `authenticated` — polityka `is_member` odcina.
    await supabase.auth.signOut();
    const { data } = await supabase.from('files').select('id');
    expect(data ?? []).toEqual([]);

    await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  });
});
