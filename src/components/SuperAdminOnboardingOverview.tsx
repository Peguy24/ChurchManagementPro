import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STEP_KEYS = [
  "step_profile_completed",
  "step_logo_uploaded",
  "step_first_member_added",
  "step_first_event_created",
  "step_first_donation_recorded",
  "step_first_branch_created",
  "step_admin_invited",
] as const;

export function SuperAdminOnboardingOverview() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-onboarding-overview"],
    queryFn: async () => {
      const { data: progress, error } = await (supabase as any)
        .from("tenant_onboarding_progress")
        .select("*, tenants(name)");
      if (error) throw error;

      const { count: totalTenants } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

      const records = progress || [];
      const fullyCompleted = records.filter((r: any) => r.completed_at).length;

      // Calculate average completion
      const avgCompletion = records.length > 0
        ? Math.round(
            records.reduce((sum: number, r: any) => {
              const done = STEP_KEYS.filter((k) => r[k]).length;
              return sum + (done / STEP_KEYS.length) * 100;
            }, 0) / records.length
          )
        : 0;

      // Recent incomplete tenants
      const incomplete = records
        .filter((r: any) => !r.completed_at)
        .map((r: any) => {
          const done = STEP_KEYS.filter((k) => r[k]).length;
          return {
            tenantName: r.tenants?.name || "—",
            progress: Math.round((done / STEP_KEYS.length) * 100),
            stepsCompleted: done,
            totalSteps: STEP_KEYS.length,
          };
        })
        .sort((a: any, b: any) => a.progress - b.progress)
        .slice(0, 5);

      return {
        totalTenants: totalTenants || 0,
        tracked: records.length,
        fullyCompleted,
        avgCompletion,
        incomplete,
      };
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5" />
          {t("onboarding.overviewTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{data?.fullyCompleted || 0}</p>
                <p className="text-xs text-muted-foreground">{t("onboarding.completed")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">
                  {(data?.tracked || 0) - (data?.fullyCompleted || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{t("onboarding.inProgress")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.avgCompletion || 0}%</p>
                <p className="text-xs text-muted-foreground">{t("onboarding.avgCompletion")}</p>
              </div>
            </div>

            {data?.incomplete && data.incomplete.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("onboarding.needsAttention")}
                </p>
                {data.incomplete.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm truncate flex-1">{item.tenantName}</span>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={item.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
