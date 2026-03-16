import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type FeatureKey =
  | "memberCards"
  | "attendanceAlerts"
  | "advancedReports"
  | "advancedFinance"
  | "automations"
  | "volunteerScheduling"
  | "smartInsights"
  | "customFields"
  | "branding"
  | "dataBackup"
  | "churnPrevention"
  | "attendanceArrivals"
  | "financeDashboard"
  | "budgets"
  | "bankReconciliation"
  | "specialFunds"
  | "cashRegister"
  | "financialAudit"
  | "creditsLoans"
  | "salaries";

interface FeatureLockedCardProps {
  featureKey: FeatureKey;
  requiredPlan: "essentiel" | "professionnel" | "entreprise";
  icon?: React.ReactNode;
}

const planNames = {
  essentiel: "Essentiel",
  professionnel: "Professionnel",
  entreprise: "Entreprise",
};

const planPrices = {
  essentiel: "49",
  professionnel: "99",
  entreprise: "199",
};

const featureTranslations: Record<FeatureKey, { fr: { name: string; desc: string }; en: { name: string; desc: string }; ht: { name: string; desc: string } }> = {
  memberCards: {
    fr: { name: "Cartes de membres", desc: "Générez des cartes d'identification pour vos membres" },
    en: { name: "Member Cards", desc: "Generate identification cards for your members" },
    ht: { name: "Kat manm yo", desc: "Jenere kat idantifikasyon pou manm ou yo" },
  },
  attendanceAlerts: {
    fr: { name: "Alertes de présence", desc: "Alertes automatiques pour les membres absents" },
    en: { name: "Attendance Alerts", desc: "Automatic alerts for absent members" },
    ht: { name: "Alèt prezans", desc: "Alèt otomatik pou manm ki absan" },
  },
  advancedReports: {
    fr: { name: "Rapports avancés", desc: "Rapports avancés et analyses comparatives" },
    en: { name: "Advanced Reports", desc: "Advanced reports and comparative analysis" },
    ht: { name: "Rapò avanse", desc: "Rapò avanse ak analiz konparatif" },
  },
  attendanceArrivals: {
    fr: { name: "Rapport d'arrivée", desc: "Analysez les heures d'arrivée de vos membres" },
    en: { name: "Arrival Report", desc: "Analyze your members' arrival times" },
    ht: { name: "Rapò arive", desc: "Analize lè manm ou yo rive" },
  },
  advancedFinance: {
    fr: { name: "Finance avancée", desc: "Outils financiers avancés pour votre église" },
    en: { name: "Advanced Finance", desc: "Advanced financial tools for your church" },
    ht: { name: "Finans avanse", desc: "Zouti finansye avanse pou legliz ou" },
  },
  financeDashboard: {
    fr: { name: "Tableau de bord financier", desc: "Vue d'ensemble des finances avec graphiques et analyses" },
    en: { name: "Financial Dashboard", desc: "Financial overview with charts and analysis" },
    ht: { name: "Tablo bò finansye", desc: "Apèsi jeneral finans ak grafik ak analiz" },
  },
  budgets: {
    fr: { name: "Budgets", desc: "Gestion avancée des budgets et prévisions financières" },
    en: { name: "Budgets", desc: "Advanced budget management and financial forecasting" },
    ht: { name: "Bidjè", desc: "Jesyon bidjè avanse ak previzyon finansye" },
  },
  bankReconciliation: {
    fr: { name: "Réconciliation bancaire", desc: "Rapprochement bancaire et gestion des comptes" },
    en: { name: "Bank Reconciliation", desc: "Bank reconciliation and account management" },
    ht: { name: "Rekonsilyasyon labank", desc: "Rekonsilyasyon labank ak jesyon kont" },
  },
  specialFunds: {
    fr: { name: "Fonds spéciaux", desc: "Gestion des fonds dédiés et caisses spéciales" },
    en: { name: "Special Funds", desc: "Management of dedicated funds and special accounts" },
    ht: { name: "Fon espesyal", desc: "Jesyon fon dedye ak kès espesyal" },
  },
  cashRegister: {
    fr: { name: "Caisse enregistreuse", desc: "Gestion des caisses et transactions en espèces" },
    en: { name: "Cash Register", desc: "Cash register and cash transaction management" },
    ht: { name: "Kès anrejistrèz", desc: "Jesyon kès ak tranzaksyon an lajan kach" },
  },
  financialAudit: {
    fr: { name: "Audit financier", desc: "Journal d'audit et traçabilité des opérations financières" },
    en: { name: "Financial Audit", desc: "Audit log and traceability of financial operations" },
    ht: { name: "Odit finansye", desc: "Jounal odit ak traçabilite operasyon finansye" },
  },
  creditsLoans: {
    fr: { name: "Crédits et prêts", desc: "Gestion des crédits, prêts et remboursements" },
    en: { name: "Credits & Loans", desc: "Credit, loan, and repayment management" },
    ht: { name: "Kredi ak prè", desc: "Jesyon kredi, prè ak ranbousman" },
  },
  salaries: {
    fr: { name: "Salaires", desc: "Gestion de la paie et des employés" },
    en: { name: "Salaries", desc: "Payroll and employee management" },
    ht: { name: "Salè", desc: "Jesyon pewòl ak anplwaye" },
  },
  automations: {
    fr: { name: "Automations d'engagement", desc: "Automatisez les notifications et les rappels" },
    en: { name: "Engagement Automations", desc: "Automate notifications and reminders" },
    ht: { name: "Otomatizasyon angajman", desc: "Otomatize notifikasyon ak rapèl" },
  },
  volunteerScheduling: {
    fr: { name: "Planification des bénévoles", desc: "Gérez les horaires et les rôles des bénévoles" },
    en: { name: "Volunteer Scheduling", desc: "Manage volunteer schedules and roles" },
    ht: { name: "Planifikasyon volontè", desc: "Jere orè ak wòl volontè yo" },
  },
  smartInsights: {
    fr: { name: "Smart Insights", desc: "Analyse intelligente de l'engagement et alertes pastorales" },
    en: { name: "Smart Insights", desc: "Intelligent engagement analysis and pastoral alerts" },
    ht: { name: "Smart Insights", desc: "Analiz entèlijan angajman ak alèt pastoral" },
  },
  customFields: {
    fr: { name: "Champs personnalisés", desc: "Créez des champs sur mesure pour vos entités" },
    en: { name: "Custom Fields", desc: "Create custom fields for your entities" },
    ht: { name: "Chan pèsonalize", desc: "Kreye chan sou mezire pou antite ou yo" },
  },
  branding: {
    fr: { name: "Personnalisation de marque", desc: "Personnalisez les couleurs, le logo et le nom" },
    en: { name: "Brand Customization", desc: "Customize colors, logo, and name" },
    ht: { name: "Pèsonalizasyon mak", desc: "Pèsonalize koulè, logo ak non" },
  },
  dataBackup: {
    fr: { name: "Sauvegarde des données", desc: "Exportez et sauvegardez toutes vos données" },
    en: { name: "Data Backup", desc: "Export and back up all your data" },
    ht: { name: "Sovgad done", desc: "Ekspòte epi sovgade tout done ou yo" },
  },
  churnPrevention: {
    fr: { name: "Prévention de l'attrition", desc: "Identifiez et retenez les membres à risque" },
    en: { name: "Churn Prevention", desc: "Identify and retain at-risk members" },
    ht: { name: "Prevansyon atrisyon", desc: "Idantifye epi kenbe manm ki an risk" },
  },
};

