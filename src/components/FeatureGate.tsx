import { ReactNode } from "react";
import { usePlanLimits, PlanLimits } from "@/hooks/usePlanLimits";
import { FeatureLockedCard, FeatureKey, uiTranslations } from "@/components/FeatureLockedCard";
import Layout from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeatureGateProps {
  feature: keyof PlanLimits["features"];
  featureKey: FeatureKey;
  requiredPlan: "essentiel" | "professionnel" | "entreprise";
  icon?: React.ReactNode;
  children: ReactNode;
}

export function FeatureGate({ feature, featureKey, requiredPlan, icon, children }: FeatureGateProps) {
  const { hasFeature, loading } = usePlanLimits();
  const { isSuperAdmin } = useUserRole();
  const { language } = useLanguage();
  const t = uiTranslations[language] || uiTranslations.en;

  // Super admins bypass all feature gates
  if (isSuperAdmin) return <>{children}</>;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">{t.loading}</div>
        </div>
      </Layout>
    );
  }

  if (!hasFeature(feature)) {
    return (
      <Layout>
        <FeatureLockedCard
          featureKey={featureKey}
          requiredPlan={requiredPlan}
          icon={icon}
        />
      </Layout>
    );
  }

  return <>{children}</>;
}
