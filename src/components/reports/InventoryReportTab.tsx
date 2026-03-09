import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Wrench, AlertTriangle, Download, TrendingUp, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    items: "Items",
    units: "units",
    totalValue: "Total Value",
    current: "current",
    purchaseCost: "Purchase Cost",
    total: "total",
    depreciation: "Depreciation",
    maintenance: "Maintenance",
    operations: "operations",
    alerts: "Alerts",
    toProcess: "to process",
    overview: "Overview",
    maintenanceView: "Maintenance",
    alertsView: "Alerts",
    usage: "Usage",
    reportType: "Report type",
    byStatus: "Distribution by Status",
    byCondition: "Distribution by Condition",
    valueByCategory: "Value by Category",
    value: "Value",
    maintenanceCosts6m: "Maintenance Costs (last 6 months)",
    cost: "Cost",
    maintenanceHistory: "Maintenance History",
    lastOperations: "Last operations",
    date: "Date",
    item: "Item",
    type: "Type",
    description: "Description",
    missingItems: "Missing Items",
    noMissingItems: "No missing items",
    article: "Article",
    category: "Category",
    location: "Location",
    lowStock: "Low Stock",
    noLowStock: "No low stock items",
    quantity: "Quantity",
    minStock: "Min Stock",
    toOrder: "To Order",
    needsAttention: "Items Needing Attention",
    noItemsToReport: "No items to report",
    condition: "Condition",
    status: "Status",
    mostUsedItems: "Most Used Items",
    top10ByUsage: "Top 10 by number of uses",
    uses: "Uses",
    recentUsage: "Recent Usage",
    event: "Event",
    returned: "Returned",
    yes: "Yes",
    no: "No",
    name: "Name",
    serialNumber: "Serial #",
    minQty: "Min Qty",
    purchasePrice: "Purchase Price",
    currentValue: "Current Value",
    purchaseDate: "Purchase Date",
    performedBy: "Performed by",
    loading: "Loading...",
    // Status labels
    available: "Available",
    inUse: "In Use",
    inMaintenance: "In Maintenance",
    missing: "Missing",
    disposed: "Disposed",
    // Category labels
    general: "General",
    audioVideo: "Audio/Video",
    furniture: "Furniture",
    musical: "Instruments",
    office: "Office",
    kitchen: "Kitchen",
    cleaning: "Cleaning",
    decoration: "Decoration",
    vehicle: "Vehicle",
    itEquipment: "IT Equipment",
    other: "Other",
    // Condition labels
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    damaged: "Damaged",
    unknown: "Unknown",
  },
  fr: {
    items: "Articles",
    units: "unités",
    totalValue: "Valeur totale",
    current: "actuelle",
    purchaseCost: "Coût d'achat",
    total: "total",
    depreciation: "Dépréciation",
    maintenance: "Maintenance",
    operations: "opérations",
    alerts: "Alertes",
    toProcess: "à traiter",
    overview: "Vue d'ensemble",
    maintenanceView: "Maintenance",
    alertsView: "Alertes",
    usage: "Utilisation",
    reportType: "Type de rapport",
    byStatus: "Répartition par statut",
    byCondition: "Répartition par état",
    valueByCategory: "Valeur par catégorie",
    value: "Valeur",
    maintenanceCosts6m: "Coûts de maintenance (6 derniers mois)",
    cost: "Coût",
    maintenanceHistory: "Historique de maintenance",
    lastOperations: "Dernières opérations",
    date: "Date",
    item: "Article",
    type: "Type",
    description: "Description",
    missingItems: "Articles manquants",
    noMissingItems: "Aucun article manquant",
    article: "Article",
    category: "Catégorie",
    location: "Emplacement",
    lowStock: "Stock bas",
    noLowStock: "Aucun article en stock bas",
    quantity: "Quantité",
    minStock: "Stock min.",
    toOrder: "À commander",
    needsAttention: "Articles nécessitant attention",
    noItemsToReport: "Aucun article à signaler",
    condition: "État",
    status: "Statut",
    mostUsedItems: "Articles les plus utilisés",
    top10ByUsage: "Top 10 par nombre d'utilisations",
    uses: "Utilisations",
    recentUsage: "Utilisations récentes",
    event: "Événement",
    returned: "Retourné",
    yes: "Oui",
    no: "Non",
    name: "Nom",
    serialNumber: "N° Série",
    minQty: "Stock Min",
    purchasePrice: "Prix d'achat",
    currentValue: "Valeur actuelle",
    purchaseDate: "Date d'achat",
    performedBy: "Effectué par",
    loading: "Chargement...",
    available: "Disponible",
    inUse: "En utilisation",
    inMaintenance: "En maintenance",
    missing: "Manquant",
    disposed: "Retiré",
    general: "Général",
    audioVideo: "Audio/Vidéo",
    furniture: "Mobilier",
    musical: "Instruments",
    office: "Bureautique",
    kitchen: "Cuisine",
    cleaning: "Nettoyage",
    decoration: "Décoration",
    vehicle: "Véhicule",
    itEquipment: "Équipement informatique",
    other: "Autre",
    excellent: "Excellent",
    good: "Bon",
    fair: "Acceptable",
    poor: "Mauvais",
    damaged: "Endommagé",
    unknown: "Inconnu",
  },
  ht: {
    items: "Atik",
    units: "inite",
    totalValue: "Valè total",
    current: "aktyèl",
    purchaseCost: "Pri acha",
    total: "total",
    depreciation: "Depresyasyon",
    maintenance: "Antretyen",
    operations: "operasyon",
    alerts: "Alèt",
    toProcess: "pou trete",
    overview: "Apèsi jeneral",
    maintenanceView: "Antretyen",
    alertsView: "Alèt",
    usage: "Itilizasyon",
    reportType: "Tip rapò",
    byStatus: "Distribisyon pa estati",
    byCondition: "Distribisyon pa eta",
    valueByCategory: "Valè pa kategori",
    value: "Valè",
    maintenanceCosts6m: "Frè antretyen (6 dènye mwa)",
    cost: "Frè",
    maintenanceHistory: "Istwa antretyen",
    lastOperations: "Dènye operasyon",
    date: "Dat",
    item: "Atik",
    type: "Tip",
    description: "Deskripsyon",
    missingItems: "Atik ki manke",
    noMissingItems: "Pa gen atik ki manke",
    article: "Atik",
    category: "Kategori",
    location: "Anplasman",
    lowStock: "Stòk ba",
    noLowStock: "Pa gen atik nan stòk ba",
    quantity: "Kantite",
    minStock: "Stòk min.",
    toOrder: "Pou kòmande",
    needsAttention: "Atik ki bezwen atansyon",
    noItemsToReport: "Pa gen atik pou siyal",
    condition: "Eta",
    status: "Estati",
    mostUsedItems: "Atik ki pi itilize",
    top10ByUsage: "Top 10 pa kantite itilizasyon",
    uses: "Itilizasyon",
    recentUsage: "Dènye itilizasyon",
    event: "Evènman",
    returned: "Retounen",
    yes: "Wi",
    no: "Non",
    name: "Non",
    serialNumber: "N° Seri",
    minQty: "Stòk Min",
    purchasePrice: "Pri acha",
    currentValue: "Valè aktyèl",
    purchaseDate: "Dat acha",
    performedBy: "Fèt pa",
    loading: "Chajman...",
    available: "Disponib",
    inUse: "An itilizasyon",
    inMaintenance: "An antretyen",
    missing: "Manke",
    disposed: "Retire",
    general: "Jeneral",
    audioVideo: "Odyo/Videyo",
    furniture: "Mèb",
    musical: "Enstriman",
    office: "Biwo",
    kitchen: "Kizin",
    cleaning: "Netwayaj",
    decoration: "Dekorasyon",
    vehicle: "Machin",
    itEquipment: "Ekipman enfòmatik",
    other: "Lòt",
    excellent: "Ekselan",
    good: "Bon",
    fair: "Akseptab",
    poor: "Move",
    damaged: "Domaje",
    unknown: "Enkoni",
  },
};

