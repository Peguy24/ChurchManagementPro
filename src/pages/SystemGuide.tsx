import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateSystemGuidePDF } from "@/lib/systemGuidePDF";
import { Download, FileText, Users, DollarSign, ClipboardCheck, Calendar, Package, BarChart3, Shield, Sparkles, Mail, Building2 } from "lucide-react";

const sections = [
  { icon: Users, key: "members" },
  { icon: ClipboardCheck, key: "attendance" },
  { icon: DollarSign, key: "finances" },
  { icon: Calendar, key: "events" },
  { icon: Building2, key: "branches" },
  { icon: BarChart3, key: "reports" },
  { icon: Package, key: "inventory" },
  { icon: Mail, key: "communication" },
  { icon: Sparkles, key: "ai" },
  { icon: Shield, key: "security" },
];

const sectionLabels: Record<string, Record<string, string>> = {
  fr: {
    members: "Gestion des Membres",
    attendance: "Gestion de la Présence",
    finances: "Gestion Financière",
    events: "Événements et Ministères",
    branches: "Gestion Multi-Branches",
    reports: "Rapports et Tableaux de Bord",
    inventory: "Gestion de l'Inventaire",
    communication: "Communication",
    ai: "Analyses Intelligentes (IA)",
    security: "Sécurité et Contrôle d'Accès",
  },
  en: {
    members: "Member Management",
    attendance: "Attendance Management",
    finances: "Financial Management",
    events: "Events & Ministries",
    branches: "Multi-Branch Management",
    reports: "Reports & Dashboards",
    inventory: "Inventory Management",
    communication: "Communication",
    ai: "Smart Insights (AI)",
    security: "Security & Access Control",
  },
};

export default function SystemGuide() {
  const { language, t } = useLanguage();
  const lang = language === "fr" ? "fr" : "en";
  const labels = sectionLabels[lang];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {lang === "fr" ? "Guide du Système" : "System Guide"}
            </h1>
            <p className="text-muted-foreground">
              {lang === "fr"
                ? "Téléchargez un document PDF décrivant toutes les fonctionnalités pour votre leadership."
                : "Download a PDF document describing all features for your leadership."}
            </p>
          </div>
          <Button size="lg" onClick={() => generateSystemGuidePDF(lang)} className="gap-2">
            <Download className="h-5 w-5" />
            {lang === "fr" ? "Télécharger le PDF" : "Download PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {lang === "fr" ? "Contenu du Document" : "Document Contents"}
            </CardTitle>
            <CardDescription>
              {lang === "fr"
                ? "Le PDF inclut les sections suivantes :"
                : "The PDF includes the following sections:"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sections.map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{labels[key]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
