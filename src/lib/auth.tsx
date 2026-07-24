import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, businessName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const globalKey = '__lovable_auth_context__';
const g = globalThis as unknown as Record<string, unknown>;
const AuthContext =
  (g[globalKey] as React.Context<AuthContextType | undefined>) ??
  (g[globalKey] = createContext<AuthContextType | undefined>(undefined));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data?.session ?? null);
      })
      .catch((err) => {
        console.warn('[auth getSession] Failed to fetch session:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, businessName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: businessName?.trim() ? { business_name: businessName.trim() } : undefined,
        },
      });

      if (error) {
        console.error('[auth signUp] Supabase Auth signUp returned error:', error);
        const msg = error.message;
        if (
          msg === '{}' || 
          error.status === 500 || 
          error.name === 'AuthRetryableFetchError'
        ) {
          return {
            error: 'A server-side error occurred (HTTP 500) during sign up. This typically happens when there is an issue with a database trigger (such as trg_accept_invites_on_signup failing) or SMTP confirmation settings on your Supabase project. If you are the administrator, please check the Supabase Auth/Database logs or disable "Confirm email" under Authentication -> Providers -> Email in your Supabase dashboard.'
          };
        }
        const displayMsg = msg || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Failed to sign up';
        return { error: displayMsg === '{}' ? 'Failed to sign up. Please check email/password requirements.' : displayMsg };
      }

      if (data?.session) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const { data: refreshed } = await supabase.auth.refreshSession(sessionData.session);
          setSession(refreshed?.session ?? sessionData.session);
        }
      }
      return { error: null };
    } catch (err: unknown) {
      console.error('[auth signUp] Caught exception during signUp:', err);
      const isErrorObj = err instanceof Error;
      const msg = isErrorObj ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err)) || 'An unexpected error occurred';
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('load')) {
        return {
          error: 'Network connection error. Please check your internet connection or backend setup.'
        };
      }
      if (msg === '{}' || msg.includes('AuthRetryableFetchError')) {
        return {
          error: 'A server-side error occurred during signup. This is typically caused by a database trigger failure or SMTP issues on your Supabase project. Please check the Supabase logs or disable "Confirm email" under Authentication -> Providers -> Email in your Supabase dashboard.'
        };
      }
      return { 
        error: msg === '{}' ? 'An unexpected error occurred during signup.' : msg
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[auth signIn] Supabase Auth signIn returned error:', error);
        const msg = error.message;
        if (
          msg === '{}' || 
          error.status === 500 || 
          error.name === 'AuthRetryableFetchError'
        ) {
          return {
            error: 'A server-side error occurred (HTTP 500) during sign in. This typically happens when there is an issue with database triggers or RLS policies on the Supabase project. Please check the Supabase logs.'
          };
        }
        const displayMsg = msg || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Failed to sign in';
        return { error: displayMsg === '{}' ? 'Failed to sign in. Please check your credentials.' : displayMsg };
      }
      return { error: null };
    } catch (err: unknown) {
      console.error('[auth signIn] Caught exception during signIn:', err);
      const isErrorObj = err instanceof Error;
      const msg = isErrorObj ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err)) || 'An unexpected error occurred';
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('load')) {
        return {
          error: 'Network connection error. Please check your internet connection or backend setup.'
        };
      }
      if (msg === '{}' || msg.includes('AuthRetryableFetchError')) {
        return {
          error: 'A server-side error occurred during sign in. Please check your Supabase logs.'
        };
      }
      return { 
        error: msg === '{}' ? 'An unexpected error occurred during sign in.' : msg
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
