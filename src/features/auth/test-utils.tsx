import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

/** Sesja-atrapa: tylko pola, których dotyka UI. */
export function fakeSession(email = 'demo@toolier.local'): Session {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'user-1', email },
  } as unknown as Session;
}

export function AuthStub({
  children,
  status = 'authenticated',
  session = fakeSession(),
  signOut = () => Promise.resolve(),
}: {
  children: ReactNode;
  status?: AuthStatus;
  session?: Session | null;
  signOut?: AuthContextValue['signOut'];
}) {
  const value: AuthContextValue = {
    status,
    session,
    userId: session?.user.id ?? null,
    signOut,
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}
