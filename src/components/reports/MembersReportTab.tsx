import { useMemo } from "react";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Users, UserPlus, UserCheck, Church, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface MembersReportTabProps {
  selectedBranch: string;
}

export default function MembersReportTab({ selectedBranch }: MembersReportTabProps) {
  const currentDate = new Date();

  // Fetch all members
  const { data: members = [] } = useQuery({
    queryKey: ["members-report", selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select(`*, branch:branches(name)`)
        .order("created_at", { ascending: false });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch ministry members
  const { data: ministryMembers = [] } = useQuery({
    queryKey: ["ministry-members-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministry_members")
        .select(`*, ministry:ministries(name), member:members(first_name, last_name)`);
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === "active").length;
    const baptized = members.filter(m => m.baptism_status === "baptized" || m.baptism_date).length;
    const newThisMonth = members.filter(m => {
      if (!m.created_at) return false;
      const createdDate = parseISO(m.created_at);
      return format(createdDate, "yyyy-MM") === format(currentDate, "yyyy-MM");
    }).length;

    return { total, active, baptized, newThisMonth };
  }, [members]);

  // Members by status
  const statusData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => {
      const status = m.status || "unknown";
      if (!breakdown[status]) breakdown[status] = 0;
      breakdown[status]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: name === "active" ? "Actif" : name === "inactive" ? "Inactif" : name === "transferred" ? "Transféré" : name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [members]);

  // Members by gender
  const genderData = useMemo(() => {
    const breakdown: Record<string, number> = { male: 0, female: 0, other: 0 };
    members.forEach(m => {
      const gender = m.gender?.toLowerCase() || "other";
      if (gender in breakdown) {
        breakdown[gender]++;
      } else {
        breakdown.other++;
      }
    });
    return [
      { name: "Hommes", value: breakdown.male, color: "hsl(var(--primary))" },
      { name: "Femmes", value: breakdown.female, color: "hsl(var(--secondary))" },
      { name: "Autre", value: breakdown.other, color: "hsl(var(--muted))" },
    ].filter(d => d.value > 0);
  }, [members]);

  // Members by marital status
  const maritalData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => {
      const status = m.marital_status || "Non spécifié";
      if (!breakdown[status]) breakdown[status] = 0;
      breakdown[status]++;
    });
    const labels: Record<string, string> = {
      single: "Célibataire",
      married: "Marié(e)",
      divorced: "Divorcé(e)",
      widowed: "Veuf/Veuve",
    };
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: labels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [members]);

  // Monthly growth
  const growthData = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, "yyyy-MM");
      months[monthKey] = 0;
    }

    members.forEach(m => {
      if (m.created_at) {
        const monthKey = format(parseISO(m.created_at), "yyyy-MM");
        if (months[monthKey] !== undefined) {
          months[monthKey]++;
        }
      }
    });

    return Object.entries(months).map(([key, value]) => ({
      month: format(parseISO(key + "-01"), "MMM yy", { locale: fr }),
      nouveaux: value,
    }));
  }, [members]);

  // Members by branch
  const branchData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => {
      const branchName = m.branch?.name || "Sans branche";
      if (!breakdown[branchName]) breakdown[branchName] = 0;
      breakdown[branchName]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [members]);

  // Members by ministry
  const ministryData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    ministryMembers.forEach(mm => {
      const ministryName = mm.ministry?.name || "Sans ministère";
      if (!breakdown[ministryName]) breakdown[ministryName] = 0;
      breakdown[ministryName]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [ministryMembers]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Members list
    const membersSheet = XLSX.utils.json_to_sheet(members.map(m => ({
      "N° Membre": m.member_number || "",
      Prénom: m.first_name,
      Nom: m.last_name,
      Statut: m.status,
      Branche: m.branch?.name || "",
      Téléphone: m.phone || "",
      Email: m.email || "",
      "Date d'inscription": m.join_date ? format(parseISO(m.join_date), "dd/MM/yyyy") : "",
    })));
    XLSX.utils.book_append_sheet(wb, membersSheet, "Liste Membres");

    // Stats
    const statsSheet = XLSX.utils.json_to_sheet([
      { Statistique: "Total Membres", Valeur: stats.total },
      { Statistique: "Membres Actifs", Valeur: stats.active },
      { Statistique: "Membres Baptisés", Valeur: stats.baptized },
      { Statistique: "Nouveaux ce mois", Valeur: stats.newThisMonth },
    ]);
    XLSX.utils.book_append_sheet(wb, statsSheet, "Statistiques");

    XLSX.writeFile(wb, `rapport-membres-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Rapport des Membres", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    // Stats
    doc.setFontSize(14);
    doc.text("Statistiques", 14, 42);
    doc.setFontSize(11);
    doc.text(`Total Membres: ${stats.total}`, 14, 50);
    doc.text(`Membres Actifs: ${stats.active}`, 14, 56);
    doc.text(`Membres Baptisés: ${stats.baptized}`, 14, 62);
    doc.text(`Nouveaux ce mois: ${stats.newThisMonth}`, 14, 68);

    // Members table
    autoTable(doc, {
      startY: 80,
      head: [["N°", "Prénom", "Nom", "Statut", "Branche"]],
      body: members.slice(0, 50).map(m => [
        m.member_number || "",
        m.first_name,
        m.last_name,
        m.status || "",
        m.branch?.name || "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapport-membres-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Membres</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membres Actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% du total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baptisés</CardTitle>
            <Church className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.baptized}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.baptized / stats.total) * 100).toFixed(1) : 0}% du total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux ce mois</CardTitle>
            <UserPlus className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Genre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {genderData.map((entry, index) => (
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

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Croissance Mensuelle</CardTitle>
          <CardDescription>Nouveaux membres par mois (12 derniers mois)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="nouveaux" name="Nouveaux membres" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Branch and Ministry Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membres par Branche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" name="Membres" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membres par Ministère</CardTitle>
          </CardHeader>
          <CardContent>
            {ministryData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ministryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" name="Membres" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune donnée de ministère</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
