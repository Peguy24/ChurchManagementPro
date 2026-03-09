import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Shield, FileSpreadsheet, FileText, Search, Eye, Activity, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))"];

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    totalActions: "Total Actions",
    creations: "Creations",
    modifications: "Modifications",
    deletions: "Deletions",
    users: "Users",
    dailyActivity: "Daily Activity",
    actionsLast30Days: "Actions over the last 30 days",
    byActionType: "By Action Type",
    auditLog: "Audit Log",
    financialDataHistory: "History of actions on financial data",
    dateTime: "Date/Time",
    user: "User",
    entity: "Entity",
    action: "Action",
    details: "Details",
    loading: "Loading...",
    noAuditRecords: "No audit records",
    actionDetails: "Action Details",
    oldValues: "Old values",
    newValues: "New values",
    search: "Search...",
    entityType: "Entity type",
    allEntities: "All entities",
    donations: "Donations",
    expenses: "Expenses",
    budgets: "Budgets",
    bankTransactions: "Bank Trans.",
    cashTransactions: "Cash Trans.",
    specialFunds: "Special Funds",
    fundTransactions: "Fund Trans.",
    allActions: "All",
    create: "Creation",
    update: "Modification",
    delete: "Deletion",
    auditReport: "Audit Report",
    date: "Date",
    statistics: "Statistics",
    activeUsers: "Active Users",
    entityId: "Entity ID",
    actions: "Actions",
  },
  fr: {
    totalActions: "Total Actions",
    creations: "Créations",
    modifications: "Modifications",
    deletions: "Suppressions",
    users: "Utilisateurs",
    dailyActivity: "Activité Journalière",
    actionsLast30Days: "Actions sur les 30 derniers jours",
    byActionType: "Par Type d'Action",
    auditLog: "Journal d'Audit",
    financialDataHistory: "Historique des actions sur les données financières",
    dateTime: "Date/Heure",
    user: "Utilisateur",
    entity: "Entité",
    action: "Action",
    details: "Détails",
    loading: "Chargement...",
    noAuditRecords: "Aucun enregistrement d'audit",
    actionDetails: "Détails de l'action",
    oldValues: "Anciennes valeurs",
    newValues: "Nouvelles valeurs",
    search: "Rechercher...",
    entityType: "Type d'entité",
    allEntities: "Toutes les entités",
    donations: "Dons",
    expenses: "Dépenses",
    budgets: "Budgets",
    bankTransactions: "Trans. Bancaires",
    cashTransactions: "Trans. Caisse",
    specialFunds: "Fonds Spéciaux",
    fundTransactions: "Trans. Fonds",
    allActions: "Toutes",
    create: "Création",
    update: "Modification",
    delete: "Suppression",
    auditReport: "Rapport d'Audit",
    date: "Date",
    statistics: "Statistiques",
    activeUsers: "Utilisateurs Actifs",
    entityId: "ID Entité",
    actions: "Actions",
  },
  ht: {
    totalActions: "Total Aksyon",
    creations: "Kreyasyon",
    modifications: "Modifikasyon",
    deletions: "Sipresyon",
    users: "Itilizatè",
    dailyActivity: "Aktivite Jounen",
    actionsLast30Days: "Aksyon sou 30 dènye jou yo",
    byActionType: "Pa Tip Aksyon",
    auditLog: "Jounal Odit",
    financialDataHistory: "Istwa aksyon sou done finansye yo",
    dateTime: "Dat/Lè",
    user: "Itilizatè",
    entity: "Antite",
    action: "Aksyon",
    details: "Detay",
    loading: "Chajman...",
    noAuditRecords: "Pa gen anrejistreman odit",
    actionDetails: "Detay aksyon an",
    oldValues: "Ansyen valè",
    newValues: "Nouvo valè",
    search: "Chèche...",
    entityType: "Tip antite",
    allEntities: "Tout antite",
    donations: "Don",
    expenses: "Depans",
    budgets: "Bidjè",
    bankTransactions: "Trans. Bank",
    cashTransactions: "Trans. Kès",
    specialFunds: "Fon Espesyal",
    fundTransactions: "Trans. Fon",
    allActions: "Tout",
    create: "Kreyasyon",
    update: "Modifikasyon",
    delete: "Sipresyon",
    auditReport: "Rapò Odit",
    date: "Dat",
    statistics: "Estatistik",
    activeUsers: "Itilizatè Aktif",
    entityId: "ID Antite",
    actions: "Aksyon",
  },
};

