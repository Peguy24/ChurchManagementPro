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
import { Shield, FileSpreadsheet, FileText, Search, Eye, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))"];

export default function AuditReportTab() {
  const currentDate = new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch audit logs
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

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return auditLogs;
    
    const term = searchTerm.toLowerCase();
    return auditLogs.filter(log => 
      log.user_email?.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term)
    );
  }, [auditLogs, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const creates = auditLogs.filter(l => l.action === "create").length;
    const updates = auditLogs.filter(l => l.action === "update").length;
    const deletes = auditLogs.filter(l => l.action === "delete").length;
    const uniqueUsers = new Set(auditLogs.map(l => l.user_email)).size;

    return { total, creates, updates, deletes, uniqueUsers };
  }, [auditLogs]);

  // Actions breakdown
  const actionsData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    auditLogs.forEach(log => {
      const action = log.action || "unknown";
      if (!breakdown[action]) breakdown[action] = 0;
      breakdown[action]++;
    });
    
    const labels: Record<string, string> = {
      create: "Création",
      update: "Modification",
      delete: "Suppression",
    };

    return Object.entries(breakdown).map(([name, value], index) => ({
      name: labels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [auditLogs]);

  // Entity breakdown
  const entityData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    auditLogs.forEach(log => {
      const entity = log.entity_type || "unknown";
      if (!breakdown[entity]) breakdown[entity] = 0;
      breakdown[entity]++;
    });

    const labels: Record<string, string> = {
      donations: "Dons",
      expenses: "Dépenses",
      budgets: "Budgets",
      bank_transactions: "Transactions Bancaires",
      cash_transactions: "Transactions Caisse",
      special_funds: "Fonds Spéciaux",
    };

    return Object.entries(breakdown).map(([name, value], index) => ({
      name: labels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [auditLogs]);

  // Daily activity
  const dailyActivity = useMemo(() => {
    const days: Record<string, number> = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = subMonths(currentDate, 0);
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
      date: format(parseISO(key), "dd/MM", { locale: fr }),
      actions: value,
    }));
  }, [auditLogs]);

  // Helper functions
  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-success text-success-foreground">Création</Badge>;
      case "update":
        return <Badge className="bg-info text-info-foreground">Modification</Badge>;
      case "delete":
        return <Badge variant="destructive">Suppression</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      donations: "Dons",
      expenses: "Dépenses",
      budgets: "Budgets",
      bank_transactions: "Transactions Bancaires",
      cash_transactions: "Transactions Caisse",
      special_funds: "Fonds Spéciaux",
      fund_transactions: "Transactions Fonds",
    };
    return labels[entity] || entity;
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const logsSheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      "Date/Heure": format(parseISO(log.created_at), "dd/MM/yyyy HH:mm"),
      Utilisateur: log.user_email || "-",
      Entité: getEntityLabel(log.entity_type),
      Action: log.action,
      "ID Entité": log.entity_id,
    })));
    XLSX.utils.book_append_sheet(wb, logsSheet, "Journal d'Audit");

    XLSX.writeFile(wb, `rapport-audit-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Rapport d'Audit", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    // Stats
    doc.setFontSize(14);
    doc.text("Statistiques", 14, 42);
    doc.setFontSize(11);
    doc.text(`Total Actions: ${stats.total}`, 14, 50);
    doc.text(`Créations: ${stats.creates}`, 14, 56);
    doc.text(`Modifications: ${stats.updates}`, 14, 62);
    doc.text(`Suppressions: ${stats.deletes}`, 14, 68);
    doc.text(`Utilisateurs Actifs: ${stats.uniqueUsers}`, 14, 74);

    // Table
    autoTable(doc, {
      startY: 86,
      head: [["Date/Heure", "Utilisateur", "Entité", "Action"]],
      body: filteredLogs.slice(0, 50).map(log => [
        format(parseISO(log.created_at), "dd/MM/yyyy HH:mm"),
        log.user_email || "-",
        getEntityLabel(log.entity_type),
        log.action,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapport-audit-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type d'entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            <SelectItem value="donations">Dons</SelectItem>
            <SelectItem value="expenses">Dépenses</SelectItem>
            <SelectItem value="budgets">Budgets</SelectItem>
            <SelectItem value="bank_transactions">Trans. Bancaires</SelectItem>
            <SelectItem value="cash_transactions">Trans. Caisse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="create">Création</SelectItem>
            <SelectItem value="update">Modification</SelectItem>
            <SelectItem value="delete">Suppression</SelectItem>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créations</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.creates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modifications</CardTitle>
            <Shield className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.updates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppressions</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.deletes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
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
            <CardTitle>Activité Journalière</CardTitle>
            <CardDescription>Actions sur les 30 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="actions" name="Actions" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par Type d'Action</CardTitle>
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
          <CardTitle>Journal d'Audit</CardTitle>
          <CardDescription>Historique des actions sur les données financières</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Chargement...</p>
          ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Détails</TableHead>
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
            <p className="text-center py-8 text-muted-foreground">Aucun enregistrement d'audit</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'action</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date/Heure</p>
                  <p className="font-medium">{format(parseISO(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Utilisateur</p>
                  <p className="font-medium">{selectedLog.user_email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entité</p>
                  <p className="font-medium">{getEntityLabel(selectedLog.entity_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <p>{getActionBadge(selectedLog.action)}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <p className="text-muted-foreground mb-2">Anciennes valeurs</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {formatValue(selectedLog.old_values)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <p className="text-muted-foreground mb-2">Nouvelles valeurs</p>
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
