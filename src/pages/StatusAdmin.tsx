import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

const COMPONENT_STATUSES = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'];
const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'];
const SEVERITIES = ['minor', 'major', 'critical', 'maintenance'];

export default function StatusAdmin() {
  const [components, setComponents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [compDialog, setCompDialog] = useState<any>(null);
  const [incDialog, setIncDialog] = useState<any>(null);

  const load = async () => {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('status_components').select('*').order('position'),
      supabase.from('status_incidents').select('*').order('started_at', { ascending: false }).limit(50),
    ]);
    setComponents(c || []);
    setIncidents(i || []);
  };

  useEffect(() => { load(); }, []);

  const saveComponent = async () => {
    const { id, name, description, status, position, is_active } = compDialog;
    const payload = { name, description, status, position: Number(position) || 0, is_active };
    const { error } = id
      ? await supabase.from('status_components').update(payload).eq('id', id)
      : await supabase.from('status_components').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setCompDialog(null);
    load();
  };

  const deleteComponent = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    const { error } = await supabase.from('status_components').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveIncident = async () => {
    const { id, title, body, status, severity, started_at, resolved_at } = incDialog;
    const payload: any = {
      title, body, status, severity,
      started_at: started_at || new Date().toISOString(),
      resolved_at: status === 'resolved' ? (resolved_at || new Date().toISOString()) : null,
    };
    const { error } = id
      ? await supabase.from('status_incidents').update(payload).eq('id', id)
      : await supabase.from('status_incidents').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setIncDialog(null);
    load();
  };

  const deleteIncident = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    const { error } = await supabase.from('status_incidents').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Status Page</h1>
            <p className="text-muted-foreground">Manage the public status page at <a href="/status" target="_blank" className="underline">/status</a></p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Components</CardTitle>
            <Button size="sm" onClick={() => setCompDialog({ name: '', status: 'operational', position: components.length + 1, is_active: true })}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {components.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="font-medium">{c.name} {!c.is_active && <Badge variant="outline" className="ml-2">Hidden</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{c.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setCompDialog(c)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteComponent(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Incidents</CardTitle>
            <Button size="sm" onClick={() => setIncDialog({ title: '', body: '', status: 'investigating', severity: 'minor', started_at: '', resolved_at: '' })}>
              <Plus className="h-4 w-4 mr-1" /> Report Incident
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents reported.</p>}
            {incidents.map((i) => (
              <div key={i.id} className="flex items-start justify-between border-b py-2 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{i.status}</Badge>
                    <Badge variant="outline">{i.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(i.started_at).toLocaleString()}</span>
                  </div>
                  <div className="font-medium">{i.title}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setIncDialog(i)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteIncident(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {compDialog && (
        <Dialog open onOpenChange={() => setCompDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{compDialog.id ? 'Edit' : 'New'} Component</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={compDialog.name || ''} onChange={(e) => setCompDialog({ ...compDialog, name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={compDialog.description || ''} onChange={(e) => setCompDialog({ ...compDialog, description: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={compDialog.status} onValueChange={(v) => setCompDialog({ ...compDialog, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPONENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Position</Label><Input type="number" value={compDialog.position || 0} onChange={(e) => setCompDialog({ ...compDialog, position: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={compDialog.is_active !== false} onChange={(e) => setCompDialog({ ...compDialog, is_active: e.target.checked })} />
                <Label>Show on public page</Label>
              </div>
            </div>
            <DialogFooter><Button onClick={saveComponent}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {incDialog && (
        <Dialog open onOpenChange={() => setIncDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{incDialog.id ? 'Edit' : 'New'} Incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={incDialog.title || ''} onChange={(e) => setIncDialog({ ...incDialog, title: e.target.value })} /></div>
              <div><Label>Details</Label><Textarea rows={5} value={incDialog.body || ''} onChange={(e) => setIncDialog({ ...incDialog, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <Select value={incDialog.status} onValueChange={(v) => setIncDialog({ ...incDialog, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Severity</Label>
                  <Select value={incDialog.severity} onValueChange={(v) => setIncDialog({ ...incDialog, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={saveIncident}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
