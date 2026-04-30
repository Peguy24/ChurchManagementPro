import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISO, clampNotFuture } from "@/lib/inputSanitize";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, CalendarCheck, DollarSign, Receipt, Loader2, AlertTriangle, Search, History } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTenantRole } from "@/hooks/useTenantRole";
import { toast } from "sonner";
import { format, subYears } from "date-fns";

const translations = {
  fr: {
    title: "Gestion des Données",
    subtitle: "Archiver les anciens enregistrements pour optimiser les performances",
    attendance: "Présences",
    attendanceDesc: "Enregistrements de présence",
    donations: "Cotisations / Revenus",
    donationsDesc: "Enregistrements de cotisations",
    expenses: "Dépenses",
    expensesDesc: "Enregistrements de dépenses",
    archiveOlderThan: "Archiver les données antérieures au :",
    preview: "Aperçu",
    archive: "Archiver",
    records: "enregistrements",
    willBeArchived: "seront archivés",
    financialWarning: "⚠ Données financières — exportez vos données avant d'archiver",
    confirmTitle: "Confirmer l'archivage",
    confirmDesc: "Êtes-vous sûr de vouloir archiver {count} {type} antérieurs au {date} ? Les données seront déplacées vers les tables d'archive et resteront consultables en lecture seule.",
    confirm: "Confirmer l'archivage",
    cancel: "Annuler",
    archiving: "Archivage en cours...",
    previewing: "Calcul...",
    successArchived: "enregistrements archivés avec succès",
    archiveHistory: "Historique des archivages",
    noHistory: "Aucun archivage effectué",
    date: "Date",
    type: "Type",
    count: "Nombre",
    before: "Avant le",
    archivedBy: "Par",
  },
  en: {
    title: "Data Management",
    subtitle: "Archive old records to optimize performance",
    attendance: "Attendance",
    attendanceDesc: "Attendance records",
    donations: "Donations / Income",
    donationsDesc: "Donation records",
    expenses: "Expenses",
    expensesDesc: "Expense records",
    archiveOlderThan: "Archive data older than:",
    preview: "Preview",
    archive: "Archive",
    records: "records",
    willBeArchived: "will be archived",
    financialWarning: "⚠ Financial data — export your data before archiving",
    confirmTitle: "Confirm Archive",
    confirmDesc: "Are you sure you want to archive {count} {type} records before {date}? Data will be moved to archive tables and remain accessible as read-only.",
    confirm: "Confirm Archive",
    cancel: "Cancel",
    archiving: "Archiving...",
    previewing: "Counting...",
    successArchived: "records archived successfully",
    archiveHistory: "Archive History",
    noHistory: "No archives performed yet",
    date: "Date",
    type: "Type",
    count: "Count",
    before: "Before",
    archivedBy: "By",
  },
  ht: {
    title: "Jesyon Done",
    subtitle: "Achive ansyen done pou amelyore pèfòmans",
    attendance: "Prezans",
    attendanceDesc: "Anrejistreman prezans",
    donations: "Kotizasyon / Revni",
    donationsDesc: "Anrejistreman kotizasyon",
    expenses: "Depans",
    expensesDesc: "Anrejistreman depans",
    archiveOlderThan: "Achive done ki pi ansyen pase :",
    preview: "Apèsi",
    archive: "Achive",
    records: "anrejistreman",
    willBeArchived: "pral achive",
    financialWarning: "⚠ Done finansyè — ekspòte done ou anvan ou achive",
    confirmTitle: "Konfime Achivaj",
    confirmDesc: "Èske ou sèten ou vle achive {count} {type} anrejistreman anvan {date} ? Done yo pral deplase nan tab achiv epi rete aksesib an lekti sèlman.",
    confirm: "Konfime Achivaj",
    cancel: "Anile",
    archiving: "Ap achive...",
    previewing: "Ap kalkile...",
    successArchived: "anrejistreman achive avèk siksè",
    archiveHistory: "Istwa Achivaj",
    noHistory: "Pa gen achivaj fèt ankò",
    date: "Dat",
    type: "Tip",
    count: "Kantite",
    before: "Anvan",
    archivedBy: "Pa",
  },
};

