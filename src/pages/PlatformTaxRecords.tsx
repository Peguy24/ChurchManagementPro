import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { FileText, DollarSign, Plus, Download, Edit, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";

type TaxRecord = {
  id: string;
  tax_type: string;
  tax_period: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  reference_number: string | null;
  filing_notes: string | null;
  document_url: string | null;
  created_at: string;
};

export default function PlatformTaxRecords() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState({
    tax_type: "federal_income", tax_period: "", amount_due: 0, amount_paid: 0,
    due_date: "", paid_date: "", status: "pending", reference_number: "", filing_notes: "",
  });

  const l = language === "fr" ? {
    title: "Gestion Fiscale", addRecord: "Nouvelle Obligation", editRecord: "Modifier",
    taxType: "Type d'Impôt", taxPeriod: "Période Fiscale", amountDue: "Montant Dû",
    amountPaid: "Montant Payé", dueDate: "Date Limite", paidDate: "Date de Paiement",
    refNumber: "N° Référence", filingNotes: "Notes de Déclaration",
    federalIncome: "Impôt Fédéral", stateIncome: "Impôt d'État",
    payrollTax: "Charges Sociales", salesTax: "Taxe de Vente", other: "Autre",
    pending: "En Attente", paid: "Payé", overdue: "En Retard", filed: "Déclaré",
    totalDue: "Total Dû", totalPaid: "Total Payé", upcomingDeadlines: "Échéances Proches",
    overdueCount: "En Retard", exportCsv: "Exporter CSV", save: "Enregistrer",
    noRecords: "Aucune obligation fiscale", balance: "Solde Restant",
  } : language === "ht" ? {
    title: "Jesyon Taks", addRecord: "Nouvo Obligasyon", editRecord: "Modifye",
    taxType: "Tip Taks", taxPeriod: "Peryòd Fiskal", amountDue: "Montan Dwe",
    amountPaid: "Montan Peye", dueDate: "Dat Limit", paidDate: "Dat Peman",
    refNumber: "N° Referans", filingNotes: "Nòt Deklarasyon",
    federalIncome: "Taks Federal", stateIncome: "Taks Eta",
    payrollTax: "Chaj Sosyal", salesTax: "Taks Lavant", other: "Lòt",
    pending: "Ap Tann", paid: "Peye", overdue: "An Reta", filed: "Deklare",
    totalDue: "Total Dwe", totalPaid: "Total Peye", upcomingDeadlines: "Echeyans Pwòch",
    overdueCount: "An Reta", exportCsv: "Ekspòte CSV", save: "Anrejistre",
    noRecords: "Pa gen obligasyon fiskal", balance: "Balans Restan",
  } : {
    title: "Tax Management", addRecord: "New Tax Record", editRecord: "Edit Record",
    taxType: "Tax Type", taxPeriod: "Tax Period", amountDue: "Amount Due",
    amountPaid: "Amount Paid", dueDate: "Due Date", paidDate: "Paid Date",
    refNumber: "Reference #", filingNotes: "Filing Notes",
    federalIncome: "Federal Income", stateIncome: "State Income",
    payrollTax: "Payroll Tax", salesTax: "Sales Tax", other: "Other",
    pending: "Pending", paid: "Paid", overdue: "Overdue", filed: "Filed",
    totalDue: "Total Due", totalPaid: "Total Paid", upcomingDeadlines: "Upcoming Deadlines",
    overdueCount: "Overdue", exportCsv: "Export CSV", save: "Save",
    noRecords: "No tax records", balance: "Balance Remaining",
  };

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["platform-tax-records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_tax_records").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data as TaxRecord[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tax_type: form.tax_type, tax_period: form.tax_period,
        amount_due: Number(form.amount_due), amount_paid: Number(form.amount_paid),
        due_date: form.due_date, paid_date: form.paid_date || null,
        status: form.status, reference_number: form.reference_number || null,
        filing_notes: form.filing_notes || null, created_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from("platform_tax_records").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_tax_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tax-records"] });
      setShowDialog(false);
      setEditing(null);
      toast.success("Saved");
    },
    onError: () => toast.error("Error"),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ tax_type: "federal_income", tax_period: "", amount_due: 0, amount_paid: 0, due_date: "", paid_date: "", status: "pending", reference_number: "", filing_notes: "" });
    setShowDialog(true);
  };

  const openEdit = (rec: TaxRecord) => {
    setEditing(rec);
    setForm({
      tax_type: rec.tax_type, tax_period: rec.tax_period,
      amount_due: rec.amount_due, amount_paid: rec.amount_paid,
      due_date: rec.due_date, paid_date: rec.paid_date || "",
      status: rec.status, reference_number: rec.reference_number || "",
      filing_notes: rec.filing_notes || "",
    });
    setShowDialog(true);
  };

  const totalDue = records.reduce((s, r) => s + r.amount_due, 0);
  const totalPaid = records.reduce((s, r) => s + r.amount_paid, 0);
  const overdueCount = records.filter(r => r.status === "overdue").length;
  const upcoming = records.filter(r => {
    if (r.status === "paid" || r.status === "filed") return false;
    const d = new Date(r.due_date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const taxTypeLabel = (t: string) => {
    const map: Record<string, string> = { federal_income: l.federalIncome, state_income: l.stateIncome, payroll_tax: l.payrollTax, sales_tax: l.salesTax, other: l.other };
    return map[t] || t;
  };

  const statusVariant = (s: string) => {
    if (s === "paid") return "default";
    if (s === "filed") return "secondary";
    if (s === "overdue") return "destructive";
    return "outline";
  };
  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: l.pending, paid: l.paid, overdue: l.overdue, filed: l.filed };
    return map[s] || s;
  };

  const exportRecords = () => {
    if (!records.length) return;
    const cols = [
      { key: "tax_type", header: l.taxType, formatter: taxTypeLabel },
      { key: "tax_period", header: l.taxPeriod },
      { key: "amount_due", header: l.amountDue, formatter: formatCurrencyForCsv },
      { key: "amount_paid", header: l.amountPaid, formatter: formatCurrencyForCsv },
      { key: "due_date", header: l.dueDate, formatter: formatDateForCsv },
      { key: "status", header: "Status", formatter: statusLabel },
    ];
    exportToCsv(records, cols, `taxes_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{l.title}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRecords}><Download className="mr-2 h-4 w-4" />{l.exportCsv}</Button>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{l.addRecord}</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{l.totalDue}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalDue)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{l.totalPaid}</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalPaid)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{l.balance}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalDue - totalPaid)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{l.overdueCount}</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold">{overdueCount}</div><p className="text-xs text-muted-foreground">{upcoming} {l.upcomingDeadlines}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? <Skeleton className="h-32 w-full" /> : records.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{l.noRecords}</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{l.taxType}</TableHead>
                  <TableHead>{l.taxPeriod}</TableHead>
                  <TableHead>{l.amountDue}</TableHead>
                  <TableHead>{l.amountPaid}</TableHead>
                  <TableHead>{l.dueDate}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{taxTypeLabel(r.tax_type)}</TableCell>
                      <TableCell>{r.tax_period}</TableCell>
                      <TableCell>{fmt(r.amount_due)}</TableCell>
                      <TableCell>{fmt(r.amount_paid)}</TableCell>
                      <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status) as any}>{statusLabel(r.status)}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? l.editRecord : l.addRecord}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{l.taxType}</Label>
                <Select value={form.tax_type} onValueChange={v => setForm(f => ({ ...f, tax_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="federal_income">{l.federalIncome}</SelectItem>
                    <SelectItem value="state_income">{l.stateIncome}</SelectItem>
                    <SelectItem value="payroll_tax">{l.payrollTax}</SelectItem>
                    <SelectItem value="sales_tax">{l.salesTax}</SelectItem>
                    <SelectItem value="other">{l.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{l.taxPeriod}</Label><Input placeholder="2026-Q1" value={form.tax_period} onChange={e => setForm(f => ({ ...f, tax_period: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{l.amountDue}</Label><Input type="number" value={form.amount_due} onChange={e => setForm(f => ({ ...f, amount_due: Number(e.target.value) }))} /></div>
              <div><Label>{l.amountPaid}</Label><Input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{l.dueDate}</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>{l.paidDate}</Label><Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{l.pending}</SelectItem>
                  <SelectItem value="paid">{l.paid}</SelectItem>
                  <SelectItem value="overdue">{l.overdue}</SelectItem>
                  <SelectItem value="filed">{l.filed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{l.refNumber}</Label><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
            <div><Label>{l.filingNotes}</Label><Textarea value={form.filing_notes} onChange={e => setForm(f => ({ ...f, filing_notes: e.target.value }))} /></div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.tax_period || !form.due_date}>{l.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
