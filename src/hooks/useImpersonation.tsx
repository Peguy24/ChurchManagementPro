import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'impersonation_session';

export interface ImpersonationState {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  superAdminId: string;
  startedAt: string;
}

export function readImpersonation(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeImpersonation(state: ImpersonationState) {
  sessionStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('impersonation-changed'));
}

export function clearImpersonation() {
  sessionStorage.removeItem(KEY);
  // Clear cached tenant so useCurrentTenant re-reads
  sessionStorage.removeItem('tenant_cache');
  window.dispatchEvent(new CustomEvent('impersonation-changed'));
}

export function useImpersonation() {
  const [state, setState] = useState<ImpersonationState | null>(readImpersonation());

  useEffect(() => {
    const handler = () => setState(readImpersonation());
    window.addEventListener('impersonation-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('impersonation-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const exit = useCallback(async () => {
    const current = readImpersonation();
    if (current?.sessionId) {
      try {
        await supabase
          .from('impersonation_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', current.sessionId);
      } catch (err) {
        console.error('Failed to end impersonation session:', err);
      }
    }
    clearImpersonation();
    // Reload to reset all tenant-scoped state
    window.location.href = '/super-admin/impersonation';
  }, []);

  return {
    isImpersonating: !!state,
    impersonation: state,
    exit,
  };
}
