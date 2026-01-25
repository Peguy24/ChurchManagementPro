import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from './useCurrentTenant';
import { toast } from '@/hooks/use-toast';

export interface EngagementScore {
  id: string;
  member_id: string;
  tenant_id: string;
  attendance_score: number;
  giving_score: number;
  ministry_score: number;
  growth_score: number;
  total_score: number;
  trend: 'improving' | 'stable' | 'declining';
  trend_change: number;
  last_attendance_date: string | null;
  attendance_count_90d: number;
  giving_consistency: number;
  calculated_at: string;
}

export interface RiskPrediction {
  id: string;
  member_id: string;
  tenant_id: string;
  risk_probability: number;
  risk_category: 'low' | 'medium' | 'high';
  contributing_factors: string[];
  days_since_last_attendance: number | null;
  attendance_trend_slope: number | null;
  giving_trend_slope: number | null;
  predicted_inactive_date: string | null;
  model_version: string;
  predicted_at: string;
}

export interface PastoralAlert {
  id: string;
  member_id: string;
  tenant_id: string;
  alert_type: string;
  priority: 'low' | 'medium' | 'high' | 'celebration';
  title: string;
  message: string | null;
  action_suggested: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  is_resolved: boolean;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  expires_at: string | null;
  created_at: string;
  members?: {
    first_name: string;
    last_name: string;
    photo_url: string | null;
  };
}

export interface EngagementDistribution {
  range: string;
  count: number;
  percentage: number;
}

export function useEngagementScores() {
  const { tenantId } = useCurrentTenant();

  return useQuery({
    queryKey: ['engagement-scores', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_engagement_scores')
        .select(`
          *,
          members!inner (
            first_name,
            last_name,
            photo_url,
            status
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('members.status', 'active')
        .order('total_score', { ascending: false });

      if (error) throw error;
      return data as (EngagementScore & { members: { first_name: string; last_name: string; photo_url: string | null } })[];
    },
    enabled: !!tenantId,
  });
}

export function useEngagementDistribution() {
  const { data: scores } = useEngagementScores();

  const distribution: EngagementDistribution[] = [
    { range: '0-20', count: 0, percentage: 0 },
    { range: '21-40', count: 0, percentage: 0 },
    { range: '41-60', count: 0, percentage: 0 },
    { range: '61-80', count: 0, percentage: 0 },
    { range: '81-100', count: 0, percentage: 0 },
  ];

  if (scores && scores.length > 0) {
    scores.forEach(score => {
      const s = score.total_score;
      if (s <= 20) distribution[0].count++;
      else if (s <= 40) distribution[1].count++;
      else if (s <= 60) distribution[2].count++;
      else if (s <= 80) distribution[3].count++;
      else distribution[4].count++;
    });

    const total = scores.length;
    distribution.forEach(d => {
      d.percentage = Math.round((d.count / total) * 100);
    });
  }

  return distribution;
}

export function useRiskPredictions() {
  const { tenantId } = useCurrentTenant();

  return useQuery({
    queryKey: ['risk-predictions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_risk_predictions')
        .select(`
          *,
          members!inner (
            first_name,
            last_name,
            photo_url,
            status
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('members.status', 'active')
        .order('risk_probability', { ascending: false });

      if (error) throw error;
      return data as (RiskPrediction & { members: { first_name: string; last_name: string; photo_url: string | null } })[];
    },
    enabled: !!tenantId,
  });
}

export function useAtRiskMembers() {
  const { data: predictions } = useRiskPredictions();

  return {
    highRisk: predictions?.filter(p => p.risk_category === 'high') || [],
    mediumRisk: predictions?.filter(p => p.risk_category === 'medium') || [],
    lowRisk: predictions?.filter(p => p.risk_category === 'low') || [],
  };
}

export function usePastoralAlerts(options?: { unreadOnly?: boolean; unresolvedOnly?: boolean }) {
  const { tenantId } = useCurrentTenant();

  return useQuery({
    queryKey: ['pastoral-alerts', tenantId, options],
    queryFn: async () => {
      let query = supabase
        .from('pastoral_alerts')
        .select(`
          *,
          members (
            first_name,
            last_name,
            photo_url
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }
      if (options?.unresolvedOnly) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PastoralAlert[];
    },
    enabled: !!tenantId,
  });
}

export function useUnreadAlertCount() {
  const { data: alerts } = usePastoralAlerts({ unreadOnly: true, unresolvedOnly: true });
  return alerts?.length || 0;
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('pastoral_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastoral-alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pastoral_alerts')
        .update({
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastoral-alerts'] });
      toast({
        title: 'Alerte résolue',
        description: "L'alerte a été marquée comme résolue.",
      });
    },
  });
}

export function useRecalculateScores() {
  const { tenantId } = useCurrentTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call all three Edge Functions in sequence
      const { error: engagementError } = await supabase.functions.invoke('calculate-engagement-scores', {
        body: { tenant_id: tenantId },
      });
      if (engagementError) throw engagementError;

      const { error: riskError } = await supabase.functions.invoke('predict-churn-risk', {
        body: { tenant_id: tenantId },
      });
      if (riskError) throw riskError;

      const { error: alertsError } = await supabase.functions.invoke('generate-pastoral-alerts', {
        body: { tenant_id: tenantId },
      });
      if (alertsError) throw alertsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-scores'] });
      queryClient.invalidateQueries({ queryKey: ['risk-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['pastoral-alerts'] });
      toast({
        title: 'Analyse terminée',
        description: 'Les scores et prédictions ont été recalculés.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: "Une erreur s'est produite lors du calcul.",
        variant: 'destructive',
      });
      console.error('Error recalculating scores:', error);
    },
  });
}

export function useMemberEngagementScore(memberId: string | undefined) {
  const { tenantId } = useCurrentTenant();

  return useQuery({
    queryKey: ['member-engagement-score', memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data, error } = await supabase
        .from('member_engagement_scores')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle();

      if (error) throw error;
      return data as EngagementScore | null;
    },
    enabled: !!memberId && !!tenantId,
  });
}

export function useMemberRiskPrediction(memberId: string | undefined) {
  const { tenantId } = useCurrentTenant();

  return useQuery({
    queryKey: ['member-risk-prediction', memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data, error } = await supabase
        .from('member_risk_predictions')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle();

      if (error) throw error;
      return data as RiskPrediction | null;
    },
    enabled: !!memberId && !!tenantId,
  });
}
