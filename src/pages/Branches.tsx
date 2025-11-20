import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Phone, Mail, Users, Building2, Edit, Trash2 } from "lucide-react";
import { BranchDialog } from "@/components/BranchDialog";
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

interface Branch {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  parent_branch_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  leader?: {
    first_name: string;
    last_name: string;
  };
  parent_branch?: {
    name: string;
  };
  member_count?: number;
  ministry_count?: number;
}

export default function Branches() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const { data: branches, refetch } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select(`
          *,
          leader:members!branches_leader_id_fkey(first_name, last_name),
          parent_branch:branches!branches_parent_branch_id_fkey(name)
        `)
        .order("name");

      if (branchesError) throw branchesError;

      // Get member counts for each branch
      const branchesWithCounts = await Promise.all(
        branchesData.map(async (branch) => {
          const { count: memberCount } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id);

          const { count: ministryCount } = await supabase
            .from("ministries")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id);

          return {
            ...branch,
            member_count: memberCount || 0,
            ministry_count: ministryCount || 0,
            parent_branch: Array.isArray(branch.parent_branch) && branch.parent_branch.length > 0 
              ? branch.parent_branch[0] 
              : null,
          };
        })
      );

      return branchesWithCounts as Branch[];
    },
  });

  const filteredBranches = branches?.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branchToDelete.id);

      if (error) throw error;

      toast.success("Branche supprimée avec succès");
      refetch();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Erreur lors de la suppression de la branche");
    } finally {
      setBranchToDelete(null);
    }
  };

  const handleSuccess = () => {
    refetch();
    setSelectedBranch(undefined);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground">
            Gérez les différentes branches et départements de votre église
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedBranch(undefined);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle branche
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher une branche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches?.map((branch) => (
          <Card key={branch.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {branch.name}
                  </CardTitle>
                  {branch.parent_branch && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Sous-branche de: {branch.parent_branch.name}
                    </p>
                  )}
                </div>
                <Badge variant={branch.status === "active" ? "default" : "secondary"}>
                  {branch.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {branch.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {branch.description}
                </p>
              )}

              {branch.leader && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Responsable: {branch.leader.first_name} {branch.leader.last_name}</span>
                </div>
              )}

              {branch.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-1">{branch.address}</span>
                </div>
              )}

              {branch.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{branch.phone}</span>
                </div>
              )}

              {branch.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-1">{branch.email}</span>
                </div>
              )}

              <div className="flex gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{branch.member_count}</p>
                  <p className="text-xs text-muted-foreground">Membres</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{branch.ministry_count}</p>
                  <p className="text-xs text-muted-foreground">Ministères</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(branch)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setBranchToDelete(branch)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBranches?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune branche trouvée</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Essayez de modifier votre recherche"
                : "Commencez par créer votre première branche"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une branche
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <BranchDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        branch={selectedBranch}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={!!branchToDelete} onOpenChange={() => setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la branche "{branchToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
