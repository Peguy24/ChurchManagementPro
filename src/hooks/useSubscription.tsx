import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string | null;
  subscriptionEnd: string | null;
  subscriptionStatus: string | null;
  hasStripeCustomer: boolean;
  loading: boolean;
}

export const PLAN_DETAILS = {
  essentiel: {
    name: "Essential",
    price: 29.99,
    yearlyPrice: 305,
    priceId: "price_1SsxZvF3VvKmdn5Gokml3EOt",
    yearlyPriceId: "price_1TBi3DF3VvKmdn5GxgjBbhoe",
    productId: "prod_Tqetfpt7pnhNFf",
  },
  professionnel: {
    name: "Professional", 
    price: 59.99,
    yearlyPrice: 612,
    priceId: "price_1Ssxa9F3VvKmdn5GGE0wSfBk",
    yearlyPriceId: "price_1TBi3bF3VvKmdn5G51dRztux",
    productId: "prod_TqetHNAL0zc5kD",
  },
  entreprise: {
    name: "Enterprise",
    price: 199,
    yearlyPrice: 2030,
    priceId: "price_1SsxaeF3VvKmdn5G8aP7l7GE",
    yearlyPriceId: "price_1TBi4AF3VvKmdn5G1d7gKP8O",
    productId: "prod_TqeuZk0jVNwjEp",
  },
} as const;

export type BillingInterval = "monthly" | "yearly";

export type StripePlanKey = keyof typeof PLAN_DETAILS;
export type PlanKey = StripePlanKey | "free" | "trial" | "none";

export function useSubscription() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    subscriptionEnd: null,
    subscriptionStatus: null,
    hasStripeCustomer: false,
    loading: true,
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const retryCountRef = useRef(0);

  const checkSubscription = useCallback(async () => {
    try {
      // Always get a fresh session to avoid stale tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({
          subscribed: false,
          plan: null,
          subscriptionEnd: null,
          subscriptionStatus: null,
          hasStripeCustomer: false,
          loading: false,
        });
        retryCountRef.current = 0;
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        
        // On 401/auth errors, try refreshing session and retry once
        const is401 = error?.message?.includes('non-2xx') || error?.status === 401;
        if (is401 && retryCountRef.current < 2) {
          retryCountRef.current += 1;
          console.log('Retrying subscription check with refreshed session...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            // Retry with fresh token after a short delay
            setTimeout(() => checkSubscription(), 1000);
            return;
          }
        }
        
        setState(prev => ({ ...prev, loading: false }));
        retryCountRef.current = 0;
        return;
      }

      retryCountRef.current = 0;
      setState({
        subscribed: data.subscribed,
        plan: data.plan,
        subscriptionEnd: data.subscription_end,
        subscriptionStatus: data.status ?? null,
        hasStripeCustomer: data.has_stripe_customer ?? false,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
      retryCountRef.current = 0;
    }
  }, []);

  const createCheckout = async (plan: PlanKey, interval: BillingInterval = "monthly") => {
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
        body: { plan, interval },
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
