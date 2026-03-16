import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PlanKey } from "./useSubscription";
import { useCurrentTenant } from "./useCurrentTenant";

// All feature keys used across the platform
export const ALL_FEATURE_KEYS = [
  "attendance", "donations", "advancedReports", "emailNotifications",
  "inventory", "prioritySupport", "whiteLabel", "advancedFinance",
  "smartInsights", "bulkCommunication", "automations", "volunteerScheduling",
  "memberCards", "attendanceAlerts", "churchHealth", "customFields",
  "dataBackup", "churnPrevention", "branding", "bankReconciliation", "cashRegister",
] as const;

export type FeatureKey = typeof ALL_FEATURE_KEYS[number];

// Fallback defaults (used if DB fetch fails)
const FALLBACK_PLAN_LIMITS: Record<string, { maxMembers: number; maxBranches: number; maxUsers: number; features: Record<FeatureKey, boolean> }> = {
  free: { maxMembers: 100, maxBranches: 1, maxUsers: 3, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, ["attendance","donations","bankReconciliation","cashRegister"].includes(k)])) as Record<FeatureKey, boolean> },
  essentiel: { maxMembers: 200, maxBranches: 1, maxUsers: 5, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, ["attendance","donations","bankReconciliation","cashRegister"].includes(k)])) as Record<FeatureKey, boolean> },
  trial: { maxMembers: 50, maxBranches: 1, maxUsers: 3, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, ["attendance","donations","bankReconciliation","cashRegister"].includes(k)])) as Record<FeatureKey, boolean> },
  none: { maxMembers: 0, maxBranches: 0, maxUsers: 0, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, false])) as Record<FeatureKey, boolean> },
  professionnel: { maxMembers: 1000, maxBranches: 3, maxUsers: 15, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, !["prioritySupport","whiteLabel","churnPrevention","branding"].includes(k)])) as Record<FeatureKey, boolean> },
  entreprise: { maxMembers: Infinity, maxBranches: Infinity, maxUsers: Infinity, features: Object.fromEntries(ALL_FEATURE_KEYS.map(k => [k, true])) as Record<FeatureKey, boolean> },
};

export interface UsageStats {
  membersCount: number;
  branchesCount: number;
  usersCount: number;
}

export interface PlanLimits {
  maxMembers: number;
  maxBranches: number;
  maxUsers: number;
  features: Record<FeatureKey, boolean>;
}

// Map DB setting keys to frontend plan names
const SETTING_KEY_TO_PLAN: Record<string, string> = {
  plan_gratuit_limits: "free",
  plan_essentiel_limits: "essentiel",
  plan_professionnel_limits: "professionnel",
  plan_entreprise_limits: "entreprise",
  trial_plan_limits: "trial",
};

function parsePlanFromSetting(settingValue: any): PlanLimits | null {
  if (!settingValue || typeof settingValue !== "object") return null;
  const maxMembers = settingValue.max_members === -1 ? Infinity : (settingValue.max_members ?? 0);
  const maxBranches = settingValue.max_branches === -1 ? Infinity : (settingValue.max_branches ?? 0);
  const maxUsers = settingValue.max_users === -1 ? Infinity : (settingValue.max_users ?? 0);
  
  // Build features from DB, defaulting to false for missing keys
  const dbFeatures = typeof settingValue.features === "object" ? settingValue.features : {};
  const features = Object.fromEntries(
    ALL_FEATURE_KEYS.map(k => [k, dbFeatures[k] === true])
  ) as Record<FeatureKey, boolean>;

  return { maxMembers, maxBranches, maxUsers, features };
}