interface InventoryReportTabProps {
  selectedBranch: string;
}

export default function InventoryReportTab({ selectedBranch }: InventoryReportTabProps) {
  const { language } = useLanguage();
  const lt = localTranslations[language] || localTranslations.en;
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;
  const { formatAmount: formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState("overview");

  const statusOptions = [
    { value: "available", label: lt.available, color: "#22c55e" },
    { value: "in_use", label: lt.inUse, color: "#3b82f6" },
    { value: "maintenance", label: lt.inMaintenance, color: "#eab308" },
    { value: "missing", label: lt.missing, color: "#ef4444" },
    { value: "disposed", label: lt.disposed, color: "#6b7280" },
  ];

  const categories = [
    { value: "general", label: lt.general },
    { value: "audio_video", label: lt.audioVideo },
    { value: "furniture", label: lt.furniture },
    { value: "musical", label: lt.musical },
    { value: "office", label: lt.office },
    { value: "kitchen", label: lt.kitchen },
    { value: "cleaning", label: lt.cleaning },
    { value: "decoration", label: lt.decoration },
    { value: "vehicle", label: lt.vehicle },
    { value: "it_equipment", label: lt.itEquipment },
    { value: "other", label: lt.other },
  ];

  const conditionOptions = [
    { value: "excellent", label: lt.excellent, color: "#22c55e" },
    { value: "good", label: lt.good, color: "#3b82f6" },
    { value: "fair", label: lt.fair, color: "#eab308" },
    { value: "poor", label: lt.poor, color: "#f97316" },
    { value: "damaged", label: lt.damaged, color: "#ef4444" },
  ];

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items-report", selectedBranch],
    queryFn: async () => {
      let query = supabase.from("inventory_items").select("*");
      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ["inventory-maintenance-report", selectedBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_maintenance")
        .select("*, inventory_items(name, branch_id)")
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      if (selectedBranch !== "all") {
        return data.filter((r: any) => r.inventory_items?.branch_id === selectedBranch);
      }
      return data;
    },
  });

  const { data: usageRecords = [] } = useQuery({
    queryKey: ["inventory-usage-report", selectedBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_usage")
        .select("*, inventory_items(name, branch_id)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      if (selectedBranch !== "all") {
        return data.filter((r: any) => r.inventory_items?.branch_id === selectedBranch);
      }
      return data;
    },
  });

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.current_value || 0), 0);
  const totalPurchaseValue = items.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
  const depreciation = totalPurchaseValue - totalValue;
  const totalMaintenanceCost = maintenanceRecords.reduce((sum: number, m: any) => sum + (m.cost || 0), 0);

  const itemsByStatus = statusOptions.map((status) => ({
    name: status.label,
    value: items.filter((i) => i.status === status.value).length,
    color: status.color,
  })).filter((s) => s.value > 0);

  const itemsByCategory = categories.map((cat) => ({
    name: cat.label,
    count: items.filter((i) => i.category === cat.value).length,
    value: items.filter((i) => i.category === cat.value).reduce((sum, i) => sum + (i.current_value || 0), 0),
  })).filter((c) => c.count > 0);

  const itemsByCondition = conditionOptions.map((cond) => ({
    name: cond.label,
    value: items.filter((i) => i.condition === cond.value).length,
    color: cond.color,
  })).filter((c) => c.value > 0);

  const maintenanceCostsByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthCosts = maintenanceRecords
      .filter((m: any) => {
        const mDate = new Date(m.maintenance_date);
        return mDate >= start && mDate <= end;
      })
      .reduce((sum: number, m: any) => sum + (m.cost || 0), 0);
    return { month: format(date, "MMM", { locale: dateLocale }), cost: monthCosts };
  });

  const missingItems = items.filter((i) => i.status === "missing");
  const lowStockItems = items.filter((i) => i.quantity <= (i.min_quantity || 0) && (i.min_quantity || 0) > 0);
  const itemsNeedingAttention = items.filter(
    (i) => i.status === "maintenance" || i.condition === "poor" || i.condition === "damaged"
  );

  const usageCount: Record<string, number> = {};
  usageRecords.forEach((u: any) => {
    const name = u.inventory_items?.name || lt.unknown;
    usageCount[name] = (usageCount[name] || 0) + 1;
  });
  const mostUsedItems = Object.entries(usageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const getCategoryLabel = (category: string) => categories.find((c) => c.value === category)?.label || category;
  const getStatusLabel = (status: string) => statusOptions.find((s) => s.value === status)?.label || status;
  const getConditionLabel = (condition: string | null) => conditionOptions.find((c) => c.value === condition)?.label || condition;

  const exportToExcel = () => {
    const data = items.map((item) => ({
      [lt.name]: item.name,
      [lt.category]: getCategoryLabel(item.category),
      [lt.serialNumber]: item.serial_number || "-",
      [lt.quantity]: item.quantity,
      [lt.minQty]: item.min_quantity,
      [lt.condition]: getConditionLabel(item.condition),
      [lt.status]: getStatusLabel(item.status),
      [lt.location]: item.location || "-",
      [lt.purchasePrice]: item.purchase_price || 0,
      [lt.currentValue]: item.current_value || 0,
      [lt.purchaseDate]: item.purchase_date ? format(new Date(item.purchase_date), "dd/MM/yyyy") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lt.items);

    const maintenanceData = maintenanceRecords.map((m: any) => ({
      [lt.date]: format(new Date(m.maintenance_date), "dd/MM/yyyy"),
      [lt.article]: m.inventory_items?.name || "-",
      [lt.type]: m.maintenance_type,
      [lt.description]: m.description,
      [lt.cost]: m.cost || 0,
      [lt.performedBy]: m.performed_by || "-",
    }));
    const ws2 = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(wb, ws2, lt.maintenance);

    XLSX.writeFile(wb, `inventory-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToCSV = () => {
    exportToCsv(
      items,
      [
        { key: "name", header: lt.name },
        { key: "category", header: lt.category, formatter: (v) => getCategoryLabel(v) },
        { key: "serial_number", header: lt.serialNumber, formatter: (v) => v || "-" },
        { key: "quantity", header: lt.quantity },
        { key: "min_quantity", header: lt.minQty },
        { key: "condition", header: lt.condition, formatter: (v) => getConditionLabel(v) || "-" },
        { key: "status", header: lt.status, formatter: (v) => getStatusLabel(v) },
        { key: "location", header: lt.location, formatter: (v) => v || "-" },
        { key: "purchase_price", header: lt.purchasePrice, formatter: (v) => v?.toFixed(2) || "0" },
        { key: "current_value", header: lt.currentValue, formatter: (v) => v?.toFixed(2) || "0" },
        { key: "purchase_date", header: lt.purchaseDate, formatter: (v) => v ? format(new Date(v), "dd/MM/yyyy") : "-" },
      ],
      `inventory-report-${format(new Date(), "yyyy-MM-dd")}`
    );
  };

  if (itemsLoading) {
    return <div className="flex items-center justify-center p-8">{lt.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={lt.reportType} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">{lt.overview}</SelectItem>
            <SelectItem value="maintenance">{lt.maintenanceView}</SelectItem>
            <SelectItem value="alerts">{lt.alertsView}</SelectItem>
            <SelectItem value="usage">{lt.usage}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <FileDown className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.items}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{totalQuantity} {lt.units}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.totalValue}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">{lt.current}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.purchaseCost}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchaseValue)}</div>
            <p className="text-xs text-muted-foreground">{lt.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.depreciation}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(depreciation)}</div>
            <p className="text-xs text-muted-foreground">
              {totalPurchaseValue > 0 ? ((depreciation / totalPurchaseValue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.maintenance}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">{maintenanceRecords.length} {lt.operations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.alerts}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {missingItems.length + lowStockItems.length + itemsNeedingAttention.length}
            </div>
            <p className="text-xs text-muted-foreground">{lt.toProcess}</p>
          </CardContent>
        </Card>
      </div>

      {reportType === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{lt.byStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={itemsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {itemsByStatus.map((entry, index) => (
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
              <CardTitle>{lt.byCondition}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={itemsByCondition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {itemsByCondition.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{lt.valueByCategory}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemsByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="value" name={lt.value} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "maintenance" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{lt.maintenanceCosts6m}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceCostsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="cost" name={lt.cost} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{lt.maintenanceHistory}</CardTitle>
              <CardDescription>{lt.lastOperations}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lt.date}</TableHead>
                    <TableHead>{lt.article}</TableHead>
                    <TableHead>{lt.type}</TableHead>
                    <TableHead>{lt.description}</TableHead>
                    <TableHead>{lt.cost}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRecords.slice(0, 10).map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.maintenance_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.inventory_items?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.maintenance_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                      <TableCell>{formatCurrency(record.cost || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "alerts" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {lt.missingItems} ({missingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missingItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{lt.noMissingItems}</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt.article}</TableHead>
                      <TableHead>{lt.category}</TableHead>
                      <TableHead>{lt.location}</TableHead>
                      <TableHead>{lt.value}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{getCategoryLabel(item.category)}</TableCell>
                        <TableCell>{item.location || "-"}</TableCell>
                        <TableCell>{formatCurrency(item.current_value || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {lt.lowStock} ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{lt.noLowStock}</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt.article}</TableHead>
                      <TableHead>{lt.quantity}</TableHead>
                      <TableHead>{lt.minStock}</TableHead>
                      <TableHead>{lt.toOrder}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-red-600">{item.quantity}</TableCell>
                        <TableCell>{item.min_quantity}</TableCell>
                        <TableCell>{Math.max(0, (item.min_quantity || 0) - item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                {lt.needsAttention} ({itemsNeedingAttention.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsNeedingAttention.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{lt.noItemsToReport}</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt.article}</TableHead>
                      <TableHead>{lt.condition}</TableHead>
                      <TableHead>{lt.status}</TableHead>
                      <TableHead>{lt.location}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsNeedingAttention.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant={item.condition === "damaged" ? "destructive" : "secondary"}>
                            {getConditionLabel(item.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusLabel(item.status)}</TableCell>
                        <TableCell>{item.location || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "usage" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{lt.mostUsedItems}</CardTitle>
              <CardDescription>{lt.top10ByUsage}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mostUsedItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" name={lt.uses} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{lt.recentUsage}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lt.date}</TableHead>
                    <TableHead>{lt.article}</TableHead>
                    <TableHead>{lt.event}</TableHead>
                    <TableHead>{lt.returned}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords.slice(0, 10).map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.start_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.inventory_items?.name}</TableCell>
                      <TableCell>{record.event_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={record.returned ? "default" : "secondary"}>
                          {record.returned ? lt.yes : lt.no}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
