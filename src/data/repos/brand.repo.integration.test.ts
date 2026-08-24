/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import { getBrandKit, updateBrandKit } from './brand.repo';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;

beforeAll(async () => {
  const supabase = getSupabase();
  await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  // Zostawiamy brand kit w stanie startowym, zeby kolejne uruchomienia testow
  // (i recznie klikanie po aplikacji) nie zaczynaly od cudzych danych.
  await updateBrandKit(workspaceId, { openingHours: [], signerName: null, signerTitle: null });
  await getSupabase().auth.signOut();
});

describe('brand.repo — godziny otwarcia i wystawiajacy (F7.2)', () => {
  it('konto sprzed migracji ma puste pola, a nie blad', async () => {
    const kit = await getBrandKit(workspaceId);

    // Kolumny doszly w 0008 z domyslnymi wartosciami — istniejacy wiersz
    // brand kitu musi sie sparsowac bez ostrzezenia.
    expect(Array.isArray(kit.openingHours)).toBe(true);
  });

  it('zapisuje i odczytuje wiersze godzin razem z podpisem', async () => {
    await updateBrandKit(workspaceId, {
      openingHours: [
        { label: 'poniedziałek – piątek', hours: '8.00 – 16.00' },
        { label: 'sobota (tylko spotkania)', hours: '10.00 – 13.00' },
      ],
      signerName: 'Anna Kowalska',
      signerTitle: 'projektant wnętrz',
    });

    const kit = await getBrandKit(workspaceId);
    expect(kit.openingHours).toHaveLength(2);
    expect(kit.openingHours[1]?.label).toBe('sobota (tylko spotkania)');
    expect(kit.signerName).toBe('Anna Kowalska');
    expect(kit.signerTitle).toBe('projektant wnętrz');
  });

  it('czesciowy patch nie kasuje pozostalych pol', async () => {
    await updateBrandKit(workspaceId, {
      signerName: 'Anna Kowalska',
      signerTitle: 'projektant wnętrz',
    });

    await updateBrandKit(workspaceId, { signerTitle: 'architekt wnętrz' });

    const kit = await getBrandKit(workspaceId);
    expect(kit.signerTitle).toBe('architekt wnętrz');
    // `undefined` w patchu nie moze wyzerowac kolumny, ktorej nikt nie ruszal.
    expect(kit.signerName).toBe('Anna Kowalska');
  });

  it('czysci pola przez jawny null', async () => {
    await updateBrandKit(workspaceId, { signerName: 'Do skasowania' });
    await updateBrandKit(workspaceId, { signerName: null });

    expect((await getBrandKit(workspaceId)).signerName).toBeNull();
  });
});
