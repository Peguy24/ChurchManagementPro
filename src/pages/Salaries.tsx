import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Users, History, Edit, Trash2, Banknote, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  salary_amount: number;
  payment_frequency: string;
  is_active: boolean;
  branch_id: string | null;
}

interface SalaryPayment {
  id: string;
  employee_id: string;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  status: string;
  employees?: Employee;
}

export default function Salaries() {
  const { toast } = useToast();
  const { formatAmount: formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);

  // Form states for employee
  const [employeeForm, setEmployeeForm] = useState({
    first_name: "",
    last_name: "",
    position: "",
    email: "",
    phone: "",
    hire_date: "",
    salary_amount: "",
    payment_frequency: "monthly",
  });

  // Form states for payment
  const [paymentForm, setPaymentForm] = useState({
    employee_id: "",
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    period_start: "",
    period_end: "",
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
    bank_account_id: "",
    cash_register_id: "",
  });

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("last_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  // Fetch salary payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["salary_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_payments")
        .select("*, employees(*)")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as SalaryPayment[];
    },
  });

  // Fetch bank accounts for payment
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch cash registers for payment
  const { data: cashRegisters = [] } = useQuery({
    queryKey: ["cash-registers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id, name, current_balance")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch or auto-create "Salaires" expense category
  const { data: salaryCategory } = useQuery({
    queryKey: ["expense-category-salaires", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      // Try to find existing
      const { data: existing } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", "Salaires")
        .maybeSingle();
      if (existing) return existing;
      // Auto-create
      const { data: created, error } = await supabase
        .from("expense_categories")
        .insert({ name: "Salaires", description: "Paiements de salaires du personnel", tenant_id: tenantId })
        .select("id")
        .single();
      if (error) throw error;
      return created;
    },
    enabled: !!tenantId,
  });

  // Create/Update employee mutation
  const employeeMutation = useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      position: string;
      email: string | null;
      phone: string | null;
      hire_date: string | null;
      salary_amount: number;
      payment_frequency: string;
    }) => {
      if (selectedEmployee) {
        const { error } = await supabase
          .from("employees")
          .update(data)
          .eq("id", selectedEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employees")
          .insert([{ ...data, created_by: user?.id, tenant_id: tenantId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: selectedEmployee ? t("salariesPage.employeeModified") : t("salariesPage.employeeAdded"),
        description: t("salariesPage.operationSuccess"),
      });
      setEmployeeDialogOpen(false);
      resetEmployeeForm();
    },
    onError: (error) => {
      toast({
        title: t("salariesPage.error"),
        description: t("salariesPage.genericError"),
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Create payment mutation - synchronized with expenses and balances
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const amount = parseFloat(data.amount);
      const employee = employees.find(e => e.id === data.employee_id);
      const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : t("salariesPage.employee");
      const periodLabel = `${format(new Date(data.period_start), "dd/MM/yyyy")} - ${format(new Date(data.period_end), "dd/MM/yyyy")}`;
      const expenseDescription = `${t("salariesPage.salary")} - ${employeeName} - ${periodLabel}`;

      // 1. Insert salary payment
      const { error: salaryError } = await supabase
        .from("salary_payments")
        .insert({
          employee_id: data.employee_id,
          amount,
          payment_date: data.payment_date,
          period_start: data.period_start,
          period_end: data.period_end,
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
          bank_account_id: data.bank_account_id || null,
          cash_register_id: data.cash_register_id || null,
          created_by: user?.id,
          tenant_id: tenantId,
        });
      if (salaryError) throw salaryError;

      // 2. Insert corresponding expense
      const { error: expenseError } = await supabase
        .from("expenses")
        .insert({
          description: expenseDescription,
          amount,
          expense_date: data.payment_date,
          category_id: salaryCategory?.id || null,
          payment_method: data.payment_method === "bank_transfer" ? "bank_transfer" : data.payment_method,
          bank_account_id: data.bank_account_id || null,
          cash_register_id: data.cash_register_id || null,
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          created_by: user?.id,
          tenant_id: tenantId,
          notes: `${t("salariesPage.autoPayment")} - ${data.notes || ""}`.trim(),
        });
      if (expenseError) throw expenseError;

      // 3. Deduct from payment source and record transaction
      if (data.cash_register_id) {
        const register = cashRegisters.find(r => r.id === data.cash_register_id);
        if (register) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(register.current_balance) - amount })
            .eq("id", data.cash_register_id);
        }
        await supabase.from("cash_transactions").insert({
          cash_register_id: data.cash_register_id,
          transaction_type: "expense",
          amount: -Math.abs(amount),
          description: expenseDescription,
          reference_number: data.reference_number || null,
          transaction_date: data.payment_date,
          tenant_id: tenantId,
        });
      } else if (data.bank_account_id) {
        const account = bankAccounts.find(a => a.id === data.bank_account_id);
        if (account) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: Number(account.current_balance) - amount })
            .eq("id", data.bank_account_id);
        }
        await supabase.from("bank_transactions").insert({
          bank_account_id: data.bank_account_id,
          transaction_type: "expense",
          amount,
          description: expenseDescription,
          reference_number: data.reference_number || null,
          transaction_date: data.payment_date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary_payments"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers-active"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({
        title: t("salariesPage.paymentRecorded"),
        description: t("salariesPage.paymentSuccess"),
      });
      setPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (error) => {
      toast({
        title: t("salariesPage.error"),
        description: t("salariesPage.paymentError"),
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: t("salariesPage.employeeDeleted"),
        description: t("salariesPage.employeeDeletedSuccess"),
      });
    },
    onError: (error) => {
      toast({
        title: t("salariesPage.error"),
        description: t("salariesPage.employeeDeleteError"),
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      first_name: "",
      last_name: "",
      position: "",
      email: "",
      phone: "",
      hire_date: "",
      salary_amount: "",
      payment_frequency: "monthly",
    });
    setSelectedEmployee(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      employee_id: "",
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      period_start: "",
      period_end: "",
      payment_method: "bank_transfer",
      reference_number: "",
      notes: "",
      bank_account_id: "",
      cash_register_id: "",
    });
    setSelectedPayment(null);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      position: employee.position,
      email: employee.email || "",
      phone: employee.phone || "",
      hire_date: employee.hire_date || "",
      salary_amount: employee.salary_amount.toString(),
      payment_frequency: employee.payment_frequency || "monthly",
    });
    setEmployeeDialogOpen(true);
  };

  const handlePayEmployee = (employee: Employee) => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setPaymentForm({
      employee_id: employee.id,
      amount: employee.salary_amount.toString(),
      payment_date: format(today, "yyyy-MM-dd"),
      period_start: format(firstOfMonth, "yyyy-MM-dd"),
      period_end: format(lastOfMonth, "yyyy-MM-dd"),
      payment_method: "bank_transfer",
      reference_number: "",
      notes: "",
      bank_account_id: "",
      cash_register_id: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    employeeMutation.mutate({
      first_name: employeeForm.first_name,
      last_name: employeeForm.last_name,
      position: employeeForm.position,
      email: employeeForm.email || null,
      phone: employeeForm.phone || null,
      hire_date: employeeForm.hire_date || null,
      salary_amount: parseFloat(employeeForm.salary_amount) || 0,
      payment_frequency: employeeForm.payment_frequency,
    });
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    paymentMutation.mutate({
      employee_id: paymentForm.employee_id,
      amount: paymentForm.amount,
      payment_date: paymentForm.payment_date,
      period_start: paymentForm.period_start,
      period_end: paymentForm.period_end,
      payment_method: paymentForm.payment_method,
      reference_number: paymentForm.reference_number || null,
      notes: paymentForm.notes || null,
      bank_account_id: paymentForm.bank_account_id || null,
      cash_register_id: paymentForm.cash_register_id || null,
    });
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = employees.filter((e) => e.is_active);
  const totalSalaries = activeEmployees.reduce((sum, e) => sum + e.salary_amount, 0);

  const paymentMethods: Record<string, string> = {
    bank_transfer: t("salariesPage.bankTransfer"),
    cash: t("salariesPage.cash"),
    check: t("salariesPage.check"),
  };

  const paymentFrequencies: Record<string, string> = {
    weekly: t("salariesPage.weekly"),
    biweekly: t("salariesPage.biweekly"),
    monthly: t("salariesPage.monthly"),
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("salariesPage.title")}</h1>
            <p className="text-muted-foreground">
              {t("salariesPage.subtitle")}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("salariesPage.activeStaff")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees.length}</div>
              <p className="text-xs text-muted-foreground">{t("salariesPage.paidEmployees")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("salariesPage.monthlyPayroll")}</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSalaries)}</div>
              <p className="text-xs text-muted-foreground">{t("salariesPage.perMonth")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("salariesPage.paymentsThisMonth")}</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(
                  (p) =>
                    new Date(p.payment_date).getMonth() === new Date().getMonth() &&
                    new Date(p.payment_date).getFullYear() === new Date().getFullYear()
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">{t("salariesPage.paymentsMade")}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              {t("salariesPage.staff")}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t("salariesPage.paymentHistory")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("salariesPage.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetEmployeeForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("salariesPage.addEmployee")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedEmployee ? t("salariesPage.editEmployee") : t("salariesPage.newEmployee")}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedEmployee
                        ? t("salariesPage.editEmployeeDesc")
                        : t("salariesPage.newEmployeeDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitEmployee} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">{t("salariesPage.firstName")} *</Label>
                        <Input
                          id="first_name"
                          value={employeeForm.first_name}
                          onChange={(e) =>
                            setEmployeeForm({ ...employeeForm, first_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">{t("salariesPage.lastName")} *</Label>
                        <Input
                          id="last_name"
                          value={employeeForm.last_name}
                          onChange={(e) =>
                            setEmployeeForm({ ...employeeForm, last_name: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">{t("salariesPage.position")} *</Label>
                      <Input
                        id="position"
                        value={employeeForm.position}
                        onChange={(e) =>
                          setEmployeeForm({ ...employeeForm, position: e.target.value })
                        }
                        placeholder={t("salariesPage.positionPlaceholder")}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("salariesPage.email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={employeeForm.email}
                          onChange={(e) =>
                            setEmployeeForm({ ...employeeForm, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("salariesPage.phone")}</Label>
                        <Input
                          id="phone"
                          value={employeeForm.phone}
                          onChange={(e) =>
                            setEmployeeForm({ ...employeeForm, phone: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hire_date">{t("salariesPage.hireDate")}</Label>
                      <Input
                        id="hire_date"
                        type="date"
                        value={employeeForm.hire_date}
                        onChange={(e) =>
                          setEmployeeForm({ ...employeeForm, hire_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="salary_amount">{t("salariesPage.salaryAmount")} *</Label>
                        <Input
                          id="salary_amount"
                          type="number"
                          step="0.01"
                          value={employeeForm.salary_amount}
                          onChange={(e) =>
                            setEmployeeForm({ ...employeeForm, salary_amount: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment_frequency">{t("salariesPage.frequency")}</Label>
                        <Select
                          value={employeeForm.payment_frequency}
                          onValueChange={(value) =>
                            setEmployeeForm({ ...employeeForm, payment_frequency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">{t("salariesPage.weekly")}</SelectItem>
                            <SelectItem value="biweekly">{t("salariesPage.biweekly")}</SelectItem>
                            <SelectItem value="monthly">{t("salariesPage.monthly")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={employeeMutation.isPending}>
                        {employeeMutation.isPending ? t("salariesPage.saving") : t("salariesPage.save")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("salariesPage.name")}</TableHead>
                    <TableHead>{t("salariesPage.position")}</TableHead>
                    <TableHead>{t("salariesPage.salaryAmount")}</TableHead>
                    <TableHead>{t("salariesPage.frequency")}</TableHead>
                    <TableHead>{t("salariesPage.status")}</TableHead>
                    <TableHead className="text-right">{t("salariesPage.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEmployees ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t("salariesPage.loading")}
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("salariesPage.noEmployees")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{formatCurrency(employee.salary_amount)}</TableCell>
                        <TableCell>
                          {paymentFrequencies[employee.payment_frequency] || employee.payment_frequency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? t("salariesPage.active") : t("salariesPage.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayEmployee(employee)}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              {t("salariesPage.pay")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEmployee(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("salariesPage.paymentHistory")}</CardTitle>
                <CardDescription>
                  {t("salariesPage.allPayments")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("salariesPage.date")}</TableHead>
                      <TableHead>{t("salariesPage.employee")}</TableHead>
                      <TableHead>{t("salariesPage.period")}</TableHead>
                      <TableHead>{t("salariesPage.amount")}</TableHead>
                      <TableHead>{t("salariesPage.paymentMethod")}</TableHead>
                      <TableHead>{t("salariesPage.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayments ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {t("salariesPage.loading")}
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("salariesPage.noPayments")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.employees?.first_name} {payment.employees?.last_name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.period_start), "dd/MM", { locale: fr })} -{" "}
                            {format(new Date(payment.period_end), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            {paymentMethods[payment.payment_method] || payment.payment_method}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                              {payment.status === "paid" ? t("salariesPage.paid") : payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("salariesPage.recordPayment")}</DialogTitle>
              <DialogDescription>
                {t("salariesPage.recordPaymentDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_employee">{t("salariesPage.employee")}</Label>
                <Select
                  value={paymentForm.employee_id}
                  onValueChange={(value) => {
                    const emp = employees.find((e) => e.id === value);
                    setPaymentForm({
                      ...paymentForm,
                      employee_id: value,
                      amount: emp?.salary_amount.toString() || paymentForm.amount,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("salariesPage.selectEmployee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.is_active)
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.position}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Montant *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Date de paiement *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Début période *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={paymentForm.period_start}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, period_start: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Fin période *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={paymentForm.period_end}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period_end: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Mode de paiement *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, payment_method: value, bank_account_id: "", cash_register_id: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Source account selection */}
              {(paymentForm.payment_method === "bank_transfer" || paymentForm.payment_method === "check") && (
                <div className="space-y-2">
                  <Label>Compte bancaire source *</Label>
                  <Select
                    value={paymentForm.bank_account_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, bank_account_id: value, cash_register_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(Number(account.current_balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {paymentForm.payment_method === "cash" && (
                <div className="space-y-2">
                  <Label>Caisse source *</Label>
                  <Select
                    value={paymentForm.cash_register_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, cash_register_id: value, bank_account_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une caisse" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashRegisters.map((register: any) => (
                        <SelectItem key={register.id} value={register.id}>
                          {register.name} ({formatCurrency(Number(register.current_balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reference_number">Référence</Label>
                <Input
                  id="reference_number"
                  value={paymentForm.reference_number}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, reference_number: e.target.value })
                  }
                  placeholder="N° de chèque, référence virement..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_notes">Notes</Label>
                <Input
                  id="payment_notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? "Enregistrement..." : "Enregistrer le paiement"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
