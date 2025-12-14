import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Download, Plus, TrendingUp, FileText } from "lucide-react";
import DonationDialog from "@/components/DonationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

const categoryColors: Record<string, string> = {
  tithe: "bg-primary/10 text-primary border-primary/20",
  offering: "bg-secondary/10 text-secondary border-secondary/20",
  building: "bg-info/10 text-info border-info/20",
  mission: "bg-success/10 text-success border-success/20",
  special: "bg-accent/10 text-accent border-accent/20",
};

const categoryLabels: Record<string, string> = {
  tithe: "Dîme",
  offering: "Offrande",
  building: "Bâtiment",
  mission: "Mission",
  special: "Spécial",
};

const methodLabels: Record<string, string> = {
  cash: "Espèces",
  check: "Chèque",
  transfer: "Virement",
  mobile_money: "Mobile Money",
  card: "Carte",
};

export default function Donations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    donationType: "all",
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["donations", filters],
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select(`
          *,
          member:members(first_name, last_name),
          branch:branches(name)
        `)
        .gte("donation_date", filters.startDate)
        .lte("donation_date", filters.endDate)
        .order("donation_date", { ascending: false });

      if (filters.donationType && filters.donationType !== "all") {
        query = query.eq("donation_type", filters.donationType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const stats = [
    {
      title: "Total Période",
      value: `$${donations.reduce((sum, d) => sum + Number(d.amount), 0).toFixed(2)}`,
      change: `${donations.length} dons`,
      icon: DollarSign,
    },
    {
      title: "Don Moyen",
      value: donations.length > 0 
        ? `$${(donations.reduce((sum, d) => sum + Number(d.amount), 0) / donations.length).toFixed(2)}`
        : "$0.00",
      change: "Sur la période",
      icon: TrendingUp,
    },
    {
      title: "Nombre de Dons",
      value: donations.length.toString(),
      change: "Sur la période",
      icon: TrendingUp,
    },
  ];

  const generateReceipt = async (donation: any) => {
    // This will be implemented with jsPDF
    console.log("Generate receipt for:", donation);
  };

  const exportData = () => {
    const csv = [
      ["Dat", "Donatè", "Montan", "Tip", "Metòd", "Branch"],
      ...donations.map((d) => [
        d.donation_date,
        d.member ? `${d.member.first_name} ${d.member.last_name}` : "Anonim",
        d.amount,
        categoryLabels[d.donation_type] || d.donation_type,
        methodLabels[d.payment_method] || d.payment_method,
        d.branch?.name || "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
  };

  const categoryBreakdown = donations.reduce((acc, d) => {
    const type = d.donation_type;
    if (!acc[type]) acc[type] = 0;
    acc[type] += Number(d.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Gestion des Contributions
            </h2>
            <p className="text-muted-foreground">
              Gérez les dons et contributions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter Don
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de Don</Label>
                <Select
                  value={filters.donationType}
                  onValueChange={(value) =>
                    setFilters({ ...filters, donationType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="tithe">Dîme</SelectItem>
                    <SelectItem value="offering">Offrande</SelectItem>
                    <SelectItem value="building">Bâtiment</SelectItem>
                    <SelectItem value="mission">Mission</SelectItem>
                    <SelectItem value="special">Spécial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de Début</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date de Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Catégorie</CardTitle>
            <CardDescription>Période sélectionnée</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryBreakdown).map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        type === "tithe"
                          ? "bg-primary"
                          : type === "building"
                          ? "bg-info"
                          : type === "mission"
                          ? "bg-success"
                          : type === "offering"
                          ? "bg-secondary"
                          : "bg-accent"
                      }`}
                    />
                    <span className="font-medium">
                      {categoryLabels[type] || type}
                    </span>
                  </div>
                  <span className="font-bold">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Donations List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Dons</CardTitle>
            <CardDescription>
              {donations.length} dons pour cette période
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : donations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun don pour cette période
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Donateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Branche</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>
                          {format(new Date(donation.donation_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {donation.member
                            ? `${donation.member.first_name} ${donation.member.last_name}`
                            : "Anonim"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${Number(donation.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={categoryColors[donation.donation_type]}
                          >
                            {categoryLabels[donation.donation_type] ||
                              donation.donation_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {methodLabels[donation.payment_method] ||
                            donation.payment_method}
                        </TableCell>
                        <TableCell>
                          {donation.branch?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateReceipt(donation)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Reçu
                          </Button>
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
      <DonationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Layout>
  );
}
