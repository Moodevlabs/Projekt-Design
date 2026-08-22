import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, type AuthStatus } from './auth-context';
import { getSupabase } from '@/data/supabase';
import { isConfigured } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isConfigured ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!isConfigured) return;

    const supabase = getSupabase();
    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) log.warn('Nie udało się odczytać sesji', error);
        setSession(data.session);
        setStatus(data.session ? 'authenticated' : 'anonymous');
      })
      .catch((error: unknown) => {
        if (!active) return;
        log.error('Błąd odczytu sesji', error);
        setStatus('anonymous');
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
      // Dane są per-workspace — przy zmianie użytkownika cache musi zniknąć.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    if (!isConfigured) return;
    // `scope: 'local'` nie wystarczy — chcemy unieważnić refresh token po stronie
    // Supabase, a lokalny storage (keychain) czyści sam klient.
    const { error } = await getSupabase().auth.signOut();
    if (error) log.warn('Błąd wylogowania', error);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, session, userId: session?.user.id ?? null, signOut }),
    [status, session, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
