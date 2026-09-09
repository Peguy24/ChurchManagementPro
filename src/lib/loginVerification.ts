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

/**
 * The edge function identifies the caller from the JWT. Right after
 * signInWithPassword the session can still be settling in storage, so we wait
 * for a real access token before invoking — otherwise the request goes out with
 * the anonymous key and is rejected, and no email is ever sent.
 */
async function waitForAccessToken(timeoutMs = 5000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

export async function sendLoginVerificationCode(): Promise<void> {
  const token = await waitForAccessToken();
  if (!token) {
    throw new Error('no_session');
  }

  const { data, error } = await supabase.functions.invoke('send-login-verification', {
    body: { action: 'send' },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    console.error('Failed to send login verification code:', error);
    throw error;
  }
  if (data && (data as { error?: string }).error) {
    throw new Error((data as { error?: string }).error);
  }
}

export async function verifyLoginCode(code: string): Promise<boolean> {
  try {
    const token = await waitForAccessToken();
    const { data, error } = await supabase.functions.invoke('send-login-verification', {
      body: { action: 'verify', code },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (error) return false;
    return Boolean((data as { valid?: boolean } | null)?.valid);
  } catch (err) {
    console.error('Failed to verify login code:', err);
    return false;
  }
}
