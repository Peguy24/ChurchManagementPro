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
import { DollarSign, Download, Plus, TrendingUp, FileText, Eye, Pencil, Wallet, Building2 } from "lucide-react";
import DonationDialog from "@/components/DonationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categoryColors: Record<string, string> = {
  tithe: "bg-primary/10 text-primary border-primary/20",
  offering: "bg-secondary/10 text-secondary border-secondary/20",
  building: "bg-info/10 text-info border-info/20",
  mission: "bg-success/10 text-success border-success/20",
  special: "bg-accent/10 text-accent border-accent/20",
  activity: "bg-warning/10 text-warning border-warning/20",
  other: "bg-muted text-muted-foreground border-muted",
};

export default function Donations() {
  const { t, language } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDonation, setEditDonation] = useState<any>(null);
  const [viewDonation, setViewDonation] = useState<any>(null);
  const [filters, setFilters] = useState({
    donationType: "all",
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const categoryLabels: Record<string, string> = {
    tithe: t("donations.tithe"),
    offering: t("donations.offering"),
    building: t("donations.building"),
    mission: t("donations.mission"),
    special: t("donations.special"),
    activity: "Activité",
    other: "Autre",
  };

  const methodLabels: Record<string, string> = {
    cash: t("donations.cash"),
    check: t("donations.check"),
    transfer: t("donations.transfer"),
    mobile_money: "Mobile Money",
    card: t("donations.card"),
  };

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["donations", filters],
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select(`
          *,
          member:members(first_name, last_name),
          branch:branches(name),
          cash_register:cash_registers(name),
          bank_account:bank_accounts(name, bank_name)
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

  const { data: userProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name");
      return data || [];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "HTG",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  const stats = [
    {
      title: t("donations.totalAmount"),
      value: formatCurrency(totalAmount),
      change: `${donations.length} ${t("donations.donationCount").toLowerCase()}`,
      icon: DollarSign,
    },
    {
      title: t("donations.avgDonation"),
      value: donations.length > 0 
        ? formatCurrency(totalAmount / donations.length)
        : formatCurrency(0),
      change: t("donations.donationDate"),
      icon: TrendingUp,
    },
    {
      title: t("donations.donationCount"),
      value: donations.length.toString(),
      change: t("donations.donationDate"),
      icon: TrendingUp,
    },
  ];

  const getCreatorName = (createdBy: string | null) => {
    if (!createdBy) return "Système";
    const profile = userProfiles?.find(p => p.id === createdBy);
    return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Utilisateur" : "Utilisateur";
  };

  const handleEdit = (donation: any) => {
    setEditDonation(donation);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditDonation(null);
    }
  };

  const exportData = () => {
    const csv = [
      [t("common.date"), t("members.name"), t("donations.amount"), t("donations.donationType"), t("donations.paymentMethod"), t("branches.branchName")],
      ...donations.map((d) => [
        d.donation_date,
        d.member ? `${d.member.first_name} ${d.member.last_name}` : t("common.noData"),
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
              {t("donations.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("donations.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              {t("common.export")} CSV
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("donations.addDonation")}
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
            <CardTitle>{t("common.filter")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("donations.donationType")}</Label>
                <Select
                  value={filters.donationType}
                  onValueChange={(value) =>
                    setFilters({ ...filters, donationType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="tithe">{t("donations.tithe")}</SelectItem>
                    <SelectItem value="offering">{t("donations.offering")}</SelectItem>
                    <SelectItem value="building">{t("donations.building")}</SelectItem>
                    <SelectItem value="mission">{t("donations.mission")}</SelectItem>
                    <SelectItem value="special">{t("donations.special")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("common.startDate")}</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.endDate")}</Label>
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
            <CardTitle>{t("donations.donationType")}</CardTitle>
            <CardDescription>{t("donations.donationDate")}</CardDescription>
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
            <CardTitle>{t("donations.title")}</CardTitle>
            <CardDescription>
              {donations.length} {t("donations.donationCount").toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">{t("common.loading")}</div>
            ) : donations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.noData")}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>{t("donations.donationType")}</TableHead>
                      <TableHead>{t("donations.amount")}</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead>{t("donations.paymentMethod")}</TableHead>
                      <TableHead>Créateur</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(donation.donation_date), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {donation.description || donation.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={categoryColors[donation.donation_type] || categoryColors.other}
                          >
                            {categoryLabels[donation.donation_type] || donation.donation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(Number(donation.amount))}
                        </TableCell>
                        <TableCell>
                          {donation.cash_register ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Wallet className="h-3 w-3" />
                              {(donation.cash_register as any).name}
                            </span>
                          ) : donation.bank_account ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Building2 className="h-3 w-3" />
                              {(donation.bank_account as any).name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {methodLabels[donation.payment_method] || donation.payment_method}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getCreatorName(donation.created_by)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewDonation(donation)}
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(donation)}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => console.log("Generate receipt for:", donation)}
                              title="Télécharger reçu"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* View Donation Dialog */}
      <Dialog open={!!viewDonation} onOpenChange={() => setViewDonation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la Recette</DialogTitle>
          </DialogHeader>
          {viewDonation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p>{format(new Date(viewDonation.donation_date), "dd MMMM yyyy", { locale: fr })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Montant</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(Number(viewDonation.amount))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant="outline" className={categoryColors[viewDonation.donation_type] || categoryColors.other}>
                    {categoryLabels[viewDonation.donation_type] || viewDonation.donation_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mode de paiement</p>
                  <p>{methodLabels[viewDonation.payment_method] || viewDonation.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compte</p>
                  <p className="flex items-center gap-1">
                    {viewDonation.cash_register ? (
                      <><Wallet className="h-4 w-4" />{(viewDonation.cash_register as any).name}</>
                    ) : viewDonation.bank_account ? (
                      <><Building2 className="h-4 w-4" />{(viewDonation.bank_account as any).name}</>
                    ) : (
                      "Non spécifié"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Donateur</p>
                  <p>{viewDonation.member ? `${viewDonation.member.first_name} ${viewDonation.member.last_name}` : "Anonyme"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{viewDonation.description || viewDonation.notes || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Branche</p>
                  <p>{viewDonation.branch?.name || "Toutes"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Créé par</p>
                  <p>{getCreatorName(viewDonation.created_by)}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setViewDonation(null)}>
                  Fermer
                </Button>
                <Button onClick={() => { handleEdit(viewDonation); setViewDonation(null); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DonationDialog 
        open={dialogOpen} 
        onOpenChange={handleCloseDialog}
        editDonation={editDonation}
      />
    </Layout>
  );
}
