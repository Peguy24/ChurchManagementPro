import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

// Plan details mapping
export const PLAN_DETAILS = {
  essentiel: {
    name: "Essentiel",
    price: 49,
    priceId: "price_1SsxZvF3VvKmdn5Gokml3EOt",
    productId: "prod_Tqetfpt7pnhNFf",
  },
  professionnel: {
    name: "Professionnel", 
    price: 99,
    priceId: "price_1Ssxa9F3VvKmdn5GGE0wSfBk",
    productId: "prod_TqetHNAL0zc5kD",
  },
  entreprise: {
    name: "Entreprise",
    price: 199,
    priceId: "price_1SsxaeF3VvKmdn5G8aP7l7GE",
    productId: "prod_TqeuZk0jVNwjEp",
  },
} as const;

export type PlanKey = keyof typeof PLAN_DETAILS;

export function useSubscription() {
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    subscriptionEnd: null,
    loading: true,
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, loading: false, subscribed: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState({
        subscribed: data.subscribed,
        plan: data.plan,
        subscriptionEnd: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const createCheckout = async (plan: PlanKey) => {
    try {
      setCheckoutLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour souscrire à un abonnement.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour gérer votre abonnement.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail de gestion. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  // Check subscription on mount and when auth changes
  useEffect(() => {
    checkSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    ...state,
    checkoutLoading,
    portalLoading,
    createCheckout,
    openCustomerPortal,
    refreshSubscription: checkSubscription,
  };
}
