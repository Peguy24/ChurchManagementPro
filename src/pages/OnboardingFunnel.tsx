import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown } from 'lucide-react';

type FunnelRow = { key: string; label: string; count: number };

export default function OnboardingFunnel() {
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stragglers, setStragglers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_onboarding_funnel');
      if (error) { console.error(error); setLoading(false); return; }
      const f = (data as any[])?.[0];
      if (f) {
        setTotal(Number(f.total_tenants) || 0);
        setRows([
          { key: 'profile', label: '1. Profile completed', count: Number(f.step_profile) },
          { key: 'logo', label: '2. Logo uploaded', count: Number(f.step_logo) },
          { key: 'branch', label: '3. First branch created', count: Number(f.step_branch) },
          { key: 'member', label: '4. First member added', count: Number(f.step_member) },
          { key: 'event', label: '5. First event created', count: Number(f.step_event) },
          { key: 'donation', label: '6. First donation recorded', count: Number(f.step_donation) },
          { key: 'invite', label: '7. Admin invited', count: Number(f.step_invite) },
        ]);
      }
      // Load tenants stuck (created > 3 days ago, missing key milestones)
      const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: st } = await supabase
        .from('tenants')
        .select('id, name, created_at, tenant_onboarding_progress(step_profile_completed, step_first_member_added, step_first_event_created, step_first_donation_recorded)')
        .lt('created_at', threshold)
        .order('created_at', { ascending: false })
        .limit(50);
      setStragglers((st || []).filter((t: any) => {
        const p = t.tenant_onboarding_progress?.[0] || t.tenant_onboarding_progress || {};
        return !p.step_first_member_added || !p.step_first_donation_recorded;
      }));
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Funnel</h1>
          <p className="text-muted-foreground">Where new churches drop off during setup</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Completion Funnel — {total} tenants</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="space-y-3">
                {rows.map((r, idx) => {
                  const pct = total > 0 ? (r.count / total) * 100 : 0;
                  const prev = idx > 0 ? rows[idx - 1].count : total;
                  const drop = prev > 0 ? Math.max(0, prev - r.count) : 0;
                  const dropPct = prev > 0 ? (drop / prev) * 100 : 0;
                  return (
                    <div key={r.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{r.label}</span>
                        <span className="tabular-nums">
                          <b>{r.count}</b> <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
                          {idx > 0 && drop > 0 && (
                            <span className="ml-2 text-xs text-destructive inline-flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />-{drop} ({dropPct.toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stalled Tenants ({stragglers.length})</CardTitle>
            <p className="text-sm text-muted-foreground">Registered &gt; 3 days ago, missing member or donation setup</p>
          </CardHeader>
          <CardContent>
            {stragglers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stalled tenants — everyone is progressing well.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Church</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Donations</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stragglers.map((t) => {
                    const p = t.tenant_onboarding_progress?.[0] || t.tenant_onboarding_progress || {};
                    const dot = (v: boolean) => <span className={`inline-block h-2 w-2 rounded-full ${v ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{dot(p.step_profile_completed)}</TableCell>
                        <TableCell>{dot(p.step_first_member_added)}</TableCell>
                        <TableCell>{dot(p.step_first_event_created)}</TableCell>
                        <TableCell>{dot(p.step_first_donation_recorded)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
