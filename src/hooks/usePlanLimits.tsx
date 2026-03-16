import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PlanKey } from "./useSubscription";
import { useCurrentTenant } from "./useCurrentTenant";

// Plan limits configuration
const ALL_FEATURES_FALSE = {
  attendance: false,
  donations: false,
  advancedReports: false,
  emailNotifications: false,
  inventory: false,
  prioritySupport: false,
  whiteLabel: false,
  advancedFinance: false,
  smartInsights: false,
  bulkCommunication: false,
  automations: false,
  volunteerScheduling: false,
  memberCards: false,
  attendanceAlerts: false,
  churchHealth: false,
  customFields: false,
  dataBackup: false,
  churnPrevention: false,
  branding: false,
} as const;

const BASIC_FEATURES = {
  ...ALL_FEATURES_FALSE,
  attendance: true,
  donations: true,
  bankReconciliation: true,
  cashRegister: true,
} as const;

const PRO_FEATURES = {
  ...BASIC_FEATURES,
  advancedReports: true,
  emailNotifications: true,
  inventory: true,
  advancedFinance: true,
  smartInsights: true,
  bulkCommunication: true,
  automations: true,
  volunteerScheduling: true,
  memberCards: true,
  attendanceAlerts: true,
  churchHealth: true,
  customFields: true,
  dataBackup: true,
} as const;

const ENTERPRISE_FEATURES = {
  ...PRO_FEATURES,
  prioritySupport: true,
  whiteLabel: true,
  churnPrevention: true,
  branding: true,
} as const;

export const PLAN_LIMITS = {
  free: {
    maxMembers: 100,
    maxBranches: 1,
    maxUsers: 3,
    features: BASIC_FEATURES,
  },
  essentiel: {
    maxMembers: 200,
    maxBranches: 1,
    maxUsers: 5,
    features: BASIC_FEATURES,
  },
  trial: {
    maxMembers: 50,
    maxBranches: 1,
    maxUsers: 3,
    features: BASIC_FEATURES,
  },
  none: {
    maxMembers: 0,
    maxBranches: 0,
    maxUsers: 0,
    features: ALL_FEATURES_FALSE,
  },
  professionnel: {
    maxMembers: 1000,
    maxBranches: 3,
    maxUsers: 15,
    features: PRO_FEATURES,
  },
  entreprise: {
    maxMembers: Infinity,
    maxBranches: Infinity,
    maxUsers: Infinity,
    features: ENTERPRISE_FEATURES,
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
    prioritySupport: boolean;
    whiteLabel: boolean;
    advancedFinance: boolean;
    smartInsights: boolean;
    bulkCommunication: boolean;
    automations: boolean;
    volunteerScheduling: boolean;
    memberCards: boolean;
    attendanceAlerts: boolean;
    churchHealth: boolean;
    customFields: boolean;
    dataBackup: boolean;
    churnPrevention: boolean;
    branding: boolean;
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

  // Check if trial has expired
  const isTrialExpired = dbSubscription?.status === "trial" && dbSubscription?.trial_ends_at
    ? new Date(dbSubscription.trial_ends_at) < new Date()
    : false;

  const isActiveTrial = dbSubscription?.status === "trial" && !isTrialExpired;

  // Determine effective plan: Stripe subscription takes priority, then DB-only plans
  const isDbActivePlan = !subscribed && dbSubscription?.plan && 
    (dbSubscription?.status === "active" || isActiveTrial);
  const effectiveSubscribed = subscribed || !!isDbActivePlan;
  
  // Map DB plan names to frontend plan names
  const DB_TO_FRONTEND_PLAN: Record<string, PlanKey> = {
    basic: "essentiel",
    standard: "professionnel",
    premium: "entreprise",
    free: "free",
    essentiel: "essentiel",
    professionnel: "professionnel",
    entreprise: "entreprise",
  };
  
  const resolvedDbPlan = isDbActivePlan && dbSubscription?.plan 
    ? (DB_TO_FRONTEND_PLAN[dbSubscription.plan] || dbSubscription.plan as PlanKey) 
    : null;
  const effectivePlan = subscribed ? (plan as PlanKey | null) : resolvedDbPlan;

  // During trial, use trial limits. After paying, use the actual plan limits.
  const getLimits = (): PlanLimits => {
    if (!effectiveSubscribed || !effectivePlan) return PLAN_LIMITS.none;
    if (isActiveTrial) return PLAN_LIMITS.trial;
    return PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.none;
  };

  const limits: PlanLimits = getLimits();

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
    subscriptionStatus: dbSubscription?.status || null,
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
