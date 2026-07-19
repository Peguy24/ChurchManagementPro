import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface GlobalFeatureGateProps {
  flagKey: string;
  children: ReactNode;
}

/**
 * Blocks rendering when a Super Admin has disabled the given platform feature flag.
 * Shows a friendly "unavailable" panel instead of the page.
 */
export default function GlobalFeatureGate({ flagKey, children }: GlobalFeatureGateProps) {
  const { loading, isGlobalFeatureEnabled } = usePlanLimits();

  if (loading) return <>{children}</>;

  if (!isGlobalFeatureEnabled(flagKey)) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 px-4">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-semibold">Feature unavailable</h2>
              <p className="text-muted-foreground">
                This feature has been temporarily disabled by the platform administrator.
                Please check back later.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
