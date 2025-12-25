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
import { Building2, Save, Loader2, Phone, Mail, MapPin, FileText, Hash, Palette, CreditCard } from "lucide-react";

interface ChurchSettings {
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
    card_primary_color: "#3B82F6",
    card_secondary_color: "#1E40AF",
    card_text_color: "#FFFFFF",
    card_show_logo: "true",
    card_church_name_on_card: "true",
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
        card_primary_color: settingsData.card_primary_color || "#3B82F6",
        card_secondary_color: settingsData.card_secondary_color || "#1E40AF",
        card_text_color: settingsData.card_text_color || "#FFFFFF",
        card_show_logo: settingsData.card_show_logo || "true",
        card_church_name_on_card: settingsData.card_church_name_on_card || "true",
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

          {/* Member Card Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Personnalisation des Cartes Membres
              </CardTitle>
              <CardDescription>
                Personnalisez l'apparence des cartes de membres avec les couleurs et le logo de votre église.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="card_primary_color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Couleur Principale
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
                    Couleur Secondaire
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
                    Couleur du Texte (En-tête)
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
                  <Label htmlFor="card_show_logo">Afficher le logo sur les cartes</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="card_church_name_on_card"
                    checked={settings.card_church_name_on_card === "true"}
                    onChange={(e) => setSettings({ ...settings, card_church_name_on_card: e.target.checked ? "true" : "false" })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="card_church_name_on_card">Afficher le nom de l'église</Label>
                </div>
              </div>

              {/* Card Preview */}
              <div className="space-y-2">
                <Label>Aperçu de la carte</Label>
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
                        ? (settings.church_name || "Nom de l'Église")
                        : "CARTE DE MEMBRE"}
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
                        <p className="text-xs text-muted-foreground">Membre</p>
                        <p className="text-xs text-muted-foreground mt-1">Né: 01/01/1990</p>
                        <p className="text-xs text-muted-foreground">Membre depuis: 15/03/2020</p>
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
                      {settings.card_church_name_on_card === "true" ? "Membre Actif" : (settings.church_name || "Nom de l'Église")}
                    </span>
                  </div>
                </div>
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
