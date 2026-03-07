import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PlanKey } from "./useSubscription";
import { useCurrentTenant } from "./useCurrentTenant";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxMembers: 100,
    maxBranches: 1,
    maxUsers: 3,
    features: {
      attendance: true,
      donations: true,
      advancedReports: false,
      emailNotifications: false,
      inventory: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  essentiel: {
    maxMembers: 200,
    maxBranches: 1,
    maxUsers: 5,
    features: {
      attendance: true,
      donations: true,
      advancedReports: false,
      emailNotifications: false,
      inventory: false,
      api: false,
      whiteLabel: false,
    },
  },
  // "none" plan for users without active subscription (after trial)
  none: {
    maxMembers: 50,
    maxBranches: 1,
    maxUsers: 2,
    features: {
      attendance: false,
      donations: false,
      advancedReports: false,
      emailNotifications: false,
      inventory: false,
      api: false,
      whiteLabel: false,
    },
  },
  professionnel: {
    maxMembers: 1000,
    maxBranches: 3,
    maxUsers: 15,
    features: {
      attendance: true,
      donations: true,
      advancedReports: true,
      emailNotifications: true,
      inventory: true,
      api: false,
      whiteLabel: false,
    },
  },
  entreprise: {
    maxMembers: Infinity,
    maxBranches: Infinity,
    maxUsers: Infinity,
    features: {
      attendance: true,
      donations: true,
      advancedReports: true,
      emailNotifications: true,
      inventory: true,
      api: true,
      whiteLabel: true,
    },
  },
} as const;

export interface UsageStats {
  membersCount: number;
  branchesCount: number;
  usersCount: number;
}

export interface PlanLimits {
  maxMembers: number;
  maxBranches: number;
  maxUsers: number;
  features: {
    attendance: boolean;
    donations: boolean;
    advancedReports: boolean;
    emailNotifications: boolean;
    inventory: boolean;
    api: boolean;
    whiteLabel: boolean;
  };
}

export function usePlanLimits() {
  const { plan, subscribed, loading: subscriptionLoading } = useSubscription();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();

  // Check DB subscription for plans not managed by Stripe (e.g., "free")
  const { data: dbSubscription } = useQuery({
    queryKey: ["db-subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("tenant_subscriptions")
        .select("plan, status")
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

      // Count members
      const { count: membersCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      // Count branches
      const { count: branchesCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      // Count users
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

  // Determine effective plan: Stripe subscription takes priority, then DB-only plans (free)
  const isDbFreePlan = !subscribed && dbSubscription?.plan === "free" && dbSubscription?.status === "active";
  const effectiveSubscribed = subscribed || isDbFreePlan;
  const effectivePlan = subscribed ? (plan as PlanKey | null) : (isDbFreePlan ? "free" : null);

  // Get current plan limits - use "none" plan if not subscribed
  const limits: PlanLimits = effectiveSubscribed && effectivePlan && PLAN_LIMITS[effectivePlan] 
    ? PLAN_LIMITS[effectivePlan] 
    : PLAN_LIMITS.none; // Default to "none" (locked) if no active subscription

  const loading = subscriptionLoading || tenantLoading || usageLoading;

  // Check if user can add more of a resource
  const canAddMember = () => {
    if (!usage) return true; // Allow if we can't check yet
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

  // Check specific feature access
  const hasFeature = (feature: keyof PlanLimits["features"]) => {
    return limits.features[feature];
  };

  // Get remaining capacity
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

  // Get usage percentage
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
    limits,
    usage: usage || { membersCount: 0, branchesCount: 0, usersCount: 0 },
    
    // Capacity checks
    canAddMember,
    canAddBranch,
    canAddUser,
    
    // Feature checks
    hasFeature,
    
    // Remaining capacity
    getRemainingMembers,
    getRemainingBranches,
    getRemainingUsers,
    
    // Usage percentages
    getMemberUsagePercent,
    getBranchUsagePercent,
  };
}
