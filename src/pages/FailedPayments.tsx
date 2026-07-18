import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Clock, Ban } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['pending', 'retrying', 'resolved', 'abandoned', 'manual_review'];

export default function FailedPayments() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('active');
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('failed_payments').select('*').order('created_at', { ascending: false }).limit(500);
    if (filter === 'active') q = q.in('status', ['pending', 'retrying', 'manual_review']);
    else if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setRows(data || []);
    // load tenant names
    const ids = Array.from(new Set((data || []).map((r) => r.tenant_id).filter(Boolean)));
    if (ids.length) {
      const { data: ts } = await supabase.from('tenants').select('id, name').in('id', ids);
      const map: Record<string, string> = {};
      (ts || []).forEach((t: any) => { map[t.id] = t.name; });
      setTenants(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === 'resolved') { patch.resolved_at = new Date().toISOString(); }
    if (notes) patch.notes = notes;
    const { error } = await supabase.from('failed_payments').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    setDetail(null);
    setNotes('');
    load();
  };

  const stats = {
    pending: rows.filter((r) => r.status === 'pending').length,
    retrying: rows.filter((r) => r.status === 'retrying').length,
    review: rows.filter((r) => r.status === 'manual_review').length,
    abandoned: rows.filter((r) => r.status === 'abandoned').length,
    totalAmount: rows.filter((r) => ['pending', 'retrying', 'manual_review'].includes(r.status))
      .reduce((s, r) => s + (Number(r.amount) || 0), 0),
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Failed Payment Dunning</h1>
          <p className="text-muted-foreground">Monitor and recover failed subscription payments</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Pending</div>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Retrying</div>
            <div className="text-2xl font-bold">{stats.retrying}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Review</div>
            <div className="text-2xl font-bold">{stats.review}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Ban className="h-4 w-4" />Abandoned</div>
            <div className="text-2xl font-bold">{stats.abandoned}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">At Risk Revenue</div>
            <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Failed Payments</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (unresolved)</SelectItem>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No failed payments — nice!
              </p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Church</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{tenants[r.tenant_id] || r.tenant_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.amount ? `${r.currency?.toUpperCase() || 'USD'} ${Number(r.amount).toFixed(2)}` : '—'}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={r.failure_reason}>{r.failure_reason || '—'}</TableCell>
                      <TableCell>{r.attempt_count}</TableCell>
                      <TableCell className="text-sm">{r.next_retry_at ? new Date(r.next_retry_at).toLocaleString() : '—'}</TableCell>
                      <TableCell><Badge variant={r.status === 'resolved' ? 'outline' : 'default'}>{r.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setDetail(r); setNotes(r.notes || ''); }}>Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {detail && (
        <Dialog open onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Payment Failure — {tenants[detail.tenant_id] || detail.tenant_id?.slice(0, 8)}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div><b>Invoice:</b> {detail.stripe_invoice_id || '—'}</div>
              <div><b>Customer:</b> {detail.stripe_customer_id || '—'}</div>
              <div><b>Amount:</b> {detail.amount ? `${detail.currency?.toUpperCase() || 'USD'} ${Number(detail.amount).toFixed(2)}` : '—'}</div>
              <div><b>Reason:</b> {detail.failure_reason || '—'}</div>
              <div><b>Code:</b> {detail.failure_code || '—'}</div>
              <div><b>Attempts:</b> {detail.attempt_count}</div>
              <div><b>Created:</b> {new Date(detail.created_at).toLocaleString()}</div>
              <div>
                <b>Notes:</b>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1" placeholder="Internal notes…" />
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => updateStatus(detail.id, 'retrying')}>Mark Retrying</Button>
              <Button variant="outline" onClick={() => updateStatus(detail.id, 'manual_review')}>Manual Review</Button>
              <Button variant="destructive" onClick={() => updateStatus(detail.id, 'abandoned')}>Abandon</Button>
              <Button onClick={() => updateStatus(detail.id, 'resolved')}>Mark Resolved</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
