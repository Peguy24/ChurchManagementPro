import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Briefcase, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  parent_branch_id: string | null;
  status: string;
  leader?: {
    first_name: string;
    last_name: string;
  };
  member_count?: number;
  ministry_count?: number;
  children?: Branch[];
}

const BranchNode = ({ branch, level = 0 }: { branch: Branch; level?: number }) => {
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
          {/* Vertical line from parent */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 w-0.5 h-8 bg-border" />
          
          <div className="flex gap-8 relative">
            {/* Horizontal line connecting children */}
            {branch.children!.length > 1 && (
              <div 
                className="absolute top-0 h-0.5 bg-border"
                style={{
                  left: 'calc(160px - 50%)',
                  right: 'calc(160px - 50%)',
                }}
              />
            )}
            
            {branch.children!.map((child, index) => (
              <div key={child.id} className="relative">
                {/* Vertical line to child */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-0 w-0.5 h-8 bg-border" />
                <div className="pt-8">
                  <BranchNode branch={child} level={level + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function BranchHierarchy() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches-hierarchy"],
    queryFn: async () => {
      // Fetch all branches
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select(`
          *,
          leader:members!branches_leader_id_fkey(first_name, last_name)
        `)
        .order("name");

      if (branchesError) throw branchesError;

      // Get member and ministry counts for each branch
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

      // Build hierarchy
      const branchMap = new Map<string, Branch>();
      const rootBranches: Branch[] = [];

      // Initialize all branches
      branchesWithCounts.forEach((branch) => {
        branchMap.set(branch.id, { ...branch, children: [] });
      });

      // Build parent-child relationships
      branchesWithCounts.forEach((branch) => {
        const branchNode = branchMap.get(branch.id)!;
        
        if (branch.parent_branch_id) {
          const parent = branchMap.get(branch.parent_branch_id);
          if (parent) {
            parent.children!.push(branchNode);
          } else {
            // Parent not found, treat as root
            rootBranches.push(branchNode);
          }
        } else {
          // No parent, this is a root branch
          rootBranches.push(branchNode);
        }
      });

      return rootBranches;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Chargement de l'organigramme...</div>
        </div>
      </div>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Organigramme des Branches</h1>
          <p className="text-muted-foreground">
            Visualisation hiérarchique des branches de votre église
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune branche trouvée</p>
            <p className="text-sm text-muted-foreground">
              Créez votre première branche pour commencer
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Organigramme des Branches</h1>
        <p className="text-muted-foreground">
          Visualisation hiérarchique des branches de votre église
        </p>
      </div>

      <div className="overflow-x-auto pb-8">
        <div className="inline-flex flex-col items-start gap-8 min-w-full">
          {branches.map((branch) => (
            <div key={branch.id} className="flex justify-center w-full">
              <BranchNode branch={branch} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
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
    </div>
  );
}
