import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useTenant } from "@/contexts/TenantContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Building2, Save, Loader2, Phone, Mail, MapPin, FileText, Hash, Palette, CreditCard, AlertCircle, Coins } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import LogoUpload from "@/components/LogoUpload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateForm, churchSettingsSchema, firstErrorMessage } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

interface ChurchSettingsData {
  church_name: string;
  church_address: string;
  church_phone: string;
  church_email: string;
  church_tax_id: string;
  church_logo_url: string;
  fiscal_receipt_footer: string;
  card_primary_color: string;
  card_secondary_color: string;
  card_text_color: string;
  card_show_logo: string;
  card_church_name_on_card: string;
  currency_code: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function ChurchSettings() {
  const queryClient = useQueryClient();
  const { tenantId: profileTenantId } = useCurrentTenant();
  const { tenant: contextTenant } = useTenant();
  const { t } = useLanguage();
  const { isAdmin: isSuperAdmin } = useUserRole();
  
  // For super admins without a profile tenant, allow selecting a tenant
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  
  // Use tenant from: 1) profile, 2) context (URL), 3) selected (for super admin)
  const tenantId = profileTenantId || contextTenant?.id || selectedTenantId;
  
  // Fetch all tenants for super admin selector
  const { data: tenants } = useQuery({
    queryKey: ["all-tenants-for-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isSuperAdmin && !profileTenantId && !contextTenant?.id,
  });

  const [settings, setSettings] = useState<ChurchSettingsData>({
    church_name: "",
    church_address: "",
    church_phone: "",
    church_email: "",
    church_tax_id: "",
    church_logo_url: "",
    fiscal_receipt_footer: "",
    card_primary_color: "#3B82F6",
    card_secondary_color: "#1E40AF",
    card_text_color: "#FFFFFF",
    card_show_logo: "true",
    card_church_name_on_card: "true",
    currency_code: "USD",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["church-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return {};
      
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value")
        .eq("tenant_id", tenantId);
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      
      return settingsMap;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (settingsData) {
      setSettings({
        church_name: settingsData.church_name || "",
        church_address: settingsData.church_address || "",
        church_phone: settingsData.church_phone || "",
        church_email: settingsData.church_email || "",
        church_tax_id: settingsData.church_tax_id || "",
        church_logo_url: settingsData.church_logo_url || "",
        fiscal_receipt_footer: settingsData.fiscal_receipt_footer || "",
        card_primary_color: settingsData.card_primary_color || "#3B82F6",
        card_secondary_color: settingsData.card_secondary_color || "#1E40AF",
        card_text_color: settingsData.card_text_color || "#FFFFFF",
        card_show_logo: settingsData.card_show_logo || "true",
        card_church_name_on_card: settingsData.card_church_name_on_card || "true",
        currency_code: settingsData.currency_code || "USD",
      });
    }
  }, [settingsData]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: ChurchSettingsData) => {
      if (!tenantId) throw new Error("No tenant ID available");
      
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        tenant_id: tenantId,
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("church_settings")
          .upsert(
            { 
              tenant_id: update.tenant_id,
              setting_key: update.setting_key, 
              setting_value: update.setting_value 
            },
            { 
              onConflict: 'tenant_id,setting_key'
            }
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-settings", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["church-currency", tenantId] });
      toast.success(t("churchSettings.saveSuccess"));
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error(t("churchSettings.saveError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error(t("churchSettings.noChurchSelected"));
      return;
    }
    const validation = validateForm(churchSettingsSchema, {
      churchName: settings.church_name,
      churchEmail: settings.church_email,
      churchPhone: settings.church_phone,
    });
    if (!validation.success) {
      setErrors({
        church_name: validation.fieldErrors.churchName || "",
        church_email: validation.fieldErrors.churchEmail || "",
        church_phone: validation.fieldErrors.churchPhone || "",
      });
      toast.error(firstErrorMessage(validation.fieldErrors, t) || t("churchSettings.saveError"));
      return;
    }
    setErrors({});
    updateSettings.mutate(settings);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Check if super admin needs to select a tenant
  const needsTenantSelection = isSuperAdmin && !profileTenantId && !contextTenant?.id;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("churchSettings.title")}</h2>
          <p className="text-muted-foreground">
            {t("churchSettings.subtitle")}
          </p>
        </div>

        {/* Tenant selector for super admins */}
        {needsTenantSelection && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <span>{t("churchSettings.selectTenantPrompt") || "Please select a church to configure its settings:"}</span>
              <Select value={selectedTenantId || ""} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder={t("churchSettings.selectTenantPlaceholder") || "Select a church..."} />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AlertDescription>
          </Alert>
        )}

        {!tenantId && !needsTenantSelection && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("churchSettings.noChurchSelected") || "No church selected. Please select or join a church first."}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Church Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("churchSettings.churchIdentity")}
              </CardTitle>
              <CardDescription>
                {t("churchSettings.churchIdentityDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="church_name">{t("churchSettings.churchNameRequired")}</Label>
                  <Input
                    id="church_name"
                    value={settings.church_name}
                    onChange={(e) => setSettings({ ...settings, church_name: e.target.value })}
                    placeholder={t("churchSettings.churchNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="church_tax_id" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {t("churchSettings.taxId")}
                  </Label>
                  <Input
                    id="church_tax_id"
                    value={settings.church_tax_id}
                    onChange={(e) => setSettings({ ...settings, church_tax_id: e.target.value })}
                    placeholder={t("churchSettings.taxIdPlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("churchSettings.fullAddress")}
                </Label>
                <Textarea
                  id="church_address"
                  value={settings.church_address}
                  onChange={(e) => setSettings({ ...settings, church_address: e.target.value })}
                  placeholder={t("churchSettings.addressPlaceholder")}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="church_phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t("churchSettings.phone")}
                  </Label>
                  <Input
                    id="church_phone"
                    value={settings.church_phone}
                    onChange={(e) => setSettings({ ...settings, church_phone: e.target.value })}
                    placeholder={t("churchSettings.phonePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="church_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("churchSettings.email")}
                  </Label>
                  <Input
                    id="church_email"
                    type="email"
                    value={settings.church_email}
                    onChange={(e) => setSettings({ ...settings, church_email: e.target.value })}
                    placeholder={t("churchSettings.emailPlaceholder")}
                  />
                </div>
              </div>

              <LogoUpload
                tenantId={tenantId}
                currentLogoUrl={settings.church_logo_url}
                onLogoUploaded={(url) => setSettings({ ...settings, church_logo_url: url })}
              />
            </CardContent>
          </Card>

          {/* Fiscal Receipt Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("churchSettings.fiscalReceipts")}
              </CardTitle>
              <CardDescription>
                {t("churchSettings.fiscalReceiptsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fiscal_receipt_footer">{t("churchSettings.receiptFooter")}</Label>
                <Textarea
                  id="fiscal_receipt_footer"
                  value={settings.fiscal_receipt_footer}
                  onChange={(e) => setSettings({ ...settings, fiscal_receipt_footer: e.target.value })}
                  placeholder={t("churchSettings.receiptFooterPlaceholder")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                {t("churchSettings.currencyTitle")}
              </CardTitle>
              <CardDescription>
                {t("churchSettings.currencyDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="currency_code">{t("churchSettings.currencyLabel")} *</Label>
                <Select
                  value={settings.currency_code}
                  onValueChange={(value) => setSettings({ ...settings, currency_code: value })}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder={t("churchSettings.currencyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} — {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Member Card Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("churchSettings.memberCards")}
              </CardTitle>
              <CardDescription>
                {t("churchSettings.memberCardsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="card_primary_color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {t("churchSettings.primaryColor")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="card_primary_color"
                      type="color"
                      value={settings.card_primary_color}
                      onChange={(e) => setSettings({ ...settings, card_primary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.card_primary_color}
                      onChange={(e) => setSettings({ ...settings, card_primary_color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card_secondary_color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {t("churchSettings.secondaryColor")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="card_secondary_color"
                      type="color"
                      value={settings.card_secondary_color}
                      onChange={(e) => setSettings({ ...settings, card_secondary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.card_secondary_color}
                      onChange={(e) => setSettings({ ...settings, card_secondary_color: e.target.value })}
                      placeholder="#1E40AF"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card_text_color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {t("churchSettings.textColor")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="card_text_color"
                      type="color"
                      value={settings.card_text_color}
                      onChange={(e) => setSettings({ ...settings, card_text_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.card_text_color}
                      onChange={(e) => setSettings({ ...settings, card_text_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="card_show_logo"
                    checked={settings.card_show_logo === "true"}
                    onChange={(e) => setSettings({ ...settings, card_show_logo: e.target.checked ? "true" : "false" })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="card_show_logo">{t("churchSettings.showLogo")}</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="card_church_name_on_card"
                    checked={settings.card_church_name_on_card === "true"}
                    onChange={(e) => setSettings({ ...settings, card_church_name_on_card: e.target.checked ? "true" : "false" })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="card_church_name_on_card">{t("churchSettings.showChurchName")}</Label>
                </div>
              </div>

              {/* Card Preview */}
              <div className="space-y-2">
                <Label>{t("churchSettings.cardPreview")}</Label>
                <div 
                  className="relative w-full max-w-[340px] h-[200px] rounded-lg overflow-hidden border-2"
                  style={{ borderColor: settings.card_primary_color }}
                >
                  {/* Header */}
                  <div 
                    className="h-12 flex items-center justify-between px-3"
                    style={{ backgroundColor: settings.card_primary_color }}
                  >
                    {settings.card_show_logo === "true" && settings.church_logo_url && (
                      <img 
                        src={settings.church_logo_url} 
                        alt="Logo" 
                        className="h-8 w-8 object-contain rounded"
                      />
                    )}
                    <span 
                      className="font-bold text-sm flex-1 text-center"
                      style={{ color: settings.card_text_color }}
                    >
                      {settings.card_church_name_on_card === "true" 
                        ? (settings.church_name || t("churchSettings.churchName"))
                        : t("churchSettings.memberCard")}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: settings.card_text_color }}
                    >
                      N°001
                    </span>
                  </div>
                  
                  {/* Body */}
                  <div className="p-3 bg-background">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <span className="text-2xl text-muted-foreground">👤</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold" style={{ color: settings.card_primary_color }}>Jean DUPONT</p>
                        <p className="text-xs text-muted-foreground">{t("churchSettings.member")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("churchSettings.born")}: 01/01/1990</p>
                        <p className="text-xs text-muted-foreground">{t("churchSettings.memberSince")}: 15/03/2020</p>
                      </div>
                      <div className="w-14 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        QR
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-end px-3"
                    style={{ backgroundColor: settings.card_secondary_color }}
                  >
                    <span className="text-xs font-medium" style={{ color: settings.card_text_color }}>
                      {settings.card_church_name_on_card === "true" ? t("churchSettings.activeMember") : (settings.church_name || t("churchSettings.churchName"))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("churchSettings.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("churchSettings.saveSettings")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
