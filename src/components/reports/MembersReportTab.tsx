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
import { Users, UserPlus, UserCheck, Church, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    totalMembers: "Total Members",
    activeMembers: "Active Members",
    baptized: "Baptized",
    newThisMonth: "New This Month",
    ofTotal: "of total",
    statusDistribution: "Distribution by Status",
    genderDistribution: "Distribution by Gender",
    monthlyGrowth: "Monthly Growth",
    newMembersPerMonth: "New members per month (last 12 months)",
    membersByBranch: "Members by Branch",
    membersByMinistry: "Members by Ministry",
    noMinistryData: "No ministry data",
    active: "Active",
    inactive: "Inactive",
    transferred: "Transferred",
    men: "Men",
    women: "Women",
    other: "Other",
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
    notSpecified: "Not specified",
    noBranch: "No branch",
    noMinistry: "No ministry",
    newMembers: "New members",
    members: "Members",
    memberNumber: "Member #",
    firstName: "First Name",
    lastName: "Last Name",
    status: "Status",
    branch: "Branch",
    phone: "Phone",
    email: "Email",
    joinDate: "Join Date",
    membersList: "Members List",
    statistics: "Statistics",
    membersReport: "Members Report",
    date: "Date",
    statistic: "Statistic",
    value: "Value",
    totalBaptized: "Baptized Members",
    newMonth: "New this month",
  },
  fr: {
    totalMembers: "Total Membres",
    activeMembers: "Membres Actifs",
    baptized: "Baptisés",
    newThisMonth: "Nouveaux ce mois",
    ofTotal: "du total",
    statusDistribution: "Répartition par Statut",
    genderDistribution: "Répartition par Genre",
    monthlyGrowth: "Croissance Mensuelle",
    newMembersPerMonth: "Nouveaux membres par mois (12 derniers mois)",
    membersByBranch: "Membres par Branche",
    membersByMinistry: "Membres par Ministère",
    noMinistryData: "Aucune donnée de ministère",
    active: "Actif",
    inactive: "Inactif",
    transferred: "Transféré",
    men: "Hommes",
    women: "Femmes",
    other: "Autre",
    single: "Célibataire",
    married: "Marié(e)",
    divorced: "Divorcé(e)",
    widowed: "Veuf/Veuve",
    notSpecified: "Non spécifié",
    noBranch: "Sans branche",
    noMinistry: "Sans ministère",
    newMembers: "Nouveaux membres",
    members: "Membres",
    memberNumber: "N° Membre",
    firstName: "Prénom",
    lastName: "Nom",
    status: "Statut",
    branch: "Branche",
    phone: "Téléphone",
    email: "Email",
    joinDate: "Date d'inscription",
    membersList: "Liste Membres",
    statistics: "Statistiques",
    membersReport: "Rapport des Membres",
    date: "Date",
    statistic: "Statistique",
    value: "Valeur",
    totalBaptized: "Membres Baptisés",
    newMonth: "Nouveaux ce mois",
  },
  ht: {
    totalMembers: "Total Manm",
    activeMembers: "Manm Aktif",
    baptized: "Batize",
    newThisMonth: "Nouvo mwa sa a",
    ofTotal: "nan total",
    statusDistribution: "Distribisyon pa Estati",
    genderDistribution: "Distribisyon pa Sèks",
    monthlyGrowth: "Kwasans Chak Mwa",
    newMembersPerMonth: "Nouvo manm chak mwa (12 dènye mwa)",
    membersByBranch: "Manm pa Branch",
    membersByMinistry: "Manm pa Ministè",
    noMinistryData: "Pa gen done ministè",
    active: "Aktif",
    inactive: "Inaktif",
    transferred: "Transfere",
    men: "Gason",
    women: "Fi",
    other: "Lòt",
    single: "Selibatè",
    married: "Marye",
    divorced: "Divòse",
    widowed: "Vèf/Vèv",
    notSpecified: "Pa presize",
    noBranch: "San branch",
    noMinistry: "San ministè",
    newMembers: "Nouvo manm",
    members: "Manm",
    memberNumber: "N° Manm",
    firstName: "Prenon",
    lastName: "Non",
    status: "Estati",
    branch: "Branch",
    phone: "Telefòn",
    email: "Imèl",
    joinDate: "Dat Enskripsyon",
    membersList: "Lis Manm",
    statistics: "Estatistik",
    membersReport: "Rapò Manm",
    date: "Dat",
    statistic: "Estatistik",
    value: "Valè",
    totalBaptized: "Manm Batize",
    newMonth: "Nouvo mwa sa a",
  },
};

interface MembersReportTabProps {
  selectedBranch: string;
}