export default function AuditReportTab() {
  const { language } = useLanguage();
  const lt = localTranslations[language] || localTranslations.en;
  const currentDate = new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const entityLabels: Record<string, string> = {
    donations: lt.donations,
    expenses: lt.expenses,
    budgets: lt.budgets,
    bank_transactions: lt.bankTransactions,
    cash_transactions: lt.cashTransactions,
    special_funds: lt.specialFunds,
    fund_transactions: lt.fundTransactions,
  };

  const actionLabels: Record<string, string> = {
    create: lt.create,
    update: lt.update,
    delete: lt.delete,
  };

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-report", entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return auditLogs;
    const term = searchTerm.toLowerCase();
    return auditLogs.filter(log => 
      log.user_email?.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term)
    );
  }, [auditLogs, searchTerm]);

  const stats = useMemo(() => {
    const total = auditLogs.length;
    const creates = auditLogs.filter(l => l.action === "create").length;
    const updates = auditLogs.filter(l => l.action === "update").length;
    const deletes = auditLogs.filter(l => l.action === "delete").length;
    const uniqueUsers = new Set(auditLogs.map(l => l.user_email)).size;
    return { total, creates, updates, deletes, uniqueUsers };
  }, [auditLogs]);

  const actionsData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    auditLogs.forEach(log => {
      const action = log.action || "unknown";
      if (!breakdown[action]) breakdown[action] = 0;
      breakdown[action]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: actionLabels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [auditLogs, lt]);

  const dailyActivity = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = format(date, "yyyy-MM-dd");
      days[dayKey] = 0;
    }

    auditLogs.forEach(log => {
      if (log.created_at) {
        const dayKey = format(parseISO(log.created_at), "yyyy-MM-dd");
        if (days[dayKey] !== undefined) {
          days[dayKey]++;
        }
      }
    });

    return Object.entries(days).map(([key, value]) => ({
      date: format(parseISO(key), "dd/MM", { locale: dateLocale }),
      actions: value,
    }));
  }, [auditLogs, dateLocale]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-success text-success-foreground">{lt.create}</Badge>;
      case "update":
        return <Badge className="bg-info text-info-foreground">{lt.update}</Badge>;
      case "delete":
        return <Badge variant="destructive">{lt.delete}</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityLabel = (entity: string) => entityLabels[entity] || entity;

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const logsSheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      [lt.dateTime]: format(parseISO(log.created_at), "dd/MM/yyyy HH:mm"),
      [lt.user]: log.user_email || "-",
      [lt.entity]: getEntityLabel(log.entity_type),
      [lt.action]: log.action,
      [lt.entityId]: log.entity_id,
    })));
    XLSX.utils.book_append_sheet(wb, logsSheet, lt.auditLog);
    XLSX.writeFile(wb, `audit-report-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(lt.auditReport, 14, 22);
    doc.setFontSize(12);
    doc.text(`${lt.date}: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    doc.setFontSize(14);
    doc.text(lt.statistics, 14, 42);
    doc.setFontSize(11);
    doc.text(`${lt.totalActions}: ${stats.total}`, 14, 50);
    doc.text(`${lt.creations}: ${stats.creates}`, 14, 56);
    doc.text(`${lt.modifications}: ${stats.updates}`, 14, 62);
    doc.text(`${lt.deletions}: ${stats.deletes}`, 14, 68);
    doc.text(`${lt.activeUsers}: ${stats.uniqueUsers}`, 14, 74);

    autoTable(doc, {
      startY: 86,
      head: [[lt.dateTime, lt.user, lt.entity, lt.action]],
      body: filteredLogs.slice(0, 50).map(log => [
        format(parseISO(log.created_at), "dd/MM/yyyy HH:mm"),
        log.user_email || "-",
        getEntityLabel(log.entity_type),
        log.action,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`audit-report-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const exportToCSV = () => {
    exportToCsv(
      filteredLogs,
      [
        { key: "created_at", header: lt.dateTime, formatter: (v) => format(parseISO(v), "dd/MM/yyyy HH:mm") },
        { key: "user_email", header: lt.user, formatter: (v) => v || "-" },
        { key: "entity_type", header: lt.entity, formatter: (v) => getEntityLabel(v) },
        { key: "action", header: lt.action },
        { key: "entity_id", header: lt.entityId },
      ],
      `audit-report-${format(currentDate, "yyyy-MM-dd")}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={lt.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={lt.entityType} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lt.allEntities}</SelectItem>
            <SelectItem value="donations">{lt.donations}</SelectItem>
            <SelectItem value="expenses">{lt.expenses}</SelectItem>
            <SelectItem value="budgets">{lt.budgets}</SelectItem>
            <SelectItem value="bank_transactions">{lt.bankTransactions}</SelectItem>
            <SelectItem value="cash_transactions">{lt.cashTransactions}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={lt.action} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lt.allActions}</SelectItem>
            <SelectItem value="create">{lt.create}</SelectItem>
            <SelectItem value="update">{lt.update}</SelectItem>
            <SelectItem value="delete">{lt.delete}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button variant="outline" onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.totalActions}</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.creations}</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.creates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.modifications}</CardTitle>
            <Shield className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.updates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.deletions}</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.deletes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.users}</CardTitle>
            <Shield className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{lt.dailyActivity}</CardTitle>
            <CardDescription>{lt.actionsLast30Days}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="actions" name={lt.actions} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lt.byActionType}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={actionsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {actionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{lt.auditLog}</CardTitle>
          <CardDescription>{lt.financialDataHistory}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">{lt.loading}</p>
          ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt.dateTime}</TableHead>
                  <TableHead>{lt.user}</TableHead>
                  <TableHead>{lt.entity}</TableHead>
                  <TableHead>{lt.action}</TableHead>
                  <TableHead className="text-right">{lt.details}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 50).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{log.user_email || "-"}</TableCell>
                    <TableCell>{getEntityLabel(log.entity_type)}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{lt.noAuditRecords}</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lt.actionDetails}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{lt.dateTime}</p>
                  <p className="font-medium">{format(parseISO(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{lt.user}</p>
                  <p className="font-medium">{selectedLog.user_email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{lt.entity}</p>
                  <p className="font-medium">{getEntityLabel(selectedLog.entity_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{lt.action}</p>
                  <p>{getActionBadge(selectedLog.action)}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <p className="text-muted-foreground mb-2">{lt.oldValues}</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {formatValue(selectedLog.old_values)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <p className="text-muted-foreground mb-2">{lt.newValues}</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {formatValue(selectedLog.new_values)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