interface ArchiveCardProps {
  dataType: "attendance" | "donations" | "expenses";
  title: string;
  description: string;
  icon: React.ReactNode;
  isFinancial: boolean;
  tenantId: string;
  lt: typeof translations.fr;
  onArchiveComplete: () => void;
}

function ArchiveCard({ dataType, title, description, icon, isFinancial, tenantId, lt, onArchiveComplete }: ArchiveCardProps) {
  const defaultDate = format(subYears(new Date(), 1), "yyyy-MM-dd");
  const [beforeDate, setBeforeDate] = useState(defaultDate);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-data-archive", {
        body: { tenant_id: tenantId, data_type: dataType, before_date: beforeDate, dry_run: true },
      });
      if (error) throw error;
      setPreviewCount(data.count);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleArchive = async () => {
    setShowConfirm(false);
    setIsArchiving(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-data-archive", {
        body: { tenant_id: tenantId, data_type: dataType, before_date: beforeDate, dry_run: false },
      });
      if (error) throw error;
      toast.success(`${data.archived} ${lt.successArchived}`);
      setPreviewCount(null);
      onArchiveComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFinancial && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {lt.financialWarning}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{lt.archiveOlderThan}</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={beforeDate}
                max={todayISO()}
                onChange={(e) => {
                  setBeforeDate(clampNotFuture(e.target.value));
                  setPreviewCount(null);
                }}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPreviewing}>
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                {isPreviewing ? lt.previewing : lt.preview}
              </Button>
            </div>
          </div>

          {previewCount !== null && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">
                <span className="font-bold text-primary">{previewCount}</span> {lt.records} {lt.willBeArchived}
              </span>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={previewCount === 0 || isArchiving}
              >
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                {isArchiving ? lt.archiving : lt.archive}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lt.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {lt.confirmDesc
                .replace("{count}", String(previewCount))
                .replace("{type}", title.toLowerCase())
                .replace("{date}", beforeDate)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lt.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>{lt.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function DataManagement() {
  const { language } = useLanguage();
  const lt = translations[language] || translations.fr;
  const { tenantId } = useTenantRole();
  const queryClient = useQueryClient();

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["data-cleanup-logs", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("data_cleanup_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const handleArchiveComplete = () => {
    refetchLogs();
    queryClient.invalidateQueries();
  };

  if (!tenantId) return null;

  const typeLabels: Record<string, string> = {
    attendance: lt.attendance,
    donations: lt.donations,
    expenses: lt.expenses,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Archive className="h-8 w-8" />
            {lt.title}
          </h1>
          <p className="text-muted-foreground mt-1">{lt.subtitle}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          <ArchiveCard
            dataType="attendance"
            title={lt.attendance}
            description={lt.attendanceDesc}
            icon={<CalendarCheck className="h-5 w-5 text-green-600" />}
            isFinancial={false}
            tenantId={tenantId}
            lt={lt}
            onArchiveComplete={handleArchiveComplete}
          />
          <ArchiveCard
            dataType="donations"
            title={lt.donations}
            description={lt.donationsDesc}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            isFinancial={true}
            tenantId={tenantId}
            lt={lt}
            onArchiveComplete={handleArchiveComplete}
          />
          <ArchiveCard
            dataType="expenses"
            title={lt.expenses}
            description={lt.expensesDesc}
            icon={<Receipt className="h-5 w-5 text-red-600" />}
            isFinancial={true}
            tenantId={tenantId}
            lt={lt}
            onArchiveComplete={handleArchiveComplete}
          />
        </div>

        {/* Archive History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {lt.archiveHistory}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">{lt.noHistory}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lt.date}</TableHead>
                    <TableHead>{lt.type}</TableHead>
                    <TableHead>{lt.count}</TableHead>
                    <TableHead>{lt.before}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeLabels[log.data_type] || log.data_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.records_archived}</TableCell>
                      <TableCell>{log.date_before}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
