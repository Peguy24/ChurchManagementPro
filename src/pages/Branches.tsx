import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MapPin, Phone, Mail, Users, Building2, Edit, Trash2, Network, ChevronDown, List, Briefcase } from "lucide-react";
import { BranchDialog } from "@/components/BranchDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  children?: Branch[];
}

const BranchNode = ({ branch }: { branch: Branch }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = branch.children && branch.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <Card 
        className={cn(
          "w-80 hover:shadow-lg transition-all cursor-pointer",
          branch.status === "inactive" && "opacity-60"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{branch.name}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={branch.status === "active" ? "default" : "secondary"}>
                {branch.status === "active" ? "Active" : "Inactive"}
              </Badge>
              {hasChildren && (
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !isExpanded && "-rotate-90"
                  )}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {branch.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {branch.description}
            </p>
          )}
          
          {branch.leader && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                Responsable: {branch.leader.first_name} {branch.leader.last_name}
              </span>
            </div>
          )}

          <div className="flex gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{branch.member_count || 0}</span>
              <span className="text-xs text-muted-foreground">membres</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{branch.ministry_count || 0}</span>
              <span className="text-xs text-muted-foreground">ministères</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChildren && isExpanded && (
        <div className="relative mt-8">
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 w-0.5 h-8 bg-border" />
          
          <div className="flex gap-8 relative">
            {branch.children!.length > 1 && (
              <div 
                className="absolute top-0 h-0.5 bg-border"
                style={{
                  left: 'calc(160px - 50%)',
                  right: 'calc(160px - 50%)',
                }}
              />
            )}
            
            {branch.children!.map((child) => (
              <div key={child.id} className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 -top-0 w-0.5 h-8 bg-border" />
                <div className="pt-8">
                  <BranchNode branch={child} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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

  const hierarchyBranches = useQuery({
    queryKey: ["branches-hierarchy"],
    queryFn: async () => {
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select(`
          *,
          leader:members!branches_leader_id_fkey(first_name, last_name)
        `)
        .order("name");

      if (branchesError) throw branchesError;

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
          };
        })
      );

      const branchMap = new Map<string, Branch>();
      const rootBranches: Branch[] = [];

      branchesWithCounts.forEach((branch) => {
        branchMap.set(branch.id, { ...branch, children: [] });
      });

      branchesWithCounts.forEach((branch) => {
        const branchNode = branchMap.get(branch.id)!;
        
        if (branch.parent_branch_id) {
          const parent = branchMap.get(branch.parent_branch_id);
          if (parent) {
            parent.children!.push(branchNode);
          } else {
            rootBranches.push(branchNode);
          }
        } else {
          rootBranches.push(branchNode);
        }
      });

      return rootBranches;
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
      hierarchyBranches.refetch();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Erreur lors de la suppression de la branche");
    } finally {
      setBranchToDelete(null);
    }
  };

  const handleSuccess = () => {
    refetch();
    hierarchyBranches.refetch();
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

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="hierarchy">
            <Network className="h-4 w-4 mr-2" />
            Organigramme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          {hierarchyBranches.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Chargement de l'organigramme...</div>
            </div>
          ) : !hierarchyBranches.data || hierarchyBranches.data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucune branche trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Créez votre première branche pour commencer
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto pb-8">
                <div className="inline-flex flex-col items-start gap-8 min-w-full">
                  {hierarchyBranches.data.map((branch) => (
                    <div key={branch.id} className="flex justify-center w-full">
                      <BranchNode branch={branch} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Légende</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Branche</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Nombre de membres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Nombre de ministères</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    <span>Cliquez pour réduire/agrandir</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

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
