import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, Database, Loader2, FileDown, CheckCircle, Shield, Users, DollarSign, Calendar, Package, ClipboardCheck, Briefcase, Church } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { exportToCsv, downloadCsv, arrayToCsv } from "@/lib/csvExport";

type ExportFormat = "xlsx" | "csv";

interface DataModule {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  table: string;
  select: string;
  description: string;
}

// Local translations to avoid HMR issues
const localT: Record<string, Record<string, string>> = {
  fr: {
    title: "Sauvegarde des Données",
    subtitle: "Exportez toutes les données de votre église pour archivage ou analyse",
    selectModules: "Modules à exporter",
    selectAll: "Tout sélectionner",
    deselectAll: "Tout désélectionner",
    exportFormat: "Format d'export",
    startExport: "Lancer l'export",
    exporting: "Export en cours...",
    exportComplete: "Export terminé !",
    exportError: "Erreur lors de l'export",
    noModuleSelected: "Veuillez sélectionner au moins un module",
    members: "Membres",
    membersDesc: "Liste complète des membres avec informations personnelles",
    donations: "Dons & Recettes",
    donationsDesc: "Historique de tous les dons et contributions",
    expenses: "Dépenses",
    expensesDesc: "Historique de toutes les dépenses approuvées",
    attendance: "Présences",
    attendanceDesc: "Enregistrements de présence aux événements",
    events: "Événements",
    eventsDesc: "Liste de tous les événements planifiés et passés",
    branches: "Branches",
    branchesDesc: "Structure organisationnelle des branches",
    ministries: "Ministères",
    ministriesDesc: "Liste des ministères et leurs membres",
    inventory: "Inventaire",
    inventoryDesc: "Articles et équipements de l'église",
    budgets: "Budgets",
    budgetsDesc: "Plans budgétaires et allocations",
    employees: "Employés",
    employeesDesc: "Liste des employés et informations salariales",
    salaryPayments: "Paiements de salaire",
    salaryDesc: "Historique des paiements de salaire",
    bankAccounts: "Comptes bancaires",
    bankDesc: "Informations sur les comptes bancaires",
    visitors: "Visiteurs",
    visitorsDesc: "Enregistrements des visiteurs",
    securityNote: "Vos données sont exportées de manière sécurisée. Seuls les administrateurs de votre église peuvent effectuer cette opération.",
    dataPrivacy: "Confidentialité des données",
    privacyDesc: "Les données exportées peuvent contenir des informations sensibles. Veuillez les stocker de manière sécurisée.",
    modulesSelected: "modules sélectionnés",
    rowsExported: "lignes exportées",
    progress: "Progression",
    downloadReady: "Téléchargement prêt",
    fileGenerated: "Fichier généré avec succès",
  },
  en: {
    title: "Data Backup",
    subtitle: "Export all your church data for archiving or analysis",
    selectModules: "Modules to export",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    exportFormat: "Export format",
    startExport: "Start export",
    exporting: "Exporting...",
    exportComplete: "Export complete!",
    exportError: "Export error",
    noModuleSelected: "Please select at least one module",
    members: "Members",
    membersDesc: "Complete list of members with personal information",
    donations: "Donations & Income",
    donationsDesc: "History of all donations and contributions",
    expenses: "Expenses",
    expensesDesc: "History of all approved expenses",
    attendance: "Attendance",
    attendanceDesc: "Attendance records for events",
    events: "Events",
    eventsDesc: "All planned and past events",
    branches: "Branches",
    branchesDesc: "Organizational branch structure",
    ministries: "Ministries",
    ministriesDesc: "List of ministries and their members",
    inventory: "Inventory",
    inventoryDesc: "Church items and equipment",
    budgets: "Budgets",
    budgetsDesc: "Budget plans and allocations",
    employees: "Employees",
    employeesDesc: "Employee list and salary information",
    salaryPayments: "Salary Payments",
    salaryDesc: "Salary payment history",
    bankAccounts: "Bank Accounts",
    bankDesc: "Bank account information",
    visitors: "Visitors",
    visitorsDesc: "Visitor records",
    securityNote: "Your data is exported securely. Only administrators of your church can perform this operation.",
    dataPrivacy: "Data Privacy",
    privacyDesc: "Exported data may contain sensitive information. Please store it securely.",
    modulesSelected: "modules selected",
    rowsExported: "rows exported",
    progress: "Progress",
    downloadReady: "Download ready",
    fileGenerated: "File generated successfully",
  },
  ht: {
    title: "Sovgad Done",
    subtitle: "Ekspòte tout done legliz ou pou achivaj oswa analiz",
    selectModules: "Modil pou ekspòte",
    selectAll: "Chwazi tout",
    deselectAll: "Dechwazi tout",
    exportFormat: "Fòma ekspòtasyon",
    startExport: "Kòmanse ekspòtasyon",
    exporting: "Ekspòtasyon ap fèt...",
    exportComplete: "Ekspòtasyon fini!",
    exportError: "Erè nan ekspòtasyon",
    noModuleSelected: "Tanpri chwazi omwen yon modil",
    members: "Manm",
    membersDesc: "Lis konplè manm yo ak enfòmasyon pèsonèl",
    donations: "Don & Resèt",
    donationsDesc: "Istwa tout don ak kontribisyon yo",
    expenses: "Depans",
    expensesDesc: "Istwa tout depans ki apwouve yo",
    attendance: "Prezans",
    attendanceDesc: "Anrejistreman prezans nan evènman yo",
    events: "Evènman",
    eventsDesc: "Tout evènman planifye ak pase yo",
    branches: "Branch",
    branchesDesc: "Estrikti òganizasyonèl branch yo",
    ministries: "Ministè",
    ministriesDesc: "Lis ministè yo ak manm yo",
    inventory: "Envantè",
    inventoryDesc: "Atik ak ekipman legliz la",
    budgets: "Bidjè",
    budgetsDesc: "Plan bidjè ak alokasyon",
    employees: "Anplwaye",
    employeesDesc: "Lis anplwaye ak enfòmasyon salè",
    salaryPayments: "Pèman Salè",
    salaryDesc: "Istwa pèman salè",
    bankAccounts: "Kont Bank",
    bankDesc: "Enfòmasyon kont bank",
    visitors: "Vizitè",
    visitorsDesc: "Anrejistreman vizitè yo",
    securityNote: "Done ou yo ekspòte an sekirite. Sèlman administratè legliz ou ka fè operasyon sa a.",
    dataPrivacy: "Konfidansyalite Done",
    privacyDesc: "Done ekspòte yo ka gen enfòmasyon sansib. Tanpri estoke yo an sekirite.",
    modulesSelected: "modil chwazi",
    rowsExported: "liy ekspòte",
    progress: "Pwogresyon",
    downloadReady: "Telechajman pare",
    fileGenerated: "Fichye jenere avèk siksè",
  },
};

