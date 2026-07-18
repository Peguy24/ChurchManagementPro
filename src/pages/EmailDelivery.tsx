import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, CheckCircle2, XCircle, Ban } from 'lucide-react';

type RangeKey = '24h' | '7d' | '30d' | 'custom';

function rangeToStart(range: RangeKey, customStart: string): Date {
  const now = new Date();
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

export default function EmailDelivery() {
  const [range, setRange] = useState<RangeKey>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const start = rangeToStart(range, customStart);
  const end = range === 'custom' && customEnd ? new Date(customEnd) : new Date();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['email-delivery', range, customStart, customEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

  // Dedupe by message_id (keep latest per message_id)
  const deduped = useMemo(() => {
    const seen = new Map<string, any>();
    for (const r of rows) {
      const key = r.message_id || `no-id-${r.id}`;
      if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
  }, [rows]);

  const templateOptions = useMemo(() => {
    const s = new Set<string>();
    deduped.forEach((r: any) => r.template_name && s.add(r.template_name));
    return Array.from(s).sort();
  }, [deduped]);

  const filtered = useMemo(() => {
    return deduped.filter((r: any) => {
      if (templateFilter !== 'all' && r.template_name !== templateFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'sent' && r.status !== 'sent') return false;
        if (statusFilter === 'failed' && r.status !== 'dlq' && r.status !== 'failed' && r.status !== 'bounced') return false;
        if (statusFilter === 'suppressed' && r.status !== 'suppressed' && r.status !== 'complained') return false;
      }
      return true;
    });
  }, [deduped, templateFilter, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: deduped.length, sent: 0, failed: 0, suppressed: 0 };
    for (const r of deduped as any[]) {
      if (r.status === 'sent') s.sent++;
      else if (r.status === 'dlq' || r.status === 'failed' || r.status === 'bounced') s.failed++;
      else if (r.status === 'suppressed' || r.status === 'complained') s.suppressed++;
    }
    return s;
  }, [deduped]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const statusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-green-500 hover:bg-green-600">Sent</Badge>;
    if (status === 'dlq' || status === 'failed' || status === 'bounced')
      return <Badge variant="destructive">{status === 'dlq' ? 'Failed' : status}</Badge>;
    if (status === 'suppressed' || status === 'complained')
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Suppressed</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Email Delivery
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor delivery of every email sent by the platform. Deduplicated by message.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Time range</label>
              <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {range === 'custom' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block">Start</label>
                  <Input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">End</label>
                  <Input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">Template</label>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {templateOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="suppressed">Suppressed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Sent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.sent}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="h-4 w-4 text-destructive" /> Failed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{stats.failed}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Ban className="h-4 w-4 text-yellow-500" /> Suppressed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{stats.suppressed}</div></CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>Delivery log</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No emails in this range.</TableCell></TableRow>
                      )}
                      {paged.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.template_name || '—'}</TableCell>
                          <TableCell className="text-sm">{r.recipient_email}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-xs truncate" title={r.error_message || ''}>{r.error_message || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({filtered.length} results)</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                      <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
