import { supabase } from '@/integrations/supabase/client';

/**
 * Second-factor helpers for privileged logins.
 *
 * The emailed code is enforced server-side: until the code is verified, the
 * database does not grant admin / church-admin / platform-staff privileges to
 * the session (see public.session_mfa_verified).
 */

export async function requiresLoginVerification(userId: string): Promise<boolean> {
  try {
    const [{ data: tenantRoles }, { data: platformRoles }, { data: userRoles }] = await Promise.all([
      supabase.from('tenant_user_roles').select('role').eq('user_id', userId).eq('is_approved', true),
      supabase.from('platform_user_roles').select('role').eq('user_id', userId),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const isTenantAdmin = tenantRoles?.some((r) => r.role === 'admin') ?? false;
    const isPlatformRole = (platformRoles?.length ?? 0) > 0;
    const isSuperAdmin = userRoles?.some((r) => r.role === 'admin') ?? false;

    return isTenantAdmin || isPlatformRole || isSuperAdmin;
  } catch (err) {
    console.error('Failed to determine login verification requirement:', err);
    return false;
  }
}

export async function sendLoginVerificationCode(): Promise<void> {
  await supabase.functions.invoke('send-login-verification', {
    body: { action: 'send' },
  });
}

export async function verifyLoginCode(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-login-verification', {
      body: { action: 'verify', code },
    });
    if (error) return false;
    return Boolean((data as { valid?: boolean } | null)?.valid);
  } catch (err) {
    console.error('Failed to verify login code:', err);
    return false;
  }
}
