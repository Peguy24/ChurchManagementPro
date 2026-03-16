import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Zap, Cake, CalendarCheck, UserMinus, Bell, Save, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

interface AutomationRule {
  key: string;
  enabled: boolean;
  config: Record<string, string>;
}

const DEFAULT_RULES: AutomationRule[] = [
  { key: "birthday_reminder", enabled: true, config: { days_before: "1" } },
  { key: "event_reminder", enabled: true, config: { hours_before: "24" } },
  { key: "absence_alert", enabled: true, config: { weeks_absent: "3" } },
  { key: "welcome_followup", enabled: false, config: { days_after: "7" } },
];

export default function EngagementAutomations() {
  const { t } = useLanguage();

  if (!planLoading && !hasFeature("automations")) {
    return (
      <Layout>
        <FeatureLockedCard featureName="Automations d'engagement" featureDescription="Automatisez les notifications et les rappels" requiredPlan="professionnel" icon={<Zap className="w-8 h-8 text-muted-foreground" />} />
      </Layout>
    );
  }
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
  const [hasChanges, setHasChanges] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value")
        .eq("tenant_id", tenantId)
        .like("setting_key", "automation_%");
      if (error) throw error;

      if (data && data.length > 0) {
        const loadedRules = DEFAULT_RULES.map(rule => {
          const setting = data.find(s => s.setting_key === `automation_${rule.key}`);
          if (setting && setting.setting_value) {
            try {
              const parsed = JSON.parse(setting.setting_value);
              return { ...rule, ...parsed };
            } catch { return rule; }
          }
          return rule;
        });
        setRules(loadedRules);
      }
      return data;
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      for (const rule of rules) {
        const key = `automation_${rule.key}`;
        const value = JSON.stringify({ enabled: rule.enabled, config: rule.config });

        const { data: existing } = await supabase
          .from("church_settings")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("setting_key", key)
          .single();

        if (existing) {
          await supabase.from("church_settings").update({ setting_value: value }).eq("id", existing.id);
        } else {
          await supabase.from("church_settings").insert({ tenant_id: tenantId, setting_key: key, setting_value: value });
        }
      }
    },
    onSuccess: () => {
      toast.success(t("automations.saved"));
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: () => toast.error(t("automations.error")),
  });

  const updateRule = (key: string, updates: Partial<AutomationRule>) => {
    setRules(prev => prev.map(r => r.key === key ? { ...r, ...updates } : r));
    setHasChanges(true);
  };

  const updateConfig = (key: string, configKey: string, value: string) => {
    setRules(prev => prev.map(r =>
      r.key === key ? { ...r, config: { ...r.config, [configKey]: value } } : r
    ));
    setHasChanges(true);
  };

  const ruleIcons: Record<string, React.ElementType> = {
    birthday_reminder: Cake,
    event_reminder: CalendarCheck,
    absence_alert: UserMinus,
    welcome_followup: Bell,
  };

  const ruleColors: Record<string, string> = {
    birthday_reminder: "text-pink-500",
    event_reminder: "text-blue-500",
    absence_alert: "text-amber-500",
    welcome_followup: "text-green-500",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("automations.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("automations.subtitle")}</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("automations.saveRules")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {rules.map((rule) => {
              const Icon = ruleIcons[rule.key] || Zap;
              const color = ruleColors[rule.key] || "text-primary";
              return (
                <Card key={rule.key} className={rule.enabled ? "" : "opacity-60"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className={`h-5 w-5 ${color}`} />
                        {t(`automations.${rule.key}.title`)}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.enabled ? "default" : "secondary"} className="text-[10px]">
                          {rule.enabled ? t("automations.active") : t("automations.inactive")}
                        </Badge>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => updateRule(rule.key, { enabled: checked })}
                        />
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {t(`automations.${rule.key}.description`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rule.key === "birthday_reminder" && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm whitespace-nowrap">{t("automations.daysBefore")}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="7"
                            value={rule.config.days_before}
                            onChange={(e) => updateConfig(rule.key, "days_before", e.target.value)}
                            className="w-20"
                            disabled={!rule.enabled}
                          />
                        </div>
                      )}
                      {rule.key === "event_reminder" && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm whitespace-nowrap">{t("automations.hoursBefore")}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="72"
                            value={rule.config.hours_before}
                            onChange={(e) => updateConfig(rule.key, "hours_before", e.target.value)}
                            className="w-20"
                            disabled={!rule.enabled}
                          />
                        </div>
                      )}
                      {rule.key === "absence_alert" && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm whitespace-nowrap">{t("automations.weeksAbsent")}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={rule.config.weeks_absent}
                            onChange={(e) => updateConfig(rule.key, "weeks_absent", e.target.value)}
                            className="w-20"
                            disabled={!rule.enabled}
                          />
                        </div>
                      )}
                      {rule.key === "welcome_followup" && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm whitespace-nowrap">{t("automations.daysAfterJoin")}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={rule.config.days_after}
                            onChange={(e) => updateConfig(rule.key, "days_after", e.target.value)}
                            className="w-20"
                            disabled={!rule.enabled}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
