import { useState, useEffect } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FeatureLockedCard } from '@/components/FeatureLockedCard';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateInputValue, toSafeDate } from '@/lib/date';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';

const localTranslations: Record<string, Record<string, string>> = {
  fr: {
    loading: "Chargement...",
    title: "Comparaison des Groupes",
    subtitle: "Analysez les tendances de présence entre différents groupes",
    last3Months: "3 derniers mois",
    last6Months: "6 derniers mois",
    last12Months: "12 derniers mois",
    selectGroups: "Sélectionner les groupes à comparer",
    selectGroupsDesc: "Choisissez jusqu'à 6 groupes pour la comparaison",
    selectAtLeastOne: "Sélectionnez au moins un groupe pour voir les statistiques",
    avgAttendanceRate: "Taux de présence moyen",
    attendanceTrend: "Évolution du taux de présence",
    trendComparison: "Comparaison des tendances au fil du temps",
    avgRateComparison: "Comparaison des taux moyens",
    performanceOverview: "Vue d'ensemble des performances par groupe",
    avgRate: "Taux moyen (%)",
  },
  en: {
    loading: "Loading...",
    title: "Group Comparison",
    subtitle: "Analyze attendance trends across different groups",
    last3Months: "Last 3 months",
    last6Months: "Last 6 months",
    last12Months: "Last 12 months",
    selectGroups: "Select groups to compare",
    selectGroupsDesc: "Choose up to 6 groups for comparison",
    selectAtLeastOne: "Select at least one group to view statistics",
    avgAttendanceRate: "Average attendance rate",
    attendanceTrend: "Attendance Rate Trend",
    trendComparison: "Trend comparison over time",
    avgRateComparison: "Average Rate Comparison",
    performanceOverview: "Performance overview by group",
    avgRate: "Avg. rate (%)",
  },
  ht: {
    loading: "Chajman...",
    title: "Konparezon Gwoup",
    subtitle: "Analize tandans prezans nan diferan gwoup yo",
    last3Months: "3 dènye mwa",
    last6Months: "6 dènye mwa",
    last12Months: "12 dènye mwa",
    selectGroups: "Chwazi gwoup pou konpare",
    selectGroupsDesc: "Chwazi jiska 6 gwoup pou konparezon",
    selectAtLeastOne: "Chwazi omwen yon gwoup pou wè estatistik yo",
    avgAttendanceRate: "To prezans mwayèn",
    attendanceTrend: "Evolisyon to prezans",
    trendComparison: "Konparezon tandans nan tan",
    avgRateComparison: "Konparezon to mwayèn",
    performanceOverview: "Apèsi pèfòmans pa gwoup",
    avgRate: "To mwayèn (%)",
  },
};

interface GroupStats {
  group: string;
  monthlyData: { month: string; rate: number; total: number }[];
  overallRate: number;
  trend: number;
}

