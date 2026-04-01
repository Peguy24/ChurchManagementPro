import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currency";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";
import {
  DollarSign, CheckCircle2, AlertTriangle, XCircle, Clock,
  Download, RefreshCw, ExternalLink, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface Invoice {
  id: string;
  number: string | null;
  customer_email: string | null;
  customer_name: string | null;
  church_name: string;
  tenant_id: string | null;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  period_start: string | null;
  period_end: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  attempt_count: number;
  next_payment_attempt: string | null;
}

interface Summary {
  total: number;
  paid: number;
  open: number;
  uncollectible: number;
  void: number;
  total_collected: number;
  total_pending: number;
}

const translations = {
  en: {
    title: "Payment Monitoring",
    subtitle: "Verify monthly Stripe payments for all churches",
    totalInvoices: "Total Invoices",
    collected: "Collected",
    pending: "Pending",
    failed: "Failed / Uncollectible",
    paid: "Paid",
    open: "Open",
    uncollectible: "Uncollectible",
    void: "Void",
    all: "All Statuses",
    church: "Church",
    plan: "Plan",
    amount: "Amount",
    status: "Status",
    date: "Date",
    period: "Period",
    actions: "Actions",
    export: "Export CSV",
    refresh: "Refresh",
    noInvoices: "No invoices found for this period",
    viewInvoice: "View Invoice",
    downloadPdf: "Download PDF",
    attempts: "attempts",
    nextAttempt: "Next attempt",
    overdue: "Overdue",
    loading: "Loading payment data...",
    error: "Error loading payment data",
  },
  fr: {
    title: "Suivi des Paiements",
    subtitle: "Vérifier les paiements mensuels Stripe pour toutes les églises",
    totalInvoices: "Total Factures",
    collected: "Collecté",
    pending: "En Attente",
    failed: "Échoué / Irrécouvrable",
    paid: "Payé",
    open: "En cours",
    uncollectible: "Irrécouvrable",
    void: "Annulé",
    all: "Tous les statuts",
    church: "Église",
    plan: "Plan",
    amount: "Montant",
    status: "Statut",
    date: "Date",
    period: "Période",
    actions: "Actions",
    export: "Exporter CSV",
    refresh: "Actualiser",
    noInvoices: "Aucune facture trouvée pour cette période",
    viewInvoice: "Voir la facture",
    downloadPdf: "Télécharger PDF",
    attempts: "tentatives",
    nextAttempt: "Prochaine tentative",
    overdue: "En retard",
    loading: "Chargement des paiements...",
    error: "Erreur de chargement des paiements",
  },
  ht: {
    title: "Swivi Pèman",
    subtitle: "Verifye pèman chak mwa Stripe pou tout legliz",
    totalInvoices: "Total Fakti",
    collected: "Kolekte",
    pending: "An Atant",
    failed: "Echwe / Pa Kolektab",
    paid: "Peye",
    open: "Ouvè",
    uncollectible: "Pa Kolektab",
    void: "Anile",
    all: "Tout Estati",
    church: "Legliz",
    plan: "Plan",
    amount: "Montan",
    status: "Estati",
    date: "Dat",
    period: "Peryòd",
    actions: "Aksyon",
    export: "Ekspòte CSV",
    refresh: "Aktyalize",
    noInvoices: "Pa gen fakti pou peryòd sa a",
    viewInvoice: "Wè fakti",
    downloadPdf: "Telechaje PDF",
    attempts: "tantativ",
    nextAttempt: "Pwochen tantativ",
    overdue: "An reta",
    loading: "Chajman done pèman...",
    error: "Erè chajman done pèman",
  },
};

export default function PaymentMonitoring() {
  const { language } = useLanguage();
  const t = (key: string) => (translations as any)[language]?.[key] || (translations as any).en[key] || key;
  const dateLocale = language === "fr" ? fr : enUS;

  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["payment-monitoring", selectedMonth, statusFilter],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({ month: selectedMonth });
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-all-invoices?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch invoices");
      }

      return await res.json() as { invoices: Invoice[]; summary: Summary };
    },
  });

  const invoices = data?.invoices || [];
  const summary = data?.summary || { total: 0, paid: 0, open: 0, uncollectible: 0, void: 0, total_collected: 0, total_pending: 0 };

  const navigateMonth = (direction: number) => {
    const current = new Date(selectedMonth + "-01");
    const target = direction > 0 ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(target, "yyyy-MM"));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />{t("paid")}</Badge>;
      case "open":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"><Clock className="h-3 w-3 mr-1" />{t("open")}</Badge>;
      case "uncollectible":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" />{t("uncollectible")}</Badge>;
      case "void":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />{t("void")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExport = () => {
    if (!invoices.length) {
      toast.error(t("noInvoices"));
      return;
    }
    const columns = [
      { key: "church_name", header: t("church") },
      { key: "plan", header: t("plan") },
      { key: "amount", header: t("amount"), formatter: (v: number) => formatCurrencyForCsv(v) },
      { key: "status", header: t("status") },
      { key: "created", header: t("date"), formatter: (v: string) => formatDateForCsv(v) },
      { key: "customer_email", header: "Email" },
      { key: "number", header: "Invoice #" },
    ];
    exportToCsv(invoices, columns, `payments_${selectedMonth}`);
    toast.success("CSV exported");
  };

  const displayMonth = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: dateLocale });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t("export")}
            </Button>
          </div>
        </div>

        {/* Month Navigator + Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm min-w-[140px] text-center capitalize">{displayMonth}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="paid">{t("paid")}</SelectItem>
              <SelectItem value="open">{t("open")}</SelectItem>
              <SelectItem value="uncollectible">{t("uncollectible")}</SelectItem>
              <SelectItem value="void">{t("void")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <FileText className="h-4 w-4" />
                  {t("totalInvoices")}
                </div>
                <p className="text-2xl font-bold mt-1">{summary.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("collected")}
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatCurrency(summary.total_collected, "USD")}
                </p>
                <p className="text-xs text-muted-foreground">{summary.paid} {t("paid").toLowerCase()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <Clock className="h-4 w-4" />
                  {t("pending")}
                </div>
                <p className="text-2xl font-bold mt-1 text-amber-600">
                  {formatCurrency(summary.total_pending, "USD")}
                </p>
                <p className="text-xs text-muted-foreground">{summary.open} {t("open").toLowerCase()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {t("failed")}
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600">{summary.uncollectible + summary.void}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invoice Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("title")} — {displayMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{t("noInvoices")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("church")}</TableHead>
                      <TableHead>{t("plan")}</TableHead>
                      <TableHead>{t("amount")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} className={inv.status === "uncollectible" ? "bg-red-50/50 dark:bg-red-950/20" : inv.status === "open" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.church_name}</p>
                            <p className="text-xs text-muted-foreground">{inv.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{inv.plan}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(inv.amount, inv.currency?.toUpperCase() || "USD")}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(inv.status)}
                            {inv.status === "open" && inv.attempt_count > 0 && (
                              <p className="text-xs text-red-600">{inv.attempt_count} {t("attempts")}</p>
                            )}
                            {inv.next_payment_attempt && (
                              <p className="text-xs text-muted-foreground">
                                {t("nextAttempt")}: {format(new Date(inv.next_payment_attempt), "dd MMM", { locale: dateLocale })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(inv.created), "dd MMM yyyy", { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {inv.hosted_invoice_url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" title={t("viewInvoice")}>
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {inv.invoice_pdf && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" title={t("downloadPdf")}>
                                  <FileText className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
