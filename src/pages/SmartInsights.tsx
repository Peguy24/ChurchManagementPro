import { useState } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FeatureLockedCard } from '@/components/FeatureLockedCard';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignedAvatar } from '@/components/SignedAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  UserCheck, 
  Bell, 
  RefreshCw,
  ChevronRight,
  Users,
  Heart,
  Calendar,
  Gift,
  CheckCircle2,
  Eye
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  useEngagementScores,
  useEngagementDistribution,
  useAtRiskMembers,
  usePastoralAlerts,
  useRecalculateScores,
  useResolveAlert,
  useMarkAlertAsRead,
  PastoralAlert,
} from '@/hooks/useSmartInsights';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    pageTitle: "Smart Insights",
    pageSubtitle: "Intelligent analysis of member engagement",
    recalculate: "Recalculate",
    analyzing: "Analyzing...",
    avgScore: "Average Score",
    trends: "Trends",
    atRisk: "At Risk",
    medium: "medium",
    activeAlerts: "Active Alerts",
    overviewTab: "Overview",
    alertsTab: "Alerts",
    atRiskTab: "At Risk",
    topEngagedTab: "Top Engaged",
    scoreDistribution: "Score Distribution",
    scoreDistributionDesc: "Member breakdown by engagement level",
    riskAnalysis: "Risk Analysis",
    riskAnalysisDesc: "Breakdown by departure risk category",
    upcomingCelebrations: "Upcoming Celebrations",
    noActiveAlerts: "No active alerts",
    noActiveAlertsDesc: "Click \"Recalculate\" to generate new alerts",
    highRisk: "High Risk",
    mediumRisk: "Medium Risk",
    riskPercent: "% risk",
    members: "members",
    viewMember: "View member",
    markResolved: "Mark as resolved",
    urgent: "Urgent",
    important: "Important",
    info: "Info",
    celebration: "🎉 Celebration",
    low: "Low",
    riskLow: "Low",
    riskMedium: "Medium",
    riskHigh: "High",
  },
  fr: {
    pageTitle: "Smart Insights",
    pageSubtitle: "Analyse intelligente de l'engagement des membres",
    recalculate: "Recalculer",
    analyzing: "Analyse en cours...",
    avgScore: "Score Moyen",
    trends: "Tendances",
    atRisk: "À Risque",
    medium: "moyens",
    activeAlerts: "Alertes Actives",
    overviewTab: "Vue d'ensemble",
    alertsTab: "Alertes",
    atRiskTab: "À Risque",
    topEngagedTab: "Top Engagés",
    scoreDistribution: "Distribution des Scores",
    scoreDistributionDesc: "Répartition des membres par niveau d'engagement",
    riskAnalysis: "Analyse des Risques",
    riskAnalysisDesc: "Répartition par catégorie de risque de départ",
    upcomingCelebrations: "Célébrations à venir",
    noActiveAlerts: "Aucune alerte active",
    noActiveAlertsDesc: "Cliquez sur \"Recalculer\" pour générer de nouvelles alertes",
    highRisk: "Risque Élevé",
    mediumRisk: "Risque Moyen",
    riskPercent: "% de risque",
    members: "membres",
    viewMember: "Voir le membre",
    markResolved: "Marquer comme résolu",
    urgent: "Urgent",
    important: "Important",
    info: "Info",
    celebration: "🎉 Célébration",
    low: "Faible",
    riskLow: "Faible",
    riskMedium: "Moyen",
    riskHigh: "Élevé",
  },
  ht: {
    pageTitle: "Smart Insights",
    pageSubtitle: "Analiz entèlijan sou angajman manm yo",
    recalculate: "Rekalkile",
    analyzing: "Analiz ap fèt...",
    avgScore: "Nòt Mwayèn",
    trends: "Tandans",
    atRisk: "An Risk",
    medium: "mwayen",
    activeAlerts: "Alèt Aktif",
    overviewTab: "Rezime",
    alertsTab: "Alèt",
    atRiskTab: "An Risk",
    topEngagedTab: "Pi Angaje",
    scoreDistribution: "Distribisyon Nòt",
    scoreDistributionDesc: "Repartisyon manm pa nivo angajman",
    riskAnalysis: "Analiz Risk",
    riskAnalysisDesc: "Repartisyon pa kategori risk depa",
    upcomingCelebrations: "Selebrasyon k ap vini",
    noActiveAlerts: "Pa gen alèt aktif",
    noActiveAlertsDesc: "Klike sou \"Rekalkile\" pou jenere nouvo alèt",
    highRisk: "Gwo Risk",
    mediumRisk: "Risk Mwayen",
    riskPercent: "% risk",
    members: "manm",
    viewMember: "Wè manm",
    markResolved: "Make kòm rezoud",
    urgent: "Ijan",
    important: "Enpòtan",
    info: "Enfò",
    celebration: "🎉 Selebrasyon",
    low: "Ba",
    riskLow: "Ba",
    riskMedium: "Mwayen",
    riskHigh: "Wo",
  },
};

