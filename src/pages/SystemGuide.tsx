import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateSystemGuidePDF, getGuideSections } from "@/lib/systemGuidePDF";
import { ALL_FEATURE_KEYS, FeatureKey, usePlanLimits } from "@/hooks/usePlanLimits";
import {
  BarChart3, BookOpen, Building2, Calendar, ClipboardCheck, DollarSign, Download,
  FileText, Globe, HandCoins, Mail, Package, Settings, Shield, Sparkles, Users,
} from "lucide-react";

const sectionIcons: Record<string, typeof Users> = {
  members: Users,
  attendance: ClipboardCheck,
  finances: DollarSign,
  giving: HandCoins,
  events: Calendar,
  branches: Building2,
  reports: BarChart3,
  inventory: Package,
  communication: Mail,
  website: Globe,
  insights: Sparkles,
  settings: Settings,
  security: Shield,
};

export default function SystemGuide() {
  const { language } = useLanguage();
  const { hasFeature, isGlobalFeatureEnabled } = usePlanLimits();
  const lang = language === "fr" ? "fr" : "en";

  // A feature key is either a plan feature (camelCase) or a global platform flag (snake_case)
  const isEnabled = (flag: string) =>
    (ALL_FEATURE_KEYS as readonly string[]).includes(flag)
      ? hasFeature(flag as FeatureKey)
      : isGlobalFeatureEnabled(flag);

  const sections = getGuideSections(lang, isEnabled);
  const featureCount = sections.reduce((sum, s) => sum + s.features.length, 0);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                {lang === "fr" ? "Guide du Système" : "System Guide"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Téléchargez un PDF décrivant les fonctionnalités disponibles pour votre église."
                  : "Download a PDF describing the features available to your church."}
              </p>
            </div>
          </div>
          <Button size="lg" onClick={() => generateSystemGuidePDF(lang, isEnabled)} className="gap-2">
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
                ? `Le PDF inclut ${sections.length} sections et ${featureCount} fonctionnalités actuellement activées pour votre église :`
                : `The PDF includes ${sections.length} sections and ${featureCount} features currently enabled for your church:`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sections.map((section, idx) => {
                const Icon = sectionIcons[section.id] ?? FileText;
                return (
                  <div key={section.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{idx + 1}. {section.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {section.features.length}{" "}
                        {lang === "fr" ? "fonctionnalités" : "features"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
