import { supabase } from "@/integrations/supabase/client";

export type ActivityEventType =
  | "signup"
  | "subscription_change"
  | "admin_action"
  | "tenant_created"
  | "tenant_deleted"
  | "user_approved"
  | "trial_extended"
  | "plan_changed"
  | "support_ticket"
  | "role_changed"
  | "plan_activated"
  | "plan_deactivated";

export type ActivityCategory = "auth" | "subscription" | "tenant" | "user" | "support" | "general";

interface LogActivityParams {
  eventType: ActivityEventType;
  eventCategory: ActivityCategory;
  description: string;
  tenantId?: string | null;
  metadata?: Record<string, any>;
}

export async function logPlatformActivity({
  eventType,
  eventCategory,
  description,
  tenantId,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from("platform_activity_logs" as any).insert({
      event_type: eventType,
      event_category: eventCategory,
      description,
      tenant_id: tenantId || null,
      user_id: user?.id || null,
      user_email: user?.email || null,
      metadata,
    });
  } catch (err) {
    console.error("Failed to log platform activity:", err);
  }
}
