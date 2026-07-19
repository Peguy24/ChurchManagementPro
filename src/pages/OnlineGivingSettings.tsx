import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Loader2, HeartHandshake, ExternalLink, Copy, CheckCircle2, AlertTriangle, Link as LinkIcon, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GivingSettings {
  tenant_id: string;
  enabled: boolean;
  stripe_enabled: boolean;
  stripe_account_id: string | null;
  moncash_enabled: boolean;
  moncash_client_id: string | null;
  moncash_client_secret: string | null;
  moncash_env: "sandbox" | "live";
  min_amount: number;
  suggested_amounts: number[];
  thank_you_message: Record<string, string>;
  cover_image_url: string | null;
  default_cash_register_id: string | null;
  default_bank_account_id: string | null;
}

const emptyDefaults: Omit<GivingSettings, "tenant_id"> = {
  enabled: false,
  stripe_enabled: false,
  stripe_account_id: "",
  moncash_enabled: false,
  moncash_client_id: "",
  moncash_client_secret: "",
  moncash_env: "sandbox",
  min_amount: 1,
  suggested_amounts: [10, 25, 50, 100],
  thank_you_message: { en: "", fr: "", ht: "" },
  cover_image_url: "",
  default_cash_register_id: null,
  default_bank_account_id: null,
};

