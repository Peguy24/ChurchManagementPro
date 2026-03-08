import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Pencil, Trash2, FolderOpen, AlertTriangle } from "lucide-react";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CategoryForm {
  id?: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

const initialForm: CategoryForm = {
  name: "",
  code: "",
  description: "",
  is_active: true,
  display_order: 0,
};

export default function IncomeCategories() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [showInactive, setShowInactive] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["income-categories-all", showInactive],
    queryFn: async () => {
      let query = supabase
        .from("income_categories")
        .select("*")
        .order("display_order")
        .order("name");
      
      if (!showInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const checkDuplicate = (name: string, code: string, excludeId?: string) => {
    const normalizedName = name.toLowerCase().trim();
    const normalizedCode = code.toLowerCase().trim();
    return categories.some(
      (cat) => 
        (cat.name.toLowerCase().trim() === normalizedName || 
         cat.code.toLowerCase().trim() === normalizedCode) && 
        cat.id !== excludeId
    );
  };

  const generateCode = (name: string) => {
    return name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "_")
      .substring(0, 10);
  };

  const createCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (checkDuplicate(data.name, data.code)) {
        throw new Error(t("layout.categoryDuplicate"));
      }

      const { error } = await supabase.from("income_categories").insert({
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description.trim() || null,
        is_active: data.is_active,
        display_order: data.display_order,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-categories"] });
      queryClient.invalidateQueries({ queryKey: ["income-categories-all"] });
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: t("common.success"), description: t("nav.newCategory") });
    },
    onError: (error: any) => {
      toast({ 
        title: t("common.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (!data.id) throw new Error("ID missing");
      
      if (checkDuplicate(data.name, data.code, data.id)) {
        throw new Error(t("nav.categoryDuplicate"));
      }

      const { error } = await supabase
        .from("income_categories")
        .update({
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          description: data.description.trim() || null,
          is_active: data.is_active,
          display_order: data.display_order,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-categories"] });
      queryClient.invalidateQueries({ queryKey: ["income-categories-all"] });
      setDialogOpen(false);
      setForm(initialForm);
      setEditMode(false);
      toast({ title: t("common.success"), description: t("nav.editCategory") });
    },
    onError: (error: any) => {
      toast({ 
        title: t("common.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id);

      if (count && count > 0) {
        throw new Error(t("nav.categoryUsed"));
      }

      const { error } = await supabase
        .from("income_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-categories"] });
      queryClient.invalidateQueries({ queryKey: ["income-categories-all"] });
      toast({ title: t("common.success"), description: t("common.delete") });
    },
    onError: (error: any) => {
      toast({ 
        title: t("common.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (category: any) => {
    setForm({
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description || "",
      is_active: category.is_active,
      display_order: category.display_order || 0,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast({ title: t("common.error"), description: t("nav.categoryName") + " & " + t("nav.categoryCode"), variant: "destructive" });
      return;
    }

    if (editMode) {
      updateCategory.mutate(form);
    } else {
      createCategory.mutate(form);
    }
  };

  const handleOpenDialog = () => {
    setForm(initialForm);
    setEditMode(false);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    const newForm = { ...form, name };
    if (!editMode && !form.code) {
      newForm.code = generateCode(name);
    }
    setForm(newForm);
  };

  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.filter((c) => !c.is_active).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("nav.incomeCategoriesTitle")}</h1>
            <p className="text-muted-foreground">{t("nav.incomeCategoriesDesc")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t("nav.newCategory")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editMode ? t("nav.editCategory") : t("nav.newCategory")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("nav.categoryName")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Tithes, Offerings..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("nav.categoryCode")} *</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: TITHES"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("nav.displayOrder")}</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>
                {(form.name || form.code) && checkDuplicate(form.name, form.code, form.id) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("nav.categoryDuplicate")}
                  </p>
                )}
                <div className="space-y-2">
                  <Label>{t("nav.categoryDescription")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t("nav.categoryActive")}</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={
                    !form.name.trim() || 
                    !form.code.trim() ||
                    checkDuplicate(form.name, form.code, form.id) ||
                    createCategory.isPending || 
                    updateCategory.isPending
                  }
                >
                  {editMode ? t("common.save") : t("common.create")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{categories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("nav.actives")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("nav.inactives")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
            {t("nav.showInactive")}
          </Label>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t("nav.categoryList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
            ) : categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("nav.displayOrder")}</TableHead>
                    <TableHead>{t("nav.categoryCode")}</TableHead>
                    <TableHead>{t("nav.categoryName")}</TableHead>
                    <TableHead>{t("nav.categoryDescription")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="text-muted-foreground">{category.display_order}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? t("nav.active") : t("nav.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("nav.deleteCategory")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("nav.deleteCategoryDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCategory.mutate(category.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