const RISK_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const TREND_ICONS = {
  improving: <TrendingUp className="h-4 w-4 text-green-500" />,
  stable: <Minus className="h-4 w-4 text-gray-400" />,
  declining: <TrendingDown className="h-4 w-4 text-red-500" />,
};

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  high_churn_risk: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' },
  engagement_drop: { icon: <TrendingDown className="h-4 w-4" />, color: 'text-orange-500' },
  attendance_cliff: { icon: <Calendar className="h-4 w-4" />, color: 'text-yellow-500' },
  birthday_upcoming: { icon: <Gift className="h-4 w-4" />, color: 'text-pink-500' },
  membership_anniversary: { icon: <Heart className="h-4 w-4" />, color: 'text-purple-500' },
  spiritual_milestone: { icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-500' },
  re_engagement: { icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-500' },
  new_member_plateau: { icon: <Users className="h-4 w-4" />, color: 'text-gray-500' },
  giving_decline: { icon: <TrendingDown className="h-4 w-4" />, color: 'text-amber-500' },
  ministry_absence: { icon: <Users className="h-4 w-4" />, color: 'text-indigo-500' },
};

function ScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
  };

  const getColor = (s: number) => {
    if (s >= 70) return 'text-green-500 border-green-500';
    if (s >= 40) return 'text-yellow-500 border-yellow-500';
    return 'text-red-500 border-red-500';
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full border-4 flex items-center justify-center font-bold ${getColor(score)}`}>
      {score}
    </div>
  );
}

// Translate alert content based on alert_type, metadata, and language
function translateAlert(alert: PastoralAlert, language: string): { title: string; message: string | null; action: string | null } {
  if (language === 'fr') {
    return { title: alert.title, message: alert.message, action: alert.action_suggested };
  }

  const memberName = alert.members
    ? `${alert.members.first_name} ${alert.members.last_name}`
    : '';
  const meta = alert.metadata || {};

  const alertTranslations: Record<string, Record<string, { title: string; message: string; action: string }>> = {
    high_churn_risk: {
      en: {
        title: `High departure risk: ${memberName}`,
        message: `${memberName} has a high disengagement risk (${meta.risk_probability ? Math.round(meta.risk_probability * 100) : '?'}%).${meta.factors?.length ? ` Factors: ${(meta.factors as string[]).join(', ')}` : ''}`,
        action: 'Schedule a pastoral call or visit within 48h',
      },
      ht: {
        title: `Gwo risk depa: ${memberName}`,
        message: `${memberName} gen yon gwo risk dezangajman (${meta.risk_probability ? Math.round(meta.risk_probability * 100) : '?'}%).${meta.factors?.length ? ` Faktè: ${(meta.factors as string[]).join(', ')}` : ''}`,
        action: 'Planifye yon apèl pastoral oswa yon vizit nan 48è',
      },
    },
    engagement_drop: {
      en: {
        title: `Engagement drop: ${memberName}`,
        message: `${memberName}'s engagement score dropped by ${meta.change ? Math.abs(meta.change as number) : '?'} points. Current score: ${meta.score || '?'}/100.`,
        action: 'Check if the member is going through a difficult time',
      },
      ht: {
        title: `Bès angajman: ${memberName}`,
        message: `Nòt angajman ${memberName} te desann ${meta.change ? Math.abs(meta.change as number) : '?'} pwen. Nòt aktyèl: ${meta.score || '?'}/100.`,
        action: 'Verifye si manm nan ap travèse yon moman difisil',
      },
    },
    attendance_cliff: {
      en: {
        title: `Extended absence: ${memberName}`,
        message: meta.days_absent
          ? `${memberName} has not attended for ${meta.days_absent} days.`
          : `No recent attendance recorded for ${memberName}.`,
        action: 'Call the member to check in',
      },
      ht: {
        title: `Absans pwolonje: ${memberName}`,
        message: meta.days_absent
          ? `${memberName} pa te prezan depi ${meta.days_absent} jou.`
          : `Pa gen prezans anrejistre pou ${memberName} dènyèman.`,
        action: 'Rele manm nan pou pran nouvel',
      },
    },
    birthday_upcoming: {
      en: {
        title: meta.days_until === 0 ? `🎂 Birthday today: ${memberName}` : `🎂 Birthday in ${meta.days_until} day(s): ${memberName}`,
        message: `${memberName} ${meta.days_until === 0 ? 'celebrates' : 'will celebrate'} their ${meta.age || '?'}th birthday${meta.days_until === 0 ? ' today' : ''}.`,
        action: 'Send a birthday message',
      },
      ht: {
        title: meta.days_until === 0 ? `🎂 Anivèsè jodi a: ${memberName}` : `🎂 Anivèsè nan ${meta.days_until} jou: ${memberName}`,
        message: `${memberName} ${meta.days_until === 0 ? 'selebre' : 'ap selebre'} ${meta.age || '?'} an${meta.days_until === 0 ? ' jodi a' : ''}.`,
        action: 'Voye yon mesaj anivèsè',
      },
    },
    membership_anniversary: {
      en: {
        title: `🎉 ${meta.years || '?'} years of faithfulness: ${memberName}`,
        message: `${memberName} celebrates ${meta.years || '?'} years in the church this month.`,
        action: 'Prepare a recognition during the service',
      },
      ht: {
        title: `🎉 ${meta.years || '?'} ane fidèl: ${memberName}`,
        message: `${memberName} selebre ${meta.years || '?'} ane nan legliz la mwa sa a.`,
        action: 'Prepare yon rekonesans pandan sèvis la',
      },
    },
    spiritual_milestone: {
      en: {
        title: `✝️ 1 year of baptism: ${memberName}`,
        message: `${memberName} celebrates the first anniversary of their baptism.`,
        action: 'Congratulate the member and discuss their spiritual journey',
      },
      ht: {
        title: `✝️ 1 ane batèm: ${memberName}`,
        message: `${memberName} selebre premye anivèsè batèm li.`,
        action: 'Felicite manm nan epi diskite sou wout espirityèl li',
      },
    },
  };

  const typeTranslations = alertTranslations[alert.alert_type];
  if (typeTranslations && typeTranslations[language]) {
    const t = typeTranslations[language];
    return { title: t.title, message: t.message, action: t.action };
  }
  // Fallback to DB values
  return { title: alert.title, message: alert.message, action: alert.action_suggested };
}

