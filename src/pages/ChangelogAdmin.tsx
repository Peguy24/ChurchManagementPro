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
import { Trash2, Plus, Edit, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['feature', 'improvement', 'fix', 'security', 'announcement'];

export default function ChangelogAdmin() {
  const [entries, setEntries] = useState<any[]>([]);
  const [dialog, setDialog] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase
      .from('changelog_entries')
      .select('*')
      .order('created_at', { ascending: false });
    setEntries(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { id, title, body, category, is_published } = dialog;
    if (!title || !body) return toast.error('Title and body required');
    const payload: any = {
      title, body, category,
      is_published,
      published_at: is_published ? (dialog.published_at || new Date().toISOString()) : null,
    };
    const { error } = id
      ? await supabase.from('changelog_entries').update(payload).eq('id', id)
      : await supabase.from('changelog_entries').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setDialog(null);
    load();
  };

  const togglePublish = async (e: any) => {
    const is_published = !e.is_published;
    const { error } = await supabase.from('changelog_entries').update({
      is_published,
      published_at: is_published ? (e.published_at || new Date().toISOString()) : null,
    }).eq('id', e.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('changelog_entries').delete().eq('id', id);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Changelog</h1>
            <p className="text-muted-foreground">Public page: <a href="/changelog" target="_blank" className="underline">/changelog</a></p>
          </div>
          <Button onClick={() => setDialog({ title: '', body: '', category: 'improvement', is_published: false })}>
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>All Entries ({entries.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {entries.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            {entries.map((e) => (
              <div key={e.id} className="flex items-start justify-between border-b py-3 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{e.category}</Badge>
                    <Badge variant={e.is_published ? 'default' : 'secondary'}>
                      {e.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {e.published_at && <span className="text-xs text-muted-foreground">{new Date(e.published_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="font-medium">{e.title}</div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.body}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => togglePublish(e)} title={e.is_published ? 'Unpublish' : 'Publish'}>
                    {e.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDialog(e)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {dialog && (
        <Dialog open onOpenChange={() => setDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{dialog.id ? 'Edit' : 'New'} Changelog Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={dialog.title || ''} onChange={(e) => setDialog({ ...dialog, title: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={dialog.category} onValueChange={(v) => setDialog({ ...dialog, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Body (markdown/plain text)</Label>
                <Textarea rows={10} value={dialog.body || ''} onChange={(e) => setDialog({ ...dialog, body: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!dialog.is_published} onChange={(e) => setDialog({ ...dialog, is_published: e.target.checked })} />
                <Label>Publish immediately</Label>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
