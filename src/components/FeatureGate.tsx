import { ReactNode } from "react";
import { usePlanLimits, PlanLimits } from "@/hooks/usePlanLimits";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import Layout from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";

interface FeatureGateProps {
  feature: keyof PlanLimits["features"];
  featureName: string;
  featureDescription: string;
  requiredPlan: "essentiel" | "professionnel" | "entreprise";
  icon?: React.ReactNode;
  children: ReactNode;
}

export function FeatureGate({ feature, featureName, featureDescription, requiredPlan, icon, children }: FeatureGateProps) {
  const { hasFeature, loading } = usePlanLimits();
  const { isSuperAdmin } = useUserRole();

  // Super admins bypass all feature gates
  if (isSuperAdmin) return <>{children}</>;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!hasFeature(feature)) {
    return (
      <Layout>
        <FeatureLockedCard
          featureName={featureName}
          featureDescription={featureDescription}
          requiredPlan={requiredPlan}
          icon={icon}
        />
      </Layout>
    );
  }

  return <>{children}</>;
}
