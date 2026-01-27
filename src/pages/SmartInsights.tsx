import { useState } from 'react';
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
import { fr } from 'date-fns/locale';

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

const PRIORITY_BADGES: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
  high: { variant: 'destructive', label: 'Urgent' },
  medium: { variant: 'default', label: 'Important' },
  low: { variant: 'secondary', label: 'Info' },
  celebration: { variant: 'outline', label: '🎉 Célébration' },
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

function AlertCard({ alert, onResolve, onView }: { alert: PastoralAlert; onResolve: () => void; onView: () => void }) {
  const config = ALERT_TYPE_CONFIG[alert.alert_type] || { icon: <Bell className="h-4 w-4" />, color: 'text-gray-500' };
  const priorityConfig = PRIORITY_BADGES[alert.priority] || PRIORITY_BADGES.low;

  return (
    <Card className={`${!alert.is_read ? 'border-l-4 border-l-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={priorityConfig.variant}>{priorityConfig.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(alert.created_at), 'dd MMM à HH:mm', { locale: fr })}
              </span>
            </div>
            <h4 className="font-medium text-sm mb-1 line-clamp-1">{alert.title}</h4>
            {alert.message && (
              <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
            )}
            {alert.action_suggested && (
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {alert.action_suggested}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={onView} title="Voir le membre">
              <Eye className="h-4 w-4" />
            </Button>
            {!alert.is_resolved && (
              <Button variant="ghost" size="icon" onClick={onResolve} title="Marquer comme résolu">
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
  const [activeTab, setActiveTab] = useState('overview');
  
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
    { name: 'Faible', value: engagementScores?.length ? engagementScores.length - highRisk.length - mediumRisk.length : 0, color: RISK_COLORS.low },
    { name: 'Moyen', value: mediumRisk.length, color: RISK_COLORS.medium },
    { name: 'Élevé', value: highRisk.length, color: RISK_COLORS.high },
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
              <h1 className="text-2xl font-bold">Smart Insights</h1>
              <p className="text-muted-foreground text-sm">Analyse intelligente de l'engagement des membres</p>
            </div>
          </div>
          <Button 
            onClick={() => recalculate.mutate()} 
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
            {recalculate.isPending ? 'Analyse en cours...' : 'Recalculer'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Score Moyen</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Tendances</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">À Risque</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{highRisk.length}</span>
                  <span className="text-muted-foreground text-sm">+ {mediumRisk.length} moyens</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertes Actives</CardTitle>
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
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="alerts">Alertes ({alerts?.length || 0})</TabsTrigger>
            <TabsTrigger value="at-risk">À Risque ({highRisk.length + mediumRisk.length})</TabsTrigger>
            <TabsTrigger value="top-engaged">Top Engagés</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Engagement Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribution des Scores</CardTitle>
                  <CardDescription>Répartition des membres par niveau d'engagement</CardDescription>
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
                            `${value} membres`,
                            name === 'count' ? 'Membres' : name
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
                  <CardTitle>Analyse des Risques</CardTitle>
                  <CardDescription>Répartition par catégorie de risque de départ</CardDescription>
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
                      Célébrations à venir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {celebrationAlerts.slice(0, 6).map(alert => (
                        <div 
                          key={alert.id} 
                          className="p-3 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleViewMember(alert)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {ALERT_TYPE_CONFIG[alert.alert_type]?.icon}
                            <span className="font-medium text-sm line-clamp-1">{alert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.action_suggested}</p>
                        </div>
                      ))}
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
                    <p className="text-muted-foreground">Aucune alerte active</p>
                    <p className="text-sm text-muted-foreground">Cliquez sur "Recalculer" pour générer de nouvelles alertes</p>
                  </CardContent>
                </Card>
              ) : (
                actionAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onResolve={() => handleResolveAlert(alert.id)}
                    onView={() => handleViewMember(alert)}
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
                  Risque Élevé ({highRisk.length})
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
                              {Math.round(member.risk_probability * 100)}% de risque
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
                  Risque Moyen ({mediumRisk.length})
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
                              {Math.round(member.risk_probability * 100)}% de risque
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
