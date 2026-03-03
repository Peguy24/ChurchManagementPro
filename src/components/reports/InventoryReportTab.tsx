import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Wrench, AlertTriangle, Download, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface InventoryReportTabProps {
  selectedBranch: string;
}

const statusOptions = [
  { value: "available", label: "Disponible", color: "#22c55e" },
  { value: "in_use", label: "En utilisation", color: "#3b82f6" },
  { value: "maintenance", label: "En maintenance", color: "#eab308" },
  { value: "missing", label: "Manquant", color: "#ef4444" },
  { value: "disposed", label: "Retiré", color: "#6b7280" },
];

const categories = [
  { value: "general", label: "Général" },
  { value: "audio_video", label: "Audio/Vidéo" },
  { value: "furniture", label: "Mobilier" },
  { value: "musical", label: "Instruments" },
  { value: "office", label: "Bureautique" },
  { value: "kitchen", label: "Cuisine" },
  { value: "cleaning", label: "Nettoyage" },
  { value: "decoration", label: "Décoration" },
  { value: "vehicle", label: "Véhicule" },
  { value: "it_equipment", label: "Équipement informatique" },
  { value: "other", label: "Autre" },
];

const conditionOptions = [
  { value: "excellent", label: "Excellent", color: "#22c55e" },
  { value: "good", label: "Bon", color: "#3b82f6" },
  { value: "fair", label: "Acceptable", color: "#eab308" },
  { value: "poor", label: "Mauvais", color: "#f97316" },
  { value: "damaged", label: "Endommagé", color: "#ef4444" },
];

export default function InventoryReportTab({ selectedBranch }: InventoryReportTabProps) {
  const { formatAmount: formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState("overview");

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

  // Calculate stats
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.current_value || 0), 0);
  const totalPurchaseValue = items.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
  const depreciation = totalPurchaseValue - totalValue;
  const totalMaintenanceCost = maintenanceRecords.reduce((sum: number, m: any) => sum + (m.cost || 0), 0);

  // Items by status
  const itemsByStatus = statusOptions.map((status) => ({
    name: status.label,
    value: items.filter((i) => i.status === status.value).length,
    color: status.color,
  })).filter((s) => s.value > 0);

  // Items by category
  const itemsByCategory = categories.map((cat) => ({
    name: cat.label,
    count: items.filter((i) => i.category === cat.value).length,
    value: items.filter((i) => i.category === cat.value).reduce((sum, i) => sum + (i.current_value || 0), 0),
  })).filter((c) => c.count > 0);

  // Items by condition
  const itemsByCondition = conditionOptions.map((cond) => ({
    name: cond.label,
    value: items.filter((i) => i.condition === cond.value).length,
    color: cond.color,
  })).filter((c) => c.value > 0);

  // Maintenance costs by month (last 6 months)
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

    return {
      month: format(date, "MMM", { locale: fr }),
      cost: monthCosts,
    };
  });

  // Missing items
  const missingItems = items.filter((i) => i.status === "missing");

  // Low stock items
  const lowStockItems = items.filter((i) => i.quantity <= (i.min_quantity || 0) && (i.min_quantity || 0) > 0);

  // Items needing maintenance (in maintenance status or poor/damaged condition)
  const itemsNeedingAttention = items.filter(
    (i) => i.status === "maintenance" || i.condition === "poor" || i.condition === "damaged"
  );

  // Most used items
  const usageCount: Record<string, number> = {};
  usageRecords.forEach((u: any) => {
    const name = u.inventory_items?.name || "Inconnu";
    usageCount[name] = (usageCount[name] || 0) + 1;
  });
  const mostUsedItems = Object.entries(usageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category;
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.label || status;
  };

  const getConditionLabel = (condition: string | null) => {
    return conditionOptions.find((c) => c.value === condition)?.label || condition;
  };

  const exportToExcel = () => {
    const data = items.map((item) => ({
      "Nom": item.name,
      "Catégorie": getCategoryLabel(item.category),
      "N° Série": item.serial_number || "-",
      "Quantité": item.quantity,
      "Stock Min": item.min_quantity,
      "État": getConditionLabel(item.condition),
      "Statut": getStatusLabel(item.status),
      "Emplacement": item.location || "-",
      "Prix d'achat": item.purchase_price || 0,
      "Valeur actuelle": item.current_value || 0,
      "Date d'achat": item.purchase_date ? format(new Date(item.purchase_date), "dd/MM/yyyy") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    
    // Add maintenance sheet
    const maintenanceData = maintenanceRecords.map((m: any) => ({
      "Date": format(new Date(m.maintenance_date), "dd/MM/yyyy"),
      "Article": m.inventory_items?.name || "-",
      "Type": m.maintenance_type,
      "Description": m.description,
      "Coût": m.cost || 0,
      "Effectué par": m.performed_by || "-",
    }));
    const ws2 = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(wb, ws2, "Maintenance");

    XLSX.writeFile(wb, `rapport_inventaire_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  if (itemsLoading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Type de rapport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Vue d'ensemble</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="alerts">Alertes</SelectItem>
            <SelectItem value="usage">Utilisation</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exporter Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{totalQuantity} unités</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">actuelle</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût d'achat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchaseValue)}</div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépréciation</CardTitle>
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
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">{maintenanceRecords.length} opérations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {missingItems.length + lowStockItems.length + itemsNeedingAttention.length}
            </div>
            <p className="text-xs text-muted-foreground">à traiter</p>
          </CardContent>
        </Card>
      </div>

      {reportType === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* By Status */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
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

          {/* By Condition */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par état</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemsByCondition}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
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

          {/* By Category */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Valeur par catégorie</CardTitle>
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
                    <Bar dataKey="value" name="Valeur" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "maintenance" && (
        <div className="grid gap-6">
          {/* Maintenance Costs Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Coûts de maintenance (6 derniers mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceCostsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="cost" name="Coût" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance History */}
          <Card>
            <CardHeader>
              <CardTitle>Historique de maintenance</CardTitle>
              <CardDescription>Dernières opérations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Coût</TableHead>
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
          {/* Missing Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Articles manquants ({missingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missingItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun article manquant</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Emplacement</TableHead>
                      <TableHead>Valeur</TableHead>
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

          {/* Low Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Stock bas ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun article en stock bas</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Stock min.</TableHead>
                      <TableHead>À commander</TableHead>
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

          {/* Items Needing Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                Articles nécessitant attention ({itemsNeedingAttention.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsNeedingAttention.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun article à signaler</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Emplacement</TableHead>
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
          {/* Most Used Items */}
          <Card>
            <CardHeader>
              <CardTitle>Articles les plus utilisés</CardTitle>
              <CardDescription>Top 10 par nombre d'utilisations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mostUsedItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" name="Utilisations" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisations récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Retourné</TableHead>
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
                          {record.returned ? "Oui" : "Non"}
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