const GroupComparisonDashboard = () => {
  const { hasFeature, loading: planLoading } = usePlanLimits();
  const navigate = useNavigate();
  const { language } = useLanguage();

  if (!planLoading && !hasFeature("advancedReports")) {
    return (
      <Layout>
        <FeatureLockedCard featureName="Comparaison des groupes" featureDescription="Rapports avancés et analyses comparatives" requiredPlan="professionnel" icon={<TrendingUp className="w-8 h-8 text-muted-foreground" />} />
      </Layout>
    );
  }
  const [loading, setLoading] = useState(true);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [period, setPeriod] = useState<'3' | '6' | '12'>('6');
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const lt = (key: string) => {
    const lang = localTranslations[language] || localTranslations.en;
    return lang[key] || localTranslations.en[key] || key;
  };

  const dateLocaleStr = language === 'fr' || language === 'ht' ? 'fr-FR' : 'en-US';

  useEffect(() => {
    loadAvailableGroups();
  }, []);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      loadComparisonData();
    }
  }, [selectedGroups, period]);

  const loadAvailableGroups = async () => {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('groups')
        .eq('status', 'active')
        .not('groups', 'is', null);

      if (error) throw error;

      const groupsSet = new Set<string>();
      members?.forEach(member => {
        if (member.groups && Array.isArray(member.groups)) {
          member.groups.forEach((group: string) => groupsSet.add(group));
        }
      });

      const groups = Array.from(groupsSet).sort();
      setAvailableGroups(groups);
      if (groups.length > 0) {
        setSelectedGroups([groups[0]]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    setLoading(true);
    try {
      const monthsAgo = parseInt(period);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);

      const stats: GroupStats[] = [];

      for (const group of selectedGroups) {
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id')
          .eq('status', 'active')
          .contains('groups', [group]);

        if (membersError) throw membersError;

        const memberIds = members?.map(m => m.id) || [];

        if (memberIds.length === 0) {
          stats.push({ group, monthlyData: [], overallRate: 0, trend: 0 });
          continue;
        }

        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('event_date, member_id')
          .in('member_id', memberIds)
          .gte('event_date', formatDateInputValue(startDate))
          .order('event_date');

        if (attendanceError) throw attendanceError;

        const monthlyMap = new Map<string, { present: Set<string>; total: number }>();
        
        attendance?.forEach(record => {
          const date = toSafeDate(record.event_date) ?? new Date(record.event_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { present: new Set(), total: 0 });
          }
          
          const monthData = monthlyMap.get(monthKey)!;
          monthData.present.add(record.member_id);
          monthData.total++;
        });

        const monthlyData = Array.from(monthlyMap.entries())
          .map(([month, data]) => {
            const [y, m] = month.split('-').map(Number);
            const monthDate = new Date(y, (m || 1) - 1, 1);
            return {
              month: monthDate.toLocaleDateString(dateLocaleStr, { month: 'short', year: '2-digit' }),
              rate: (data.present.size / memberIds.length) * 100,
              total: data.total,
            };
          })
          .sort((a, b) => a.month.localeCompare(b.month));

        const overallRate = monthlyData.length > 0
          ? monthlyData.reduce((sum, m) => sum + m.rate, 0) / monthlyData.length
          : 0;

        const trend = monthlyData.length >= 2
          ? monthlyData[monthlyData.length - 1].rate - monthlyData[0].rate
          : 0;

        stats.push({ group, monthlyData, overallRate, trend });
      }

      setGroupStats(stats);

      const allMonths = new Set<string>();
      stats.forEach(s => s.monthlyData.forEach(m => allMonths.add(m.month)));
      
      const chartData = Array.from(allMonths).sort().map(month => {
        const dataPoint: any = { month };
        stats.forEach(stat => {
          const monthData = stat.monthlyData.find(m => m.month === month);
          dataPoint[stat.group] = monthData ? monthData.rate : 0;
        });
        return dataPoint;
      });

      setComparisonData(chartData);
    } catch (error) {
      console.error('Error loading comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  if (loading && selectedGroups.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{lt("loading")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{lt("title")}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{lt("subtitle")}</p>
            </div>
          </div>
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{lt("last3Months")}</SelectItem>
              <SelectItem value="6">{lt("last6Months")}</SelectItem>
              <SelectItem value="12">{lt("last12Months")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group Selection */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-sm sm:text-base md:text-lg">{lt("selectGroups")}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{lt("selectGroupsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {availableGroups.map((group) => (
                <div key={group} className="flex items-center space-x-2">
                  <Checkbox
                    id={group}
                    checked={selectedGroups.includes(group)}
                    onCheckedChange={() => toggleGroup(group)}
                    disabled={!selectedGroups.includes(group) && selectedGroups.length >= 6}
                  />
                  <label
                    htmlFor={group}
                    className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                  >
                    {group}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedGroups.length === 0 && (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <p className="text-sm sm:text-base text-muted-foreground">{lt("selectAtLeastOne")}</p>
            </CardContent>
          </Card>
        )}

        {selectedGroups.length > 0 && (
          <>
            {/* Overview Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {groupStats.map((stat) => (
                <Card key={stat.group}>
                  <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-medium truncate">{stat.group}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-base sm:text-lg md:text-2xl font-bold">{stat.overallRate.toFixed(1)}%</div>
                      <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                        {getTrendIcon(stat.trend)}
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{lt("avgAttendanceRate")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Line Chart */}
            <Card>
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">{lt("attendanceTrend")}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{lt("trendComparison")}</CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="h-[220px] sm:h-[260px] md:h-[320px] lg:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {selectedGroups.map((group, index) => (
                        <Line
                          key={group}
                          type="monotone"
                          dataKey={group}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">{lt("avgRateComparison")}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{lt("performanceOverview")}</CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="h-[200px] sm:h-[240px] md:h-[280px] lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="overallRate" name={lt("avgRate")} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default GroupComparisonDashboard;
