import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import {
  formatCurrency as formatCurrencyUtil,
  formatCurrencyCompact as formatCurrencyCompactUtil,
  getCurrencyConfig,
  DEFAULT_CURRENCY_CODE,
  type CurrencyConfig,
} from "@/lib/currency";

interface UseCurrencyReturn {
  currencyCode: string;
  currencySymbol: string;
  currencyConfig: CurrencyConfig;
  formatAmount: (amount: number) => string;
  formatCompact: (amount: number) => string;
  loading: boolean;
}

export function useCurrency(): UseCurrencyReturn {
  const { tenantId } = useCurrentTenant();

  const { data: currencyCode, isLoading } = useQuery({
    queryKey: ["church-currency", tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_CURRENCY_CODE;

      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_value")
        .eq("tenant_id", tenantId)
        .eq("setting_key", "currency_code")
        .maybeSingle();

      if (error) {
        console.error("Error fetching currency setting:", error);
        return DEFAULT_CURRENCY_CODE;
      }

      return data?.setting_value || DEFAULT_CURRENCY_CODE;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const resolvedCode = currencyCode || DEFAULT_CURRENCY_CODE;
  const config = useMemo(() => getCurrencyConfig(resolvedCode), [resolvedCode]);

  const formatAmount = useMemo(
    () => (amount: number) => formatCurrencyUtil(amount, resolvedCode),
    [resolvedCode]
  );

  const formatCompact = useMemo(
    () => (amount: number) => formatCurrencyCompactUtil(amount, resolvedCode),
    [resolvedCode]
  );

  return {
    currencyCode: resolvedCode,
    currencySymbol: config.symbol,
    currencyConfig: config,
    formatAmount,
    formatCompact,
    loading: isLoading,
  };
}