export function usePlanLimits() {
  const { plan, subscribed, loading: subscriptionLoading } = useSubscription();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();

  // Fetch dynamic plan limits from platform_settings
  const { data: dynamicLimits } = useQuery({
    queryKey: ["platform-plan-limits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "plan_gratuit_limits", "plan_essentiel_limits",
          "plan_professionnel_limits", "plan_entreprise_limits",
          "trial_plan_limits",
        ]);
      if (error) throw error;
      
      const limitsMap: Record<string, PlanLimits> = {};
      for (const row of (data || [])) {
        const planName = SETTING_KEY_TO_PLAN[row.setting_key];
        if (planName) {
          const parsed = parsePlanFromSetting(row.setting_value);
          if (parsed) limitsMap[planName] = parsed;
        }
      }
      return limitsMap;
    },
    staleTime: 1000 * 60 * 5, // Cache 5 min
  });

  // Check DB subscription for plans not managed by Stripe (e.g., "free")
  const { data: dbSubscription } = useQuery({
    queryKey: ["db-subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("tenant_subscriptions")
        .select("plan, status, trial_ends_at")
        .eq("tenant_id", tenantId)
        .single();
      return data;
    },
    enabled: !!tenantId && !tenantLoading,
  });

  // Get current usage stats
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage-stats", tenantId],
    queryFn: async (): Promise<UsageStats> => {
      if (!tenantId) {
        return { membersCount: 0, branchesCount: 0, usersCount: 0 };
      }

      const { count: membersCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      const { count: branchesCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      const { count: usersCount } = await supabase
        .from("tenant_user_roles")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_approved", true);

      return {
        membersCount: membersCount || 0,
        branchesCount: branchesCount || 0,
        usersCount: usersCount || 0,
      };
    },
    enabled: !!tenantId && !tenantLoading,
  });

  // Check if trial has expired
  const isTrialExpired = dbSubscription?.status === "trial" && dbSubscription?.trial_ends_at
    ? new Date(dbSubscription.trial_ends_at) < new Date()
    : false;

  const isActiveTrial = dbSubscription?.status === "trial" && !isTrialExpired;

  // Determine effective plan
  const isDbActivePlan = !subscribed && dbSubscription?.plan && 
    (dbSubscription?.status === "active" || isActiveTrial);
  const effectiveSubscribed = subscribed || !!isDbActivePlan;
  
  const DB_TO_FRONTEND_PLAN: Record<string, PlanKey> = {
    basic: "essentiel", standard: "professionnel", premium: "entreprise",
    free: "free", essentiel: "essentiel", professionnel: "professionnel", entreprise: "entreprise",
  };
  
  const resolvedDbPlan = isDbActivePlan && dbSubscription?.plan 
    ? (DB_TO_FRONTEND_PLAN[dbSubscription.plan] || dbSubscription.plan as PlanKey) 
    : null;
  const effectivePlan = subscribed ? (plan as PlanKey | null) : resolvedDbPlan;

  // Resolve limits: prefer dynamic DB values, fall back to hardcoded
  const resolveLimits = (planKey: string): PlanLimits => {
    return dynamicLimits?.[planKey] || FALLBACK_PLAN_LIMITS[planKey] || FALLBACK_PLAN_LIMITS.none;
  };

  const getLimits = (): PlanLimits => {
    if (!effectiveSubscribed || !effectivePlan) return resolveLimits("none");
    if (isActiveTrial) return resolveLimits("trial");
    return resolveLimits(effectivePlan);
  };

  const limits: PlanLimits = getLimits();
  const loading = subscriptionLoading || tenantLoading || usageLoading;

  const canAddMember = () => {
    if (!usage) return true;
    return usage.membersCount < limits.maxMembers;
  };

  const canAddBranch = () => {
    if (!usage) return true;
    return usage.branchesCount < limits.maxBranches;
  };

  const canAddUser = () => {
    if (!usage) return true;
    return usage.usersCount < limits.maxUsers;
  };

  const hasFeature = (feature: FeatureKey) => {
    return limits.features[feature];
  };

  const getRemainingMembers = () => {
    if (!usage || limits.maxMembers === Infinity) return Infinity;
    return Math.max(0, limits.maxMembers - usage.membersCount);
  };

  const getRemainingBranches = () => {
    if (!usage || limits.maxBranches === Infinity) return Infinity;
    return Math.max(0, limits.maxBranches - usage.branchesCount);
  };

  const getRemainingUsers = () => {
    if (!usage || limits.maxUsers === Infinity) return Infinity;
    return Math.max(0, limits.maxUsers - usage.usersCount);
  };

  const getMemberUsagePercent = () => {
    if (!usage || limits.maxMembers === Infinity) return 0;
    return Math.round((usage.membersCount / limits.maxMembers) * 100);
  };

  const getBranchUsagePercent = () => {
    if (!usage || limits.maxBranches === Infinity) return 0;
    return Math.round((usage.branchesCount / limits.maxBranches) * 100);
  };

  return {
    loading,
    subscribed,
    plan: effectivePlan,
    subscriptionStatus: dbSubscription?.status || null,
    limits,
    usage: usage || { membersCount: 0, branchesCount: 0, usersCount: 0 },
    canAddMember, canAddBranch, canAddUser,
    hasFeature,
    getRemainingMembers, getRemainingBranches, getRemainingUsers,
    getMemberUsagePercent, getBranchUsagePercent,
  };
}

// Re-export for backward compat
export const PLAN_LIMITS = FALLBACK_PLAN_LIMITS;
