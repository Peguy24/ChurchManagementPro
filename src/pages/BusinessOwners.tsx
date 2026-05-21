import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Owner {
  id: string;
  name: string;
  email: string | null;
  default_share_percent: number;
  is_active: boolean;
  display_order: number;
}

const L: Record<string, Record<string, string>> = {
  en: {
    title: "Business Owners", subtitle: "Manage co-owners and their default contribution share.",
    add: "Add owner", edit: "Edit owner", name: "Name", email: "Email", share: "Default share (%)",
    active: "Active", save: "Save", cancel: "Cancel", delete: "Delete",
    confirmDelete: "Delete this owner?", noOwners: "No owners yet. Add your first co-owner.",
    totalShare: "Total active share", warnShare: "Active owners' share should equal 100%.",
    nameRequired: "Name is required.", saved: "Saved", deleted: "Deleted", failed: "Operation failed",
  },
  fr: {
    title: "Propriétaires de l'entreprise", subtitle: "Gérer les copropriétaires et leur part par défaut.",
    add: "Ajouter un propriétaire", edit: "Modifier le propriétaire", name: "Nom", email: "Email",
    share: "Part par défaut (%)", active: "Actif", save: "Enregistrer", cancel: "Annuler", delete: "Supprimer",
    confirmDelete: "Supprimer ce propriétaire ?", noOwners: "Aucun propriétaire. Ajoutez votre premier copropriétaire.",
    totalShare: "Part active totale", warnShare: "La somme des parts des propriétaires actifs doit être 100%.",
    nameRequired: "Le nom est requis.", saved: "Enregistré", deleted: "Supprimé", failed: "Échec de l'opération",
  },
  ht: {
    title: "Pwopriyetè Biznis", subtitle: "Jere ko-pwopriyetè yo ak pati defo yo.",
    add: "Ajoute pwopriyetè", edit: "Modifye pwopriyetè", name: "Non", email: "Imèl",
    share: "Pati defo (%)", active: "Aktif", save: "Anrejistre", cancel: "Anile", delete: "Efase",
    confirmDelete: "Efase pwopriyetè sa a?", noOwners: "Pa gen pwopriyetè. Ajoute premye ko-pwopriyetè ou.",
    totalShare: "Total pati aktif", warnShare: "Pati pwopriyetè aktif yo dwe egal 100%.",
    nameRequired: "Non obligatwa.", saved: "Anrejistre", deleted: "Efase", failed: "Operasyon echwe",
  },
};

export default function BusinessOwners() {
  const { language } = useLanguage();
  const tr = (k: string) => L[language]?.[k] || L.en[k] || k;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Owner | null>(null);
  const [form, setForm] = useState({ name: "", email: "", default_share_percent: "50", is_active: true });

  const { data: owners } = useQuery({
    queryKey: ["platform-owners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_owners" as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Owner[];
    },
  });

  const resetForm = () => {
    setForm({ name: "", email: "", default_share_percent: "50", is_active: true });
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        default_share_percent: parseFloat(form.default_share_percent) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("platform_owners" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_owners" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-owners"] });
      toast.success(tr("saved"));
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(tr("failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_owners" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-owners"] });
      toast.success(tr("deleted"));
    },
    onError: () => toast.error(tr("failed")),
  });

  const handleEdit = (o: Owner) => {
    setEditing(o);
    setForm({
      name: o.name,
      email: o.email || "",
      default_share_percent: String(o.default_share_percent),
      is_active: o.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error(tr("nameRequired"));
      return;
    }
    saveMutation.mutate();
  };

  const totalActive = (owners || [])
    .filter((o) => o.is_active)
    .reduce((s, o) => s + Number(o.default_share_percent || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" /> {tr("title")}
            </h1>
            <p className="text-muted-foreground">{tr("subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{tr("add")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? tr("edit") : tr("add")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{tr("name")} *</Label>
                  <Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>{tr("email")}</Label>
                  <Input type="email" value={form.email} maxLength={150} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>{tr("share")}</Label>
                  <Input type="number" min="0" max="100" step="0.01" value={form.default_share_percent}
                    onChange={(e) => setForm({ ...form, default_share_percent: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>{tr("active")}</Label>
                </div>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full">
                  {tr("save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{tr("totalShare")}: {totalActive.toFixed(2)}%</CardTitle>
            {Math.abs(totalActive - 100) > 0.01 && (owners || []).some((o) => o.is_active) && (
              <span className="text-xs text-amber-600">{tr("warnShare")}</span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {(!owners || owners.length === 0) ? (
              <p className="text-muted-foreground text-center py-8">{tr("noOwners")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("name")}</TableHead>
                    <TableHead>{tr("email")}</TableHead>
                    <TableHead className="text-right">{tr("share")}</TableHead>
                    <TableHead className="text-center">{tr("active")}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{o.email || "—"}</TableCell>
                      <TableCell className="text-right">{Number(o.default_share_percent).toFixed(2)}%</TableCell>
                      <TableCell className="text-center">
                        {o.is_active ? (
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                            {tr("active")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(o)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (window.confirm(tr("confirmDelete"))) deleteMutation.mutate(o.id);
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
