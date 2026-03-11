import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const THROTTLE_MS = 1000;

export function useInactivityLogout() {
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isAuthenticatedRef = useRef(false);

  const handleLogout = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;
    isAuthenticatedRef.current = false;
    await supabase.auth.signOut();
    toast({
      title: "Session expirée",
      description: "Vous avez été déconnecté pour inactivité.",
      variant: "destructive",
    });
    navigate('/auth');
  }, [navigate]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  }, [handleLogout]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      isAuthenticatedRef.current = !!session;
      if (session) {
        resetTimer();
      } else if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      isAuthenticatedRef.current = !!session;
      if (session) resetTimer();
    });

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      subscription.unsubscribe();
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);
}
