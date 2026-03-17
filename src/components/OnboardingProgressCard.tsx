import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  link: string;
}

export function OnboardingProgressCard() {
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const navigate = useNavigate();

  // Fetch existing progress record
  const { data: progress, isLoading, refetch: refetchProgress } = useQuery({
    queryKey: ["onboarding-progress", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await (supabase as any)
        .from("tenant_onboarding_progress")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Check actual data state from all relevant tables
  const { data: liveState } = useQuery({
    queryKey: ["onboarding-live-check", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [members, events, donations, branches, adminInvites, settings] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        (supabase as any).from("admin_invitations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        (supabase as any).from("church_settings").select("setting_key, setting_value").eq("tenant_id", tenantId),
      ]);

      // Check profile: church_name setting exists and is non-empty
      const settingsData = settings.data || [];
      const churchName = settingsData.find((s: any) => s.setting_key === "church_name");
      const profileCompleted = !!(churchName && churchName.setting_value && churchName.setting_value.trim() !== "");

      // Check logo: church_logo_url in settings OR logo_url on tenants table
      const logoSetting = settingsData.find((s: any) => s.setting_key === "church_logo_url") 
        || settingsData.find((s: any) => s.setting_key === "church_logo");
      let logoUploaded = !!(logoSetting && logoSetting.setting_value && logoSetting.setting_value.trim() !== "");
      
      // Also check tenants.logo_url as fallback (TenantBranding saves there)
      if (!logoUploaded) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("logo_url")
          .eq("id", tenantId)
          .maybeSingle();
        logoUploaded = !!(tenantData?.logo_url && tenantData.logo_url.trim() !== "");
      }

      return {
        step_profile_completed: profileCompleted,
        step_logo_uploaded: logoUploaded,
        step_first_member_added: (members.count || 0) > 0,
        step_first_event_created: (events.count || 0) > 0,
        step_first_donation_recorded: (donations.count || 0) > 0,
        step_first_branch_created: (branches.count || 0) > 0,
        step_admin_invited: (adminInvites.count || 0) > 0,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // re-check every 30 seconds
  });

  // Sync live state to the database
  useEffect(() => {
    if (!tenantId || !liveState) return;

    const syncProgress = async () => {
      // Check if record exists
      const { data: existing } = await (supabase as any)
        .from("tenant_onboarding_progress")
        .select("id, step_profile_completed, step_logo_uploaded, step_first_member_added, step_first_event_created, step_first_donation_recorded, step_first_branch_created, step_admin_invited, completed_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const allCompleted = Object.values(liveState).every(Boolean);

      if (!existing) {
        // Create new record
        await (supabase as any)
          .from("tenant_onboarding_progress")
          .insert({
            tenant_id: tenantId,
            ...liveState,
            completed_at: allCompleted ? new Date().toISOString() : null,
          });
      } else {
        // Check if any values changed
        const needsUpdate = Object.keys(liveState).some(
          (key) => (liveState as any)[key] !== existing[key]
        ) || (allCompleted && !existing.completed_at);

        if (needsUpdate) {
          await (supabase as any)
            .from("tenant_onboarding_progress")
            .update({
              ...liveState,
              completed_at: allCompleted ? new Date().toISOString() : null,
            })
            .eq("id", existing.id);
        }
      }

      refetchProgress();
    };

    syncProgress();
  }, [tenantId, liveState, refetchProgress]);

  const currentProgress = liveState || progress;
  if (!currentProgress || isLoading) return null;

  const steps: OnboardingStep[] = [
    { key: "step_profile_completed", label: t("onboarding.stepProfile"), completed: currentProgress.step_profile_completed, link: "/settings/church" },
    { key: "step_logo_uploaded", label: t("onboarding.stepLogo"), completed: currentProgress.step_logo_uploaded, link: "/settings/church" },
    { key: "step_first_member_added", label: t("onboarding.stepMember"), completed: currentProgress.step_first_member_added, link: "/members" },
    { key: "step_first_event_created", label: t("onboarding.stepEvent"), completed: currentProgress.step_first_event_created, link: "/events" },
    { key: "step_first_donation_recorded", label: t("onboarding.stepDonation"), completed: currentProgress.step_first_donation_recorded, link: "/donations" },
    { key: "step_first_branch_created", label: t("onboarding.stepBranch"), completed: currentProgress.step_first_branch_created, link: "/branches" },
    { key: "step_admin_invited", label: t("onboarding.stepInvite"), completed: currentProgress.step_admin_invited, link: "/settings/invitations" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  // Don't show if fully completed
  if (percentage === 100) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-primary" />
          {t("onboarding.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{completedCount}/{steps.length} {t("onboarding.stepsCompleted")}</span>
            <span className="font-semibold text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid gap-2">
          {steps.map((step) => (
            <button
              key={step.key}
              onClick={() => !step.completed && navigate(step.link)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                step.completed
                  ? "text-muted-foreground"
                  : "hover:bg-primary/10 cursor-pointer"
              }`}
              disabled={step.completed}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={step.completed ? "line-through" : "font-medium"}>
                {step.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