function AlertCard({ alert, onResolve, onView, lt, dateLocale, language }: { alert: PastoralAlert; onResolve: () => void; onView: () => void; lt: (key: string) => string; dateLocale: typeof fr; language: string }) {
  const config = ALERT_TYPE_CONFIG[alert.alert_type] || { icon: <Bell className="h-4 w-4" />, color: 'text-gray-500' };
  const translated = translateAlert(alert, language);
  
  const priorityLabels: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; key: string }> = {
    high: { variant: 'destructive', key: 'urgent' },
    medium: { variant: 'default', key: 'important' },
    low: { variant: 'secondary', key: 'info' },
    celebration: { variant: 'outline', key: 'celebration' },
  };
  const priorityConfig = priorityLabels[alert.priority] || priorityLabels.low;

  return (
    <Card className={`${!alert.is_read ? 'border-l-4 border-l-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={priorityConfig.variant}>{lt(priorityConfig.key)}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(alert.created_at), 'dd MMM, HH:mm', { locale: dateLocale })}
              </span>
            </div>
            <h4 className="font-medium text-sm mb-1 line-clamp-1">{translated.title}</h4>
            {translated.message && (
              <p className="text-sm text-muted-foreground line-clamp-2">{translated.message}</p>
            )}
            {translated.action && (
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {translated.action}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={onView} title={lt('viewMember')}>
              <Eye className="h-4 w-4" />
            </Button>
            {!alert.is_resolved && (
              <Button variant="ghost" size="icon" onClick={onResolve} title={lt('markResolved')}>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmartInsights() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  const lt = (key: string) => {
    const lang = localTranslations[language] || localTranslations.en;
    return lang[key] || localTranslations.en[key] || key;
  };

  const dateLocale = language === 'fr' ? fr : enUS;
  
  const { data: engagementScores, isLoading: loadingScores } = useEngagementScores();
  const distribution = useEngagementDistribution();
  const { highRisk, mediumRisk } = useAtRiskMembers();
  const { data: alerts, isLoading: loadingAlerts } = usePastoralAlerts({ unresolvedOnly: true });
  const recalculate = useRecalculateScores();
  const resolveAlert = useResolveAlert();
  const markAsRead = useMarkAlertAsRead();

  const avgScore = engagementScores?.length 
    ? Math.round(engagementScores.reduce((sum, s) => sum + s.total_score, 0) / engagementScores.length) 
    : 0;

  const improvingCount = engagementScores?.filter(s => s.trend === 'improving').length || 0;
  const decliningCount = engagementScores?.filter(s => s.trend === 'declining').length || 0;

  const riskDistribution = [
    { name: lt('riskLow'), value: engagementScores?.length ? engagementScores.length - highRisk.length - mediumRisk.length : 0, color: RISK_COLORS.low },
    { name: lt('riskMedium'), value: mediumRisk.length, color: RISK_COLORS.medium },
    { name: lt('riskHigh'), value: highRisk.length, color: RISK_COLORS.high },
  ];

  const handleResolveAlert = (alertId: string) => {
    resolveAlert.mutate({ alertId });
  };

  const handleViewMember = (alert: PastoralAlert) => {
    markAsRead.mutate(alert.id);
    navigate(`/members/details?id=${alert.member_id}`);
  };

  const celebrationAlerts = alerts?.filter(a => a.priority === 'celebration') || [];
  const actionAlerts = alerts?.filter(a => a.priority !== 'celebration') || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{lt('pageTitle')}</h1>
              <p className="text-muted-foreground text-sm">{lt('pageSubtitle')}</p>
            </div>
          </div>
          <Button 
            onClick={() => recalculate.mutate()} 
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
            {recalculate.isPending ? lt('analyzing') : lt('recalculate')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{lt('avgScore')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-3">
                  <ScoreGauge score={avgScore} size="sm" />
                  <span className="text-2xl font-bold">/100</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{lt('trends')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-bold text-green-600">{improvingCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="font-bold text-red-600">{decliningCount}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{lt('atRisk')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{highRisk.length}</span>
                  <span className="text-muted-foreground text-sm">+ {mediumRisk.length} {lt('medium')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{lt('activeAlerts')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAlerts ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{alerts?.length || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{lt('overviewTab')}</TabsTrigger>
            <TabsTrigger value="alerts">{lt('alertsTab')} ({alerts?.length || 0})</TabsTrigger>
            <TabsTrigger value="at-risk">{lt('atRiskTab')} ({highRisk.length + mediumRisk.length})</TabsTrigger>
            <TabsTrigger value="top-engaged">{lt('topEngagedTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Engagement Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{lt('scoreDistribution')}</CardTitle>
                  <CardDescription>{lt('scoreDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} ${lt('members')}`,
                            name === 'count' ? lt('members') : name
                          ]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>{lt('riskAnalysis')}</CardTitle>
                  <CardDescription>{lt('riskAnalysisDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Celebrations */}
              {celebrationAlerts.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-pink-500" />
                      {lt('upcomingCelebrations')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {celebrationAlerts.slice(0, 6).map(alert => {
                        const translated = translateAlert(alert, language);
                        return (
                          <div 
                            key={alert.id} 
                            className="p-3 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleViewMember(alert)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {ALERT_TYPE_CONFIG[alert.alert_type]?.icon}
                              <span className="font-medium text-sm line-clamp-1">{translated.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{translated.action}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <div className="space-y-4">
              {loadingAlerts ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
              ) : actionAlerts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">{lt('noActiveAlerts')}</p>
                    <p className="text-sm text-muted-foreground">{lt('noActiveAlertsDesc')}</p>
                  </CardContent>
                </Card>
              ) : (
                actionAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onResolve={() => handleResolveAlert(alert.id)}
                    onView={() => handleViewMember(alert)}
                    lt={lt}
                    dateLocale={dateLocale}
                    language={language}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="at-risk" className="mt-6">
            <div className="space-y-6">
              {/* High Risk */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {lt('highRisk')} ({highRisk.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {highRisk.map(member => (
                    <Card 
                      key={member.member_id} 
                      className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/members/details?id=${member.member_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.members.photo_url || undefined} />
                            <AvatarFallback>
                              {member.members.first_name[0]}{member.members.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {member.members.first_name} {member.members.last_name}
                            </p>
                            <p className="text-sm text-red-600 font-semibold">
                              {Math.round(member.risk_probability * 100)}{lt('riskPercent')}
                            </p>
                          </div>
                        </div>
                        {member.contributing_factors.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {member.contributing_factors.slice(0, 2).join(' • ')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Medium Risk */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  {lt('mediumRisk')} ({mediumRisk.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mediumRisk.map(member => (
                    <Card 
                      key={member.member_id} 
                      className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/members/details?id=${member.member_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.members.photo_url || undefined} />
                            <AvatarFallback>
                              {member.members.first_name[0]}{member.members.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {member.members.first_name} {member.members.last_name}
                            </p>
                            <p className="text-sm text-yellow-600 font-semibold">
                              {Math.round(member.risk_probability * 100)}{lt('riskPercent')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="top-engaged" className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {loadingScores ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
              ) : engagementScores?.slice(0, 12).map((score, index) => (
                <Card 
                  key={score.member_id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/members/details?id=${score.member_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={score.members.photo_url || undefined} />
                          <AvatarFallback>
                            {score.members.first_name[0]}{score.members.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {score.members.first_name} {score.members.last_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={score.total_score} className="h-2 flex-1" />
                          <span className="text-sm font-semibold">{score.total_score}</span>
                          {TREND_ICONS[score.trend]}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
