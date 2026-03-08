import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const { data: progress, isLoading } = useQuery({
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

  // Auto-create progress record if it doesn't exist
  const { data: autoCreated } = useQuery({
    queryKey: ["onboarding-progress-init", tenantId, progress],
    queryFn: async () => {
      if (!tenantId || progress !== null) return null;
      // Check actual data to set initial state
      const [members, events, donations, branches] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      const record = {
        tenant_id: tenantId,
        step_first_member_added: (members.count || 0) > 0,
        step_first_event_created: (events.count || 0) > 0,
        step_first_donation_recorded: (donations.count || 0) > 0,
        step_first_branch_created: (branches.count || 0) > 0,
      };

      const { data, error } = await (supabase as any)
        .from("tenant_onboarding_progress")
        .insert(record)
        .select()
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!tenantId && progress === null && !isLoading,
  });

  const currentProgress = progress || autoCreated;
  if (!currentProgress) return null;

  const steps: OnboardingStep[] = [
    { key: "step_profile_completed", label: t("onboarding.stepProfile"), completed: currentProgress.step_profile_completed, link: "/settings" },
    { key: "step_logo_uploaded", label: t("onboarding.stepLogo"), completed: currentProgress.step_logo_uploaded, link: "/settings" },
    { key: "step_first_member_added", label: t("onboarding.stepMember"), completed: currentProgress.step_first_member_added, link: "/members" },
    { key: "step_first_event_created", label: t("onboarding.stepEvent"), completed: currentProgress.step_first_event_created, link: "/events" },
    { key: "step_first_donation_recorded", label: t("onboarding.stepDonation"), completed: currentProgress.step_first_donation_recorded, link: "/donations" },
    { key: "step_first_branch_created", label: t("onboarding.stepBranch"), completed: currentProgress.step_first_branch_created, link: "/branches" },
    { key: "step_admin_invited", label: t("onboarding.stepInvite"), completed: currentProgress.step_admin_invited, link: "/admin-invitations" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  // Don't show if fully completed
  if (percentage === 100 && currentProgress.completed_at) return null;

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
