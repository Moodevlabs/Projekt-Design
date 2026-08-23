import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

/**
 * Klienci Supabase dla funkcji brzegowych.
 *
 * Rozdzielone świadomie: `userClient` działa w imieniu zalogowanego (RLS go
 * obowiązuje), a `adminClient` omija RLS i **wolno go używać wyłącznie do
 * zapisu stanu subskrypcji z webhooka**, gdzie nie ma żadnego użytkownika.
 */

export function userClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
}

export function adminClient(): SupabaseClient {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('Brak SUPABASE_SERVICE_ROLE_KEY.');

  return createClient(Deno.env.get('SUPABASE_URL') ?? '', key, {
    auth: { persistSession: false },
  });
}

/**
 * Workspace, którego użytkownik jest właścicielem.
 *
 * Płaci właściciel, nie każdy członek — dlatego checkout i portal sprawdzają
 * `owner_id`, a nie samo członkostwo.
 */
export async function ownedWorkspace(
  supabase: SupabaseClient,
): Promise<{ id: string; email: string } | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id as string, email: user.email ?? '' };
}
