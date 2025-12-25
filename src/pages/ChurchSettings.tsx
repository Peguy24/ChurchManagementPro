import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Save, Loader2, Phone, Mail, MapPin, FileText, Hash } from "lucide-react";

interface ChurchSettings {
  church_name: string;
  church_address: string;
  church_phone: string;
  church_email: string;
  church_tax_id: string;
  church_logo_url: string;
  fiscal_receipt_footer: string;
}

export default function ChurchSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ChurchSettings>({
    church_name: "",
    church_address: "",
    church_phone: "",
    church_email: "",
    church_tax_id: "",
    church_logo_url: "",
    fiscal_receipt_footer: "",
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["church-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value");
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      
      return settingsMap;
    },
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
      });
    }
  }, [settingsData]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: ChurchSettings) => {
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("church_settings")
          .update({ setting_value: update.setting_value })
          .eq("setting_key", update.setting_key);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-settings"] });
      toast.success("Paramètres enregistrés avec succès");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Paramètres de l'Église</h2>
          <p className="text-muted-foreground">
            Configurez les informations de votre église pour les relevés fiscaux et documents officiels.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Church Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Identité de l'Église
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur les relevés fiscaux et documents officiels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="church_name">Nom de l'Église *</Label>
                  <Input
                    id="church_name"
                    value={settings.church_name}
                    onChange={(e) => setSettings({ ...settings, church_name: e.target.value })}
                    placeholder="Église Évangélique de..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="church_tax_id" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Numéro Fiscal (NIF)
                  </Label>
                  <Input
                    id="church_tax_id"
                    value={settings.church_tax_id}
                    onChange={(e) => setSettings({ ...settings, church_tax_id: e.target.value })}
                    placeholder="NIF-XXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse Complète
                </Label>
                <Textarea
                  id="church_address"
                  value={settings.church_address}
                  onChange={(e) => setSettings({ ...settings, church_address: e.target.value })}
                  placeholder="Rue, Ville, Code Postal, Pays"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="church_phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </Label>
                  <Input
                    id="church_phone"
                    value={settings.church_phone}
                    onChange={(e) => setSettings({ ...settings, church_phone: e.target.value })}
                    placeholder="+509 XXXX-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="church_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="church_email"
                    type="email"
                    value={settings.church_email}
                    onChange={(e) => setSettings({ ...settings, church_email: e.target.value })}
                    placeholder="contact@eglise.org"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_logo_url">URL du Logo (optionnel)</Label>
                <Input
                  id="church_logo_url"
                  value={settings.church_logo_url}
                  onChange={(e) => setSettings({ ...settings, church_logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Receipt Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relevés Fiscaux
              </CardTitle>
              <CardDescription>
                Personnalisez le texte qui apparaît sur les relevés fiscaux.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fiscal_receipt_footer">Texte de pied de page du relevé fiscal</Label>
                <Textarea
                  id="fiscal_receipt_footer"
                  value={settings.fiscal_receipt_footer}
                  onChange={(e) => setSettings({ ...settings, fiscal_receipt_footer: e.target.value })}
                  placeholder="Ce document est un reçu officiel pour fins fiscales..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>
                Voici comment les informations apparaîtront sur les relevés fiscaux.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg p-6 border">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold">{settings.church_name || "Nom de l'église"}</h3>
                  <p className="text-sm text-muted-foreground">{settings.church_address || "Adresse"}</p>
                  <p className="text-sm text-muted-foreground">
                    Tél: {settings.church_phone || "Téléphone"} | Email: {settings.church_email || "Email"}
                  </p>
                  {settings.church_tax_id && (
                    <p className="text-sm font-medium">N° Fiscal: {settings.church_tax_id}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending} size="lg">
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les paramètres
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
