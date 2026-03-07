import { useState, useEffect } from "react";
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
import { enUS } from "date-fns/locale";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

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
  const { 
    subscribed, 
    plan, 
    subscriptionEnd, 
    loading, 
    checkoutLoading, 
    portalLoading,
    createCheckout, 
    openCustomerPortal,
    refreshSubscription 
  } = useSubscription();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-invoices', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const currentPlan = plan ? PLAN_DETAILS[plan as PlanKey] : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="border-warning/50 text-warning">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'void':
      case 'uncollectible':
        return (
          <Badge variant="outline" className="border-destructive/50 text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Subscription</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your subscription and view your payment history
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refreshSubscription();
              fetchInvoices();
              toast({ title: "Refreshing..." });
            }}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Current Subscription */}
        <Card className={subscribed ? "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Your Current Subscription</CardTitle>
              </div>
              {subscribed && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {subscribed && currentPlan ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{currentPlan.name}</p>
                    <p className="text-muted-foreground">
                      ${currentPlan.price}/month
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">Next renewal</p>
                    <p className="font-medium text-base sm:text-lg">
                      {subscriptionEnd 
                        ? format(new Date(subscriptionEnd), "MMMM d, yyyy", { locale: enUS })
                        : "—"
                      }
                    </p>
                  </div>
                </div>
                <Separator />
                <Button 
                  onClick={openCustomerPortal} 
                  disabled={portalLoading}
                  className="w-full"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  Manage subscription (change plan, cancel, payment method)
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No active subscription</p>
                <p className="text-muted-foreground mb-4">
                  Choose a plan below to unlock all features
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans Comparison */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {subscribed ? "Change Plan" : "Choose a Plan"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(PLAN_DETAILS) as [StripePlanKey, typeof PLAN_DETAILS[StripePlanKey]][]).map(([key, details]) => {
              const isCurrentPlan = plan === key;
              const isProfessional = key === 'professionnel';
              
              return (
                <Card 
                  key={key}
                  className={`relative overflow-hidden transition-all ${
                    isCurrentPlan 
                      ? 'border-2 border-primary ring-2 ring-primary/20' 
                      : isProfessional 
                        ? 'border-2 border-secondary/50' 
                        : ''
                  }`}
                >
                  {isProfessional && !isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                      Popular
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                      Your Plan
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{details.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${details.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {key === 'essentiel' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Up to 200 members
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            1 branch
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Attendance management
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Email support
                          </li>
                        </>
                      )}
                      {key === 'professionnel' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Up to 1,000 members
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            3 branches
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            All features included
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Advanced reports
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Priority support
                          </li>
                        </>
                      )}
                      {key === 'entreprise' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Unlimited members
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Unlimited branches
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            {t("commercial.feat_prioritySupport")}
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Training included
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            24/7 support
                          </li>
                        </>
                      )}
                    </ul>
                    
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        Current Plan
                      </Button>
                    ) : subscribed ? (
                      <Button 
                        onClick={openCustomerPortal} 
                        disabled={portalLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Switch
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => createCheckout(key)}
                        disabled={checkoutLoading}
                        className={isProfessional ? "w-full bg-secondary hover:bg-secondary/90" : "w-full"}
                        variant={isProfessional ? "default" : "outline"}
                      >
                        {checkoutLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Subscribe
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Payment History</CardTitle>
            </div>
            <CardDescription>
              View your invoices and download receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No invoices yet</p>
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
                            {format(new Date(invoice.created), "MMM d, yyyy", { locale: enUS })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 ml-13 sm:ml-0">
                      <div className="sm:text-right">
                        <p className="font-semibold text-sm sm:text-base">
                          ${invoice.amount.toFixed(2)}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-1">
                        {invoice.invoice_pdf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                          >
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