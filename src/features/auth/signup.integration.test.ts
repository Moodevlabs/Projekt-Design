/**
 * Test integracyjny rejestracji na zywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Sprawdza kryterium akceptacji T-05 „po rejestracji trigger tworzy workspace":
 * jedno wywolanie `signUp` musi wyprodukowac komplet — workspace, czlonkostwo,
 * profil, brand kit i subskrypcje na 14-dniowym trialu.
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';

const LOCAL_URL = 'http://127.0.0.1:54321';

/**
 * Standardowy, publiczny klucz service_role lokalnego stacku Supabase —
 * identyczny na kazdej maszynie, nie jest sekretem. Uzywamy go WYLACZNIE
 * do posprzatania konta testowego (kasowanie uzytkownikow wymaga admina).
 */
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUserIds: string[] = [];

afterAll(async () => {
  await getSupabase().auth.signOut();
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
});

function uniqueEmail() {
  return 'test-' + Math.random().toString(36).slice(2, 10) + '@anzorge.local';
}

describe('rejestracja', () => {
  it('zaklada komplet: workspace, czlonkostwo, profil, brand kit i trial', async () => {
    const supabase = getSupabase();
    const email = uniqueEmail();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'haslo-testowe-123',
      options: { data: { company: 'Studio Testowe', full_name: 'Jan Testowy' } },
    });

    expect(error).toBeNull();
    const userId = data.user?.id;
    expect(userId).toBeTruthy();
    if (!userId) throw new Error('brak usera');
    createdUserIds.push(userId);

    // Lokalna konfiguracja nie wymaga potwierdzania maila, wiec sesja jest od razu.
    expect(data.session).not.toBeNull();

    // --- workspace utworzony przez trigger handle_new_user() ---
    const { data: workspaces } = await admin
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('owner_id', userId);

    expect(workspaces).toHaveLength(1);
    const workspace = workspaces?.[0];
    // Nazwa firmy z metadanych rejestracji trafia do nazwy workspace.
    expect(workspace?.name).toBe('Studio Testowe');
    const workspaceId = workspace?.id as string;

    // --- czlonkostwo owner ---
    const { data: members } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    expect(members?.[0]?.role).toBe('owner');

    // --- profil z full_name i domyslnym workspace ---
    const { data: profiles } = await admin
      .from('profiles')
      .select('full_name, default_workspace_id')
      .eq('id', userId);
    expect(profiles?.[0]?.full_name).toBe('Jan Testowy');
    expect(profiles?.[0]?.default_workspace_id).toBe(workspaceId);

    // --- brand kit ---
    const { data: brand } = await admin
      .from('brand_kits')
      .select('workspace_id, company_name')
      .eq('workspace_id', workspaceId);
    expect(brand).toHaveLength(1);

    // --- subskrypcja: trial 14 dni, bez karty ---
    const { data: subs } = await admin
      .from('subscriptions')
      .select('status, trial_ends_at, stripe_customer_id')
      .eq('workspace_id', workspaceId);

    const sub = subs?.[0];
    expect(sub?.status).toBe('trialing');
    expect(sub?.stripe_customer_id).toBeNull();

    const daysLeft = (new Date(sub?.trial_ends_at as string).getTime() - Date.now()) / 86_400_000;
    expect(daysLeft).toBeGreaterThan(13);
    expect(daysLeft).toBeLessThanOrEqual(14);

    // --- slownik typow pomieszczen: 14 startowych (kryterium T-33) ---
    const { data: roomTypes } = await admin
      .from('room_types')
      .select('name, slug, sort_order')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true });

    const slugi = (roomTypes ?? []).map((typ) => String(typ.slug));
    expect(slugi).toHaveLength(14);
    expect(slugi[0]).toBe('sien-hol');
    expect(slugi).toContain('kuchnia');
    // Slug jest kluczem technicznym cennika — bez polskich znakow.
    expect(slugi.every((slug) => /^[a-z0-9-]+$/.test(slug))).toBe(true);
  });

  it('nowy uzytkownik widzi swoj workspace przez RLS i zaden inny', async () => {
    const supabase = getSupabase();
    const email = uniqueEmail();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'haslo-testowe-123',
      options: { data: { company: 'Druga Firma', full_name: 'Anna Testowa' } },
    });
    expect(error).toBeNull();
    if (data.user) createdUserIds.push(data.user.id);

    // Klient jest teraz zalogowany jako nowy uzytkownik — RLS przepusci jeden wiersz.
    const { data: visible } = await supabase.from('workspaces').select('id, name');
    expect(visible).toHaveLength(1);
    expect(visible?.[0]?.name).toBe('Druga Firma');
  });
});
