import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Edit, Users, Trash2 } from "lucide-react";
import MinistryDialog from "@/components/MinistryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

export default function Ministries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<any>();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: ministries = [], refetch } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select(`
          *,
          leader:members!ministries_leader_id_fkey(first_name, last_name),
          ministry_members(count)
        `)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMinistries = ministries.filter(
    (ministry: any) =>
      ministry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ministry.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const { error } = await supabase
        .from("ministries")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      
      toast.success("Ministère supprimé avec succès");
      refetch();
      setDeleteDialog({ open: false, id: null });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Ministè yo</h2>
            <p className="text-muted-foreground">
              Jere tout ministè legliz ou
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedMinistry(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajoute Ministè
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lis Ministè</CardTitle>
            <CardDescription>
              Total: {ministries.length} ministè
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Chèche ministè..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Non</TableHead>
                    <TableHead>Deskripsyon</TableHead>
                    <TableHead>Responsab</TableHead>
                    <TableHead>Manm</TableHead>
                    <TableHead>Estati</TableHead>
                    <TableHead className="text-right">Aksyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMinistries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Okenn ministè pa jwenn
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMinistries.map((ministry: any) => (
                      <TableRow key={ministry.id}>
                        <TableCell className="font-medium">
                          {ministry.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {ministry.description || "-"}
                        </TableCell>
                        <TableCell>
                          {ministry.leader
                            ? `${ministry.leader.first_name} ${ministry.leader.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {ministry.ministry_members?.[0]?.count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[ministry.status || "active"]}
                          >
                            {ministry.status === "active" ? "Aktif" : "Inaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMinistry(ministry);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteDialog({ open: true, id: ministry.id })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <MinistryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ministry={selectedMinistry}
        onSuccess={refetch}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Efase Ministè</AlertDialogTitle>
            <AlertDialogDescription>
              Èske ou sèten ou vle efase ministè sa a? Aksyon sa a pa ka defèt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anile</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Efase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
