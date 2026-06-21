import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { hasSupabaseAuthConfig, supabase } from '../supabase';
import { fetchCurrentUserProfile } from '../api';
import type { UserRole, UserProfile } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthContextValue {
  /** Supabase session (null when unauthenticated). */
  session: Session | null;
  /** Convenience shortcut for session.user. */
  user: User | null;
  /** Resolved role — 'admin' | 'cashier'. */
  role: UserRole;
  /** Extended profile from the user_profiles table. */
  userProfile: UserProfile | null;
  /** True while the initial auth check is still in progress. */
  isAuthLoading: boolean;
  /** True while user profile / role is being resolved after session is known. */
  isProfileLoading: boolean;
  /** 'default' | 'recovery' — mirrors PASSWORD_RECOVERY event. */
  authView: 'default' | 'recovery';
  /** Whether Supabase is configured at all. */
  hasSupabaseConfig: boolean;
  /** Sign the user out and reset state. */
  signOut: () => Promise<void>;
}

const DEFAULT_ROLE: UserRole = 'cashier';

const AuthContext = createContext<AuthContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>.');
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authView, setAuthView] = useState<'default' | 'recovery'>('default');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Resolved role with priority chain:
  //   1. user_metadata.role  →  2. user_profiles table  →  3. DEFAULT_ROLE
  const resolveRole = (s: Session | null, profile: UserProfile | null): UserRole => {
    const metaRole = s?.user?.user_metadata?.role as string | undefined;
    if (metaRole === 'admin' || metaRole === 'cashier') return metaRole;
    if (profile?.role) return profile.role;
    return DEFAULT_ROLE;
  };

  const role = resolveRole(session, userProfile);

  /* ---------- 1. Bootstrap Supabase auth ---------- */
  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;
    const isRecoveryUrl = window.location.href.includes('type=recovery');

    // Safety timeout: if Supabase is unreachable (e.g. paused project),
    // don't let the app hang on a white/loading screen forever.
    const authTimeout = setTimeout(() => {
      if (isMounted && isAuthLoading) {
        console.warn('Auth session check timed out – proceeding without session.');
        setSession(null);
        setIsAuthLoading(false);
      }
    }, 5000);

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      clearTimeout(authTimeout);

      if (error) {
        console.error('Failed to restore auth session:', error);
      }

      setSession(data.session ?? null);
      setAuthView(isRecoveryUrl && data.session ? 'recovery' : 'default');
      setIsAuthLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      clearTimeout(authTimeout);
      console.error('Auth getSession() failed:', err);
      setSession(null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('recovery');
      } else if (event === 'SIGNED_OUT') {
        setAuthView('default');
      }

      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 2. Fetch user profile once session is known ---------- */
  useEffect(() => {
    if (isAuthLoading || !session || authView === 'recovery') {
      setUserProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;
    setIsProfileLoading(true);

    void (async () => {
      try {
        const profile = await fetchCurrentUserProfile();
        if (!isMounted) return;
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        if (!isMounted) return;
        // Fallback profile using session data
        setUserProfile({
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || DEFAULT_ROLE,
        });
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, session?.user.id, authView]);

  /* ---------- 3. Sign out ---------- */
  const signOut = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out:', error);
      return;
    }

    setAuthView('default');
    setUserProfile(null);
    setSession(null);
  };

  /* ---------- Render ---------- */
  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    role,
    userProfile,
    isAuthLoading,
    isProfileLoading,
    authView,
    hasSupabaseConfig: hasSupabaseAuthConfig,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
