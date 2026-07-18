import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Activity } from 'lucide-react';

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  operational: { label: 'Operational', color: 'bg-green-500', icon: CheckCircle2 },
  degraded: { label: 'Degraded Performance', color: 'bg-yellow-500', icon: AlertTriangle },
  partial_outage: { label: 'Partial Outage', color: 'bg-orange-500', icon: AlertTriangle },
  major_outage: { label: 'Major Outage', color: 'bg-red-500', icon: XCircle },
  maintenance: { label: 'Under Maintenance', color: 'bg-blue-500', icon: Wrench },
};

const INCIDENT_STATUS: Record<string, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

export default function PublicStatus() {
  const [components, setComponents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'System Status | Church Management Pro';
    (async () => {
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from('status_components').select('*').eq('is_active', true).order('position'),
        supabase.from('status_incidents').select('*').order('started_at', { ascending: false }).limit(20),
      ]);
      setComponents(c || []);
      setIncidents(i || []);
      setLoading(false);
    })();
  }, []);

  const worst = components.reduce((acc, c) => {
    const order = ['operational', 'maintenance', 'degraded', 'partial_outage', 'major_outage'];
    return order.indexOf(c.status) > order.indexOf(acc) ? c.status : acc;
  }, 'operational');
  const overall = STATUS_META[worst] || STATUS_META.operational;
  const OverallIcon = overall.icon;
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            Church Management Pro
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/changelog" className="text-muted-foreground hover:text-foreground">Changelog</Link>
            <Link to="/commercial" className="text-muted-foreground hover:text-foreground">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className={`rounded-lg p-6 mb-8 flex items-center gap-4 ${worst === 'operational' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          <OverallIcon className={`h-10 w-10 ${worst === 'operational' ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <h1 className="text-2xl font-bold">
              {worst === 'operational' ? 'All Systems Operational' : overall.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time status of Church Management Pro services
            </p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle>Components</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : components.length === 0 ? (
              <p className="text-sm text-muted-foreground">No components configured yet.</p>
            ) : (
              components.map((c) => {
                const meta = STATUS_META[c.status] || STATUS_META.operational;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                      <span className="text-sm">{meta.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {activeIncidents.length > 0 && (
          <Card className="mb-8 border-yellow-500/50">
            <CardHeader><CardTitle>Active Incidents</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeIncidents.map((i) => (
                <div key={i.id} className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{INCIDENT_STATUS[i.status]}</Badge>
                    <Badge variant="secondary">{i.severity}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(i.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-medium">{i.title}</div>
                  {i.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Incident History</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past incidents reported.</p>
            ) : (
              incidents.map((i) => (
                <div key={i.id} className="pb-4 border-b last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={i.status === 'resolved' ? 'outline' : 'default'}>
                      {INCIDENT_STATUS[i.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(i.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-medium">{i.title}</div>
                  {i.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>}
                  {i.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved {new Date(i.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
