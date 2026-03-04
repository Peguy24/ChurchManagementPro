import { useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MapPin, Phone, Mail, Users, Building2, Edit, Trash2, Network, ChevronDown, List, Briefcase, ArrowLeft } from "lucide-react";
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
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PlanLimitDialog } from "@/components/PlanLimitDialog";
import { useLanguage } from "@/contexts/LanguageContext";

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

const BranchNode = ({ branch, t }: { branch: Branch; t: (key: string) => string }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = branch.children && branch.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <Card 
        className={cn(
          "w-full max-w-[280px] sm:w-80 hover:shadow-lg transition-all cursor-pointer",
          branch.status === "inactive" && "opacity-60"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <CardTitle className="text-sm sm:text-lg truncate">{branch.name}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge variant={branch.status === "active" ? "default" : "secondary"} className="text-xs">
                {branch.status === "active" ? t("branches.active") : t("branches.inactive")}
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
                {t("branches.leader")}: {branch.leader.first_name} {branch.leader.last_name}
              </span>
            </div>
          )}

          <div className="flex gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{branch.member_count || 0}</span>
              <span className="text-xs text-muted-foreground">{t("branches.members").toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{branch.ministry_count || 0}</span>
              <span className="text-xs text-muted-foreground">{t("branches.ministries").toLowerCase()}</span>
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
                  <BranchNode branch={child} t={t} />
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
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { canAddBranch, usage, limits, plan } = usePlanLimits();

  const handleAddBranch = () => {
    if (!canAddBranch()) {
      setLimitDialogOpen(true);
      return;
    }
    setSelectedBranch(undefined);
    setIsDialogOpen(true);
  };

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

      toast.success(t("branches.deleteSuccess"));
      refetch();
      hierarchyBranches.refetch();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error(t("branches.deleteError"));
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
    <Layout>
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("branches.title")}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("branches.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={handleAddBranch} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("branches.newBranch")}</span>
          <span className="sm:hidden">{t("branches.add")}</span>
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="list" className="flex-1 sm:flex-none">
            <List className="h-4 w-4 mr-2" />
            {t("branches.list")}
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex-1 sm:flex-none">
            <Network className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t("branches.hierarchy")}</span>
            <span className="sm:hidden">{t("branches.orgChart")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 sm:space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("branches.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
                          {t("branches.subBranchOf")}: {branch.parent_branch.name}
                        </p>
                      )}
                    </div>
                    <Badge variant={branch.status === "active" ? "default" : "secondary"}>
                      {branch.status === "active" ? t("branches.active") : t("branches.inactive")}
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
                      <span>{t("branches.leader")}: {branch.leader.first_name} {branch.leader.last_name}</span>
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
                      <p className="text-xs text-muted-foreground">{t("branches.members")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{branch.ministry_count}</p>
                      <p className="text-xs text-muted-foreground">{t("branches.ministries")}</p>
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
                      {t("branches.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setBranchToDelete(branch)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("branches.delete")}
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
                <p className="text-lg font-medium">{t("branches.noBranchFound")}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? t("branches.modifySearch")
                    : t("branches.createFirstBranch")}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("branches.createBranch")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          {hierarchyBranches.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("branches.loadingOrgChart")}</div>
            </div>
          ) : !hierarchyBranches.data || hierarchyBranches.data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("branches.noBranchFound")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("branches.createFirstBranchToStart")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto pb-8">
                <div className="inline-flex flex-col items-start gap-8 min-w-full">
                  {hierarchyBranches.data.map((branch) => (
                    <div key={branch.id} className="flex justify-center w-full">
                      <BranchNode branch={branch} t={t} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">{t("branches.legend")}</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{t("branches.branch")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{t("branches.memberCount")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{t("branches.ministryCount")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    <span>{t("branches.clickToToggle")}</span>
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
            <AlertDialogTitle>{t("branches.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("branches.confirmDeleteDesc").replace("{name}", branchToDelete?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("branches.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("branches.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanLimitDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        limitType="branches"
        currentCount={usage.branchesCount}
        maxCount={limits.maxBranches}
        planName={plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Essentiel"}
      />
    </div>
    </Layout>
  );
}
