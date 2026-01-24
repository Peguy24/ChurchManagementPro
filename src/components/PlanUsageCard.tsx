import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, UserCheck, AlertTriangle, Crown, ArrowRight } from "lucide-react";
import { usePlanLimits, PLAN_LIMITS } from "@/hooks/usePlanLimits";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function PlanUsageCard() {
  const navigate = useNavigate();
  const {
    loading,
    plan,
    limits,
    usage,
    getMemberUsagePercent,
    getBranchUsagePercent,
    canAddMember,
    canAddBranch,
  } = usePlanLimits();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const planName = plan 
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : "Essentiel";

  const memberPercent = getMemberUsagePercent();
  const branchPercent = getBranchUsagePercent();
  const isNearMemberLimit = memberPercent >= 80;
  const isNearBranchLimit = branchPercent >= 80;
  const atMemberLimit = !canAddMember();
  const atBranchLimit = !canAddBranch();

  return (
    <Card className={atMemberLimit || atBranchLimit ? "border-destructive/50" : ""}>
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="font-semibold text-sm sm:text-base">Plan {planName}</span>
          </div>
          {plan !== "entreprise" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate("/settings/subscription")}
              className="self-start sm:self-auto"
            >
              Améliorer
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Members Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Membres</span>
            </div>
            <div className="flex items-center gap-2">
              {atMemberLimit && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Limite atteinte
                </Badge>
              )}
              {!atMemberLimit && isNearMemberLimit && (
                <Badge variant="outline" className="text-xs border-warning text-warning">
                  Presque plein
                </Badge>
              )}
              <span className="font-medium">
                {usage.membersCount} / {limits.maxMembers === Infinity ? "∞" : limits.maxMembers}
              </span>
            </div>
          </div>
          {limits.maxMembers !== Infinity && (
            <Progress 
              value={memberPercent} 
              className={`h-2 ${atMemberLimit ? "[&>div]:bg-destructive" : isNearMemberLimit ? "[&>div]:bg-warning" : ""}`}
            />
          )}
        </div>

        {/* Branches Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Succursales</span>
            </div>
            <div className="flex items-center gap-2">
              {atBranchLimit && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Limite atteinte
                </Badge>
              )}
              {!atBranchLimit && isNearBranchLimit && (
                <Badge variant="outline" className="text-xs border-warning text-warning">
                  Presque plein
                </Badge>
              )}
              <span className="font-medium">
                {usage.branchesCount} / {limits.maxBranches === Infinity ? "∞" : limits.maxBranches}
              </span>
            </div>
          </div>
          {limits.maxBranches !== Infinity && (
            <Progress 
              value={branchPercent} 
              className={`h-2 ${atBranchLimit ? "[&>div]:bg-destructive" : isNearBranchLimit ? "[&>div]:bg-warning" : ""}`}
            />
          )}
        </div>

        {/* Users Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Utilisateurs</span>
            </div>
            <span className="font-medium">
              {usage.usersCount} / {limits.maxUsers === Infinity ? "∞" : limits.maxUsers}
            </span>
          </div>
        </div>

        {(atMemberLimit || atBranchLimit) && plan !== "entreprise" && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Passez à un plan supérieur pour débloquer plus de capacité.
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => navigate("/settings/subscription")}
            >
              Voir les plans
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
