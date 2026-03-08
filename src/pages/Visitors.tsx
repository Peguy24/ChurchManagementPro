import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserPlus, Phone, Mail, Calendar, ArrowRight, CheckCircle, Clock, Eye, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Visitor {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  visit_date: string;
  how_heard: string | null;
  notes: string | null;
  follow_up_status: string;
  assigned_to: string | null;
  converted_to_member_id: string | null;
  members?: { first_name: string; last_name: string } | null;
}

interface FollowUp {
  id: string;
  visitor_id: string;
  follow_up_date: string;
  follow_up_type: string;
  notes: string | null;
  is_completed: boolean;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
}

export default function Visitors() {
  const { tenantId, forInsert } = useCurrentTenant();
  const { toast } = useToast();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [filter, setFilter] = useState('all');

  // Visitor dialog
  const [visitorDialogOpen, setVisitorDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visitDate, setVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [howHeard, setHowHeard] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');

  // Follow-up dialog
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [followUpType, setFollowUpType] = useState('call');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    if (tenantId) fetchAll();
  }, [tenantId]);

  async function fetchAll() {
    setLoading(true);
    const [visitorsRes, membersRes] = await Promise.all([
      supabase.from('visitors').select('*, members!visitors_assigned_to_fkey(first_name, last_name)')
        .eq('tenant_id', tenantId!)
        .order('visit_date', { ascending: false }),
      supabase.from('members').select('id, first_name, last_name').eq('tenant_id', tenantId!).eq('status', 'active').order('first_name'),
    ]);

    if (visitorsRes.data) setVisitors(visitorsRes.data as any);
    if (membersRes.data) setMembers(membersRes.data);
    setLoading(false);
  }

  async function fetchFollowUps(visitorId: string) {
    const { data } = await supabase.from('visitor_follow_ups').select('*')
      .eq('visitor_id', visitorId)
      .order('follow_up_date', { ascending: false });
    if (data) setFollowUps(data);
  }

  async function saveVisitor() {
    if (!firstName.trim() || !lastName.trim()) return;
    try {
      await supabase.from('visitors').insert(forInsert({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        email: email || null,
        visit_date: visitDate,
        how_heard: howHeard || null,
        notes: visitorNotes || null,
      }));
      toast({ title: 'Visiteur ajouté' });
      resetVisitorDialog();
      fetchAll();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  }

  async function updateStatus(visitor: Visitor, newStatus: string) {
    await supabase.from('visitors').update({ follow_up_status: newStatus }).eq('id', visitor.id);
    toast({ title: 'Statut mis à jour' });
    fetchAll();
  }

  async function assignMember(visitorId: string, memberId: string) {
    await supabase.from('visitors').update({ assigned_to: memberId }).eq('id', visitorId);
    toast({ title: 'Responsable assigné' });
    fetchAll();
  }

  async function deleteVisitor(id: string) {
    await supabase.from('visitors').delete().eq('id', id);
    toast({ title: 'Visiteur supprimé' });
    if (selectedVisitor?.id === id) setSelectedVisitor(null);
    fetchAll();
  }

  async function saveFollowUp() {
    if (!selectedVisitor) return;
    try {
      await supabase.from('visitor_follow_ups').insert(forInsert({
        visitor_id: selectedVisitor.id,
        follow_up_date: followUpDate,
        follow_up_type: followUpType,
        notes: followUpNotes || null,
      }));
      // Update visitor status
      if (selectedVisitor.follow_up_status === 'new') {
        await supabase.from('visitors').update({ follow_up_status: 'contacted' }).eq('id', selectedVisitor.id);
      }
      toast({ title: 'Suivi enregistré' });
      setFollowUpDialogOpen(false);
      setFollowUpNotes('');
      fetchFollowUps(selectedVisitor.id);
      fetchAll();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  }

  async function toggleFollowUpComplete(fu: FollowUp) {
    await supabase.from('visitor_follow_ups').update({ is_completed: !fu.is_completed }).eq('id', fu.id);
    if (selectedVisitor) fetchFollowUps(selectedVisitor.id);
  }

  function resetVisitorDialog() {
    setVisitorDialogOpen(false);
    setFirstName(''); setLastName(''); setPhone(''); setEmail('');
    setVisitDate(format(new Date(), 'yyyy-MM-dd'));
    setHowHeard(''); setVisitorNotes('');
  }

  function openVisitorDetails(visitor: Visitor) {
    setSelectedVisitor(visitor);
    fetchFollowUps(visitor.id);
  }

  const filteredVisitors = filter === 'all' ? visitors : visitors.filter(v => v.follow_up_status === filter);

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    new: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: UserPlus },
    contacted: { label: 'Contacté', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Phone },
    follow_up: { label: 'En suivi', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: Clock },
    interested: { label: 'Intéressé', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
    converted: { label: 'Converti (membre)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: ArrowRight },
    inactive: { label: 'Inactif', color: 'bg-muted text-muted-foreground', icon: Clock },
  };

  const howHeardOptions = ['Ami/Famille', 'Réseaux sociaux', 'Site web', 'Événement', 'Publicité', 'Passage', 'Autre'];
  const followUpTypes: Record<string, string> = { call: 'Appel', visit: 'Visite', email: 'Email', sms: 'SMS', meeting: 'Rencontre' };

  // Stats
  const stats = {
    total: visitors.length,
    new: visitors.filter(v => v.follow_up_status === 'new').length,
    contacted: visitors.filter(v => v.follow_up_status === 'contacted').length,
    converted: visitors.filter(v => v.follow_up_status === 'converted').length,
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion des Visiteurs</h1>
            <p className="text-muted-foreground">Suivez les visiteurs et gérez le pipeline de conversion</p>
          </div>
          <Dialog open={visitorDialogOpen} onOpenChange={setVisitorDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau visiteur</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer un visiteur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Prénom</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                  <div><Label>Nom</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                </div>
                <div><Label>Date de visite</Label><Input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} /></div>
                <div>
                  <Label>Comment nous avez-vous connu ?</Label>
                  <Select value={howHeard} onValueChange={setHowHeard}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {howHeardOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Textarea value={visitorNotes} onChange={e => setVisitorNotes(e.target.value)} /></div>
                <Button onClick={saveVisitor} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-sm text-muted-foreground">Total visiteurs</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.new}</p><p className="text-sm text-muted-foreground">Nouveaux</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p><p className="text-sm text-muted-foreground">Contactés</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.converted}</p><p className="text-sm text-muted-foreground">Convertis</p></CardContent></Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'all', label: 'Tous' }, ...Object.entries(statusConfig).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
            <Button key={f.key} variant={filter === f.key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visitors List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visiteur</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date de visite</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun visiteur trouvé</TableCell></TableRow>
                    ) : filteredVisitors.map(v => {
                      const sc = statusConfig[v.follow_up_status] || statusConfig.new;
                      return (
                        <TableRow key={v.id} className={selectedVisitor?.id === v.id ? 'bg-muted/50' : ''}>
                          <TableCell className="font-medium">{v.first_name} {v.last_name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {v.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{v.phone}</div>}
                              {v.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{v.email}</div>}
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(v.visit_date), 'd MMM yyyy', { locale: fr })}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={v.assigned_to || ''} onValueChange={(val) => assignMember(v.id, val)}>
                              <SelectTrigger className="h-8 text-xs w-32">
                                <SelectValue placeholder="Assigner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openVisitorDetails(v)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteVisitor(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
          <div>
            {selectedVisitor ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedVisitor.first_name} {selectedVisitor.last_name}</span>
                    <Badge variant="outline" className={statusConfig[selectedVisitor.follow_up_status]?.color}>
                      {statusConfig[selectedVisitor.follow_up_status]?.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVisitor.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedVisitor.phone}</div>}
                  {selectedVisitor.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedVisitor.email}</div>}
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />Visite : {format(new Date(selectedVisitor.visit_date), 'd MMMM yyyy', { locale: fr })}</div>
                  {selectedVisitor.how_heard && <div className="text-sm text-muted-foreground">Source : {selectedVisitor.how_heard}</div>}
                  {selectedVisitor.notes && <div className="text-sm bg-muted p-2 rounded">{selectedVisitor.notes}</div>}

                  {/* Status update */}
                  <div>
                    <Label className="text-xs">Changer le statut</Label>
                    <Select value={selectedVisitor.follow_up_status} onValueChange={(val) => updateStatus(selectedVisitor, val)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Follow-ups */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Historique de suivi</h4>
                      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Suivi</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Ajouter un suivi</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div><Label>Date</Label><Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></div>
                            <div>
                              <Label>Type</Label>
                              <Select value={followUpType} onValueChange={setFollowUpType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(followUpTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Notes</Label><Textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} /></div>
                            <Button onClick={saveFollowUp} className="w-full">Enregistrer</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {followUps.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun suivi enregistré</p>
                      ) : followUps.map(fu => (
                        <div key={fu.id} className="flex items-start gap-2 text-xs border rounded p-2">
                          <button onClick={() => toggleFollowUpComplete(fu)} className="mt-0.5">
                            {fu.is_completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <div className={fu.is_completed ? 'opacity-60' : ''}>
                            <div className="font-medium">{followUpTypes[fu.follow_up_type] || fu.follow_up_type} — {format(new Date(fu.follow_up_date), 'd MMM yyyy', { locale: fr })}</div>
                            {fu.notes && <div className="text-muted-foreground">{fu.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez un visiteur pour voir les détails</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
