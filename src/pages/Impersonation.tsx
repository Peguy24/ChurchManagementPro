import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { writeImpersonation, useImpersonation } from '@/hooks/useImpersonation';
import { logPlatformActivity } from '@/lib/activityLogger';
import { Eye, LogOut, ShieldAlert } from 'lucide-react';

export default function Impersonation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isImpersonating, impersonation, exit } = useImpersonation();
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ['impersonation-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: recentSessions = [] } = useQuery({
    queryKey: ['impersonation-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .select('id, tenant_id, super_admin_email, reason, started_at, ended_at')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.slug || '').toLowerCase().includes(search.toLowerCase()),
  );

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name || id.slice(0, 8);

  const startImpersonation = async () => {
    if (!selectedTenant || !reason.trim() || !user) {
      toast({ title: 'Missing information', description: 'Select a church and provide a reason.', variant: 'destructive' });
      return;
    }
    setStarting(true);
    try {
      const tenant = tenants.find((t) => t.id === selectedTenant);
      if (!tenant) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          super_admin_id: user.id,
          super_admin_email: user.email,
          tenant_id: selectedTenant,
          reason: reason.trim(),
        })
        .select('id')
        .single();

      if (error) throw error;

      writeImpersonation({
        sessionId: data.id,
        tenantId: selectedTenant,
        tenantName: tenant.name,
        superAdminId: user.id,
        startedAt: new Date().toISOString(),
      });

      await logPlatformActivity({
        eventType: 'admin_action',
        eventCategory: 'tenant',
        description: `Impersonation started for ${tenant.name}`,
        tenantId: selectedTenant,
        metadata: { reason: reason.trim(), session_id: data.id },
      });

      toast({ title: 'Impersonation started', description: `You are now viewing as ${tenant.name}.` });
      // Force reload so tenant-scoped hooks pick up the impersonation
      setTimeout(() => (window.location.href = '/'), 400);
    } catch (err: any) {
      toast({ title: 'Failed to start', description: err.message, variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6" /> Tenant Impersonation
          </h1>
          <p className="text-muted-foreground mt-1">
            View the platform as a specific church to reproduce issues. Every session is logged.
          </p>
        </div>

        {isImpersonating && impersonation && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" /> Active session
              </CardTitle>
              <CardDescription>
                Currently viewing as <strong>{impersonation.tenantName}</strong> since{' '}
                {new Date(impersonation.startedAt).toLocaleString()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => void exit()}>
                <LogOut className="mr-2 h-4 w-4" /> Exit impersonation
              </Button>
            </CardContent>
          </Card>
        )}

        {!isImpersonating && (
          <Card>
            <CardHeader>
              <CardTitle>Start a session</CardTitle>
              <CardDescription>
                Choose a church and provide a reason. This will be recorded in the audit log.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Search churches</Label>
                <Input
                  placeholder="Search by name or slug…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <Label>Church</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a church" />
                  </SelectTrigger>
                  <SelectContent>
                    {filtered.slice(0, 100).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.slug && <span className="text-muted-foreground">({t.slug})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason *</Label>
                <Textarea
                  placeholder="e.g. Investigating attendance import failure reported in ticket #123"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={startImpersonation} disabled={starting || !selectedTenant || !reason.trim()}>
                <Eye className="mr-2 h-4 w-4" />
                {starting ? 'Starting…' : 'Start impersonation'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Last 20 impersonation sessions across all admins.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSessions.length === 0 && (
                <p className="text-sm text-muted-foreground">No sessions yet.</p>
              )}
              {recentSessions.map((s: any) => (
                <div key={s.id} className="flex items-start justify-between gap-3 border rounded-md p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {tenantName(s.tenant_id)}{' '}
                      <Badge variant={s.ended_at ? 'secondary' : 'default'} className="ml-2">
                        {s.ended_at ? 'Ended' : 'Active'}
                      </Badge>
                    </p>
                    <p className="text-muted-foreground text-xs">{s.super_admin_email}</p>
                    {s.reason && <p className="text-xs mt-1">{s.reason}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    <div>{new Date(s.started_at).toLocaleString()}</div>
                    {s.ended_at && <div>→ {new Date(s.ended_at).toLocaleString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
