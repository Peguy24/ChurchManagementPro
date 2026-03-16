import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Settings, Loader2, Crown, Sparkles } from "lucide-react";
import { useSubscription, PLAN_DETAILS, PlanKey, StripePlanKey, BillingInterval } from "@/hooks/useSubscription";
import { useLanguage } from "@/contexts/LanguageContext";

export function SubscriptionCard() {
  const { t, language } = useLanguage();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const { 
    subscribed, 
    plan, 
    subscriptionEnd,
    subscriptionStatus,
    hasStripeCustomer,
    loading, 
    checkoutLoading, 
    portalLoading,
    createCheckout, 
    openCustomerPortal 
  } = useSubscription();

  const dateLocale = language === "fr" ? "fr-FR" : language === "ht" ? "fr-HT" : "en-US";

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
  const isTrial = subscriptionStatus === "trial";
  const statusLabel = isTrial ? t("superAdmin.statusTrial") : t("sub.active");
  const endDateLabel = isTrial ? t("superAdmin.trialEndsOn") : t("sub.renewal");

  if (subscribed && (currentPlan || isTrial)) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("sub.yourSubscription")}</CardTitle>
            </div>
            <Badge className={isTrial ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary border-primary/20"}>
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{isTrial ? t("sub.freeTrial") : currentPlan?.name}</p>
              {!isTrial && currentPlan ? (
                <p className="text-sm text-muted-foreground">
                  ${currentPlan.price}{t("sub.perMonth")}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{endDateLabel}</p>
              <p className="font-medium">
                {subscriptionEnd 
                  ? new Date(subscriptionEnd).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
                  : "—"
                }
              </p>
            </div>
          </div>
          {isTrial ? (
            <p className="text-xs text-center text-muted-foreground">
              {t("sub.normalMsg")}
            </p>
          ) : hasStripeCustomer ? (
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
              {t("sub.manageSubscription")}
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              {t("sub.managedByAdmin") || "This subscription is managed by the platform administrator."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const isYearly = billingInterval === "yearly";

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("sub.upgradePremium")}</CardTitle>
        </div>
        <CardDescription>
          {t("sub.unlockFeatures")}
        </CardDescription>
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isYearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("sub.monthly")}
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isYearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("sub.yearly")}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
              {t("sub.save15")}
            </Badge>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.entries(PLAN_DETAILS) as [StripePlanKey, typeof PLAN_DETAILS[StripePlanKey]][]).map(([key, details]) => (
          <div 
            key={key}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div>
              <p className="font-medium">{details.name}</p>
              {isYearly ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-muted-foreground">${details.price * 12}</span>
                  <span className="text-sm text-foreground font-medium">${details.yearlyPrice}{t("sub.perYear")}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">${details.price}{t("sub.perMonth")}</p>
              )}
            </div>
            <Button 
              size="sm"
              onClick={() => createCheckout(key, billingInterval)}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1" />
                  {t("sub.choose")}
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
