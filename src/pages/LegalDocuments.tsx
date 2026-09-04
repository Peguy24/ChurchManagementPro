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
import { FileText, Save, Loader2, Eye, Globe, Shield, CreditCard, Download } from "lucide-react";

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
    allDocs: "Tous les documents",
    allChurches: "Toutes les églises",
    exportCsv: "Exporter CSV",
    current: "À jour",
    outdated: "Obsolète",
    notifyLabel: "Notifier les églises par email",
    notifySent: "Notification envoyée aux églises",
    notifyFailed: "Échec de l'envoi des notifications",
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
    allDocs: "All documents",
    allChurches: "All churches",
    exportCsv: "Export CSV",
    current: "Current",
    outdated: "Outdated",
    notifyLabel: "Notify churches by email",
    notifySent: "Notification sent to churches",
    notifyFailed: "Could not send notifications",
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
    allDocs: "Tout dokiman",
    allChurches: "Tout legliz",
    exportCsv: "Ekspòte CSV",
    current: "Ajou",
    outdated: "Fin itilize",
    notifyLabel: "Avize legliz yo pa imel",
    notifySent: "Notifikasyon voye bay legliz yo",
    notifyFailed: "Nou pa ka voye notifikasyon yo",
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
  const [notifyChurches, setNotifyChurches] = useState(false);
  const [filterDoc, setFilterDoc] = useState("all");
  const [filterTenant, setFilterTenant] = useState("all");

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
        .limit(1000);
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

      if (notifyChurches) {
        const { error: notifyError } = await supabase.functions.invoke("notify-policy-update", {
          body: { documentType: activeDoc },
        });
        if (notifyError) throw new Error("notify_failed");
        return { notified: true };
      }
      return { notified: false };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["policy-acceptances"] });
      toast.success(t.saved);
      if (res?.notified) toast.success(t.notifySent);
    },
    onError: (e: any) => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      toast.error(e?.message === "notify_failed" ? t.notifyFailed : String(e?.message || e));
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

  const filteredAcceptances = ((acceptances || []) as any[]).filter(
    (a) =>
      (filterDoc === "all" || a.document_type === filterDoc) &&
      (filterTenant === "all" || a.tenant_id === filterTenant)
  );

  const churchOptions = Array.from(
    new Map(
      ((acceptances || []) as any[])
        .filter((a) => a.tenant_id)
        .map((a) => [a.tenant_id as string, { id: a.tenant_id as string, name: a.tenants?.name || a.tenant_id }])
    ).values()
  ).sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const exportCsv = () => {
    const header = ["Church", "Document", "Version", "Accepted by", "Email", "Date", "IP"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filteredAcceptances.map((a: any) => [
      a.tenants?.name || "",
      a.document_type,
      a.document_version,
      a.accepted_by_name || "",
      a.accepted_by_email || "",
      new Date(a.accepted_at).toLocaleString(),
      a.ip_address || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `policy-acceptances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const docTypes = [
    { key: "terms_of_use", label: t.terms },
    { key: "privacy_policy", label: t.privacy },
    { key: "payment_terms", label: t.payment },
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
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

                  <div className="flex flex-wrap items-center gap-3">
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
                    <div className="flex items-center gap-2">
                      <Switch id="notify-toggle" checked={notifyChurches} onCheckedChange={setNotifyChurches} />
                      <Label htmlFor="notify-toggle" className="text-sm">{t.notifyLabel}</Label>
                    </div>
                  </div>

                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>

        {/* Acceptances section */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.acceptances}
              {filteredAcceptances.length > 0 && (
                <Badge variant="secondary">{filteredAcceptances.length}</Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDoc}
                onChange={(e) => setFilterDoc(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">{t.allDocs}</option>
                {docTypes.map((dt) => (
                  <option key={dt.key} value={dt.key}>{dt.label}</option>
                ))}
              </select>
              <select
                value={filterTenant}
                onChange={(e) => setFilterTenant(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[200px]"
              >
                <option value="all">{t.allChurches}</option>
                {churchOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredAcceptances.length}>
                <Download className="h-4 w-4 mr-2" />
                {t.exportCsv}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!filteredAcceptances.length ? (
              <p className="text-muted-foreground text-sm">{t.noAcceptances}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">{t.church}</th>
                      <th className="text-left py-2 px-3">Document</th>
                      <th className="text-left py-2 px-3">{t.version}</th>
                      <th className="text-left py-2 px-3">{t.acceptedBy}</th>
                      <th className="text-left py-2 px-3">{t.date}</th>
                      <th className="text-left py-2 px-3">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAcceptances.map((a: any) => {
                      const current = documents?.find((d) => d.document_type === a.document_type)?.version ?? a.document_version;
                      const isCurrent = a.document_version >= current;
                      return (
                        <tr key={a.id} className="border-b">
                          <td className="py-2 px-3">{a.tenants?.name || "—"}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline">{a.document_type}</Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={isCurrent ? "default" : "destructive"}>
                              v{a.document_version} · {isCurrent ? t.current : t.outdated}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <div>{a.accepted_by_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{a.accepted_by_email || ""}</div>
                          </td>
                          <td className="py-2 px-3">{new Date(a.accepted_at).toLocaleString()}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{a.ip_address || "—"}</td>
                        </tr>
                      );
                    })}
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