const uiTranslations = {
  fr: {
    planRequired: "Plan {plan} requis",
    startingAt: "À partir de {price}$/mois",
    upgrade: "Mettre à niveau",
    backToDashboard: "Retour au tableau de bord",
    loading: "Chargement...",
  },
  en: {
    planRequired: "{plan} plan required",
    startingAt: "Starting at ${price}/month",
    upgrade: "Upgrade",
    backToDashboard: "Back to dashboard",
    loading: "Loading...",
  },
  ht: {
    planRequired: "Plan {plan} obligatwa",
    startingAt: "Apati ${price}/mwa",
    upgrade: "Mete ajou",
    backToDashboard: "Retounen nan tablo bò",
    loading: "Chajman...",
  },
};

export type { FeatureKey };
export { featureTranslations, uiTranslations };

export function FeatureLockedCard({ 
  featureKey, 
  requiredPlan,
  icon 
}: FeatureLockedCardProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = uiTranslations[language] || uiTranslations.en;
  const ft = featureTranslations[featureKey]?.[language] || featureTranslations[featureKey]?.en;

  return (
    <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] px-4">
      <Card className="max-w-lg w-full border-2 border-dashed border-muted-foreground/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
            {icon || <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />}
          </div>
          <CardTitle className="text-xl sm:text-2xl">{ft?.name}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {ft?.desc}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="font-semibold text-base sm:text-lg">
                {t.planRequired.replace("{plan}", planNames[requiredPlan])}
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t.startingAt.replace("{price}", planPrices[requiredPlan])}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button 
              onClick={() => navigate("/settings/subscription")}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-sm sm:text-base"
            >
              {t.upgrade}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="w-full text-sm sm:text-base"
            >
              {t.backToDashboard}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
