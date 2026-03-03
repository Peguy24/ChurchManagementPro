import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Package, Wrench, History, AlertTriangle, Search, Edit, Trash2, Eye, Tags, ImageIcon, FileText, ArrowLeft } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import InventoryBarcodeScanner from "@/components/InventoryBarcodeScanner";
import InventoryLabelPrinter from "@/components/InventoryLabelPrinter";
import InventoryPhotoUpload from "@/components/InventoryPhotoUpload";
import InventoryAuditMode from "@/components/InventoryAuditMode";
import InventoryReportGenerator from "@/components/InventoryReportGenerator";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";

// Interfaces
interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  serial_number: string | null;
  barcode: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  location: string | null;
  branch_id: string | null;
  status: string;
  condition: string | null;
  quantity: number;
  min_quantity: number;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  item_id: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  maintenance_date: string;
  performed_by: string | null;
  vendor: string | null;
  next_maintenance_date: string | null;
  status: string;
  notes: string | null;
  inventory_items?: { name: string };
}

interface UsageRecord {
  id: string;
  item_id: string;
  used_by: string | null;
  event_name: string | null;
  start_date: string;
  end_date: string | null;
  quantity_used: number;
  notes: string | null;
  returned: boolean;
  inventory_items?: { name: string };
  members?: { first_name: string; last_name: string };
}

export default function Inventory() {
  const { hasFeature, loading: planLoading } = usePlanLimits();
  const { t } = useLanguage();

  if (!planLoading && !hasFeature("inventory")) {
    return (
      <Layout>
        <FeatureLockedCard
          featureName={t("inventory.featureName")}
          featureDescription={t("inventory.featureDesc")}
          requiredPlan="professionnel"
          icon={<Package className="w-8 h-8 text-muted-foreground" />}
        />
      </Layout>
    );
  }

  if (planLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">{t("inventory.loading")}</div>
        </div>
      </Layout>
    );
  }

  return <InventoryContent />;
}

function InventoryContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tenantId } = useCurrentTenant();
  const { formatAmount: formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const categoryKeys: Record<string, string> = {
    general: "inventory.catGeneral",
    audio_video: "inventory.catAudioVideo",
    furniture: "inventory.catFurniture",
    musical: "inventory.catMusical",
    office: "inventory.catOffice",
    kitchen: "inventory.catKitchen",
    cleaning: "inventory.catCleaning",
    decoration: "inventory.catDecoration",
    vehicle: "inventory.catVehicle",
    other: "inventory.catOther",
  };

  const statusKeys: Record<string, { key: string; color: string }> = {
    available: { key: "inventory.statusAvailable", color: "bg-green-500" },
    in_use: { key: "inventory.statusInUse", color: "bg-blue-500" },
    maintenance: { key: "inventory.statusMaintenance", color: "bg-yellow-500" },
    missing: { key: "inventory.statusMissing", color: "bg-red-500" },
    disposed: { key: "inventory.statusDisposed", color: "bg-gray-500" },
  };

  const conditionKeys: Record<string, string> = {
    excellent: "inventory.condExcellent",
    good: "inventory.condGood",
    fair: "inventory.condFair",
    poor: "inventory.condPoor",
    damaged: "inventory.condDamaged",
  };

  const maintenanceTypeKeys: Record<string, string> = {
    repair: "inventory.maintRepair",
    inspection: "inventory.maintInspection",
    cleaning: "inventory.maintCleaning",
    replacement: "inventory.maintReplacement",
    upgrade: "inventory.maintUpgrade",
  };

  // Form states
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    category: "general",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    location: "",
    status: "available",
    condition: "good",
    quantity: "1",
    min_quantity: "0",
    notes: "",
    photo_url: null as string | null,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    item_id: "",
    maintenance_type: "repair",
    description: "",
    cost: "",
    maintenance_date: format(new Date(), "yyyy-MM-dd"),
    performed_by: "",
    vendor: "",
    next_maintenance_date: "",
    status: "completed",
    notes: "",
  });

  const [usageForm, setUsageForm] = useState({
    item_id: "",
    used_by: "",
    event_name: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    quantity_used: "1",
    notes: "",
    returned: false,
  });

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ["inventory-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_maintenance")
        .select("*, inventory_items(name)")
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
  });

  const { data: usageRecords = [] } = useQuery({
    queryKey: ["inventory-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_usage")
        .select("*, inventory_items(name), members(first_name, last_name)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as UsageRecord[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-for-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: typeof itemForm) => {
      const { error } = await supabase.from("inventory_items").insert({
        name: data.name,
        description: data.description || null,
        category: data.category,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : 0,
        current_value: data.current_value ? parseFloat(data.current_value) : 0,
        location: data.location || null,
        status: data.status,
        condition: data.condition,
        quantity: parseInt(data.quantity) || 1,
        min_quantity: parseInt(data.min_quantity) || 0,
        notes: data.notes || null,
        photo_url: data.photo_url,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success(t("inventory.itemAdded"));
      setIsItemDialogOpen(false);
      resetItemForm();
    },
    onError: () => toast.error(t("inventory.errorAdd")),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof itemForm }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: data.name,
          description: data.description || null,
          category: data.category,
          serial_number: data.serial_number || null,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : 0,
          current_value: data.current_value ? parseFloat(data.current_value) : 0,
          location: data.location || null,
          status: data.status,
          condition: data.condition,
          quantity: parseInt(data.quantity) || 1,
          min_quantity: parseInt(data.min_quantity) || 0,
          notes: data.notes || null,
          photo_url: data.photo_url,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success(t("inventory.itemUpdated"));
      setIsItemDialogOpen(false);
      setEditingItem(null);
      resetItemForm();
    },
    onError: () => toast.error(t("inventory.errorUpdate")),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success(t("inventory.itemDeleted"));
    },
    onError: () => toast.error(t("inventory.errorDelete")),
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: typeof maintenanceForm) => {
      const { error } = await supabase.from("inventory_maintenance").insert({
        item_id: data.item_id,
        maintenance_type: data.maintenance_type,
        description: data.description,
        cost: data.cost ? parseFloat(data.cost) : 0,
        maintenance_date: data.maintenance_date,
        performed_by: data.performed_by || null,
        vendor: data.vendor || null,
        next_maintenance_date: data.next_maintenance_date || null,
        status: data.status,
        notes: data.notes || null,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-maintenance"] });
      toast.success(t("inventory.maintenanceRecorded"));
      setIsMaintenanceDialogOpen(false);
      resetMaintenanceForm();
    },
    onError: () => toast.error(t("inventory.errorRecord")),
  });

  const createUsageMutation = useMutation({
    mutationFn: async (data: typeof usageForm) => {
      const { error } = await supabase.from("inventory_usage").insert({
        item_id: data.item_id,
        used_by: data.used_by || null,
        event_name: data.event_name || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        quantity_used: parseInt(data.quantity_used) || 1,
        notes: data.notes || null,
        returned: data.returned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-usage"] });
      toast.success(t("inventory.usageRecorded"));
      setIsUsageDialogOpen(false);
      resetUsageForm();
    },
    onError: () => toast.error(t("inventory.errorRecord")),
  });

  const resetItemForm = () => {
    setItemForm({
      name: "",
      description: "",
      category: "general",
      serial_number: "",
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      location: "",
      status: "available",
      condition: "good",
      quantity: "1",
      min_quantity: "0",
      notes: "",
      photo_url: null,
    });
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      item_id: "",
      maintenance_type: "repair",
      description: "",
      cost: "",
      maintenance_date: format(new Date(), "yyyy-MM-dd"),
      performed_by: "",
      vendor: "",
      next_maintenance_date: "",
      status: "completed",
      notes: "",
    });
  };

  const resetUsageForm = () => {
    setUsageForm({
      item_id: "",
      used_by: "",
      event_name: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      quantity_used: "1",
      notes: "",
      returned: false,
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      serial_number: item.serial_number || "",
      purchase_date: item.purchase_date || "",
      purchase_price: item.purchase_price?.toString() || "",
      current_value: item.current_value?.toString() || "",
      location: item.location || "",
      status: item.status,
      condition: item.condition || "good",
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      notes: item.notes || "",
      photo_url: item.photo_url,
    });
    setIsItemDialogOpen(true);
  };

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Stats
  const totalItems = items.length;
  const availableItems = items.filter((i) => i.status === "available").length;
  const missingItems = items.filter((i) => i.status === "missing").length;
  const lowStockItems = items.filter((i) => i.quantity <= i.min_quantity && i.min_quantity > 0).length;
  const totalValue = items.reduce((sum, i) => sum + (i.current_value || 0), 0);
  const maintenanceCosts = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);

  const getStatusBadge = (status: string) => {
    const info = statusKeys[status];
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${info?.color || "bg-gray-500"}`} />
        {info ? t(info.key) : status}
      </Badge>
    );
  };

  const getConditionLabel = (condition: string | null) => {
    if (!condition) return condition;
    return conditionKeys[condition] ? t(conditionKeys[condition]) : condition;
  };

  const getCategoryLabel = (category: string) => {
    return categoryKeys[category] ? t(categoryKeys[category]) : category;
  };

  const getMaintenanceTypeLabel = (type: string) => {
    return maintenanceTypeKeys[type] ? t(maintenanceTypeKeys[type]) : type;
  };

  if (itemsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">{t("inventory.loading")}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("inventory.title")}</h2>
              <p className="text-muted-foreground">{t("inventory.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <InventoryBarcodeScanner 
              items={items} 
              onItemFound={(item) => handleViewItem(item)}
              onItemNotFound={(code) => console.log("Code not found:", code)}
            />
            <InventoryAuditMode 
              items={items}
              onAuditComplete={() => queryClient.invalidateQueries({ queryKey: ["inventory-items"] })}
            />
            <InventoryLabelPrinter items={items} />
            <InventoryReportGenerator 
              items={items} 
              maintenanceRecords={maintenanceRecords}
            />
            <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  {t("inventory.usage")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("inventory.recordUsage")}</DialogTitle>
                  <DialogDescription>{t("inventory.recordUsageDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("inventory.colItem")} *</Label>
                    <Select value={usageForm.item_id} onValueChange={(v) => setUsageForm({ ...usageForm, item_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("inventory.selectItem")} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.usedBy")}</Label>
                    <Select value={usageForm.used_by} onValueChange={(v) => setUsageForm({ ...usageForm, used_by: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("inventory.selectMember")} />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.event")}</Label>
                    <Input value={usageForm.event_name} onChange={(e) => setUsageForm({ ...usageForm, event_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.startDate")} *</Label>
                      <Input type="date" value={usageForm.start_date} onChange={(e) => setUsageForm({ ...usageForm, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.endDate")}</Label>
                      <Input type="date" value={usageForm.end_date} onChange={(e) => setUsageForm({ ...usageForm, end_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.quantity")}</Label>
                    <Input type="number" value={usageForm.quantity_used} onChange={(e) => setUsageForm({ ...usageForm, quantity_used: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>{t("inventory.cancel")}</Button>
                  <Button onClick={() => createUsageMutation.mutate(usageForm)} disabled={!usageForm.item_id || !usageForm.start_date}>
                    {t("inventory.save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Wrench className="h-4 w-4 mr-2" />
                  {t("inventory.maintenance")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("inventory.recordMaintenance")}</DialogTitle>
                  <DialogDescription>{t("inventory.recordMaintenanceDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>{t("inventory.colItem")} *</Label>
                    <Select value={maintenanceForm.item_id} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, item_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("inventory.selectItem")} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.type")} *</Label>
                    <Select value={maintenanceForm.maintenance_type} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(maintenanceTypeKeys).map(([value, key]) => (
                          <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.description")} *</Label>
                    <Textarea value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.cost")}</Label>
                      <Input type="number" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.date")} *</Label>
                      <Input type="date" value={maintenanceForm.maintenance_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.performedBy")}</Label>
                    <Input value={maintenanceForm.performed_by} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performed_by: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.vendor")}</Label>
                    <Input value={maintenanceForm.vendor} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vendor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.nextMaintenance")}</Label>
                    <Input type="date" value={maintenanceForm.next_maintenance_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_maintenance_date: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>{t("inventory.cancel")}</Button>
                  <Button onClick={() => createMaintenanceMutation.mutate(maintenanceForm)} disabled={!maintenanceForm.item_id || !maintenanceForm.description}>
                    {t("inventory.save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
              setIsItemDialogOpen(open);
              if (!open) {
                setEditingItem(null);
                resetItemForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("inventory.addItem")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingItem ? t("inventory.editItem") : t("inventory.addNewItem")}</DialogTitle>
                  <DialogDescription>{t("inventory.fillItemInfo")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.name")} *</Label>
                      <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.category")} *</Label>
                      <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryKeys).map(([value, key]) => (
                            <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.description")}</Label>
                    <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.serialNumber")}</Label>
                      <Input value={itemForm.serial_number} onChange={(e) => setItemForm({ ...itemForm, serial_number: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.location")}</Label>
                      <Input value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.purchaseDate")}</Label>
                      <Input type="date" value={itemForm.purchase_date} onChange={(e) => setItemForm({ ...itemForm, purchase_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.purchasePrice")}</Label>
                      <Input type="number" value={itemForm.purchase_price} onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.currentValue")}</Label>
                      <Input type="number" value={itemForm.current_value} onChange={(e) => setItemForm({ ...itemForm, current_value: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.status")}</Label>
                      <Select value={itemForm.status} onValueChange={(v) => setItemForm({ ...itemForm, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusKeys).map(([value, info]) => (
                            <SelectItem key={value} value={value}>{t(info.key)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.condition")}</Label>
                      <Select value={itemForm.condition} onValueChange={(v) => setItemForm({ ...itemForm, condition: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(conditionKeys).map(([value, key]) => (
                            <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("inventory.quantity")}</Label>
                      <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("inventory.minStock")}</Label>
                      <Input type="number" value={itemForm.min_quantity} onChange={(e) => setItemForm({ ...itemForm, min_quantity: e.target.value })} />
                    </div>
                  </div>
                  <InventoryPhotoUpload
                    currentPhotoUrl={itemForm.photo_url}
                    onPhotoChange={(url) => setItemForm({ ...itemForm, photo_url: url })}
                    itemId={editingItem?.id}
                  />
                  <div className="space-y-2">
                    <Label>{t("inventory.notes")}</Label>
                    <Textarea value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsItemDialogOpen(false);
                    setEditingItem(null);
                    resetItemForm();
                  }}>{t("inventory.cancel")}</Button>
                  <Button
                    onClick={() => {
                      if (editingItem) {
                        updateItemMutation.mutate({ id: editingItem.id, data: itemForm });
                      } else {
                        createItemMutation.mutate(itemForm);
                      }
                    }}
                    disabled={!itemForm.name}
                  >
                    {editingItem ? t("inventory.modify") : t("inventory.addItem")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.totalItems")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.available")}</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.missing")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{missingItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.lowStock")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.totalValue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("inventory.maintenanceCosts")}</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(maintenanceCosts)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="items">{t("inventory.tabItems")}</TabsTrigger>
            <TabsTrigger value="maintenance">{t("inventory.tabMaintenance")}</TabsTrigger>
            <TabsTrigger value="usage">{t("inventory.tabUsage")}</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{t("inventory.itemList")}</CardTitle>
                    <CardDescription>{t("inventory.itemListDesc")}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("inventory.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-[200px]"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t("inventory.statusFilter")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("inventory.all")}</SelectItem>
                        {Object.entries(statusKeys).map(([value, info]) => (
                          <SelectItem key={value} value={value}>{t(info.key)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t("inventory.categoryFilter")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("inventory.allFeminine")}</SelectItem>
                        {Object.entries(categoryKeys).map(([value, key]) => (
                          <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("inventory.colItem")}</TableHead>
                      <TableHead>{t("inventory.colCategory")}</TableHead>
                      <TableHead>{t("inventory.colQuantity")}</TableHead>
                      <TableHead>{t("inventory.colCondition")}</TableHead>
                      <TableHead>{t("inventory.colStatus")}</TableHead>
                      <TableHead>{t("inventory.colValue")}</TableHead>
                      <TableHead className="text-right">{t("inventory.colActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.photo_url ? (
                              <SignedImage
                                storedUrl={item.photo_url}
                                bucket="inventory-photos"
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover border"
                                fallback={
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                  </div>
                                }
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.serial_number && (
                                <div className="text-xs text-muted-foreground">SN: {item.serial_number}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryLabel(item.category)}</TableCell>
                        <TableCell>
                          <span className={item.quantity <= item.min_quantity && item.min_quantity > 0 ? "text-red-600 font-semibold" : ""}>
                            {item.quantity}
                          </span>
                          {item.min_quantity > 0 && (
                            <span className="text-muted-foreground text-xs ml-1">(min: {item.min_quantity})</span>
                          )}
                        </TableCell>
                        <TableCell>{getConditionLabel(item.condition)}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatCurrency(item.current_value || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleViewItem(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("inventory.deleteConfirm")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("inventory.deleteWarning")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("inventory.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteItemMutation.mutate(item.id)}>
                                    {t("inventory.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t("inventory.noItemsFound")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("inventory.maintenanceHistory")}</CardTitle>
                <CardDescription>{t("inventory.maintenanceHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("inventory.colDate")}</TableHead>
                      <TableHead>{t("inventory.colItem")}</TableHead>
                      <TableHead>{t("inventory.colType")}</TableHead>
                      <TableHead>{t("inventory.colDescription")}</TableHead>
                      <TableHead>{t("inventory.colCost")}</TableHead>
                      <TableHead>{t("inventory.colPerformedBy")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.maintenance_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{record.inventory_items?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getMaintenanceTypeLabel(record.maintenance_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                        <TableCell>{formatCurrency(record.cost || 0)}</TableCell>
                        <TableCell>{record.performed_by || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {maintenanceRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t("inventory.noMaintenance")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("inventory.usageHistory")}</CardTitle>
                <CardDescription>{t("inventory.usageHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("inventory.colDate")}</TableHead>
                      <TableHead>{t("inventory.colItem")}</TableHead>
                      <TableHead>{t("inventory.colUser")}</TableHead>
                      <TableHead>{t("inventory.colEvent")}</TableHead>
                      <TableHead>{t("inventory.colQuantity")}</TableHead>
                      <TableHead>{t("inventory.colReturned")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>{format(new Date(record.start_date), "dd/MM/yyyy")}</div>
                          {record.end_date && (
                            <div className="text-xs text-muted-foreground">
                              → {format(new Date(record.end_date), "dd/MM/yyyy")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{record.inventory_items?.name}</TableCell>
                        <TableCell>
                          {record.members
                            ? `${record.members.first_name} ${record.members.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>{record.event_name || "-"}</TableCell>
                        <TableCell>{record.quantity_used}</TableCell>
                        <TableCell>
                          <Badge variant={record.returned ? "default" : "secondary"}>
                            {record.returned ? t("inventory.yes") : t("inventory.no")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {usageRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t("inventory.noUsage")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("inventory.itemDetails")}</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="grid gap-4 py-4">
                {selectedItem.photo_url && (
                  <div className="flex justify-center">
                    <img
                      src={selectedItem.photo_url}
                      alt={selectedItem.name}
                      className="max-w-full max-h-48 rounded-lg object-contain border"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.name")}</Label>
                    <p className="font-medium">{selectedItem.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.category")}</Label>
                    <p>{getCategoryLabel(selectedItem.category)}</p>
                  </div>
                </div>
                {selectedItem.description && (
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.description")}</Label>
                    <p>{selectedItem.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.condition")}</Label>
                    <p>{getConditionLabel(selectedItem.condition)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.quantity")}</Label>
                    <p>{selectedItem.quantity}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.purchasePrice")}</Label>
                    <p>{formatCurrency(selectedItem.purchase_price || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.currentValue")}</Label>
                    <p>{formatCurrency(selectedItem.current_value || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.purchaseDate")}</Label>
                    <p>{selectedItem.purchase_date ? format(new Date(selectedItem.purchase_date), "dd/MM/yyyy") : "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.serialNumber")}</Label>
                    <p>{selectedItem.serial_number || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.location")}</Label>
                    <p>{selectedItem.location || "-"}</p>
                  </div>
                </div>
                {selectedItem.notes && (
                  <div>
                    <Label className="text-muted-foreground">{t("inventory.notes")}</Label>
                    <p>{selectedItem.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
