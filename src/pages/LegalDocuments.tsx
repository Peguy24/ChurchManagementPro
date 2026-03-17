import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Save, Loader2, Eye, Globe, Shield, CreditCard } from "lucide-react";

interface LegalDocument {
  id: string;
  document_type: string;
  title_fr: string;
  title_en: string;
  title_ht: string;
  content_fr: string;
  content_en: string;
  content_ht: string;
  version: number;
  is_active: boolean;
  updated_at: string;
}

const translations = {
  fr: {
    title: "Documents Juridiques",
    desc: "Gérez les politiques que les églises doivent accepter lors de l'inscription",
    terms: "Conditions d'Utilisation",
    privacy: "Politique de Confidentialité",
    payment: "Conditions de Paiement",
    titleLabel: "Titre",
    contentLabel: "Contenu",
    french: "Français",
    english: "Anglais",
    creole: "Créole",
    save: "Enregistrer",
    saving: "Enregistrement...",
    saved: "Document enregistré avec succès",
    version: "Version",
    active: "Actif",
    inactive: "Inactif",
    preview: "Aperçu",
    lastUpdated: "Dernière mise à jour",
    acceptances: "Acceptations",
    noAcceptances: "Aucune acceptation enregistrée",
    church: "Église",
    acceptedBy: "Accepté par",
    date: "Date",
  },
  en: {
    title: "Legal Documents",
    desc: "Manage the policies that churches must accept during registration",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    payment: "Payment Terms",
    titleLabel: "Title",
    contentLabel: "Content",
    french: "French",
    english: "English",
    creole: "Creole",
    save: "Save",
    saving: "Saving...",
    saved: "Document saved successfully",
    version: "Version",
    active: "Active",
    inactive: "Inactive",
    preview: "Preview",
    lastUpdated: "Last updated",
    acceptances: "Acceptances",
    noAcceptances: "No acceptances recorded",
    church: "Church",
    acceptedBy: "Accepted by",
    date: "Date",
  },
  ht: {
    title: "Dokiman Legal",
    desc: "Jere politik ke legliz yo dwe aksepte lè yo enskri",
    terms: "Kondisyon Itilizasyon",
    privacy: "Politik Konfidansyalite",
    payment: "Kondisyon Peman",
    titleLabel: "Tit",
    contentLabel: "Kontni",
    french: "Franse",
    english: "Angle",
    creole: "Kreyòl",
    save: "Anrejistre",
    saving: "Anrejistreman...",
    saved: "Dokiman anrejistre avèk siksè",
    version: "Vèsyon",
    active: "Aktif",
    inactive: "Inaktif",
    preview: "Apèsi",
    lastUpdated: "Dènye mizajou",
    acceptances: "Akseptasyon",
    noAcceptances: "Pa gen akseptasyon anrejistre",
    church: "Legliz",
    acceptedBy: "Aksepte pa",
    date: "Dat",
  },
};

const docIcons: Record<string, any> = {
  terms_of_use: FileText,
  privacy_policy: Shield,
  payment_terms: CreditCard,
};

export default function LegalDocuments() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const [activeDoc, setActiveDoc] = useState("terms_of_use");
  const [editLang, setEditLang] = useState("fr");
  const [editData, setEditData] = useState<Record<string, any>>({});

  const { data: documents, isLoading } = useQuery({
    queryKey: ["legal-documents"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_documents")
        .select("*")
        .order("document_type");
      if (error) throw error;
      return data as LegalDocument[];
    },
  });

  const { data: acceptances } = useQuery({
    queryKey: ["policy-acceptances"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenant_policy_acceptances")
        .select("*, tenants:tenant_id(name)")
        .order("accepted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (doc: Partial<LegalDocument> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("legal_documents")
        .update({
          ...doc,
          version: (doc.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      toast.success(t.saved);
    },
  });

  const currentDoc = documents?.find((d) => d.document_type === activeDoc);

  const getEditValue = (field: string) => {
    if (editData[activeDoc]?.[field] !== undefined) return editData[activeDoc][field];
    return (currentDoc as any)?.[field] || "";
  };

  const setEditValue = (field: string, value: string | boolean) => {
    setEditData((prev) => ({
      ...prev,
      [activeDoc]: { ...prev[activeDoc], [field]: value },
    }));
  };

  const handleSave = () => {
    if (!currentDoc) return;
    saveMutation.mutate({
      id: currentDoc.id,
      version: currentDoc.version,
      ...editData[activeDoc],
    });
  };

  const docTypes = [
    { key: "terms_of_use", label: t.terms },
    { key: "privacy_policy", label: t.privacy },
    { key: "payment_terms", label: t.payment },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.desc}</p>
        </div>

        <Tabs value={activeDoc} onValueChange={setActiveDoc}>
          <TabsList>
            {docTypes.map((dt) => {
              const Icon = docIcons[dt.key] || FileText;
              return (
                <TabsTrigger key={dt.key} value={dt.key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {dt.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {docTypes.map((dt) => (
            <TabsContent key={dt.key} value={dt.key}>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : currentDoc ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={currentDoc.is_active ? "default" : "secondary"}>
                        {currentDoc.is_active ? t.active : t.inactive}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t.version} {currentDoc.version}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t.lastUpdated}: {new Date(currentDoc.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="active-toggle">{t.active}</Label>
                      <Switch
                        id="active-toggle"
                        checked={getEditValue("is_active") !== false && (getEditValue("is_active") || currentDoc.is_active)}
                        onCheckedChange={(v) => setEditValue("is_active", v)}
                      />
                    </div>
                  </div>

                  <Tabs value={editLang} onValueChange={setEditLang}>
                    <TabsList>
                      <TabsTrigger value="fr">🇫🇷 {t.french}</TabsTrigger>
                      <TabsTrigger value="en">🇺🇸 {t.english}</TabsTrigger>
                      <TabsTrigger value="ht">🇭🇹 {t.creole}</TabsTrigger>
                    </TabsList>

                    {["fr", "en", "ht"].map((lang) => (
                      <TabsContent key={lang} value={lang} className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t.titleLabel}</Label>
                          <Input
                            value={getEditValue(`title_${lang}`)}
                            onChange={(e) => setEditValue(`title_${lang}`, e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.contentLabel}</Label>
                          <Textarea
                            value={getEditValue(`content_${lang}`)}
                            onChange={(e) => setEditValue(`content_${lang}`, e.target.value)}
                            rows={15}
                            className="font-mono text-sm"
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {saveMutation.isPending ? t.saving : t.save}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/legal/${activeDoc}`, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t.preview}
                    </Button>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>

        {/* Acceptances section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.acceptances}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!acceptances?.length ? (
              <p className="text-muted-foreground text-sm">{t.noAcceptances}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">{t.church}</th>
                      <th className="text-left py-2 px-3">Document</th>
                      <th className="text-left py-2 px-3">{t.acceptedBy}</th>
                      <th className="text-left py-2 px-3">{t.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptances.map((a: any) => (
                      <tr key={a.id} className="border-b">
                        <td className="py-2 px-3">{a.tenants?.name || "—"}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{a.document_type}</Badge>
                        </td>
                        <td className="py-2 px-3">{a.accepted_by_name || a.accepted_by_email || "—"}</td>
                        <td className="py-2 px-3">{new Date(a.accepted_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
