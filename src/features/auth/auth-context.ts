import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'unconfigured';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>');
  return value;
}
