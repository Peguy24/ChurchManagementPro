import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Save, Loader2, Image, Type, Eye } from "lucide-react";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

export default function TenantBranding() {
  const queryClient = useQueryClient();
  const { tenant, tenantId, loading: tenantLoading } = useCurrentTenant();
  
  const [settings, setSettings] = useState({
    name: "",
    logo_url: "",
    primary_color: "#6366f1",
  });

  useEffect(() => {
    if (tenant) {
      setSettings({
        name: tenant.name || "",
        logo_url: tenant.logo_url || "",
        primary_color: tenant.primary_color || "#6366f1",
      });
    }
  }, [tenant]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      if (!tenantId) throw new Error("No tenant ID");
      
      const { error } = await supabase
        .from("tenants")
        .update({
          name: newSettings.name,
          logo_url: newSettings.logo_url || null,
          primary_color: newSettings.primary_color,
        })
        .eq("id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["white-label-settings"] });
      toast.success("Paramètres de marque enregistrés avec succès");
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

  if (tenantLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Personnalisation de Marque</h2>
          <p className="text-muted-foreground">
            Personnalisez l'apparence de votre espace avec votre logo, nom et couleur.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Identité de Votre Église
              </CardTitle>
              <CardDescription>
                Définissez le nom et le logo qui apparaîtront dans toute l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'Église</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="Mon Église"
                />
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
                  placeholder="https://example.com/logo.png"
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
                Couleur Principale
              </CardTitle>
              <CardDescription>
                Choisissez la couleur qui représente votre église.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="primary_color">Couleur</Label>
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
                    placeholder="#6366f1"
                    className="flex-1"
                  />
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
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="h-12 w-12 object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      {settings.name?.charAt(0) || "E"}
                    </div>
                  )}
                  <div>
                    <h3 
                      className="font-bold text-lg"
                      style={{ color: settings.primary_color }}
                    >
                      {settings.name || "Nom de l'Église"}
                    </h3>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: settings.primary_color }}
                  >
                    Bouton Principal
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
