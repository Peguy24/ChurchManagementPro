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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
  description: string;
  is_active: boolean;
}

const initialForm: CategoryForm = {
  name: "",
  description: "",
  is_active: true,
};

export default function ExpenseCategories() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [showInactive, setShowInactive] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["expense-categories-all", showInactive],
    queryFn: async () => {
      let query = supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      
      if (!showInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Check for duplicate names
  const checkDuplicate = (name: string, excludeId?: string) => {
    const normalizedName = name.toLowerCase().trim();
    return categories.some(
      (cat) => 
        cat.name.toLowerCase().trim() === normalizedName && 
        cat.id !== excludeId
    );
  };

  const createCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (checkDuplicate(data.name)) {
        throw new Error("Une catégorie avec ce nom existe déjà");
      }

      const { error } = await supabase.from("expense_categories").insert({
        name: data.name.trim(),
        description: data.description.trim() || null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories-all"] });
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: "Succès", description: "Catégorie créée avec succès" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de créer la catégorie", 
        variant: "destructive" 
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (!data.id) throw new Error("ID manquant");
      
      if (checkDuplicate(data.name, data.id)) {
        throw new Error("Une catégorie avec ce nom existe déjà");
      }

      const { error } = await supabase
        .from("expense_categories")
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null,
          is_active: data.is_active,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories-all"] });
      setDialogOpen(false);
      setForm(initialForm);
      setEditMode(false);
      toast({ title: "Succès", description: "Catégorie mise à jour" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de modifier la catégorie", 
        variant: "destructive" 
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Check if category is used in expenses
      const { count } = await supabase
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id);

      if (count && count > 0) {
        throw new Error(`Cette catégorie est utilisée dans ${count} dépense(s). Désactivez-la plutôt.`);
      }

      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories-all"] });
      toast({ title: "Succès", description: "Catégorie supprimée" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de supprimer la catégorie", 
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (category: any) => {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
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

  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.filter((c) => !c.is_active).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catégories de Dépenses</h1>
            <p className="text-muted-foreground">Gérez les catégories pour classifier les dépenses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Catégorie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editMode ? "Modifier la Catégorie" : "Nouvelle Catégorie"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Électricité, Transport..."
                  />
                  {form.name && checkDuplicate(form.name, form.id) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Une catégorie avec ce nom existe déjà
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description optionnelle..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Catégorie active</Label>
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
                    checkDuplicate(form.name, form.id) ||
                    createCategory.isPending || 
                    updateCategory.isPending
                  }
                >
                  {editMode ? "Mettre à jour" : "Créer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
            Afficher les catégories inactives
          </Label>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Liste des Catégories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Chargement...</p>
            ) : categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune catégorie</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(category.created_at), "dd/MM/yyyy", { locale: fr })}
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
                                <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Si la catégorie est utilisée dans des dépenses, 
                                  vous ne pourrez pas la supprimer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCategory.mutate(category.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
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
