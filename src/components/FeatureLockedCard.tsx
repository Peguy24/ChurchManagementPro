import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureLockedCardProps {
  featureName: string;
  featureDescription: string;
  requiredPlan: "essentiel" | "professionnel" | "entreprise";
  icon?: React.ReactNode;
}

const planNames = {
  essentiel: "Essentiel",
  professionnel: "Professionnel",
  entreprise: "Entreprise",
};

const planPrices = {
  essentiel: "49",
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
    <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] px-4">
      <Card className="max-w-lg w-full border-2 border-dashed border-muted-foreground/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
            {icon || <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />}
          </div>
          <CardTitle className="text-xl sm:text-2xl">{featureName}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {featureDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="font-semibold text-base sm:text-lg">
                Plan {planNames[requiredPlan]} requis
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              À partir de {planPrices[requiredPlan]}$/mois
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button 
              onClick={() => navigate("/settings/subscription")}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-sm sm:text-base"
            >
              Mettre à niveau
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="w-full text-sm sm:text-base"
            >
              Retour au tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
