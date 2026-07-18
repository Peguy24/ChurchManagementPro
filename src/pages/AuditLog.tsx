import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, ChevronDown, ShieldCheck } from 'lucide-react';

function toCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DateRangeFilter({ start, end, onStart, onEnd }: any) {
  return (
    <>
      <div>
        <label className="text-xs font-medium mb-1 block">From</label>
        <Input type="date" value={start} onChange={(e) => onStart(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">To</label>
        <Input type="date" value={end} onChange={(e) => onEnd(e.target.value)} />
      </div>
    </>
  );
}

function PlatformActivityTab() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [category, setCategory] = useState('all');
  const [actor, setActor] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-platform', start, end, category, actor],
    queryFn: async () => {
      let q = supabase
        .from('platform_activity_logs')
        .select('id, event_type, event_category, description, user_email, tenant_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (start) q = q.gte('created_at', start);
      if (end) q = q.lte('created_at', new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString());
      if (category !== 'all') q = q.eq('event_category', category);
      if (actor) q = q.ilike('user_email', `%${actor}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const exportCsv = () => {
    const csv = toCSV(rows as any[], [
      { key: 'created_at', label: 'When' },
      { key: 'event_category', label: 'Category' },
      { key: 'event_type', label: 'Event' },
      { key: 'user_email', label: 'Actor' },
      { key: 'description', label: 'Description' },
      { key: 'metadata', label: 'Metadata' },
    ]);
    download(`platform-activity-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-5">
          <DateRangeFilter start={start} end={end} onStart={setStart} onEnd={setEnd} />
          <div>
            <label className="text-xs font-medium mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Actor email</label>
            <Input placeholder="email@…" value={actor} onChange={(e) => setActor(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No activity in range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <Collapsible key={r.id} asChild>
                    <>
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{r.event_category}</Badge></TableCell>
                        <TableCell className="text-xs font-mono">{r.event_type}</TableCell>
                        <TableCell className="text-xs">{r.user_email || '—'}</TableCell>
                        <TableCell className="text-sm">{r.description}</TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(r.metadata || {}, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialAuditTab() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [entity, setEntity] = useState('all');
  const [action, setAction] = useState('all');
  const [actor, setActor] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-financial', start, end, entity, action, actor],
    queryFn: async () => {
      let q = supabase
        .from('financial_audit_logs')
        .select('id, entity_type, entity_id, action, old_values, new_values, user_email, tenant_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (start) q = q.gte('created_at', start);
      if (end) q = q.lte('created_at', new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString());
      if (entity !== 'all') q = q.eq('entity_type', entity);
      if (action !== 'all') q = q.eq('action', action);
      if (actor) q = q.ilike('user_email', `%${actor}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const entityOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r: any) => s.add(r.entity_type));
    return Array.from(s).sort();
  }, [rows]);

  const exportCsv = () => {
    const csv = toCSV(rows as any[], [
      { key: 'created_at', label: 'When' },
      { key: 'entity_type', label: 'Entity' },
      { key: 'action', label: 'Action' },
      { key: 'user_email', label: 'Actor' },
      { key: 'old_values', label: 'Old' },
      { key: 'new_values', label: 'New' },
    ]);
    download(`financial-audit-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-6">
          <DateRangeFilter start={start} end={end} onStart={setStart} onEnd={setEnd} />
          <div>
            <label className="text-xs font-medium mb-1 block">Entity</label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Actor email</label>
            <Input placeholder="email@…" value={actor} onChange={(e) => setActor(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="w-full">
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No financial changes in range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <Collapsible key={r.id} asChild>
                    <>
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-mono">{r.entity_type}</TableCell>
                        <TableCell>
                          <Badge variant={r.action === 'delete' ? 'destructive' : r.action === 'create' ? 'default' : 'secondary'}>{r.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.user_email || '—'}</TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold mb-1">Before</p>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-background p-2 rounded border">
{r.old_values ? JSON.stringify(r.old_values, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold mb-1">After</p>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-background p-2 rounded border">
{r.new_values ? JSON.stringify(r.new_values, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLog() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Full accountability across platform activity and financial changes.
          </p>
        </div>

        <Tabs defaultValue="platform">
          <TabsList>
            <TabsTrigger value="platform">Platform activity</TabsTrigger>
            <TabsTrigger value="financial">Financial audit</TabsTrigger>
          </TabsList>
          <TabsContent value="platform" className="mt-4"><PlatformActivityTab /></TabsContent>
          <TabsContent value="financial" className="mt-4"><FinancialAuditTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
