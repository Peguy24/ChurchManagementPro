import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureLockedCardProps {
  featureName: string;
  featureDescription: string;
  requiredPlan: "professionnel" | "entreprise";
  icon?: React.ReactNode;
}

const planNames = {
  professionnel: "Professionnel",
  entreprise: "Entreprise",
};

const planPrices = {
  professionnel: "99",
  entreprise: "199",
};

export function FeatureLockedCard({ 
  featureName, 
  featureDescription, 
  requiredPlan,
  icon 
}: FeatureLockedCardProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full border-2 border-dashed border-muted-foreground/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            {icon || <Lock className="w-8 h-8 text-muted-foreground" />}
          </div>
          <CardTitle className="text-2xl">{featureName}</CardTitle>
          <CardDescription className="text-base">
            {featureDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">
                Plan {planNames[requiredPlan]} requis
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              À partir de {planPrices[requiredPlan]}$/mois
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/settings/subscription")}
              className="w-full bg-gradient-to-r from-primary to-primary-dark"
            >
              Mettre à niveau
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              Retour au tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