export default function OnlineGivingSettings() {
  const { tenantId } = useCurrentTenant();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Omit<GivingSettings, "tenant_id">>(emptyDefaults);

  const T = {
    en: {
      title: "Online Giving",
      subtitle: "Let visitors donate directly on your public church site.",
      enable: "Enable online giving",
      enableDesc: "Requires the Church Mini-Site add-on to be active.",
      stripe: "Stripe (Cards, Apple Pay, Google Pay)",
      stripeDesc: "Enter your Stripe connected account ID. Funds settle to your bank via Stripe.",
      stripeId: "Stripe account ID (acct_...)",
      moncash: "MonCash (Digicel Haiti)",
      moncashDesc: "Enter your MonCash Business API credentials. Funds go directly to your MonCash account.",
      moncashClient: "Client ID",
      moncashSecret: "Client Secret",
      env: "Environment",
      amounts: "Suggested amounts (comma-separated)",
      min: "Minimum donation amount",
      thankYou: "Thank-you message (shown after donation)",
      cover: "Cover image URL (optional)",
      cashReg: "Default cash register (optional)",
      bank: "Default bank account (optional)",
      unlinked: "Not linked",
      save: "Save",
      saved: "Settings saved",
      giveUrl: "Your public giving page:",
      copy: "Copy",
      copied: "Copied!",
      noTenant: "No tenant selected.",
    },
    fr: {
      title: "Dons en ligne",
      subtitle: "Permettez aux visiteurs de faire un don directement sur votre site public.",
      enable: "Activer les dons en ligne",
      enableDesc: "Nécessite le module complémentaire Mini-Site actif.",
      stripe: "Stripe (Cartes, Apple Pay, Google Pay)",
      stripeDesc: "Saisissez l'ID de votre compte Stripe connecté. Les fonds arrivent sur votre banque via Stripe.",
      stripeId: "ID de compte Stripe (acct_...)",
      moncash: "MonCash (Digicel Haïti)",
      moncashDesc: "Saisissez vos identifiants API MonCash Business. Les fonds vont directement sur votre compte MonCash.",
      moncashClient: "Client ID",
      moncashSecret: "Client Secret",
      env: "Environnement",
      amounts: "Montants suggérés (séparés par des virgules)",
      min: "Montant minimum",
      thankYou: "Message de remerciement (affiché après le don)",
      cover: "URL image de couverture (optionnel)",
      cashReg: "Caisse par défaut (optionnel)",
      bank: "Compte bancaire par défaut (optionnel)",
      unlinked: "Non lié",
      save: "Enregistrer",
      saved: "Paramètres enregistrés",
      giveUrl: "Votre page de dons publique :",
      copy: "Copier",
      copied: "Copié !",
      noTenant: "Aucune église sélectionnée.",
    },
    ht: {
      title: "Don an liy",
      subtitle: "Kite vizitè yo bay don dirèkteman sou sit piblik legliz ou.",
      enable: "Aktive don an liy",
      enableDesc: "Bezwen modil Mini-Sit la aktif.",
      stripe: "Stripe (Kat, Apple Pay, Google Pay)",
      stripeDesc: "Antre ID kont Stripe konekte ou.",
      stripeId: "ID kont Stripe (acct_...)",
      moncash: "MonCash (Digicel Ayiti)",
      moncashDesc: "Antre kredansyèl API MonCash Biznis ou.",
      moncashClient: "Client ID",
      moncashSecret: "Client Secret",
      env: "Anviwònman",
      amounts: "Montan sijere (separe ak vigil)",
      min: "Montan minimòm",
      thankYou: "Mesaj remèsiman (apre don an)",
      cover: "URL imaj kouvèti (opsyonèl)",
      cashReg: "Kès pa defo (opsyonèl)",
      bank: "Kont labank pa defo (opsyonèl)",
      unlinked: "Pa lye",
      save: "Anrejistre",
      saved: "Paramèt anrejistre",
      giveUrl: "Paj don piblik ou:",
      copy: "Kopye",
      copied: "Kopye!",
      noTenant: "Pa gen legliz chwazi.",
    },
  }[language] || {} as any;

  const { data: tenant } = useQuery({
    queryKey: ["tenant-slug", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("slug, name").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["giving-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_giving_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cashRegisters } = useQuery({
    queryKey: ["cash-registers-active", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("cash_registers").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-active", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("bank_accounts").select("id, name, bank_name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled ?? false,
        stripe_enabled: settings.stripe_enabled ?? false,
        stripe_account_id: settings.stripe_account_id ?? "",
        moncash_enabled: settings.moncash_enabled ?? false,
        moncash_client_id: settings.moncash_client_id ?? "",
        moncash_client_secret: settings.moncash_client_secret ?? "",
        moncash_env: (settings.moncash_env as "sandbox" | "live") ?? "sandbox",
        min_amount: Number(settings.min_amount ?? 1),
        suggested_amounts: (settings.suggested_amounts as number[]) ?? [10, 25, 50, 100],
        thank_you_message: (settings.thank_you_message as Record<string, string>) ?? { en: "", fr: "", ht: "" },
        cover_image_url: settings.cover_image_url ?? "",
        default_cash_register_id: settings.default_cash_register_id,
        default_bank_account_id: settings.default_bank_account_id,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("no tenant");
      const payload = {
        tenant_id: tenantId,
        enabled: form.enabled,
        stripe_enabled: form.stripe_enabled,
        stripe_account_id: form.stripe_account_id?.trim() || null,
        moncash_enabled: form.moncash_enabled,
        moncash_client_id: form.moncash_client_id?.trim() || null,
        moncash_client_secret: form.moncash_client_secret?.trim() || null,
        moncash_env: form.moncash_env,
        min_amount: form.min_amount,
        suggested_amounts: form.suggested_amounts,
        thank_you_message: form.thank_you_message,
        cover_image_url: form.cover_image_url?.trim() || null,
        default_cash_register_id: form.default_cash_register_id,
        default_bank_account_id: form.default_bank_account_id,
      };
      const { error } = await supabase.from("tenant_giving_settings").upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(T.saved);
      queryClient.invalidateQueries({ queryKey: ["giving-settings", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const giveUrl = tenant?.slug ? `${window.location.origin}/site/${tenant.slug}/give` : "";

  if (!tenantId) {
    return <Layout><div className="p-8 text-muted-foreground">{T.noTenant}</div></Layout>;
  }

  return (
    <Layout>
      <div className="container max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-3">
          <HeartHandshake className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{T.title}</h1>
            <p className="text-muted-foreground">{T.subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{T.enable}</CardTitle>
                    <CardDescription>{T.enableDesc}</CardDescription>
                  </div>
                  <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                </div>
              </CardHeader>
              {form.enabled && giveUrl && (
                <CardContent>
                  <Alert>
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">{T.giveUrl}</div>
                        <code className="text-xs break-all">{giveUrl}</code>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(giveUrl); toast.success(T.copied); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={giveUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{T.stripe}</CardTitle>
                    <CardDescription>{T.stripeDesc}</CardDescription>
                  </div>
                  <Switch checked={form.stripe_enabled} onCheckedChange={(v) => setForm({ ...form, stripe_enabled: v })} />
                </div>
              </CardHeader>
              {form.stripe_enabled && (
                <CardContent className="space-y-3">
                  <div>
                    <Label>{T.stripeId}</Label>
                    <Input
                      placeholder="acct_1AbCdEfGhIjKlMnO"
                      value={form.stripe_account_id || ""}
                      onChange={(e) => setForm({ ...form, stripe_account_id: e.target.value })}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{T.moncash}</CardTitle>
                    <CardDescription>{T.moncashDesc}</CardDescription>
                  </div>
                  <Switch checked={form.moncash_enabled} onCheckedChange={(v) => setForm({ ...form, moncash_enabled: v })} />
                </div>
              </CardHeader>
              {form.moncash_enabled && (
                <CardContent className="space-y-3">
                  <div>
                    <Label>{T.moncashClient}</Label>
                    <Input value={form.moncash_client_id || ""} onChange={(e) => setForm({ ...form, moncash_client_id: e.target.value })} />
                  </div>
                  <div>
                    <Label>{T.moncashSecret}</Label>
                    <Input type="password" value={form.moncash_client_secret || ""} onChange={(e) => setForm({ ...form, moncash_client_secret: e.target.value })} />
                  </div>
                  <div>
                    <Label>{T.env}</Label>
                    <Select value={form.moncash_env} onValueChange={(v: "sandbox" | "live") => setForm({ ...form, moncash_env: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{T.amounts}</Label>
                  <Input
                    value={form.suggested_amounts.join(", ")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        suggested_amounts: e.target.value
                          .split(",")
                          .map((s) => Number(s.trim()))
                          .filter((n) => !isNaN(n) && n > 0),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{T.min}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.min_amount}
                    onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>{T.thankYou} (EN)</Label>
                  <Textarea rows={2} value={form.thank_you_message.en || ""} onChange={(e) => setForm({ ...form, thank_you_message: { ...form.thank_you_message, en: e.target.value } })} />
                </div>
                <div>
                  <Label>{T.thankYou} (FR)</Label>
                  <Textarea rows={2} value={form.thank_you_message.fr || ""} onChange={(e) => setForm({ ...form, thank_you_message: { ...form.thank_you_message, fr: e.target.value } })} />
                </div>
                <div>
                  <Label>{T.thankYou} (HT)</Label>
                  <Textarea rows={2} value={form.thank_you_message.ht || ""} onChange={(e) => setForm({ ...form, thank_you_message: { ...form.thank_you_message, ht: e.target.value } })} />
                </div>
                <div>
                  <Label>{T.cover}</Label>
                  <Input value={form.cover_image_url || ""} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>{T.cashReg}</Label>
                  <Select
                    value={form.default_cash_register_id || "none"}
                    onValueChange={(v) => setForm({ ...form, default_cash_register_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{T.unlinked}</SelectItem>
                      {cashRegisters?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{T.bank}</Label>
                  <Select
                    value={form.default_bank_account_id || "none"}
                    onValueChange={(v) => setForm({ ...form, default_bank_account_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{T.unlinked}</SelectItem>
                      {bankAccounts?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} — {b.bank_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {T.save}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