const DATA_MODULES: DataModule[] = [
  { key: "members", labelKey: "members", icon: Users, table: "members", select: "*, branch:branches(name)", description: "membersDesc" },
  { key: "donations", labelKey: "donations", icon: DollarSign, table: "donations", select: "*, member:members(first_name, last_name), branch:branches(name), category:income_categories(name)", description: "donationsDesc" },
  { key: "expenses", labelKey: "expenses", icon: Briefcase, table: "expenses", select: "*, category:expense_categories(name), branch:branches(name)", description: "expensesDesc" },
  { key: "attendance", labelKey: "attendance", icon: ClipboardCheck, table: "attendance_records", select: "*, member:members(first_name, last_name)", description: "attendanceDesc" },
  { key: "events", labelKey: "events", icon: Calendar, table: "events", select: "*, branch:branches(name)", description: "eventsDesc" },
  { key: "branches", labelKey: "branches", icon: Church, table: "branches", select: "*", description: "branchesDesc" },
  { key: "ministries", labelKey: "ministries", icon: Briefcase, table: "ministries", select: "*", description: "ministriesDesc" },
  { key: "inventory", labelKey: "inventory", icon: Package, table: "inventory_items", select: "*", description: "inventoryDesc" },
  { key: "budgets", labelKey: "budgets", icon: DollarSign, table: "budgets", select: "*, category:expense_categories(name)", description: "budgetsDesc" },
  { key: "employees", labelKey: "employees", icon: Users, table: "employees", select: "*", description: "employeesDesc" },
  { key: "salaryPayments", labelKey: "salaryPayments", icon: DollarSign, table: "salary_payments", select: "*, employee:employees(first_name, last_name)", description: "salaryDesc" },
  { key: "bankAccounts", labelKey: "bankAccounts", icon: Database, table: "bank_accounts", select: "*", description: "bankDesc" },
  { key: "visitors", labelKey: "visitors", icon: Users, table: "visitors", select: "*", description: "visitorsDesc" },
];

