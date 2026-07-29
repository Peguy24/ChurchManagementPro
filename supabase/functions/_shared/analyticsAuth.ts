import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AnalyticsAuthResult =
  | { ok: true; tenantId: string | null; isCron: boolean }
  | { ok: false; status: number; error: string };

/**
 * Authorizes analytics/background jobs.
 * - CRON_SECRET bearer => full platform run allowed.
 * - Authenticated user => must be super admin (platform-wide run) OR
 *   admin/pastor of the requested tenant_id.
 */
export async function authorizeAnalyticsRequest(
  req: Request,
  requestedTenantId: string | null,
): Promise<AnalyticsAuthResult> {
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");

  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) {
    return { ok: true, tenantId: requestedTenantId, isCron: true };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader) return { ok: false, status: 401, error: "Unauthorized" };

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
  if (isSuperAdmin) {
    return { ok: true, tenantId: requestedTenantId, isCron: false };
  }

  // Non super admins may only run the job for their own tenant.
  const { data: ownTenantId } = await admin.rpc("get_user_tenant_id", { _user_id: user.id });
  if (!ownTenantId) return { ok: false, status: 403, error: "Forbidden" };

  const targetTenantId = requestedTenantId ?? ownTenantId;
  if (targetTenantId !== ownTenantId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const [{ data: isAdmin }, { data: isPastor }] = await Promise.all([
    admin.rpc("has_tenant_role", { _user_id: user.id, _tenant_id: targetTenantId, _role: "admin" }),
    admin.rpc("has_tenant_role", { _user_id: user.id, _tenant_id: targetTenantId, _role: "pastor" }),
  ]);

  if (!isAdmin && !isPastor) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, tenantId: targetTenantId, isCron: false };
}
