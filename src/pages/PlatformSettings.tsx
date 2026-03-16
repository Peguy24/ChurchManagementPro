import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALL_FEATURE_KEYS, FeatureKey } from "@/hooks/usePlanLimits";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, Clock, BarChart3, Flag, Mail, Save, Loader2 } from "lucide-react";

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_category: string;
  description: string | null;
}

export default function PlatformSettings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("*")
        .order("setting_category");
      if (error) throw error;
      return data as PlatformSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("platformSettings.saved") });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: () => {
      toast({ title: t("platformSettings.saveError"), variant: "destructive" });
    },
  });

  const getSetting = (key: string) => settings?.find((s) => s.setting_key === key);
  const getSettingValue = (key: string) => {
    const s = getSetting(key);
    return s?.setting_value;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("platformSettings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("platformSettings.subtitle")}</p>
        </div>

        <Tabs defaultValue="trial">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trial" className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {t("platformSettings.trialTab")}
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> {t("platformSettings.plansTab")}
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Flag className="h-4 w-4" /> {t("platformSettings.featuresTab")}
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" /> {t("platformSettings.emailTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trial">
            <TrialSettings
              trialDays={getSettingValue("trial_duration_days")}
              trialLimits={getSettingValue("trial_plan_limits")}
              onSave={(key, val) => updateMutation.mutate({ key, value: val })}
              saving={updateMutation.isPending}
              t={t}
            />
          </TabsContent>

          <TabsContent value="plans">
            <PlanLimitsSettings
              settings={settings || []}
              onSave={(key, val) => updateMutation.mutate({ key, value: val })}
              saving={updateMutation.isPending}
              t={t}
            />
          </TabsContent>

          <TabsContent value="features">
            <FeatureFlagsSettings
              flags={getSettingValue("feature_flags")}
              maintenanceMode={getSettingValue("maintenance_mode")}
              onSave={(key, val) => updateMutation.mutate({ key, value: val })}
              saving={updateMutation.isPending}
              t={t}
            />
          </TabsContent>

          <TabsContent value="email">
            <EmailSettings
              senderName={getSettingValue("email_sender_name")}
              senderAddress={getSettingValue("email_sender_address")}
              welcomeMessage={getSettingValue("welcome_message")}
              onSave={(key, val) => updateMutation.mutate({ key, value: val })}
              saving={updateMutation.isPending}
              t={t}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// --- Trial Settings ---
function TrialSettings({
  trialDays,
  trialLimits,
  onSave,
  saving,
  t,
}: {
  trialDays: any;
  trialLimits: any;
  onSave: (key: string, val: any) => void;
  saving: boolean;
  t: (k: string) => string;
}) {
  const parsedDays = typeof trialDays === "number" ? trialDays : parseInt(trialDays) || 14;
  const limits = typeof trialLimits === "object" ? trialLimits : {};
  const [days, setDays] = useState<number>(parsedDays);
  const [maxMembers, setMaxMembers] = useState(limits.max_members ?? 50);
  const [maxBranches, setMaxBranches] = useState(limits.max_branches ?? 1);
  const [maxUsers, setMaxUsers] = useState(limits.max_users ?? 2);
  const [maxStorage, setMaxStorage] = useState(limits.max_storage_mb ?? 100);

  useEffect(() => { setDays(parsedDays); }, [parsedDays]);
  useEffect(() => {
    setMaxMembers(limits.max_members ?? 50);
    setMaxBranches(limits.max_branches ?? 1);
    setMaxUsers(limits.max_users ?? 2);
    setMaxStorage(limits.max_storage_mb ?? 100);
  }, [trialLimits]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> {t("platformSettings.trialConfig")}
        </CardTitle>
        <CardDescription>{t("platformSettings.trialConfigDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("platformSettings.trialDuration")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 14)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">{t("platformSettings.days")}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("platformSettings.maxMembers")}</Label>
            <Input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value) || 50)} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformSettings.maxBranches")}</Label>
            <Input type="number" min={1} value={maxBranches} onChange={(e) => setMaxBranches(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformSettings.maxUsers")}</Label>
            <Input type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(parseInt(e.target.value) || 2)} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformSettings.maxStorageMB")}</Label>
            <Input type="number" min={50} value={maxStorage} onChange={(e) => setMaxStorage(parseInt(e.target.value) || 100)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onSave("trial_duration_days", days)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveDuration")}
          </Button>
          <Button
            onClick={() =>
              onSave("trial_plan_limits", {
                max_members: maxMembers,
                max_branches: maxBranches,
                max_users: maxUsers,
                max_storage_mb: maxStorage,
              })
            }
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveLimits")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Plan Limits Settings ---
function PlanLimitsSettings({
  settings,
  onSave,
  saving,
  t,
}: {
  settings: PlatformSetting[];
  onSave: (key: string, val: any) => void;
  saving: boolean;
  t: (k: string) => string;
}) {
  const planKeys = [
    { key: "plan_gratuit_limits", label: "Gratuit" },
    { key: "plan_essentiel_limits", label: "Essentiel" },
    { key: "plan_professionnel_limits", label: "Professionnel" },
    { key: "plan_entreprise_limits", label: "Entreprise" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {planKeys.map(({ key, label }) => {
        const setting = settings.find((s) => s.setting_key === key);
        const limits = typeof setting?.setting_value === "object" ? setting.setting_value : {};
        return <PlanCard key={key} planKey={key} label={label} limits={limits} onSave={onSave} saving={saving} t={t} />;
      })}
    </div>
  );
}

function PlanCard({
  planKey,
  label,
  limits,
  onSave,
  saving,
  t,
}: {
  planKey: string;
  label: string;
  limits: any;
  onSave: (key: string, val: any) => void;
  saving: boolean;
  t: (k: string) => string;
}) {
  const [mm, setMm] = useState(limits.max_members ?? 100);
  const [mb, setMb] = useState(limits.max_branches ?? 1);
  const [mu, setMu] = useState(limits.max_users ?? 3);
  const [ms, setMs] = useState(limits.max_storage_mb ?? 200);

  const defaultFeatures = Object.fromEntries(
    ALL_FEATURE_KEYS.map(k => [k, false])
  ) as Record<FeatureKey, boolean>;

  const [features, setFeatures] = useState<Record<string, boolean>>(
    typeof limits.features === "object" ? { ...defaultFeatures, ...limits.features } : defaultFeatures
  );

  useEffect(() => {
    setMm(limits.max_members ?? 100);
    setMb(limits.max_branches ?? 1);
    setMu(limits.max_users ?? 3);
    setMs(limits.max_storage_mb ?? 200);
    if (typeof limits.features === "object") setFeatures({ ...defaultFeatures, ...limits.features });
  }, [limits.max_members, limits.max_branches, limits.max_users, limits.max_storage_mb, limits.features]);

  const featureLabels: Record<string, string> = {
    attendance: t("platformSettings.featureAttendance"),
    donations: t("platformSettings.featureDonations"),
    advancedReports: t("platformSettings.featureAdvancedReports"),
    emailNotifications: t("platformSettings.featureEmailNotif"),
    inventory: t("platformSettings.featureInventory"),
    prioritySupport: t("platformSettings.featurePrioritySupport"),
    whiteLabel: t("platformSettings.featureWhiteLabel"),
    advancedFinance: t("platformSettings.featureAdvancedFinance"),
    smartInsights: t("platformSettings.featureSmartInsights"),
    bulkCommunication: t("platformSettings.featureBulkComm"),
    automations: t("platformSettings.featureAutomations"),
    volunteerScheduling: t("platformSettings.featureVolunteerScheduling"),
    memberCards: t("platformSettings.featureMemberCards"),
    attendanceAlerts: t("platformSettings.featureAttendanceAlerts"),
    churchHealth: t("platformSettings.featureChurchHealth"),
    customFields: t("platformSettings.featureCustomFields"),
    dataBackup: t("platformSettings.featureDataBackup"),
    churnPrevention: t("platformSettings.featureChurnPrevention"),
    branding: t("platformSettings.featureBranding"),
    bankReconciliation: t("platformSettings.featureBankRecon"),
    cashRegister: t("platformSettings.featureCashRegister"),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{label}</CardTitle>
        <CardDescription>{t("platformSettings.planLimitsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("platformSettings.maxMembers")}</Label>
            <Input type="number" value={mm} onChange={(e) => setMm(parseInt(e.target.value))} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("platformSettings.maxBranches")}</Label>
            <Input type="number" value={mb} onChange={(e) => setMb(parseInt(e.target.value))} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("platformSettings.maxUsers")}</Label>
            <Input type="number" value={mu} onChange={(e) => setMu(parseInt(e.target.value))} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("platformSettings.maxStorageMB")}</Label>
            <Input type="number" value={ms} onChange={(e) => setMs(parseInt(e.target.value))} className="h-8" />
          </div>
        </div>

        <div className="border-t pt-3 mt-3">
          <Label className="text-xs font-semibold mb-2 block">{t("platformSettings.includedFeatures")}</Label>
          <div className="grid gap-2">
            {Object.entries(featureLabels).map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{lbl}</Label>
                <Switch
                  checked={features[key] ?? false}
                  onCheckedChange={(checked) => setFeatures((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t("platformSettings.unlimitedHint")}</p>
        <Button
          size="sm"
          className="w-full"
          onClick={() =>
            onSave(planKey, { max_members: mm, max_branches: mb, max_users: mu, max_storage_mb: ms, features })
          }
          disabled={saving}
        >
          <Save className="h-3 w-3 mr-1" /> {t("platformSettings.save")}
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Feature Flags ---
function FeatureFlagsSettings({
  flags,
  maintenanceMode,
  onSave,
  saving,
  t,
}: {
  flags: any;
  maintenanceMode: any;
  onSave: (key: string, val: any) => void;
  saving: boolean;
  t: (k: string) => string;
}) {
  const featureFlags = typeof flags === "object" ? { ...flags } : {};
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(featureFlags);
  const [maintenance, setMaintenance] = useState(maintenanceMode === true || maintenanceMode === "true");

  useEffect(() => { setLocalFlags(typeof flags === "object" ? { ...flags } : {}); }, [flags]);
  useEffect(() => { setMaintenance(maintenanceMode === true || maintenanceMode === "true"); }, [maintenanceMode]);

  const featureLabels: Record<string, string> = {
    smart_insights: t("platformSettings.featureSmartInsights"),
    bulk_communication: t("platformSettings.featureBulkComm"),
    inventory_management: t("platformSettings.featureInventory"),
    bank_reconciliation: t("platformSettings.featureBankRecon"),
    event_registrations: t("platformSettings.featureEventReg"),
    member_cards: t("platformSettings.featureMemberCards"),
    custom_fields: t("platformSettings.featureCustomFields"),
    salary_management: t("platformSettings.featureSalary"),
    attendance: t("platformSettings.featureAttendance"),
    donations: t("platformSettings.featureDonations"),
    advanced_reports: t("platformSettings.featureAdvancedReports"),
    email_notifications: t("platformSettings.featureEmailNotif"),
    priority_support: t("platformSettings.featurePrioritySupport"),
    white_label: t("platformSettings.featureWhiteLabel"),
    advanced_finance: t("platformSettings.featureAdvancedFinance"),
    automations: t("platformSettings.featureAutomations"),
    volunteer_scheduling: t("platformSettings.featureVolunteerScheduling"),
    attendance_alerts: t("platformSettings.featureAttendanceAlerts"),
    church_health: t("platformSettings.featureChurchHealth"),
    data_backup: t("platformSettings.featureDataBackup"),
    churn_prevention: t("platformSettings.featureChurnPrevention"),
    branding: t("platformSettings.featureBranding"),
    cash_register: t("platformSettings.featureCashRegister"),
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" /> {t("platformSettings.featureFlags")}
          </CardTitle>
          <CardDescription>{t("platformSettings.featureFlagsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(featureLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={localFlags[key] ?? true}
                  onCheckedChange={(checked) =>
                    setLocalFlags((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
          <Button
            onClick={() => onSave("feature_flags", localFlags)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveFeatures")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t("platformSettings.maintenanceMode")}</CardTitle>
          <CardDescription>{t("platformSettings.maintenanceModeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t("platformSettings.enableMaintenance")}</Label>
            <Switch
              checked={maintenance}
              onCheckedChange={(checked) => {
                setMaintenance(checked);
                onSave("maintenance_mode", checked);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Email Settings ---
function EmailSettings({
  senderName,
  senderAddress,
  welcomeMessage,
  onSave,
  saving,
  t,
}: {
  senderName: any;
  senderAddress: any;
  welcomeMessage: any;
  onSave: (key: string, val: any) => void;
  saving: boolean;
  t: (k: string) => string;
}) {
  const [name, setName] = useState(typeof senderName === "string" ? senderName : "Church Management Pro");
  const [address, setAddress] = useState(typeof senderAddress === "string" ? senderAddress : "noreply@churchmanagementpro.com");
  const [welcome, setWelcome] = useState(typeof welcomeMessage === "string" ? welcomeMessage : "");

  useEffect(() => { if (typeof senderName === "string") setName(senderName); }, [senderName]);
  useEffect(() => { if (typeof senderAddress === "string") setAddress(senderAddress); }, [senderAddress]);
  useEffect(() => { if (typeof welcomeMessage === "string") setWelcome(welcomeMessage); }, [welcomeMessage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> {t("platformSettings.emailConfig")}
        </CardTitle>
        <CardDescription>{t("platformSettings.emailConfigDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("platformSettings.senderName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformSettings.senderAddress")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("platformSettings.welcomeMessage")}</Label>
          <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave("email_sender_name", name)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveSender")}
          </Button>
          <Button onClick={() => onSave("email_sender_address", address)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveAddress")}
          </Button>
          <Button onClick={() => onSave("welcome_message", welcome)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {t("platformSettings.saveWelcome")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