export default function DataBackup() {
  const { language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const lt = (key: string) => localT[language]?.[key] || localT.en[key] || key;

  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(DATA_MODULES.map((m) => m.key))
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);

  const toggleModule = (key: string) => {
    const next = new Set(selectedModules);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedModules(next);
  };

  const toggleAll = () => {
    if (selectedModules.size === DATA_MODULES.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(DATA_MODULES.map((m) => m.key)));
    }
  };

  const flattenRow = (row: any): Record<string, any> => {
    const flat: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
          flat[`${key}_${subKey}`] = subValue;
        }
      } else {
        flat[key] = value;
      }
    }
    return flat;
  };

  const fetchModuleData = async (mod: DataModule): Promise<any[]> => {
    let query = supabase.from(mod.table as any).select(mod.select);
    
    // Filter by tenant_id if the table supports it
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error(`Error fetching ${mod.table}:`, error);
      return [];
    }
    return (data || []).map(flattenRow);
  };

  const handleExport = async () => {
    if (selectedModules.size === 0) {
      toast.error(lt("noModuleSelected"));
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setTotalRows(0);

    try {
      const modulesToExport = DATA_MODULES.filter((m) => selectedModules.has(m.key));
      const allData: Record<string, any[]> = {};
      let rowCount = 0;

      for (let i = 0; i < modulesToExport.length; i++) {
        const mod = modulesToExport[i];
        const data = await fetchModuleData(mod);
        allData[mod.key] = data;
        rowCount += data.length;
        setProgress(Math.round(((i + 1) / modulesToExport.length) * 90));
      }

      setTotalRows(rowCount);

      if (exportFormat === "xlsx") {
        const wb = XLSX.utils.book_new();

        for (const mod of modulesToExport) {
          const data = allData[mod.key];
          if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            const sheetName = lt(mod.labelKey).substring(0, 31); // Excel sheet name limit
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        }

        const filename = `backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
        XLSX.writeFile(wb, filename);
      } else {
        // CSV: export each module as separate CSV file
        for (const mod of modulesToExport) {
          const data = allData[mod.key];
          if (data.length > 0) {
            const columns = Object.keys(data[0]).map((key) => ({
              key,
              header: key,
            }));
            const csvContent = arrayToCsv(data, columns);
            const filename = `backup-${mod.key}-${format(new Date(), "yyyy-MM-dd-HHmm")}`;
            downloadCsv(csvContent, filename);
          }
        }
      }

      setProgress(100);
      toast.success(lt("exportComplete"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(lt("exportError"));
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{lt("title")}</h2>
          <p className="text-muted-foreground">{lt("subtitle")}</p>
        </div>

        {/* Security Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{lt("dataPrivacy")}</p>
              <p className="text-sm text-muted-foreground">{lt("privacyDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Module Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{lt("selectModules")}</CardTitle>
                    <CardDescription>
                      {selectedModules.size} {lt("modulesSelected")}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedModules.size === DATA_MODULES.length
                      ? lt("deselectAll")
                      : lt("selectAll")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DATA_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const isSelected = selectedModules.has(mod.key);
                    return (
                      <div
                        key={mod.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                        onClick={() => toggleModule(mod.key)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleModule(mod.key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Label className="font-medium cursor-pointer text-sm">
                              {lt(mod.labelKey)}
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lt(mod.description)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileDown className="h-5 w-5" />
                  {lt("exportFormat")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={exportFormat === "xlsx" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setExportFormat("xlsx")}
                  >
                    Excel (.xlsx)
                  </Button>
                  <Button
                    variant={exportFormat === "csv" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setExportFormat("csv")}
                  >
                    CSV
                  </Button>
                </div>

                {exportFormat === "csv" && (
                  <p className="text-xs text-muted-foreground">
                    {language === "fr"
                      ? "Chaque module sera téléchargé dans un fichier CSV séparé."
                      : language === "ht"
                      ? "Chak modil ap telechaje nan yon fichye CSV separe."
                      : "Each module will be downloaded as a separate CSV file."}
                  </p>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleExport}
                  disabled={isExporting || selectedModules.size === 0}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {lt("exporting")}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {lt("startExport")}
                    </>
                  )}
                </Button>

                {isExporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{lt("progress")}</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {progress === 100 && !isExporting && totalRows > 0 && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {lt("fileGenerated")} — {totalRows} {lt("rowsExported")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{lt("securityNote")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
