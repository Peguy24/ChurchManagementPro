import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Sparkles, Loader2, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useSubscription, PLAN_DETAILS, PlanKey } from "@/hooks/useSubscription";
import { differenceInDays, differenceInHours, isPast } from "date-fns";
import { Progress } from "@/components/ui/progress";

export function TrialCountdownCard() {
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const { subscribed, loading: subLoading, createCheckout, checkoutLoading } = useSubscription();

  // Fetch trial info from tenant_subscriptions
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["tenant-subscription-trial", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("status, trial_ends_at, plan")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      return data;
    },
    enabled: !!tenantId && !tenantLoading,
  });

  const loading = isLoading || tenantLoading || subLoading;

  // Don't show if user has active subscription or no trial data
  if (loading) {
    return (
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If subscribed with a paid plan, don't show trial card
  if (subscribed) {
    return null;
  }

  // If no subscription record or not in trial, don't show
  if (!subscription || subscription.status !== "trial" || !subscription.trial_ends_at) {
    return null;
  }

  const trialEndDate = new Date(subscription.trial_ends_at);
  const now = new Date();
  const isExpired = isPast(trialEndDate);
  const daysLeft = differenceInDays(trialEndDate, now);
  const hoursLeft = differenceInHours(trialEndDate, now) % 24;
  
  // Calculate progress (14 days total)
  const totalTrialDays = 14;
  const daysPassed = totalTrialDays - daysLeft;
  const progressPercent = Math.min(100, Math.max(0, (daysPassed / totalTrialDays) * 100));

  // Determine urgency level
  const isUrgent = daysLeft <= 3 && !isExpired;
  const isWarning = daysLeft <= 7 && daysLeft > 3;

  if (isExpired) {
    return (
      <Card className="border-2 border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg text-destructive">Essai Expiré</CardTitle>
            </div>
            <Badge variant="destructive">Expiré</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Votre période d'essai gratuite est terminée. Souscrivez maintenant pour continuer à utiliser toutes les fonctionnalités.
          </p>
          <div className="grid gap-2">
            {(Object.entries(PLAN_DETAILS) as [PlanKey, typeof PLAN_DETAILS[PlanKey]][]).slice(0, 2).map(([key, details]) => (
              <Button 
                key={key}
                onClick={() => createCheckout(key)}
                disabled={checkoutLoading}
                variant={key === "professionnel" ? "default" : "outline"}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {details.name}
                </span>
                <span>${details.price}/mois</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-colors ${
      isUrgent 
        ? "border-destructive/50 bg-gradient-to-br from-destructive/10 to-orange-500/10" 
        : isWarning 
          ? "border-orange-500/50 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20"
          : "border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5"
    }`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${isUrgent ? "text-destructive" : isWarning ? "text-orange-500" : "text-primary"}`} />
            <CardTitle className="text-base sm:text-lg">Période d'Essai Gratuite</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`self-start sm:self-auto ${
              isUrgent 
                ? "border-destructive text-destructive" 
                : isWarning 
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-primary text-primary"
            }`}
          >
            {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown display */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-center">
            <p className={`text-3xl sm:text-4xl font-bold ${isUrgent ? "text-destructive" : isWarning ? "text-orange-600 dark:text-orange-400" : "text-primary"}`}>
              {daysLeft}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Jours</p>
          </div>
          <div className={`text-2xl font-bold ${isUrgent ? "text-destructive" : isWarning ? "text-orange-500" : "text-primary"}`}>:</div>
          <div className="text-center">
            <p className={`text-3xl sm:text-4xl font-bold ${isUrgent ? "text-destructive" : isWarning ? "text-orange-600 dark:text-orange-400" : "text-primary"}`}>
              {hoursLeft}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Heures</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Jour 1</span>
            <span>Jour 14</span>
          </div>
          <Progress 
            value={progressPercent} 
            className={`h-2 ${isUrgent ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-orange-500" : ""}`}
          />
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground text-center">
          {isUrgent 
            ? "⚠️ Attention ! Votre essai se termine bientôt. Souscrivez maintenant pour ne pas perdre l'accès."
            : isWarning
              ? "Profitez de votre essai ! Pensez à souscrire avant la fin pour conserver toutes les fonctionnalités."
              : "Explorez toutes les fonctionnalités premium pendant votre essai gratuit."
          }
        </p>

        {/* CTA Button */}
        <Button 
          onClick={() => createCheckout("professionnel")}
          disabled={checkoutLoading}
          className={`w-full ${isUrgent || isWarning ? "bg-orange-500 hover:bg-orange-600" : ""}`}
        >
          {checkoutLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Souscrire Maintenant
        </Button>
      </CardContent>
    </Card>
  );
}
