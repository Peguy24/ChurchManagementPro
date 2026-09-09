import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function escapeHtml(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

/**
 * Verifies the request comes from a trusted internal caller
 * (platform CRON secret or the service role key).
 */
export function isInternalCaller(req: Request): boolean {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return false;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(
    (cronSecret && token === cronSecret) ||
    (serviceRoleKey && token === serviceRoleKey),
  );
}

export type TenantStaffResult =
  | { ok: true; userId: string; supabase: ReturnType<typeof serviceClient>; tenantName: string; tenantSlug: string | null }
  | { ok: false; status: number; error: string };

/**
 * Validates the caller's JWT and confirms they are an approved
 * admin / pastor / secretary of the given tenant (or a platform super admin).
 */
export async function requireTenantStaff(req: Request, tenantId: string): Promise<TenantStaffResult> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { ok: false, status: 401, error: "Unauthorized" };

  if (!tenantId) return { ok: false, status: 400, error: "Missing tenantId" };

  const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: user.id });

  let allowed = Boolean(isSuper);
  if (!allowed) {
    const { data: roles } = await supabase
      .from("tenant_user_roles")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("is_approved", true);
    allowed = (roles || []).some((r: { role: string }) =>
      ["admin", "pastor", "secretary"].includes(r.role)
    );
  }

  if (!allowed) return { ok: false, status: 403, error: "Forbidden" };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, slug")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return { ok: false, status: 404, error: "Tenant not found" };

  return {
    ok: true,
    userId: user.id,
    supabase,
    tenantName: tenant.name as string,
    tenantSlug: (tenant.slug as string) ?? null,
  };
}
