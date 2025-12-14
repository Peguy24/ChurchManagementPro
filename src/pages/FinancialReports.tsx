import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
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
  Download,
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
  startOfYear,
  endOfYear,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const categoryLabels: Record<string, string> = {
  tithe: "Dim",
  offering: "Ofrann",
  building: "Batiman",
  mission: "Misyon",
  special: "Espesyal",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))"];

export default function FinancialReports() {
  const [period, setPeriod] = useState("12");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const currentDate = new Date();

  // Fetch all branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all donations for the selected period
  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["financial-reports", period, selectedBranch],
    queryFn: async () => {
      const startDate = format(
        subMonths(startOfMonth(currentDate), parseInt(period) - 1),
        "yyyy-MM-dd"
      );
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");

      let query = supabase
        .from("donations")
        .select(`
          *,
          member:members(first_name, last_name),
          branch:branches(name)
        `)
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

  // Calculate monthly data for charts
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; total: number; tithe: number; offering: number; building: number; mission: number; special: number }> = {};
    
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy", { locale: fr });
      months[monthKey] = {
        month: monthLabel,
        total: 0,
        tithe: 0,
        offering: 0,
        building: 0,
        mission: 0,
        special: 0,
      };
    }

    donations.forEach((d) => {
      const monthKey = format(parseISO(d.donation_date), "yyyy-MM");
      if (months[monthKey]) {
        months[monthKey].total += Number(d.amount);
        const type = d.donation_type as keyof typeof months[string];
        if (type in months[monthKey]) {
          (months[monthKey] as any)[type] += Number(d.amount);
        }
      }
    });

    return Object.values(months);
  }, [donations, period]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    donations.forEach((d) => {
      if (!breakdown[d.donation_type]) breakdown[d.donation_type] = 0;
      breakdown[d.donation_type] += Number(d.amount);
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: categoryLabels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [donations]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const count = donations.length;
    const average = count > 0 ? total / count : 0;

    // Calculate current month vs previous month
    const currentMonth = format(currentDate, "yyyy-MM");
    const previousMonth = format(subMonths(currentDate, 1), "yyyy-MM");

    const currentMonthTotal = donations
      .filter((d) => format(parseISO(d.donation_date), "yyyy-MM") === currentMonth)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const previousMonthTotal = donations
      .filter((d) => format(parseISO(d.donation_date), "yyyy-MM") === previousMonth)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const monthlyChange = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

    return {
      total,
      count,
      average,
      currentMonthTotal,
      previousMonthTotal,
      monthlyChange,
    };
  }, [donations]);

  // Export to Excel
  const exportToExcel = () => {
    // Monthly summary
    const monthlySheet = monthlyData.map((m) => ({
      Mwa: m.month,
      "Total ($)": m.total.toFixed(2),
      "Dim ($)": m.tithe.toFixed(2),
      "Ofrann ($)": m.offering.toFixed(2),
      "Batiman ($)": m.building.toFixed(2),
      "Misyon ($)": m.mission.toFixed(2),
      "Espesyal ($)": m.special.toFixed(2),
    }));

    // Detailed transactions
    const detailSheet = donations.map((d) => ({
      Dat: format(parseISO(d.donation_date), "dd/MM/yyyy"),
      Donatè: d.member ? `${d.member.first_name} ${d.member.last_name}` : "Anonim",
      "Montan ($)": Number(d.amount).toFixed(2),
      Tip: categoryLabels[d.donation_type] || d.donation_type,
      Branch: d.branch?.name || "N/A",
      Nòt: d.notes || "",
    }));

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(monthlySheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Rezime Mansyèl");
    
    const ws2 = XLSX.utils.json_to_sheet(detailSheet);
    XLSX.utils.book_append_sheet(wb, ws2, "Detay Tranzaksyon");

    XLSX.writeFile(wb, `rapò-finansye-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Rapò Finansyè", 14, 22);
    doc.setFontSize(12);
    doc.text(`Peryòd: ${period} dènye mwa`, 14, 30);
    doc.text(`Dat: ${format(currentDate, "dd/MM/yyyy")}`, 14, 36);

    // Summary stats
    doc.setFontSize(14);
    doc.text("Rezime", 14, 48);
    doc.setFontSize(11);
    doc.text(`Total Kontribisyon: $${stats.total.toFixed(2)}`, 14, 56);
    doc.text(`Kantite Don: ${stats.count}`, 14, 62);
    doc.text(`Mwayèn pa Don: $${stats.average.toFixed(2)}`, 14, 68);

    // Monthly summary table
    doc.setFontSize(14);
    doc.text("Rezime Mansyèl", 14, 82);

    autoTable(doc, {
      startY: 88,
      head: [["Mwa", "Total", "Dim", "Ofrann", "Batiman", "Misyon", "Espesyal"]],
      body: monthlyData.map((m) => [
        m.month,
        `$${m.total.toFixed(2)}`,
        `$${m.tithe.toFixed(2)}`,
        `$${m.offering.toFixed(2)}`,
        `$${m.building.toFixed(2)}`,
        `$${m.mission.toFixed(2)}`,
        `$${m.special.toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Category breakdown
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Distribisyon pa Kategori", 14, finalY);

    autoTable(doc, {
      startY: finalY + 6,
      head: [["Kategori", "Montan", "Pousantaj"]],
      body: categoryData.map((c) => [
        c.name,
        `$${c.value.toFixed(2)}`,
        `${((c.value / stats.total) * 100).toFixed(1)}%`,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapò-finansye-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Rapò Finansye</h2>
            <p className="text-muted-foreground">
              Analiz detaye kontribisyon ak don
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tout branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout branch</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 dènye mwa</SelectItem>
                <SelectItem value="6">6 dènye mwa</SelectItem>
                <SelectItem value="12">12 dènye mwa</SelectItem>
                <SelectItem value="24">24 dènye mwa</SelectItem>
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
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Peryòd</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats.count} don</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mwa Sa</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.currentMonthTotal.toFixed(2)}
              </div>
              <div className="flex items-center text-xs">
                {stats.monthlyChange >= 0 ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-success" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-destructive" />
                )}
                <span
                  className={
                    stats.monthlyChange >= 0 ? "text-success" : "text-destructive"
                  }
                >
                  {Math.abs(stats.monthlyChange).toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs mwa pase</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mwayèn Don</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.average.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">pa don</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mwa Pase</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.previousMonthTotal.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(subMonths(currentDate, 1), "MMMM yyyy", { locale: fr })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolisyon Mansyèl</CardTitle>
              <CardDescription>Total kontribisyon pa mwa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribisyon pa Kategori</CardTitle>
              <CardDescription>Rezime pa tip don</CardDescription>
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
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Montan"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stacked Bar Chart - Category Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Konparezon Kategori pa Mwa</CardTitle>
            <CardDescription>
              Distribisyon don pa kategori chak mwa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`,
                      categoryLabels[name] || name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    formatter={(value) => categoryLabels[value] || value}
                  />
                  <Bar dataKey="tithe" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="offering" stackId="a" fill="hsl(var(--secondary))" />
                  <Bar dataKey="building" stackId="a" fill="hsl(var(--info))" />
                  <Bar dataKey="mission" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="special" stackId="a" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rezime Mansyèl Detaye</CardTitle>
            <CardDescription>
              Chif egzak pa mwa ak kategori
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mwa</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dim</TableHead>
                    <TableHead className="text-right">Ofrann</TableHead>
                    <TableHead className="text-right">Batiman</TableHead>
                    <TableHead className="text-right">Misyon</TableHead>
                    <TableHead className="text-right">Espesyal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${row.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.tithe.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.offering.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.building.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.mission.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.special.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.total, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.tithe, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.offering, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.building, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.mission, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${monthlyData.reduce((s, m) => s + m.special, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
