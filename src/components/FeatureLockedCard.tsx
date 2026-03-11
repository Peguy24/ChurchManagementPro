import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

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

const translations = {
  fr: {
    planRequired: "Plan {plan} requis",
    startingAt: "À partir de {price}$/mois",
    upgrade: "Mettre à niveau",
    backToDashboard: "Retour au tableau de bord",
  },
  en: {
    planRequired: "{plan} plan required",
    startingAt: "Starting at ${price}/month",
    upgrade: "Upgrade",
    backToDashboard: "Back to dashboard",
  },
  ht: {
    planRequired: "Plan {plan} obligatwa",
    startingAt: "Apati ${price}/mwa",
    upgrade: "Mete ajou",
    backToDashboard: "Retounen nan tablo bò",
  },
};

export function FeatureLockedCard({ 
  featureName, 
  featureDescription, 
  requiredPlan,
  icon 
}: FeatureLockedCardProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

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
                {t.planRequired.replace("{plan}", planNames[requiredPlan])}
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t.startingAt.replace("{price}", planPrices[requiredPlan])}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button 
              onClick={() => navigate("/settings/subscription")}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-sm sm:text-base"
            >
              {t.upgrade}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="w-full text-sm sm:text-base"
            >
              {t.backToDashboard}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
