import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Banknote
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--secondary))", "hsl(var(--accent))"];

const FinancialDashboard = () => {
  const { t, language } = useLanguage();
  const currentDate = new Date();
  const currentMonthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");

  // Fetch donations for current month
  const { data: currentDonations } = useQuery({
    queryKey: ["donations-current-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("amount, donation_type")
        .gte("donation_date", currentMonthStart)
        .lte("donation_date", currentMonthEnd);
      return data || [];
    },
  });

  // Fetch donations for last month
  const { data: lastMonthDonations } = useQuery({
    queryKey: ["donations-last-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("amount")
        .gte("donation_date", lastMonthStart)
        .lte("donation_date", lastMonthEnd);
      return data || [];
    },
  });

  // Fetch expenses for current month
  const { data: currentExpenses } = useQuery({
    queryKey: ["expenses-current-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount, status, category_id, expense_categories(name)")
        .gte("expense_date", currentMonthStart)
        .lte("expense_date", currentMonthEnd);
      return data || [];
    },
  });

  // Fetch expenses for last month
  const { data: lastMonthExpenses } = useQuery({
    queryKey: ["expenses-last-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", lastMonthStart)
        .lte("expense_date", lastMonthEnd);
      return data || [];
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Fetch budgets for current year with category info
  const { data: budgets } = useQuery({
    queryKey: ["budgets-current-year"],
    queryFn: async () => {
      const { data } = await supabase
        .from("budgets")
        .select("*, category:expense_categories(id, name)")
        .eq("fiscal_year", currentDate.getFullYear())
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch cash registers
  const { data: cashRegisters } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Fetch approved expenses by category for budget comparison
  const { data: approvedExpenses } = useQuery({
    queryKey: ["approved-expenses-current-year"],
    queryFn: async () => {
      const yearStart = `${currentDate.getFullYear()}-01-01`;
      const yearEnd = `${currentDate.getFullYear()}-12-31`;
      const { data } = await supabase
        .from("expenses")
        .select("amount, category_id")
        .eq("status", "approved")
        .gte("expense_date", yearStart)
        .lte("expense_date", yearEnd);
      return data || [];
    },
  });

  // Fetch monthly trends (last 6 months)
  const { data: monthlyTrends } = useQuery({
    queryKey: ["monthly-trends"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(currentDate, i);
        const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const end = format(endOfMonth(monthDate), "yyyy-MM-dd");
        months.push({ start, end, label: format(monthDate, "MMM", { locale: language === "fr" ? fr : undefined }) });
      }

      const trends = await Promise.all(
        months.map(async ({ start, end, label }) => {
          const [donationsRes, expensesRes] = await Promise.all([
            supabase
              .from("donations")
              .select("amount")
              .gte("donation_date", start)
              .lte("donation_date", end),
            supabase
              .from("expenses")
              .select("amount")
              .gte("expense_date", start)
              .lte("expense_date", end),
          ]);

          const income = donationsRes.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
          const expenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

          return { month: label, income, expenses, net: income - expenses };
        })
      );

      return trends;
    },
  });

  // Calculate totals
  const totalIncome = currentDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const lastMonthIncome = lastMonthDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const incomeChange = lastMonthIncome > 0 ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;

  const totalExpenses = currentExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const lastMonthExpensesTotal = lastMonthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const expenseChange = lastMonthExpensesTotal > 0 ? ((totalExpenses - lastMonthExpensesTotal) / lastMonthExpensesTotal) * 100 : 0;

  const totalBankBalance = bankAccounts?.reduce((sum, a) => sum + Number(a.current_balance || 0), 0) || 0;
  const totalCashBalance = cashRegisters?.reduce((sum, r) => sum + Number(r.current_balance || 0), 0) || 0;
  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.planned_amount), 0) || 0;

  const netIncome = totalIncome - totalExpenses;

  // Calculate budget alerts
  const budgetAlerts = budgets?.map(budget => {
    const categoryId = (budget.category as any)?.id;
    const spentAmount = approvedExpenses
      ?.filter(e => e.category_id === categoryId)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const plannedAmount = Number(budget.planned_amount);
    const percentage = plannedAmount > 0 ? (spentAmount / plannedAmount) * 100 : 0;
    const isOverBudget = percentage > 100;
    const isNearLimit = percentage >= 80 && percentage <= 100;
    
    return {
      name: budget.name,
      categoryName: (budget.category as any)?.name || t("finance.uncategorized"),
      planned: plannedAmount,
      spent: spentAmount,
      percentage,
      isOverBudget,
      isNearLimit,
      remaining: plannedAmount - spentAmount,
    };
  }).filter(b => b.isOverBudget || b.isNearLimit) || [];

  // Income by type for pie chart
  const incomeByType = currentDonations?.reduce((acc, d) => {
    const type = d.donation_type || "other";
    acc[type] = (acc[type] || 0) + Number(d.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const incomeTypeData = Object.entries(incomeByType).map(([name, value]) => ({ name, value }));

  // Expenses by category for pie chart
  const expensesByCategory = currentExpenses?.reduce((acc, e) => {
    const category = (e.expense_categories as any)?.name || t("finance.other");
    acc[category] = (acc[category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const expenseCategoryData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("finance.dashboard")}</h1>
          <p className="text-muted-foreground">
            {format(currentDate, "MMMM yyyy", { locale: language === "fr" ? fr : undefined })}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("finance.totalIncome")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {incomeChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={incomeChange >= 0 ? "text-green-500" : "text-red-500"}>
                  {incomeChange >= 0 ? "+" : ""}{incomeChange.toFixed(1)}%
                </span>
                <span className="ml-1">{t("finance.vsLastMonth")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("finance.totalExpenses")}</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {expenseChange <= 0 ? (
                  <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={expenseChange <= 0 ? "text-green-500" : "text-red-500"}>
                  {expenseChange >= 0 ? "+" : ""}{expenseChange.toFixed(1)}%
                </span>
                <span className="ml-1">{t("finance.vsLastMonth")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("finance.bankBalance")}</CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBankBalance)}</div>
              <p className="text-xs text-muted-foreground">
                {bankAccounts?.length || 0} {t("finance.activeAccounts")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("finance.annualBudget")}</CardTitle>
              <PiggyBank className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                {budgets?.length || 0} {t("finance.activeBudgets")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Net Income Card */}
        <Card className={`border-2 ${netIncome >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("finance.netIncome")}</p>
                <p className={`text-3xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(netIncome)}
                </p>
              </div>
              <DollarSign className={`h-12 w-12 ${netIncome >= 0 ? "text-green-500" : "text-red-500"}`} />
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Trends */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{t("finance.monthlyTrends")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name={t("finance.income")} 
                      stroke="hsl(142, 76%, 36%)" 
                      fill="hsl(142, 76%, 36%)" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      name={t("finance.expenses")} 
                      stroke="hsl(0, 84%, 60%)" 
                      fill="hsl(0, 84%, 60%)" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income by Type */}
          <Card>
            <CardHeader>
              <CardTitle>{t("finance.incomeByType")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {incomeTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {incomeTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t("common.noData")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle>{t("finance.expensesByCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {expenseCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t("common.noData")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                {t("finance.budgetAlerts")}
              </CardTitle>
              <CardDescription>{t("finance.budgetsNearOrOver")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetAlerts.map((alert, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-sm text-muted-foreground">{alert.categoryName}</p>
                      </div>
                      <Badge variant={alert.isOverBudget ? "destructive" : "secondary"}>
                        {alert.isOverBudget ? t("finance.overBudget") : t("finance.nearLimit")}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("finance.spent")}: {formatCurrency(alert.spent)}</span>
                        <span>{t("finance.budget")}: {formatCurrency(alert.planned)}</span>
                      </div>
                      <Progress 
                        value={Math.min(alert.percentage, 100)} 
                        className={alert.isOverBudget ? "[&>div]:bg-destructive" : "[&>div]:bg-orange-500"}
                      />
                      <p className={`text-sm font-medium ${alert.remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {alert.remaining < 0 
                          ? `${t("finance.overage")}: ${formatCurrency(Math.abs(alert.remaining))}` 
                          : `${t("finance.remaining")}: ${formatCurrency(alert.remaining)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Registers & Bank Accounts Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Cash Registers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" />
                {t("finance.cashRegisters")}
              </CardTitle>
              <CardDescription>{t("finance.totalBalance")}: {formatCurrency(totalCashBalance)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cashRegisters?.map((register) => (
                  <div key={register.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{register.name}</span>
                    </div>
                    <span className={`font-bold ${Number(register.current_balance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Number(register.current_balance || 0))}
                    </span>
                  </div>
                ))}
                {(!cashRegisters || cashRegisters.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">{t("common.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                {t("finance.bankAccounts")}
              </CardTitle>
              <CardDescription>Solde total: {formatCurrency(totalBankBalance)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bankAccounts?.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(Number(account.current_balance || 0))}
                    </span>
                  </div>
                ))}
                {(!bankAccounts || bankAccounts.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">{t("common.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Available Funds */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fonds Disponibles Totaux</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(totalCashBalance + totalBankBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Caisses: {formatCurrency(totalCashBalance)} + Banques: {formatCurrency(totalBankBalance)}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FinancialDashboard;
