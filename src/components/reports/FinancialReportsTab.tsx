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
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  parseISO,
  startOfYear,
  endOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLanguage } from "@/contexts/LanguageContext";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface FinancialReportsTabProps {
  selectedBranch: string;
  branches: { id: string; name: string }[];
}

export default function FinancialReportsTab({ selectedBranch, branches }: FinancialReportsTabProps) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("12");
  const [reportType, setReportType] = useState("monthly");
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

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
      const monthLabel = format(date, "MMM yyyy", { locale: fr });
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
  }, [donations, expenses, period]);

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

    // Revenue vs Expenses sheet
    const revenueSheet = XLSX.utils.json_to_sheet(revenueVsExpensesData.map(m => ({
      Mois: m.month,
      "Revenus ($)": m.revenue.toFixed(2),
      "Dépenses ($)": m.expenses.toFixed(2),
      "Net ($)": m.net.toFixed(2),
    })));
    XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenus vs Dépenses");

    // Budget vs Actual sheet
    if (budgetVsActualData.length > 0) {
      const budgetSheet = XLSX.utils.json_to_sheet(budgetVsActualData.map(b => ({
        Budget: b.name,
        "Prévu ($)": b.planned.toFixed(2),
        "Réel ($)": b.actual.toFixed(2),
        "Variance ($)": b.variance.toFixed(2),
        "% Utilisé": b.percentUsed.toFixed(1) + "%",
      })));
      XLSX.utils.book_append_sheet(wb, budgetSheet, "Budget vs Réel");
    }

    // Category breakdown
    const categorySheet = XLSX.utils.json_to_sheet(categoryData.map(c => ({
      Catégorie: c.name,
      "Montant ($)": c.value.toFixed(2),
    })));
    XLSX.utils.book_append_sheet(wb, categorySheet, "Par Catégorie");

    XLSX.writeFile(wb, `rapport-financier-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Rapport Financier", 14, 22);
    doc.setFontSize(12);
    doc.text(`Période: ${period} derniers mois`, 14, 30);
    doc.text(`Date: ${format(currentDate, "dd/MM/yyyy")}`, 14, 36);

    // Summary
    doc.setFontSize(14);
    doc.text("Résumé", 14, 48);
    doc.setFontSize(11);
    doc.text(`Total Revenus: $${stats.totalRevenue.toFixed(2)}`, 14, 56);
    doc.text(`Total Dépenses: $${stats.totalExpenses.toFixed(2)}`, 14, 62);
    doc.text(`Revenu Net: $${stats.netIncome.toFixed(2)}`, 14, 68);

    // Revenue vs Expenses table
    autoTable(doc, {
      startY: 80,
      head: [["Mois", "Revenus", "Dépenses", "Net"]],
      body: revenueVsExpensesData.map(m => [
        m.month,
        `$${m.revenue.toFixed(2)}`,
        `$${m.expenses.toFixed(2)}`,
        `$${m.net.toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapport-financier-${format(currentDate, "yyyy-MM-dd")}.pdf`);
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
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
            <SelectItem value="24">24 derniers mois</SelectItem>
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

      {/* Sub-tabs for different financial reports */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="monthly" className="text-xs sm:text-sm">Mensuel</TabsTrigger>
          <TabsTrigger value="annual" className="text-xs sm:text-sm">Annuel</TabsTrigger>
          <TabsTrigger value="revenueVsExpenses" className="text-xs sm:text-sm">Revenus vs Dépenses</TabsTrigger>
          <TabsTrigger value="budgetVsActual" className="text-xs sm:text-sm">Budget vs Réel</TabsTrigger>
          <TabsTrigger value="funds" className="text-xs sm:text-sm">Fonds</TabsTrigger>
        </TabsList>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenus</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Dépenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalExpenses.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Net</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                  ${stats.netIncome.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Restant</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.budgetRemaining.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenus par Catégorie</CardTitle>
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
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Montant"]} />
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
              <CardTitle>Rapport Annuel {currentYear}</CardTitle>
              <CardDescription>Vue d'ensemble de l'année fiscale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenus</p>
                  <p className="text-2xl font-bold text-success">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Dépenses</p>
                  <p className="text-2xl font-bold text-destructive">${stats.totalExpenses.toFixed(2)}</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${stats.netIncome >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground">Résultat Net</p>
                  <p className={`text-2xl font-bold ${stats.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                    ${stats.netIncome.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--success))" />
                    <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--destructive))" />
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
              <CardTitle>Revenus vs Dépenses</CardTitle>
              <CardDescription>Comparaison mensuelle des flux financiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenus" stroke="hsl(var(--success))" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--destructive))" strokeWidth={2} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
              <Table className="mt-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">Revenus</TableHead>
                    <TableHead className="text-right">Dépenses</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueVsExpensesData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right text-success">${row.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-destructive">${row.expenses.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.net >= 0 ? "text-success" : "text-destructive"}`}>
                        ${row.net.toFixed(2)}
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
              <CardTitle>Budget Prévu vs Réel</CardTitle>
              <CardDescription>Suivi de l'exécution budgétaire {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetVsActualData.length > 0 ? (
                <>
                  <div className="h-[350px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetVsActualData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`]} />
                        <Legend />
                        <Bar dataKey="planned" name="Prévu" fill="hsl(var(--primary))" />
                        <Bar dataKey="actual" name="Réel" fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget</TableHead>
                        <TableHead className="text-right">Prévu</TableHead>
                        <TableHead className="text-right">Réel</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">% Utilisé</TableHead>
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
                <p className="text-center text-muted-foreground py-8">Aucun budget créé pour {currentYear}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funds Report */}
        <TabsContent value="funds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapport par Fonds Spéciaux</CardTitle>
              <CardDescription>Suivi des fonds spéciaux actifs</CardDescription>
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
                        <Bar dataKey="target" name="Objectif" fill="hsl(var(--muted-foreground))" />
                        <Bar dataKey="current" name="Collecté" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonds</TableHead>
                        <TableHead className="text-right">Objectif</TableHead>
                        <TableHead className="text-right">Collecté</TableHead>
                        <TableHead className="text-right">Progression</TableHead>
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
                <p className="text-center text-muted-foreground py-8">Aucun fonds spécial actif</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