export default function MembersReportTab({ selectedBranch }: MembersReportTabProps) {
  const { language } = useLanguage();
  const lt = localTranslations[language] || localTranslations.en;
  const currentDate = new Date();
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const { data: members = [] } = useQuery({
    queryKey: ["members-report", selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select(`*, branch:branches!members_branch_id_fkey(name)`)
        .order("created_at", { ascending: false });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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

  const statusLabels: Record<string, string> = {
    active: lt.active,
    inactive: lt.inactive,
    transferred: lt.transferred,
  };

  const statusData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => {
      const status = m.status || "unknown";
      if (!breakdown[status]) breakdown[status] = 0;
      breakdown[status]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: statusLabels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [members, lt]);

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
      { name: lt.men, value: breakdown.male, color: "hsl(var(--primary))" },
      { name: lt.women, value: breakdown.female, color: "hsl(var(--secondary))" },
      { name: lt.other, value: breakdown.other, color: "hsl(var(--muted))" },
    ].filter(d => d.value > 0);
  }, [members, lt]);

  const maritalLabels: Record<string, string> = {
    single: lt.single,
    married: lt.married,
    divorced: lt.divorced,
    widowed: lt.widowed,
  };

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
      month: format(parseISO(key + "-01"), "MMM yy", { locale: dateLocale }),
      newMembers: value,
    }));
  }, [members, dateLocale]);

  const branchData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => {
      const branchName = m.branch?.name || lt.noBranch;
      if (!breakdown[branchName]) breakdown[branchName] = 0;
      breakdown[branchName]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [members, lt]);

  const ministryData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    ministryMembers.forEach(mm => {
      const ministryName = mm.ministry?.name || lt.noMinistry;
      if (!breakdown[ministryName]) breakdown[ministryName] = 0;
      breakdown[ministryName]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [ministryMembers, lt]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const membersSheet = XLSX.utils.json_to_sheet(members.map(m => ({
      [lt.memberNumber]: m.member_number || "",
      [lt.firstName]: m.first_name,
      [lt.lastName]: m.last_name,
      [lt.status]: m.status,
      [lt.branch]: m.branch?.name || "",
      [lt.phone]: m.phone || "",
      [lt.email]: m.email || "",
      [lt.joinDate]: m.join_date ? format(parseISO(m.join_date), "dd/MM/yyyy") : "",
    })));
    XLSX.utils.book_append_sheet(wb, membersSheet, lt.membersList);

    const statsSheet = XLSX.utils.json_to_sheet([
      { [lt.statistic]: lt.totalMembers, [lt.value]: stats.total },
      { [lt.statistic]: lt.activeMembers, [lt.value]: stats.active },
      { [lt.statistic]: lt.totalBaptized, [lt.value]: stats.baptized },
      { [lt.statistic]: lt.newThisMonth, [lt.value]: stats.newThisMonth },
    ]);
    XLSX.utils.book_append_sheet(wb, statsSheet, lt.statistics);

    XLSX.writeFile(wb, `members-report-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(lt.membersReport, 14, 22);
    doc.setFontSize(12);
    doc.text(`${lt.date}: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    doc.setFontSize(14);
    doc.text(lt.statistics, 14, 42);
    doc.setFontSize(11);
    doc.text(`${lt.totalMembers}: ${stats.total}`, 14, 50);
    doc.text(`${lt.activeMembers}: ${stats.active}`, 14, 56);
    doc.text(`${lt.totalBaptized}: ${stats.baptized}`, 14, 62);
    doc.text(`${lt.newThisMonth}: ${stats.newThisMonth}`, 14, 68);

    autoTable(doc, {
      startY: 80,
      head: [[lt.memberNumber, lt.firstName, lt.lastName, lt.status, lt.branch]],
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

    doc.save(`members-report-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const exportToCSV = () => {
    exportToCsv(
      members,
      [
        { key: "member_number", header: lt.memberNumber },
        { key: "first_name", header: lt.firstName },
        { key: "last_name", header: lt.lastName },
        { key: "status", header: lt.status },
        { key: "branch.name", header: lt.branch },
        { key: "phone", header: lt.phone },
        { key: "email", header: lt.email },
        { key: "join_date", header: lt.joinDate, formatter: (v) => v ? format(parseISO(v), "dd/MM/yyyy") : "" },
      ],
      `members-report-${format(currentDate, "yyyy-MM-dd")}`
    );
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
        <Button variant="outline" onClick={exportToCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.totalMembers}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.activeMembers}</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% {lt.ofTotal}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.baptized}</CardTitle>
            <Church className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.baptized}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.baptized / stats.total) * 100).toFixed(1) : 0}% {lt.ofTotal}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.newThisMonth}</CardTitle>
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
            <CardTitle>{lt.statusDistribution}</CardTitle>
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
            <CardTitle>{lt.genderDistribution}</CardTitle>
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
          <CardTitle>{lt.monthlyGrowth}</CardTitle>
          <CardDescription>{lt.newMembersPerMonth}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="newMembers" name={lt.newMembers} stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Branch and Ministry Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{lt.membersByBranch}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" name={lt.members} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lt.membersByMinistry}</CardTitle>
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
                    <Bar dataKey="value" name={lt.members} fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{lt.noMinistryData}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
