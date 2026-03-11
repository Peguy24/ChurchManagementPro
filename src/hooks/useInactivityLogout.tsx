import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const THROTTLE_MS = 1000;

const translations = {
  en: {
    title: "Session Expired",
    description: "You have been logged out due to inactivity.",
  },
  fr: {
    title: "Session expirée",
    description: "Vous avez été déconnecté pour inactivité.",
  },
  ht: {
    title: "Sesyon ekspire",
    description: "Ou te dekonekte poutèt inaktivite.",
  },
};

// Routes where inactivity logout should NOT apply
const EXCLUDED_PREFIXES = ['/super-admin', '/settings/tenants', '/settings/tenant-users', '/settings/users', '/settings/invitations'];

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function getLang(): 'en' | 'fr' | 'ht' {
  try {
    const stored = localStorage.getItem('preferred-language');
    if (stored === 'fr' || stored === 'en' || stored === 'ht') return stored;
  } catch {}
  return 'en';
}

export function useInactivityLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isAuthenticatedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;
    isAuthenticatedRef.current = false;
    await supabase.auth.signOut();
    const t = translations[getLang()];
    toast({ title: t.title, description: t.description, variant: "destructive" });
    navigate('/auth');
  }, [navigate]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;
    clearTimer();
    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  }, [handleLogout, clearTimer]);

  // React to route changes — disable on excluded routes
  useEffect(() => {
    if (isExcludedRoute(location.pathname)) {
      clearTimer();
    } else if (isAuthenticatedRef.current) {
      resetTimer();
    }
  }, [location.pathname, clearTimer, resetTimer]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      isAuthenticatedRef.current = !!session;
      if (session && !isExcludedRoute(location.pathname)) {
        resetTimer();
      } else {
        clearTimer();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      isAuthenticatedRef.current = !!session;
      if (session && !isExcludedRoute(location.pathname)) resetTimer();
    });

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    const handler = () => {
      if (!isExcludedRoute(location.pathname)) resetTimer();
    };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));

    return () => {
      subscription.unsubscribe();
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimer();
    };
  }, [resetTimer, clearTimer, location.pathname]);
}
