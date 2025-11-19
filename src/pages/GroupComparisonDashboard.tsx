import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface GroupStats {
  group: string;
  monthlyData: { month: string; rate: number; total: number }[];
  overallRate: number;
  trend: number;
}

const GroupComparisonDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [period, setPeriod] = useState<'3' | '6' | '12'>('6');
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

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
        // Get members in this group
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id')
          .eq('status', 'active')
          .contains('groups', [group]);

        if (membersError) throw membersError;

        const memberIds = members?.map(m => m.id) || [];

        if (memberIds.length === 0) {
          stats.push({
            group,
            monthlyData: [],
            overallRate: 0,
            trend: 0
          });
          continue;
        }

        // Get attendance records
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('event_date, member_id')
          .in('member_id', memberIds)
          .gte('event_date', startDate.toISOString().split('T')[0])
          .order('event_date');

        if (attendanceError) throw attendanceError;

        // Process monthly data
        const monthlyMap = new Map<string, { present: Set<string>; total: number }>();
        
        attendance?.forEach(record => {
          const date = new Date(record.event_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { present: new Set(), total: 0 });
          }
          
          const monthData = monthlyMap.get(monthKey)!;
          monthData.present.add(record.member_id);
          monthData.total++;
        });

        const monthlyData = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            rate: (data.present.size / memberIds.length) * 100,
            total: data.total
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        const overallRate = monthlyData.length > 0
          ? monthlyData.reduce((sum, m) => sum + m.rate, 0) / monthlyData.length
          : 0;

        const trend = monthlyData.length >= 2
          ? monthlyData[monthlyData.length - 1].rate - monthlyData[0].rate
          : 0;

        stats.push({
          group,
          monthlyData,
          overallRate,
          trend
        });
      }

      setGroupStats(stats);

      // Prepare comparison data for charts
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Comparaison des Groupes</h1>
              <p className="text-muted-foreground">Analysez les tendances de présence entre différents groupes</p>
            </div>
          </div>
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 derniers mois</SelectItem>
              <SelectItem value="6">6 derniers mois</SelectItem>
              <SelectItem value="12">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner les groupes à comparer</CardTitle>
            <CardDescription>Choisissez jusqu'à 6 groupes pour la comparaison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Sélectionnez au moins un groupe pour voir les statistiques</p>
            </CardContent>
          </Card>
        )}

        {selectedGroups.length > 0 && (
          <>
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {groupStats.map((stat, index) => (
                <Card key={stat.group}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{stat.group}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">{stat.overallRate.toFixed(1)}%</div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stat.trend)}
                        <span className="text-xs text-muted-foreground">
                          {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Taux de présence moyen</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution du taux de présence</CardTitle>
                <CardDescription>Comparaison des tendances de présence au fil du temps</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {selectedGroups.map((group, index) => (
                      <Line
                        key={group}
                        type="monotone"
                        dataKey={group}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Comparaison des taux moyens</CardTitle>
                <CardDescription>Vue d'ensemble des performances par groupe</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="group" className="text-xs" />
                    <YAxis className="text-xs" label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="overallRate" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default GroupComparisonDashboard;
