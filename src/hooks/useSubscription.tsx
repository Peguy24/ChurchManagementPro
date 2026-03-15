import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

export const PLAN_DETAILS = {
  essentiel: {
    name: "Essential",
    price: 49,
    priceId: "price_1SsxZvF3VvKmdn5Gokml3EOt",
    productId: "prod_Tqetfpt7pnhNFf",
  },
  professionnel: {
    name: "Professional", 
    price: 99,
    priceId: "price_1Ssxa9F3VvKmdn5GGE0wSfBk",
    productId: "prod_TqetHNAL0zc5kD",
  },
  entreprise: {
    name: "Enterprise",
    price: 199,
    priceId: "price_1SsxaeF3VvKmdn5G8aP7l7GE",
    productId: "prod_TqeuZk0jVNwjEp",
  },
} as const;

export type StripePlanKey = keyof typeof PLAN_DETAILS;
export type PlanKey = StripePlanKey | "free";

export function useSubscription() {
  const { toast } = useToast();
  const { t } = useLanguage();
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
          title: t("sub.loginRequired"),
          description: t("sub.loginToSubscribe"),
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

      if (data?.free_access) {
        toast({
          title: "✅ " + (data.message || "Free access activated"),
        });
        await checkSubscription();
        return;
      }

      if (data?.updated) {
        toast({
          title: t("sub.subscriptionUpdated"),
          description: data.message || t("sub.subscriptionUpdatedMsg"),
        });
        await checkSubscription();
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: t("common.error"),
        description: t("sub.checkoutError"),
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
          title: t("sub.loginRequired"),
          description: t("sub.loginToManage"),
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
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      const errorMsg = error?.message || error?.context?.body?.error || '';
      const isNoCustomer = errorMsg.includes('No Stripe customer');
      toast({
        title: t("common.error"),
        description: isNoCustomer ? t("sub.noStripeCustomer") : t("sub.portalError"),
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

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
