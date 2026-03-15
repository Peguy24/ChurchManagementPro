import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CreditCard, ArrowRight, HeadphonesIcon, Clock, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription, PLAN_DETAILS, StripePlanKey } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface SubscriptionBlockPageProps {
  reason?: "expired" | "trial_ended" | "past_due" | "cancelled";
}

const reasonIcons = {
  expired: XCircle,
  trial_ended: Clock,
  past_due: AlertTriangle,
  cancelled: XCircle,
};

export default function SubscriptionBlockPage({ reason = "expired" }: SubscriptionBlockPageProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { createCheckout, checkoutLoading, openCustomerPortal, portalLoading } = useSubscription();

  const Icon = reasonIcons[reason] || ShieldAlert;

  const titleKey = reason === "trial_ended" ? "sub.trialEndedTitle"
    : reason === "past_due" ? "sub.pastDueTitle"
    : "sub.subscriptionExpiredTitle";

  const msgKey = reason === "trial_ended" ? "sub.trialEndedMsg"
    : reason === "past_due" ? "sub.pastDueMsg"
    : "sub.subscriptionExpiredMsg";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Block Card */}
        <Card className="border-2 border-destructive/20 overflow-hidden">
          <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 px-6 py-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {t(titleKey)}
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t(msgKey)}
            </p>
          </div>

          <CardContent className="p-6 space-y-4">
            {reason === "past_due" ? (
              <Button
                onClick={openCustomerPortal}
                disabled={portalLoading}
                className="w-full"
                size="lg"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {t("sub.updatePayment")}
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/settings/subscription")}
                className="w-full"
                size="lg"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {t("sub.choosePlan")}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/support")}
              className="w-full"
            >
              <HeadphonesIcon className="h-4 w-4 mr-2" />
              {t("sub.contactSupport")}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Plan Cards */}
        {reason !== "past_due" && (
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(PLAN_DETAILS) as [StripePlanKey, typeof PLAN_DETAILS[StripePlanKey]][]).map(([key, details]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                  key === "professionnel" ? "border-primary/30 ring-1 ring-primary/10" : ""
                }`}
                onClick={() => createCheckout(key)}
              >
                <CardContent className="p-4 text-center">
                  {key === "professionnel" && (
                    <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 text-xs">
                      {t("sub.popular")}
                    </Badge>
                  )}
                  <p className="font-semibold">{details.name}</p>
                  <p className="text-2xl font-bold mt-1">${details.price}<span className="text-sm text-muted-foreground font-normal">{t("sub.perMonth")}</span></p>
                  <Button
                    size="sm"
                    variant={key === "professionnel" ? "default" : "outline"}
                    className="mt-3 w-full"
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sub.choose")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
