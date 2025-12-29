import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Save, Loader2, Image, Type, Eye } from "lucide-react";

interface WhiteLabelSettings {
  app_name: string;
  app_subtitle: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export default function WhiteLabelSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<WhiteLabelSettings>({
    app_name: "Church of God",
    app_subtitle: "Ministry of Prayer and of The Word",
    logo_url: "/images/church-logo.png",
    primary_color: "#3B82F6",
    secondary_color: "#1E40AF",
    accent_color: "#8B5CF6",
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["white-label-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "app_name",
          "app_subtitle",
          "logo_url",
          "primary_color",
          "secondary_color",
          "accent_color",
        ]);

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
        app_name: settingsData.app_name || "Church of God",
        app_subtitle: settingsData.app_subtitle || "Ministry of Prayer and of The Word",
        logo_url: settingsData.logo_url || "/images/church-logo.png",
        primary_color: settingsData.primary_color || "#3B82F6",
        secondary_color: settingsData.secondary_color || "#1E40AF",
        accent_color: settingsData.accent_color || "#8B5CF6",
      });
    }
  }, [settingsData]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: WhiteLabelSettings) => {
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        // First try to update
        const { data: existing } = await supabase
          .from("church_settings")
          .select("id")
          .eq("setting_key", update.setting_key)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("church_settings")
            .update({ setting_value: update.setting_value })
            .eq("setting_key", update.setting_key);
          if (error) throw error;
        } else {
          // Insert if doesn't exist
          const { error } = await supabase
            .from("church_settings")
            .insert({ setting_key: update.setting_key, setting_value: update.setting_value });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["white-label-settings"] });
      queryClient.invalidateQueries({ queryKey: ["white-label-settings-admin"] });
      toast.success("Paramètres White-Label enregistrés avec succès");
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
          <h2 className="text-3xl font-bold tracking-tight">Personnalisation White-Label</h2>
          <p className="text-muted-foreground">
            Personnalisez l'apparence de l'application avec votre logo, nom et couleurs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Identité de Marque
              </CardTitle>
              <CardDescription>
                Définissez le nom et le logo qui apparaîtront dans toute l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Nom de l'Application</Label>
                  <Input
                    id="app_name"
                    value={settings.app_name}
                    onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                    placeholder="Church of God"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app_subtitle">Sous-titre / Slogan</Label>
                  <Input
                    id="app_subtitle"
                    value={settings.app_subtitle}
                    onChange={(e) => setSettings({ ...settings, app_subtitle: e.target.value })}
                    placeholder="Ministry of Prayer and of The Word"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL du Logo
                </Label>
                <Input
                  id="logo_url"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="/images/church-logo.png ou https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez une image carrée pour un meilleur rendu (minimum 128x128 pixels)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Couleurs de l'Application
              </CardTitle>
              <CardDescription>
                Personnalisez les couleurs principales de l'interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Couleur Principale</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Couleur Secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      placeholder="#1E40AF"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent_color">Couleur d'Accent</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent_color"
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.accent_color}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Aperçu
              </CardTitle>
              <CardDescription>
                Voici comment l'en-tête de l'application apparaîtra.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="rounded-lg border p-4"
                style={{ backgroundColor: settings.primary_color + "10" }}
              >
                <div className="flex items-center gap-3">
                  {settings.logo_url && (
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="h-12 w-12 object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h3 
                      className="font-bold text-lg"
                      style={{ color: settings.primary_color }}
                    >
                      {settings.app_name || "Nom de l'Application"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {settings.app_subtitle || "Sous-titre"}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium"
                    style={{ 
                      backgroundColor: settings.primary_color,
                      color: "white"
                    }}
                  >
                    Bouton Principal
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium"
                    style={{ 
                      backgroundColor: settings.secondary_color,
                      color: "white"
                    }}
                  >
                    Bouton Secondaire
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium"
                    style={{ 
                      backgroundColor: settings.accent_color,
                      color: "white"
                    }}
                  >
                    Accent
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
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les Paramètres
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
