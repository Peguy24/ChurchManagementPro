import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Palette, Search, Save, Loader2, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "White-Label Management",
    subtitle: "Manage visual branding for each church",
    allChurches: "All Churches",
    desc: "Edit name, logo, and colors for each church",
    search: "Search a church...",
    logo: "Logo",
    color: "Color",
    primaryColor: "Primary Color",
    editBranding: "Edit Branding",
    saved: "Branding updated successfully",
    error: "Error updating branding",
    noResults: "No churches found",
    churchName: "Church Name",
    slug: "Slug (URL)",
    actions: "Actions",
    edit: "Edit",
    cancel: "Cancel",
    save: "Save",
    preview: "Preview",
    primaryButton: "Primary Button",
  },
  fr: {
    title: "Gestion White-Label",
    subtitle: "Gérez la personnalisation visuelle de chaque église",
    allChurches: "Toutes les Églises",
    desc: "Modifier le nom, le logo et les couleurs de chaque église",
    search: "Rechercher une église...",
    logo: "Logo",
    color: "Couleur",
    primaryColor: "Couleur Principale",
    editBranding: "Modifier le Branding",
    saved: "Branding mis à jour avec succès",
    error: "Erreur lors de la mise à jour",
    noResults: "Aucune église trouvée",
    churchName: "Nom de l'église",
    slug: "Slug (URL)",
    actions: "Actions",
    edit: "Modifier",
    cancel: "Annuler",
    save: "Enregistrer",
    preview: "Aperçu",
    primaryButton: "Bouton Principal",
  },
  ht: {
    title: "Jesyon White-Label",
    subtitle: "Jere pèsonalizasyon vizyèl chak legliz",
    allChurches: "Tout Legliz",
    desc: "Modifye non, logo ak koulè chak legliz",
    search: "Chèche yon legliz...",
    logo: "Logo",
    color: "Koulè",
    primaryColor: "Koulè Prensipal",
    editBranding: "Modifye Branding",
    saved: "Branding mete ajou avèk siksè",
    error: "Erè pandan miz ajou",
    noResults: "Pa gen legliz jwenn",
    churchName: "Non Legliz",
    slug: "Slug (URL)",
    actions: "Aksyon",
    edit: "Modifye",
    cancel: "Anile",
    save: "Anrejistre",
    preview: "Apèsi",
    primaryButton: "Bouton Prensipal",
  },
};

export default function WhiteLabelManager() {
  const { language } = useLanguage();
  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", primary_color: "#6366f1", logo_url: "" });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["all-tenants-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, contact_email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const updateBranding = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; primary_color: string; logo_url: string }) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: updates.name,
          primary_color: updates.primary_color,
          logo_url: updates.logo_url || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants-branding"] });
      toast.success(t("superAdmin.whiteLabel.saved"));
      setEditingTenant(null);
    },
    onError: () => toast.error(t("superAdmin.whiteLabel.error")),
  });

  const filtered = tenants?.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name || "",
      primary_color: tenant.primary_color || "#6366f1",
      logo_url: tenant.logo_url || "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("superAdmin.whiteLabel.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("superAdmin.whiteLabel.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("superAdmin.whiteLabel.allChurches")}
            </CardTitle>
            <CardDescription>{t("superAdmin.whiteLabel.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("superAdmin.whiteLabel.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("superAdmin.whiteLabel.logo")}</TableHead>
                      <TableHead>{t("superAdmin.churchName")}</TableHead>
                      <TableHead>{t("superAdmin.whiteLabel.color")}</TableHead>
                      <TableHead>{t("superAdmin.slug")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t("superAdmin.whiteLabel.noResults")}
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          {tenant.logo_url ? (
                            <img
                              src={tenant.logo_url}
                              alt={tenant.name}
                              className="h-8 w-8 rounded object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div
                              className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: tenant.primary_color || "#6366f1" }}
                            >
                              {tenant.name?.charAt(0) || "?"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-5 w-5 rounded border"
                              style={{ backgroundColor: tenant.primary_color || "#6366f1" }}
                            />
                            <span className="text-xs text-muted-foreground">{tenant.primary_color || "#6366f1"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEdit(tenant)}>
                            <Palette className="mr-1 h-3 w-3" />
                            {t("common.edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("superAdmin.whiteLabel.editBranding")}: {editingTenant?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("superAdmin.churchName")}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("superAdmin.whiteLabel.primaryColor")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editForm.primary_color}
                    onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={editForm.primary_color}
                    onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Eye className="h-3 w-3" />{t("tenant.preview")}</Label>
                <div className="rounded-lg border p-4" style={{ backgroundColor: editForm.primary_color + "10" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: editForm.primary_color }}
                    >
                      {editForm.name?.charAt(0) || "?"}
                    </div>
                    <span className="font-bold" style={{ color: editForm.primary_color }}>{editForm.name}</span>
                  </div>
                  <div className="mt-3">
                    <div
                      className="px-3 py-1.5 rounded text-xs font-medium text-white inline-block"
                      style={{ backgroundColor: editForm.primary_color }}
                    >
                      {t("tenant.primaryButton")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTenant(null)}>{t("common.cancel")}</Button>
              <Button
                onClick={() => updateBranding.mutate({ id: editingTenant.id, ...editForm })}
                disabled={updateBranding.isPending}
              >
                {updateBranding.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
