import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Settings, Loader2, Crown, Sparkles } from "lucide-react";
import { useSubscription, PLAN_DETAILS, PlanKey, StripePlanKey } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SubscriptionCard() {
  const { 
    subscribed, 
    plan, 
    subscriptionEnd, 
    loading, 
    checkoutLoading, 
    portalLoading,
    createCheckout, 
    openCustomerPortal 
  } = useSubscription();

  if (loading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentPlan = plan ? PLAN_DETAILS[plan as PlanKey] : null;

  if (subscribed && currentPlan) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Votre Abonnement</CardTitle>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Actif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                ${currentPlan.price}/mois
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Renouvellement</p>
              <p className="font-medium">
                {subscriptionEnd 
                  ? format(new Date(subscriptionEnd), "d MMMM yyyy", { locale: fr })
                  : "—"
                }
              </p>
            </div>
          </div>
          <Button 
            onClick={openCustomerPortal} 
            disabled={portalLoading}
            variant="outline" 
            className="w-full"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Gérer l'abonnement
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not subscribed - show upgrade options
  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Passer à Premium</CardTitle>
        </div>
        <CardDescription>
          Débloquez toutes les fonctionnalités avec un abonnement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.entries(PLAN_DETAILS) as [StripePlanKey, typeof PLAN_DETAILS[StripePlanKey]][]).map(([key, details]) => (
          <div 
            key={key}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div>
              <p className="font-medium">{details.name}</p>
              <p className="text-sm text-muted-foreground">${details.price}/mois</p>
            </div>
            <Button 
              size="sm"
              onClick={() => createCheckout(key)}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Choisir
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
