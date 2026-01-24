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
import { useSubscription, PLAN_DETAILS, PlanKey } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
            Payée
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="border-warning/50 text-warning">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'void':
      case 'uncollectible':
        return (
          <Badge variant="outline" className="border-destructive/50 text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Annulée
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Abonnement</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gérez votre abonnement et consultez votre historique de paiements
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refreshSubscription();
              fetchInvoices();
              toast({ title: "Actualisation en cours..." });
            }}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>

        {/* Current Subscription */}
        <Card className={subscribed ? "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Votre Abonnement Actuel</CardTitle>
              </div>
              {subscribed && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Actif
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
                      ${currentPlan.price}/mois
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">Prochain renouvellement</p>
                    <p className="font-medium text-base sm:text-lg">
                      {subscriptionEnd 
                        ? format(new Date(subscriptionEnd), "d MMMM yyyy", { locale: fr })
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
                  Gérer l'abonnement (changer de plan, annuler, méthode de paiement)
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Aucun abonnement actif</p>
                <p className="text-muted-foreground mb-4">
                  Choisissez un plan ci-dessous pour débloquer toutes les fonctionnalités
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans Comparison */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {subscribed ? "Changer de Plan" : "Choisir un Plan"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(PLAN_DETAILS) as [PlanKey, typeof PLAN_DETAILS[PlanKey]][]).map(([key, details]) => {
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
                      Populaire
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                      Votre plan
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{details.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${details.price}</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {key === 'essentiel' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Jusqu'à 200 membres
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            1 succursale
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Gestion des présences
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Support email
                          </li>
                        </>
                      )}
                      {key === 'professionnel' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Jusqu'à 1000 membres
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            3 succursales
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Toutes les fonctionnalités
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Rapports avancés
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Support prioritaire
                          </li>
                        </>
                      )}
                      {key === 'entreprise' && (
                        <>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Membres illimités
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Succursales illimitées
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            API personnalisée
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Formation incluse
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            Support 24/7
                          </li>
                        </>
                      )}
                    </ul>
                    
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        Plan actuel
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
                            Changer
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
                            S'abonner
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
              <CardTitle>Historique des Paiements</CardTitle>
            </div>
            <CardDescription>
              Consultez vos factures et téléchargez vos reçus
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
                <p>Aucune facture pour le moment</p>
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
                          {invoice.number || `Facture ${invoice.id.slice(-8)}`}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {format(new Date(invoice.created), "d MMM yyyy", { locale: fr })}
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
