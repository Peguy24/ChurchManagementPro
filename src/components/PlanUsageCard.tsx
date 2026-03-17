import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, UserCheck, AlertTriangle, Crown, ArrowRight, HardDrive } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

function formatStorageSize(mb: number): string {
  if (mb === Infinity) return "∞";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function PlanUsageCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    loading,
    plan,
    limits,
    usage,
    getMemberUsagePercent,
    getBranchUsagePercent,
    getStorageUsagePercent,
    canAddMember,
    canAddBranch,
    canUploadFile,
  } = usePlanLimits();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const planName = plan 
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : "Essential";

  const memberPercent = getMemberUsagePercent();
  const branchPercent = getBranchUsagePercent();
  const storagePercent = getStorageUsagePercent();
  const isNearMemberLimit = memberPercent >= 80;
  const isNearBranchLimit = branchPercent >= 80;
  const isNearStorageLimit = storagePercent >= 80;
  const atMemberLimit = !canAddMember();
  const atBranchLimit = !canAddBranch();
  const atStorageLimit = !canUploadFile(0);

  const hasAnyLimit = atMemberLimit || atBranchLimit || atStorageLimit;

  return (
    <Card className={hasAnyLimit ? "border-destructive/50" : ""}>
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="font-semibold text-sm sm:text-base">{t("sub.plan")} {planName}</span>
          </div>
          {plan !== "entreprise" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate("/settings/subscription")}
              className="self-start sm:self-auto"
            >
              {t("sub.upgrade")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Members Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{t("sub.members")}</span>
            </div>
            <div className="flex items-center gap-2">
              {atMemberLimit && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("sub.limitReached")}
                </Badge>
              )}
              {!atMemberLimit && isNearMemberLimit && (
                <Badge variant="outline" className="text-xs border-warning text-warning">
                  {t("sub.almostFull")}
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
              <span>{t("sub.branches")}</span>
            </div>
            <div className="flex items-center gap-2">
              {atBranchLimit && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("sub.limitReached")}
                </Badge>
              )}
              {!atBranchLimit && isNearBranchLimit && (
                <Badge variant="outline" className="text-xs border-warning text-warning">
                  {t("sub.almostFull")}
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
              <span>{t("sub.users")}</span>
            </div>
            <span className="font-medium">
              {usage.usersCount} / {limits.maxUsers === Infinity ? "∞" : limits.maxUsers}
            </span>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span>{t("sub.storage") || "Stockage"}</span>
            </div>
            <div className="flex items-center gap-2">
              {atStorageLimit && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("sub.limitReached")}
                </Badge>
              )}
              {!atStorageLimit && isNearStorageLimit && (
                <Badge variant="outline" className="text-xs border-warning text-warning">
                  {t("sub.almostFull")}
                </Badge>
              )}
              <span className="font-medium">
                {formatStorageSize(usage.storageMB)} / {formatStorageSize(limits.maxStorageMB)}
              </span>
            </div>
          </div>
          {limits.maxStorageMB !== Infinity && (
            <Progress 
              value={storagePercent} 
              className={`h-2 ${atStorageLimit ? "[&>div]:bg-destructive" : isNearStorageLimit ? "[&>div]:bg-warning" : ""}`}
            />
          )}
        </div>

        {hasAnyLimit && plan !== "entreprise" && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {t("sub.upgradeMsg")}
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => navigate("/settings/subscription")}
            >
              {t("sub.viewPlans")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
