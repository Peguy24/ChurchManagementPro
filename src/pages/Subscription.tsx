import { useState, useEffect } from "react";
import { BillingInterval } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, CreditCard, Settings, Loader2, Crown, Sparkles, 
  Download, ExternalLink, Calendar, Receipt, ArrowRight,
  CheckCircle2, Clock, XCircle, RefreshCw
} from "lucide-react";
import { useSubscription, PLAN_DETAILS, PlanKey, StripePlanKey } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: string;
  period_start: string | null;
  period_end: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

export default function Subscription() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
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
    openCustomerPortal,
    refreshSubscription 
  } = useSubscription();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const isYearly = billingInterval === "yearly";
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-invoices', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const currentPlan = plan ? PLAN_DETAILS[plan as PlanKey] : null;
  const isTrial = subscriptionStatus === "trial";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("sub.paid")}
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="border-warning/50 text-warning">
            <Clock className="w-3 h-3 mr-1" />
            {t("sub.pending")}
          </Badge>
        );
      case 'void':
      case 'uncollectible':
        return (
          <Badge variant="outline" className="border-destructive/50 text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t("sub.cancelled")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const planFeatures: Record<string, string[]> = {
    essentiel: [
      `${t("sub.upTo")} 200 ${t("sub.members")}`,
      `1 ${t("sub.branches").toLowerCase()}`,
      t("sub.attendanceMgmt"),
      t("sub.emailSupport"),
    ],
    professionnel: [
      `${t("sub.upTo")} 1,000 ${t("sub.members")}`,
      `3 ${t("sub.branches").toLowerCase()}`,
      t("sub.allFeatures"),
      t("sub.advancedReports"),
      t("sub.prioritySupport"),
    ],
    entreprise: [
      `${t("sub.unlimited")} ${t("sub.members").toLowerCase()}`,
      `${t("sub.unlimited")} ${t("sub.branches").toLowerCase()}`,
      t("sub.prioritySupport"),
      t("sub.trainingIncluded"),
      t("sub.support247"),
    ],
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("sub.yourSubscription")}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("sub.invoiceDesc")}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refreshSubscription();
              fetchInvoices();
              toast({ title: t("sub.refreshing") });
            }}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("sub.refresh")}
          </Button>
        </div>

        {/* Current Subscription */}
        <Card className={subscribed ? "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>{t("sub.currentSubscription")}</CardTitle>
              </div>
              {subscribed && (
                <Badge className={isTrial ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary border-primary/20"}>
                  {isTrial ? t("superAdmin.statusTrial") : t("sub.active")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {subscribed && (currentPlan || isTrial) ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{isTrial ? t("sub.freeTrial") : currentPlan?.name}</p>
                    {!isTrial && currentPlan ? (
                      <p className="text-muted-foreground">${currentPlan.price}{t("sub.perMonth")}</p>
                    ) : null}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">{isTrial ? t("superAdmin.trialEndsOn") : t("sub.nextRenewal")}</p>
                    <p className="font-medium text-base sm:text-lg">
                      {subscriptionEnd 
                        ? format(new Date(subscriptionEnd), "d MMMM yyyy", { locale: dateLocale })
                        : "—"
                      }
                    </p>
                  </div>
                </div>
                <Separator />
                {isTrial ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("sub.normalMsg")}
                    </p>
                  </div>
                ) : hasStripeCustomer ? (
                  <Button onClick={openCustomerPortal} disabled={portalLoading} className="w-full">
                    {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                    {t("sub.manageSub")}
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("sub.choosePlanBelow")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{t("sub.noActiveSubscription")}</p>
                <p className="text-muted-foreground mb-4">{t("sub.choosePlanBelow")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              {subscribed ? t("sub.changePlan") : t("sub.choosePlan")}
            </h2>
            {/* Billing toggle */}
            <div className="flex items-center gap-2">
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
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(PLAN_DETAILS) as [StripePlanKey, typeof PLAN_DETAILS[StripePlanKey]][]).map(([key, details]) => {
              const isCurrentPlan = !isTrial && plan === key;
              const isProfessional = key === 'professionnel';
              const features = planFeatures[key] || [];
              
              return (
                <Card 
                  key={key}
                  className={`relative overflow-hidden transition-all ${
                    isCurrentPlan ? 'border-2 border-primary ring-2 ring-primary/20' 
                    : isProfessional ? 'border-2 border-secondary/50' : ''
                  }`}
                >
                  {isProfessional && !isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                      {t("sub.popular")}
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                      {t("sub.yourPlan")}
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{details.name}</CardTitle>
                    {isYearly ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl line-through text-muted-foreground">${details.price * 12}</span>
                        <span className="text-3xl font-bold">${details.yearlyPrice}</span>
                        <span className="text-muted-foreground">{t("sub.perYear")}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${details.price}</span>
                        <span className="text-muted-foreground">{t("sub.perMonth")}</span>
                      </div>
                    )}
                    {isYearly && (
                      <p className="text-xs text-muted-foreground">{t("sub.billedAnnually")}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        {t("sub.currentPlanLabel")}
                      </Button>
                    ) : subscribed && hasStripeCustomer ? (
                      <Button onClick={openCustomerPortal} disabled={portalLoading} variant="outline" className="w-full">
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("sub.switchPlan")} <ArrowRight className="h-4 w-4 ml-2" /></>}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => createCheckout(key)}
                        disabled={checkoutLoading}
                        className={isProfessional ? "w-full bg-secondary hover:bg-secondary/90" : "w-full"}
                        variant={isProfessional ? "default" : "outline"}
                      >
                        {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="h-4 w-4 mr-2" />{t("sub.subscribe")}</>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History / Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("sub.invoiceTitle")}</CardTitle>
            </div>
            <CardDescription>{t("sub.invoiceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("sub.noInvoices")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {format(new Date(invoice.created), "d MMM yyyy", { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 ml-13 sm:ml-0">
                      <div className="sm:text-right">
                        <p className="font-semibold text-sm sm:text-base">${invoice.amount.toFixed(2)}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-1">
                        {invoice.invoice_pdf && (
                          <Button size="sm" variant="ghost" title={t("sub.download")} onClick={() => window.open(invoice.invoice_pdf!, '_blank')}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button size="sm" variant="ghost" title={t("sub.viewInvoice")} onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
