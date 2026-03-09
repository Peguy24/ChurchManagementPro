import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileDown,
} from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import { fr, enUS } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface FinancialReportsTabProps {
  selectedBranch: string;
  branches: { id: string; name: string }[];
}

export default function FinancialReportsTab({ selectedBranch, branches }: FinancialReportsTabProps) {
  const { t, language } = useLanguage();
  const { formatAmount, currencySymbol } = useCurrency();
  const r = (key: string) => t(`financialReports.${key}`);
  const [period, setPeriod] = useState("12");
  const [reportType, setReportType] = useState("monthly");
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const categoryLabels: Record<string, string> = {
    tithe: t("donations.tithe"),
    offering: t("donations.offering"),
    building: t("donations.building"),
    mission: t("donations.mission"),
    special: t("donations.special"),
  };

  // Fetch donations
  const { data: donations = [] } = useQuery({
    queryKey: ["financial-reports-donations", period, selectedBranch],
    queryFn: async () => {
      const startDate = format(
        subMonths(startOfMonth(currentDate), parseInt(period) - 1),
        "yyyy-MM-dd"
      );
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");

      let query = supabase
        .from("donations")
        .select(`*, member:members(first_name, last_name), branch:branches(name), category:income_categories(name)`)
        .gte("donation_date", startDate)
        .lte("donation_date", endDate)
        .order("donation_date", { ascending: true });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ["financial-reports-expenses", period, selectedBranch],
    queryFn: async () => {
      const startDate = format(
        subMonths(startOfMonth(currentDate), parseInt(period) - 1),
        "yyyy-MM-dd"
      );
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");

      let query = supabase
        .from("expenses")
        .select(`*, category:expense_categories(name), branch:branches(name)`)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .eq("status", "approved")
        .order("expense_date", { ascending: true });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ["financial-reports-budgets", currentYear, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("budgets")
        .select(`*, category:expense_categories(name)`)
        .eq("fiscal_year", currentYear)
        .eq("status", "active");

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch special funds
  const { data: funds = [] } = useQuery({
    queryKey: ["financial-reports-funds", selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("special_funds")
        .select(`*, fund_transactions(*)`)
        .eq("status", "active");

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch income categories
  const { data: incomeCategories = [] } = useQuery({
    queryKey: ["income-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Monthly revenue vs expenses data
  const revenueVsExpensesData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; net: number }> = {};

    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy", { locale: dateLocale });
      months[monthKey] = { month: monthLabel, revenue: 0, expenses: 0, net: 0 };
    }

    donations.forEach((d) => {
      const monthKey = format(parseISO(d.donation_date), "yyyy-MM");
      if (months[monthKey]) {
        months[monthKey].revenue += Number(d.amount);
      }
    });

    expenses.forEach((e) => {
      const monthKey = format(parseISO(e.expense_date), "yyyy-MM");
      if (months[monthKey]) {
        months[monthKey].expenses += Number(e.amount);
      }
    });

    Object.keys(months).forEach((key) => {
      months[key].net = months[key].revenue - months[key].expenses;
    });

    return Object.values(months);
  }, [donations, expenses, period, dateLocale]);

  // Budget vs actual data
  const budgetVsActualData = useMemo(() => {
    return budgets.map((budget) => {
      const spent = expenses
        .filter((e) => e.category_id === budget.category_id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      return {
        name: budget.name,
        planned: Number(budget.planned_amount),
        actual: spent,
        variance: Number(budget.planned_amount) - spent,
        percentUsed: budget.planned_amount > 0 ? (spent / Number(budget.planned_amount)) * 100 : 0,
      };
    });
  }, [budgets, expenses]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    donations.forEach((d) => {
      const categoryName = d.category?.name || categoryLabels[d.donation_type] || d.donation_type;
      if (!breakdown[categoryName]) breakdown[categoryName] = 0;
      breakdown[categoryName] += Number(d.amount);
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [donations, categoryLabels]);

  // Funds report data
  const fundsData = useMemo(() => {
    return funds.map((fund) => ({
      name: fund.name,
      target: Number(fund.target_amount) || 0,
      current: Number(fund.current_amount) || 0,
      progress: fund.target_amount ? (Number(fund.current_amount) / Number(fund.target_amount)) * 100 : 0,
    }));
  }, [funds]);

  // Stats
  const stats = useMemo(() => {
    const totalRevenue = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netIncome = totalRevenue - totalExpenses;
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.planned_amount), 0);
    const budgetUsed = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      totalBudget,
      budgetUsed,
      budgetRemaining: totalBudget - budgetUsed,
    };
  }, [donations, expenses, budgets]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const revenueSheet = XLSX.utils.json_to_sheet(revenueVsExpensesData.map(m => ({
      [r("month")]: m.month,
      [r("revenue")]: m.revenue.toFixed(2),
      [r("expenses")]: m.expenses.toFixed(2),
      [r("net")]: m.net.toFixed(2),
    })));
    XLSX.utils.book_append_sheet(wb, revenueSheet, r("revenueVsExpenses"));

    if (budgetVsActualData.length > 0) {
      const budgetSheet = XLSX.utils.json_to_sheet(budgetVsActualData.map(b => ({
        [r("budget")]: b.name,
        [r("planned")]: b.planned.toFixed(2),
        [r("actual")]: b.actual.toFixed(2),
        [r("variance")]: b.variance.toFixed(2),
        [r("percentUsed")]: b.percentUsed.toFixed(1) + "%",
      })));
      XLSX.utils.book_append_sheet(wb, budgetSheet, r("budgetVsActual"));
    }

    const categorySheet = XLSX.utils.json_to_sheet(categoryData.map(c => ({
      [r("categoryDistribution")]: c.name,
      [r("amount")]: c.value.toFixed(2),
    })));
    XLSX.utils.book_append_sheet(wb, categorySheet, r("categoryDistribution"));

    XLSX.writeFile(wb, `${r("pdfTitle").toLowerCase().replace(/ /g, "-")}-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(r("pdfTitle"), 14, 22);
    doc.setFontSize(12);
    doc.text(r("pdfPeriod").replace("{n}", period), 14, 30);
    doc.text(`${r("pdfDate")}: ${format(currentDate, "dd/MM/yyyy")}`, 14, 36);

    doc.setFontSize(14);
    doc.text(r("pdfSummary"), 14, 48);
    doc.setFontSize(11);
    doc.text(`${r("totalRevenue")}: ${formatAmount(stats.totalRevenue)}`, 14, 56);
    doc.text(`${r("totalExpenses")}: ${formatAmount(stats.totalExpenses)}`, 14, 62);
    doc.text(`${r("netIncome")}: ${formatAmount(stats.netIncome)}`, 14, 68);

    autoTable(doc, {
      startY: 80,
      head: [[r("month"), r("revenue"), r("expenses"), r("net")]],
      body: revenueVsExpensesData.map(m => [
        m.month,
        formatAmount(m.revenue),
        formatAmount(m.expenses),
        formatAmount(m.net),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${r("pdfTitle").toLowerCase().replace(/ /g, "-")}-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const exportToCSV = () => {
    exportToCsv(
      revenueVsExpensesData,
      [
        { key: "month", header: r("month") },
        { key: "revenue", header: r("revenue"), formatter: (v) => v.toFixed(2) },
        { key: "expenses", header: r("expenses"), formatter: (v) => v.toFixed(2) },
        { key: "net", header: r("net"), formatter: (v) => v.toFixed(2) },
      ],
      `${r("pdfTitle").toLowerCase().replace(/ /g, "-")}-${format(currentDate, "yyyy-MM-dd")}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{r("last3Months")}</SelectItem>
            <SelectItem value="6">{r("last6Months")}</SelectItem>
            <SelectItem value="12">{r("last12Months")}</SelectItem>
            <SelectItem value="24">{r("last24Months")}</SelectItem>
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

      {/* Sub-tabs for different financial reports */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="monthly" className="text-xs sm:text-sm">{r("monthly")}</TabsTrigger>
          <TabsTrigger value="annual" className="text-xs sm:text-sm">{r("annual")}</TabsTrigger>
          <TabsTrigger value="revenueVsExpenses" className="text-xs sm:text-sm">{r("revenueVsExpenses")}</TabsTrigger>
          <TabsTrigger value="budgetVsActual" className="text-xs sm:text-sm">{r("budgetVsActual")}</TabsTrigger>
          <TabsTrigger value="funds" className="text-xs sm:text-sm">{r("funds")}</TabsTrigger>
        </TabsList>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r("totalRevenue")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(stats.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r("totalExpenses")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(stats.totalExpenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r("netIncome")}</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatAmount(stats.netIncome)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r("budgetRemaining")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(stats.budgetRemaining)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{r("revenueByCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatAmount(value), r("amount")]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annual Report */}
        <TabsContent value="annual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{r("annualReport")} {currentYear}</CardTitle>
              <CardDescription>{r("fiscalYearOverview")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">{r("totalRevenue")}</p>
                  <p className="text-2xl font-bold text-success">{formatAmount(stats.totalRevenue)}</p>
                </div>
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">{r("totalExpenses")}</p>
                  <p className="text-2xl font-bold text-destructive">{formatAmount(stats.totalExpenses)}</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${stats.netIncome >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground">{r("netResult")}</p>
                  <p className={`text-2xl font-bold ${stats.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatAmount(stats.netIncome)}
                  </p>
                </div>
              </div>

              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => formatAmount(value)} />
                    <Tooltip formatter={(value: number) => [formatAmount(value)]} />
                    <Legend />
                    <Bar dataKey="revenue" name={r("revenue")} fill="hsl(var(--success))" />
                    <Bar dataKey="expenses" name={r("expenses")} fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue vs Expenses */}
        <TabsContent value="revenueVsExpenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{r("revenueVsExpenses")}</CardTitle>
              <CardDescription>{r("monthlyComparison")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => formatAmount(value)} />
                    <Tooltip formatter={(value: number) => [formatAmount(value)]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name={r("revenue")} stroke="hsl(var(--success))" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" name={r("expenses")} stroke="hsl(var(--destructive))" strokeWidth={2} />
                    <Line type="monotone" dataKey="net" name={r("net")} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
              <Table className="mt-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>{r("month")}</TableHead>
                    <TableHead className="text-right">{r("revenue")}</TableHead>
                    <TableHead className="text-right">{r("expenses")}</TableHead>
                    <TableHead className="text-right">{r("net")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueVsExpensesData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right text-success">{formatAmount(row.revenue)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatAmount(row.expenses)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.net >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatAmount(row.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget vs Actual */}
        <TabsContent value="budgetVsActual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{r("plannedBudget")}</CardTitle>
              <CardDescription>{r("budgetExecution")} {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetVsActualData.length > 0 ? (
                <>
                  <div className="h-[350px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetVsActualData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(value) => formatAmount(value)} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => [formatAmount(value)]} />
                        <Legend />
                        <Bar dataKey="planned" name={r("planned")} fill="hsl(var(--primary))" />
                        <Bar dataKey="actual" name={r("actual")} fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{r("budget")}</TableHead>
                        <TableHead className="text-right">{r("planned")}</TableHead>
                        <TableHead className="text-right">{r("actual")}</TableHead>
                        <TableHead className="text-right">{r("variance")}</TableHead>
                        <TableHead className="text-right">{r("percentUsed")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetVsActualData.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">${row.planned.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.actual.toFixed(2)}</TableCell>
                          <TableCell className={`text-right ${row.variance >= 0 ? "text-success" : "text-destructive"}`}>
                            ${row.variance.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${row.percentUsed > 100 ? "text-destructive" : "text-success"}`}>
                            {row.percentUsed.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">{r("noBudgets")} {currentYear}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funds Report */}
        <TabsContent value="funds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{r("specialFundsReport")}</CardTitle>
              <CardDescription>{r("activeFundsTracking")}</CardDescription>
            </CardHeader>
            <CardContent>
              {fundsData.length > 0 ? (
                <>
                  <div className="h-[350px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fundsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`]} />
                        <Legend />
                        <Bar dataKey="target" name={r("target")} fill="hsl(var(--muted-foreground))" />
                        <Bar dataKey="current" name={r("collected")} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{r("fund")}</TableHead>
                        <TableHead className="text-right">{r("target")}</TableHead>
                        <TableHead className="text-right">{r("collected")}</TableHead>
                        <TableHead className="text-right">{r("progress")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundsData.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">${row.target.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.current.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full" 
                                  style={{ width: `${Math.min(row.progress, 100)}%` }}
                                />
                              </div>
                              <span className="font-semibold">{row.progress.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">{r("noActiveFunds")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
