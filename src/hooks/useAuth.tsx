import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const initializedRef = useRef(false);
  const lastKnownUserRef = useRef<User | null>(null);

  useEffect(() => {
    const SESSION_MARKER = 'app_session_active';

    // Public church site routes (custom domain, subdomain, or /site/<slug>) and
    // other unauthenticated public pages must NOT trigger a sign-out on load.
    // Doing so would broadcast SIGNED_OUT to the user's other tabs (e.g. the
    // tenant admin session) via shared localStorage.
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    let isPublicPage = false;
    try {
      // Lazy import to avoid pulling tenant host logic into unrelated bundles.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isTenantHost } = require('@/lib/tenantHost');
      isPublicPage =
        isTenantHost(host) ||
        path.startsWith('/site/') ||
        path.startsWith('/give') ||
        path.startsWith('/event/') ||
        path.startsWith('/legal/') ||
        path === '/commercial' ||
        path.startsWith('/status') ||
        path.startsWith('/changelog');
    } catch { /* noop */ }

    // Force sign-out if browser was closed and reopened (sessionStorage is empty)
    const isNewBrowserSession = !sessionStorage.getItem(SESSION_MARKER);
    if (isNewBrowserSession && !isPublicPage) {
      // Clear any cached data
      sessionStorage.removeItem('user_role_cache');
      sessionStorage.removeItem('tenant_cache');
      // Sign out stale session from localStorage
      supabase.auth.getSession().then(({ data: { session: staleSession } }) => {
        if (staleSession) {
          supabase.auth.signOut().then(() => {
            setSession(null);
            setUser(null);
            setLoading(false);
          });
        }
      });
    }

    // Mark this browser session as active
    sessionStorage.setItem(SESSION_MARKER, 'true');


    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          lastKnownUserRef.current = null;
          setSession(null);
          setUser(null);
          setLoading(false);
        } else if (newSession) {
          lastKnownUserRef.current = newSession.user;
          setSession(newSession);
          setUser(newSession.user);
          setLoading(false);
          initializedRef.current = true;
        } else if (event === 'TOKEN_REFRESHED' && !newSession) {
          // Token refresh returned null session — likely transient, keep current user
          // Do NOT clear user state here; wait for a definitive SIGNED_OUT event
          console.warn('TOKEN_REFRESHED with null session — keeping current user state');
        } else if (!initializedRef.current) {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession) {
        lastKnownUserRef.current = existingSession.user;
        setSession(existingSession);
        setUser(existingSession.user);
        initializedRef.current = true;
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, extraMetadata?: Record<string, unknown>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          ...extraMetadata,
        }
      }
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/auth');
    }
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
