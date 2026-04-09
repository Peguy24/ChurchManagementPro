import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Users, DollarSign, Plus, Download, Edit, UserMinus } from "lucide-react";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_title: string;
  employment_type: string;
  hire_date: string | null;
  salary_amount: number;
  pay_frequency: string;
  tax_id: string | null;
  status: string;
  bank_info: string | null;
  notes: string | null;
  created_at: string;
};

type PayrollRecord = {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  gross_amount: number;
  deductions: Record<string, number>;
  net_amount: number;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  platform_employees?: { full_name: string };
};

const DEFAULT_DEDUCTION_RATES = {
  federal_tax: 15,
  state_tax: 5,
  social_security: 6.2,
  medicare: 1.45,
};

export default function PlatformPayroll() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    full_name: "", email: "", phone: "", role_title: "", employment_type: "full-time",
    hire_date: "", salary_amount: 0, pay_frequency: "monthly", tax_id: "", bank_info: "", notes: "",
  });
  const [payrollForm, setPayrollForm] = useState({
    employee_id: "", pay_period_start: "", pay_period_end: "", gross_amount: 0,
    payment_date: "", payment_method: "direct_deposit", reference_number: "", notes: "",
    deduction_rates: { ...DEFAULT_DEDUCTION_RATES },
  });

  const labels = language === "fr" ? {
    title: "Gestion de la Paie", employees: "Employés", payRuns: "Fiches de Paie",
    addEmployee: "Ajouter un Employé", editEmployee: "Modifier l'Employé",
    name: "Nom Complet", email: "Email", phone: "Téléphone", role: "Poste",
    type: "Type", hireDate: "Date d'embauche", salary: "Salaire", frequency: "Fréquence",
    taxId: "N° Fiscal", bankInfo: "Info Bancaire", fullTime: "Temps Plein",
    partTime: "Temps Partiel", contractor: "Contractuel", monthly: "Mensuel",
    biWeekly: "Bi-hebdomadaire", weekly: "Hebdomadaire", active: "Actif", inactive: "Inactif",
    deactivate: "Désactiver", activate: "Activer", addPayRun: "Nouvelle Fiche de Paie",
    employee: "Employé", periodStart: "Début Période", periodEnd: "Fin Période",
    grossAmount: "Montant Brut", netAmount: "Montant Net", deductions: "Déductions",
    federalTax: "Impôt Fédéral", stateTax: "Impôt État", socialSecurity: "Sécurité Sociale",
    medicare: "Medicare", paymentDate: "Date Paiement", paymentMethod: "Mode Paiement",
    refNumber: "N° Référence", pending: "En Attente", paid: "Payé", cancelled: "Annulé",
    totalPayrollMonth: "Paie du Mois", ytdPayroll: "Paie Cumul Annuel",
    activeEmployees: "Employés Actifs", avgSalary: "Salaire Moyen",
    directDeposit: "Virement", check: "Chèque", cash: "Espèces",
    exportCsv: "Exporter CSV", notes: "Notes", save: "Enregistrer",
    selectEmployee: "Sélectionner un employé", noEmployees: "Aucun employé",
    noPayroll: "Aucune fiche de paie",
  } : language === "ht" ? {
    title: "Jesyon Pewòl", employees: "Anplwaye", payRuns: "Fich Pewòl",
    addEmployee: "Ajoute Anplwaye", editEmployee: "Modifye Anplwaye",
    name: "Non Konplè", email: "Imèl", phone: "Telefòn", role: "Pòs",
    type: "Tip", hireDate: "Dat Anbochaj", salary: "Salè", frequency: "Frekans",
    taxId: "N° Fiskal", bankInfo: "Info Bank", fullTime: "Tan Plen",
    partTime: "Tan Pasyèl", contractor: "Kontrakte", monthly: "Mansyèl",
    biWeekly: "Chak 2 Semèn", weekly: "Chak Semèn", active: "Aktif", inactive: "Inaktif",
    deactivate: "Dezaktive", activate: "Aktive", addPayRun: "Nouvo Fich Pewòl",
    employee: "Anplwaye", periodStart: "Kòmansman Peryòd", periodEnd: "Fen Peryòd",
    grossAmount: "Montan Brit", netAmount: "Montan Nèt", deductions: "Dediksyon",
    federalTax: "Taks Federal", stateTax: "Taks Eta", socialSecurity: "Sekirite Sosyal",
    medicare: "Medicare", paymentDate: "Dat Peman", paymentMethod: "Metòd Peman",
    refNumber: "N° Referans", pending: "Ap Tann", paid: "Peye", cancelled: "Anile",
    totalPayrollMonth: "Pewòl Mwa a", ytdPayroll: "Pewòl Ane a",
    activeEmployees: "Anplwaye Aktif", avgSalary: "Salè Mwayèn",
    directDeposit: "Transfè", check: "Chèk", cash: "Kach",
    exportCsv: "Ekspòte CSV", notes: "Nòt", save: "Anrejistre",
    selectEmployee: "Chwazi yon anplwaye", noEmployees: "Pa gen anplwaye",
    noPayroll: "Pa gen fich pewòl",
  } : {
    title: "Payroll Management", employees: "Employees", payRuns: "Pay Runs",
    addEmployee: "Add Employee", editEmployee: "Edit Employee",
    name: "Full Name", email: "Email", phone: "Phone", role: "Role/Title",
    type: "Type", hireDate: "Hire Date", salary: "Salary", frequency: "Frequency",
    taxId: "Tax ID", bankInfo: "Bank Info", fullTime: "Full-Time",
    partTime: "Part-Time", contractor: "Contractor", monthly: "Monthly",
    biWeekly: "Bi-Weekly", weekly: "Weekly", active: "Active", inactive: "Inactive",
    deactivate: "Deactivate", activate: "Activate", addPayRun: "New Pay Run",
    employee: "Employee", periodStart: "Period Start", periodEnd: "Period End",
    grossAmount: "Gross Amount", netAmount: "Net Amount", deductions: "Deductions",
    federalTax: "Federal Tax", stateTax: "State Tax", socialSecurity: "Social Security",
    medicare: "Medicare", paymentDate: "Payment Date", paymentMethod: "Payment Method",
    refNumber: "Reference #", pending: "Pending", paid: "Paid", cancelled: "Cancelled",
    totalPayrollMonth: "Payroll This Month", ytdPayroll: "YTD Payroll",
    activeEmployees: "Active Employees", avgSalary: "Avg Salary",
    directDeposit: "Direct Deposit", check: "Check", cash: "Cash",
    exportCsv: "Export CSV", notes: "Notes", save: "Save",
    selectEmployee: "Select an employee", noEmployees: "No employees",
    noPayroll: "No pay runs",
  };

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["platform-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_employees").select("*").order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const { data: payroll = [], isLoading: loadingPay } = useQuery({
    queryKey: ["platform-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_payroll")
        .select("*, platform_employees(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PayrollRecord[];
    },
  });

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const payload = { ...employeeForm, salary_amount: Number(employeeForm.salary_amount), created_by: user?.id };
      if (editingEmployee) {
        const { error } = await supabase.from("platform_employees").update(payload).eq("id", editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-employees"] });
      setShowEmployeeDialog(false);
      setEditingEmployee(null);
      toast.success(editingEmployee ? "Updated" : "Added");
    },
    onError: () => toast.error("Error"),
  });

  const toggleEmployeeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("platform_employees").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-employees"] }),
  });

  const savePayroll = useMutation({
    mutationFn: async () => {
      const rates = payrollForm.deduction_rates;
      const gross = Number(payrollForm.gross_amount);
      const deductions = {
        federal_tax: +(gross * rates.federal_tax / 100).toFixed(2),
        state_tax: +(gross * rates.state_tax / 100).toFixed(2),
        social_security: +(gross * rates.social_security / 100).toFixed(2),
        medicare: +(gross * rates.medicare / 100).toFixed(2),
      };
      const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
      const net = +(gross - totalDeductions).toFixed(2);
      const { error } = await supabase.from("platform_payroll").insert({
        employee_id: payrollForm.employee_id,
        pay_period_start: payrollForm.pay_period_start,
        pay_period_end: payrollForm.pay_period_end,
        gross_amount: gross,
        deductions,
        net_amount: net,
        payment_date: payrollForm.payment_date || null,
        payment_method: payrollForm.payment_method,
        reference_number: payrollForm.reference_number || null,
        status: payrollForm.payment_date ? "paid" : "pending",
        notes: payrollForm.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-payroll"] });
      setShowPayrollDialog(false);
      toast.success("Pay run created");
    },
    onError: () => toast.error("Error"),
  });

  const openAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({ full_name: "", email: "", phone: "", role_title: "", employment_type: "full-time", hire_date: "", salary_amount: 0, pay_frequency: "monthly", tax_id: "", bank_info: "", notes: "" });
    setShowEmployeeDialog(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      full_name: emp.full_name, email: emp.email || "", phone: emp.phone || "",
      role_title: emp.role_title, employment_type: emp.employment_type,
      hire_date: emp.hire_date || "", salary_amount: emp.salary_amount,
      pay_frequency: emp.pay_frequency, tax_id: emp.tax_id || "",
      bank_info: emp.bank_info || "", notes: emp.notes || "",
    });
    setShowEmployeeDialog(true);
  };

  const openAddPayroll = () => {
    setPayrollForm({ employee_id: "", pay_period_start: "", pay_period_end: "", gross_amount: 0, payment_date: "", payment_method: "direct_deposit", reference_number: "", notes: "", deduction_rates: { ...DEFAULT_DEDUCTION_RATES } });
    setShowPayrollDialog(true);
  };

  // Stats
  const activeEmps = employees.filter(e => e.status === "active");
  const now = new Date();
  const thisMonth = payroll.filter(p => p.payment_date && new Date(p.payment_date).getMonth() === now.getMonth() && new Date(p.payment_date).getFullYear() === now.getFullYear());
  const thisYear = payroll.filter(p => p.payment_date && new Date(p.payment_date).getFullYear() === now.getFullYear());
  const totalMonth = thisMonth.reduce((s, p) => s + p.net_amount, 0);
  const totalYtd = thisYear.reduce((s, p) => s + p.net_amount, 0);
  const avgSalary = activeEmps.length > 0 ? activeEmps.reduce((s, e) => s + e.salary_amount, 0) / activeEmps.length : 0;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportPayroll = () => {
    if (!payroll.length) return;
    const cols = [
      { key: "platform_employees", header: labels.employee, formatter: (v: any) => v?.full_name || "-" },
      { key: "pay_period_start", header: labels.periodStart, formatter: formatDateForCsv },
      { key: "pay_period_end", header: labels.periodEnd, formatter: formatDateForCsv },
      { key: "gross_amount", header: labels.grossAmount, formatter: formatCurrencyForCsv },
      { key: "net_amount", header: labels.netAmount, formatter: formatCurrencyForCsv },
      { key: "status", header: "Status" },
      { key: "payment_date", header: labels.paymentDate, formatter: (v: string) => v ? formatDateForCsv(v) : "-" },
    ];
    exportToCsv(payroll, cols, `payroll_${new Date().toISOString().split("T")[0]}`);
  };

  const typeLabel = (t: string) => t === "full-time" ? labels.fullTime : t === "part-time" ? labels.partTime : labels.contractor;
  const freqLabel = (f: string) => f === "monthly" ? labels.monthly : f === "bi-weekly" ? labels.biWeekly : labels.weekly;
  const statusBadge = (s: string) => s === "paid" ? "default" : s === "pending" ? "secondary" : "destructive";

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{labels.title}</h1>
          </div>
          <Button variant="outline" onClick={exportPayroll}><Download className="mr-2 h-4 w-4" />{labels.exportCsv}</Button>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{labels.totalPayrollMonth}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalMonth)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{labels.ytdPayroll}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalYtd)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{labels.activeEmployees}</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeEmps.length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{labels.avgSalary}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(avgSalary)}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">{labels.employees}</TabsTrigger>
            <TabsTrigger value="payroll">{labels.payRuns}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{labels.employees}</CardTitle>
                <Button onClick={openAddEmployee}><Plus className="mr-2 h-4 w-4" />{labels.addEmployee}</Button>
              </CardHeader>
              <CardContent>
                {loadingEmp ? <Skeleton className="h-32 w-full" /> : employees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{labels.noEmployees}</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{labels.name}</TableHead>
                      <TableHead>{labels.role}</TableHead>
                      <TableHead>{labels.type}</TableHead>
                      <TableHead>{labels.salary}</TableHead>
                      <TableHead>{labels.frequency}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("common.actions")}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {employees.map(emp => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.full_name}</TableCell>
                          <TableCell>{emp.role_title}</TableCell>
                          <TableCell>{typeLabel(emp.employment_type)}</TableCell>
                          <TableCell>{fmt(emp.salary_amount)}</TableCell>
                          <TableCell>{freqLabel(emp.pay_frequency)}</TableCell>
                          <TableCell>
                            <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                              {emp.status === "active" ? labels.active : labels.inactive}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditEmployee(emp)}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleEmployeeStatus.mutate({ id: emp.id, status: emp.status })}>
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{labels.payRuns}</CardTitle>
                <Button onClick={openAddPayroll}><Plus className="mr-2 h-4 w-4" />{labels.addPayRun}</Button>
              </CardHeader>
              <CardContent>
                {loadingPay ? <Skeleton className="h-32 w-full" /> : payroll.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{labels.noPayroll}</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{labels.employee}</TableHead>
                      <TableHead>{labels.periodStart}</TableHead>
                      <TableHead>{labels.periodEnd}</TableHead>
                      <TableHead>{labels.grossAmount}</TableHead>
                      <TableHead>{labels.deductions}</TableHead>
                      <TableHead>{labels.netAmount}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {payroll.map(p => {
                        const totalDed = Object.values(p.deductions || {}).reduce((s: number, v: any) => s + Number(v), 0);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.platform_employees?.full_name || "-"}</TableCell>
                            <TableCell>{new Date(p.pay_period_start).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(p.pay_period_end).toLocaleDateString()}</TableCell>
                            <TableCell>{fmt(p.gross_amount)}</TableCell>
                            <TableCell>{fmt(totalDed)}</TableCell>
                            <TableCell className="font-semibold">{fmt(p.net_amount)}</TableCell>
                            <TableCell>
                              <Badge variant={statusBadge(p.status) as any}>
                                {p.status === "paid" ? labels.paid : p.status === "pending" ? labels.pending : labels.cancelled}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? labels.editEmployee : labels.addEmployee}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.name}</Label><Input value={employeeForm.full_name} onChange={e => setEmployeeForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div><Label>{labels.role}</Label><Input value={employeeForm.role_title} onChange={e => setEmployeeForm(f => ({ ...f, role_title: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.email}</Label><Input type="email" value={employeeForm.email} onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>{labels.phone}</Label><Input value={employeeForm.phone} onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{labels.type}</Label>
                <Select value={employeeForm.employment_type} onValueChange={v => setEmployeeForm(f => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{labels.fullTime}</SelectItem>
                    <SelectItem value="part-time">{labels.partTime}</SelectItem>
                    <SelectItem value="contractor">{labels.contractor}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{labels.hireDate}</Label><Input type="date" value={employeeForm.hire_date} onChange={e => setEmployeeForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.salary}</Label><Input type="number" value={employeeForm.salary_amount} onChange={e => setEmployeeForm(f => ({ ...f, salary_amount: Number(e.target.value) }))} /></div>
              <div>
                <Label>{labels.frequency}</Label>
                <Select value={employeeForm.pay_frequency} onValueChange={v => setEmployeeForm(f => ({ ...f, pay_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{labels.monthly}</SelectItem>
                    <SelectItem value="bi-weekly">{labels.biWeekly}</SelectItem>
                    <SelectItem value="weekly">{labels.weekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.taxId}</Label><Input value={employeeForm.tax_id} onChange={e => setEmployeeForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
              <div><Label>{labels.bankInfo}</Label><Input value={employeeForm.bank_info} onChange={e => setEmployeeForm(f => ({ ...f, bank_info: e.target.value }))} /></div>
            </div>
            <div><Label>{labels.notes}</Label><Textarea value={employeeForm.notes} onChange={e => setEmployeeForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={() => saveEmployee.mutate()} disabled={!employeeForm.full_name}>{labels.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.addPayRun}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>{labels.employee}</Label>
              <Select value={payrollForm.employee_id} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setPayrollForm(f => ({ ...f, employee_id: v, gross_amount: emp?.salary_amount || 0 }));
              }}>
                <SelectTrigger><SelectValue placeholder={labels.selectEmployee} /></SelectTrigger>
                <SelectContent>
                  {activeEmps.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.periodStart}</Label><Input type="date" value={payrollForm.pay_period_start} onChange={e => setPayrollForm(f => ({ ...f, pay_period_start: e.target.value }))} /></div>
              <div><Label>{labels.periodEnd}</Label><Input type="date" value={payrollForm.pay_period_end} onChange={e => setPayrollForm(f => ({ ...f, pay_period_end: e.target.value }))} /></div>
            </div>
            <div><Label>{labels.grossAmount}</Label><Input type="number" value={payrollForm.gross_amount} onChange={e => setPayrollForm(f => ({ ...f, gross_amount: Number(e.target.value) }))} /></div>

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{labels.deductions} (%)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">{labels.federalTax}</Label><Input type="number" step="0.1" value={payrollForm.deduction_rates.federal_tax} onChange={e => setPayrollForm(f => ({ ...f, deduction_rates: { ...f.deduction_rates, federal_tax: Number(e.target.value) } }))} /></div>
                <div><Label className="text-xs">{labels.stateTax}</Label><Input type="number" step="0.1" value={payrollForm.deduction_rates.state_tax} onChange={e => setPayrollForm(f => ({ ...f, deduction_rates: { ...f.deduction_rates, state_tax: Number(e.target.value) } }))} /></div>
                <div><Label className="text-xs">{labels.socialSecurity}</Label><Input type="number" step="0.1" value={payrollForm.deduction_rates.social_security} onChange={e => setPayrollForm(f => ({ ...f, deduction_rates: { ...f.deduction_rates, social_security: Number(e.target.value) } }))} /></div>
                <div><Label className="text-xs">{labels.medicare}</Label><Input type="number" step="0.1" value={payrollForm.deduction_rates.medicare} onChange={e => setPayrollForm(f => ({ ...f, deduction_rates: { ...f.deduction_rates, medicare: Number(e.target.value) } }))} /></div>
              </div>
              {payrollForm.gross_amount > 0 && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  <p>{labels.deductions}: {fmt(payrollForm.gross_amount * Object.values(payrollForm.deduction_rates).reduce((s, v) => s + v, 0) / 100)}</p>
                  <p className="font-semibold text-foreground">{labels.netAmount}: {fmt(payrollForm.gross_amount - payrollForm.gross_amount * Object.values(payrollForm.deduction_rates).reduce((s, v) => s + v, 0) / 100)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{labels.paymentDate}</Label><Input type="date" value={payrollForm.payment_date} onChange={e => setPayrollForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
              <div>
                <Label>{labels.paymentMethod}</Label>
                <Select value={payrollForm.payment_method} onValueChange={v => setPayrollForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_deposit">{labels.directDeposit}</SelectItem>
                    <SelectItem value="check">{labels.check}</SelectItem>
                    <SelectItem value="cash">{labels.cash}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{labels.refNumber}</Label><Input value={payrollForm.reference_number} onChange={e => setPayrollForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
            <div><Label>{labels.notes}</Label><Textarea value={payrollForm.notes} onChange={e => setPayrollForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={() => savePayroll.mutate()} disabled={!payrollForm.employee_id || !payrollForm.pay_period_start || !payrollForm.pay_period_end}>{labels.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
