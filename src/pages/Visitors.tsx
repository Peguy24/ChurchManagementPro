import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, UserPlus, Phone, Mail, Calendar, ArrowRight, CheckCircle, Clock, Eye, Trash2, MessageSquare, Download, Search, X } from 'lucide-react';
import { exportToCsv, type CsvColumn, formatDateForCsv } from '@/lib/csvExport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { validateForm, visitorSchema, firstErrorMessage, personNameSchema, optionalPhoneSchema, optionalEmailSchema, longTextSchema } from '@/lib/validation';

const liveCheck = (schema: { safeParse: (v: unknown) => any }, value: string): string | null => {
  const r = schema.safeParse(value);
  if (r.success) return null;
  return r.error?.issues?.[0]?.message ?? null;
};
import { FieldError } from '@/components/FieldError';

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
  const { t } = useLanguage();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [filter, setFilter] = useState('all');

  const [visitorDialogOpen, setVisitorDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visitDate, setVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [howHeard, setHowHeard] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const validation = validateForm(visitorSchema, {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      notes: visitorNotes,
    });
    if (!validation.success) {
      setErrors({
        firstName: validation.fieldErrors.firstName || '',
        lastName: validation.fieldErrors.lastName || '',
        email: validation.fieldErrors.email || '',
        phone: validation.fieldErrors.phone || '',
        notes: validation.fieldErrors.notes || '',
      });
      toast({ title: t('visitors.error'), description: firstErrorMessage(validation.fieldErrors, t), variant: 'destructive' });
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    if (visitDate && visitDate > today) {
      setErrors(p => ({ ...p, visitDate: t('validation.date.notInFuture') }));
      toast({ title: t('visitors.error'), description: t('validation.date.notInFuture'), variant: 'destructive' });
      return;
    }
    setErrors({});
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
      toast({ title: t('visitors.visitorAdded') });
      resetVisitorDialog();
      fetchAll();
    } catch {
      toast({ title: t('visitors.error'), variant: 'destructive' });
    }
  }

  async function updateStatus(visitor: Visitor, newStatus: string) {
    await supabase.from('visitors').update({ follow_up_status: newStatus }).eq('id', visitor.id);
    toast({ title: t('visitors.statusUpdated') });
    fetchAll();
  }

  async function assignMember(visitorId: string, memberId: string) {
    await supabase.from('visitors').update({ assigned_to: memberId }).eq('id', visitorId);
    toast({ title: t('visitors.assignedUpdated') });
    fetchAll();
  }

  async function deleteVisitor(id: string) {
    await supabase.from('visitors').delete().eq('id', id);
    toast({ title: t('visitors.visitorDeleted') });
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
      if (selectedVisitor.follow_up_status === 'new') {
        await supabase.from('visitors').update({ follow_up_status: 'contacted' }).eq('id', selectedVisitor.id);
      }
      toast({ title: t('visitors.followUpSaved') });
      setFollowUpDialogOpen(false);
      setFollowUpNotes('');
      fetchFollowUps(selectedVisitor.id);
      fetchAll();
    } catch {
      toast({ title: t('visitors.error'), variant: 'destructive' });
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
    new: { label: t('visitors.statusNew'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: UserPlus },
    contacted: { label: t('visitors.statusContacted'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Phone },
    follow_up: { label: t('visitors.statusFollowUp'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: Clock },
    interested: { label: t('visitors.statusInterested'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
    converted: { label: t('visitors.statusConverted'), color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: ArrowRight },
    inactive: { label: t('visitors.statusInactive'), color: 'bg-muted text-muted-foreground', icon: Clock },
  };

  const howHeardOptions = [
    { value: 'Ami/Famille', label: t('visitors.howHeardFriend') },
    { value: 'Réseaux sociaux', label: t('visitors.howHeardSocial') },
    { value: 'Site web', label: t('visitors.howHeardWebsite') },
    { value: 'Événement', label: t('visitors.howHeardEvent') },
    { value: 'Publicité', label: t('visitors.howHeardAd') },
    { value: 'Passage', label: t('visitors.howHeardWalkIn') },
    { value: 'Autre', label: t('visitors.howHeardOther') },
  ];

  const followUpTypes: Record<string, string> = {
    call: t('visitors.followUpCall'),
    visit: t('visitors.followUpVisit'),
    email: t('visitors.followUpEmail'),
    sms: t('visitors.followUpSMS'),
    meeting: t('visitors.followUpMeeting'),
  };

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('visitors.title')}</h1>
            <p className="text-muted-foreground">{t('visitors.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const columns: CsvColumn<Visitor>[] = [
                { key: 'first_name', header: t('visitors.firstName') },
                { key: 'last_name', header: t('visitors.lastName') },
                { key: 'phone', header: t('visitors.phone') },
                { key: 'email', header: t('visitors.email') },
                { key: 'visit_date', header: t('visitors.visitDate'), formatter: (v) => formatDateForCsv(v) },
                { key: 'how_heard', header: t('visitors.howHeard') },
                { key: 'follow_up_status', header: t('visitors.status') },
                { key: 'notes', header: t('visitors.notes') },
              ];
              exportToCsv(filteredVisitors, columns, `visitors-${format(new Date(), 'yyyy-MM-dd')}`);
            }}>
              <Download className="h-4 w-4 mr-2" />{t('common.export')}
            </Button>
            <Dialog open={visitorDialogOpen} onOpenChange={setVisitorDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />{t('visitors.newVisitor')}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('visitors.registerVisitor')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('visitors.firstName')}</Label>
                    <Input
                      maxLength={100}
                      value={firstName}
                      aria-invalid={!!errors.firstName}
                      className={errors.firstName ? 'border-destructive' : ''}
                      onChange={e => {
                        const v = e.target.value.slice(0, 100);
                        setFirstName(v);
                        setErrors(p => ({ ...p, firstName: liveCheck(personNameSchema, v) ?? '' }));
                      }}
                    />
                    <FieldError name="firstName" errors={errors} />
                  </div>
                  <div>
                    <Label>{t('visitors.lastName')}</Label>
                    <Input
                      maxLength={100}
                      value={lastName}
                      aria-invalid={!!errors.lastName}
                      className={errors.lastName ? 'border-destructive' : ''}
                      onChange={e => {
                        const v = e.target.value.slice(0, 100);
                        setLastName(v);
                        setErrors(p => ({ ...p, lastName: liveCheck(personNameSchema, v) ?? '' }));
                      }}
                    />
                    <FieldError name="lastName" errors={errors} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('visitors.phone')}</Label>
                    <Input
                      inputMode="tel"
                      maxLength={20}
                      value={phone}
                      aria-invalid={!!errors.phone}
                      className={errors.phone ? 'border-destructive' : ''}
                      onChange={e => {
                        const v = e.target.value.replace(/[^+\d()\-\s]/g, '').slice(0, 20);
                        setPhone(v);
                        const err = v.trim().length === 0 ? '' : (liveCheck(optionalPhoneSchema, v) ?? '');
                        setErrors(p => ({ ...p, phone: err }));
                      }}
                    />
                    <FieldError name="phone" errors={errors} />
                  </div>
                  <div>
                    <Label>{t('visitors.email')}</Label>
                    <Input
                      type="email"
                      maxLength={255}
                      value={email}
                      aria-invalid={!!errors.email}
                      className={errors.email ? 'border-destructive' : ''}
                      onChange={e => {
                        const v = e.target.value.slice(0, 255);
                        setEmail(v);
                        const err = v.trim().length === 0 ? '' : (liveCheck(optionalEmailSchema, v) ?? '');
                        setErrors(p => ({ ...p, email: err }));
                      }}
                    />
                    <FieldError name="email" errors={errors} />
                  </div>
                </div>
                <div>
                  <Label>{t('visitors.visitDate')}</Label>
                  <Input
                    type="date"
                    value={visitDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    aria-invalid={!!errors.visitDate}
                    className={errors.visitDate ? 'border-destructive' : ''}
                    onChange={e => {
                      const v = e.target.value;
                      setVisitDate(v);
                      const today = format(new Date(), 'yyyy-MM-dd');
                      setErrors(p => ({ ...p, visitDate: v && v > today ? t('validation.date.notInFuture') : '' }));
                    }}
                  />
                  <FieldError name="visitDate" errors={errors} />
                </div>
                <div>
                  <Label>{t('visitors.howHeard')}</Label>
                  <Select value={howHeard} onValueChange={setHowHeard}>
                    <SelectTrigger><SelectValue placeholder={t('visitors.selectOption')} /></SelectTrigger>
                    <SelectContent>
                      {howHeardOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('visitors.notes')}</Label>
                  <Textarea
                    maxLength={2000}
                    value={visitorNotes}
                    aria-invalid={!!errors.notes}
                    className={errors.notes ? 'border-destructive' : ''}
                    onChange={e => {
                      const v = e.target.value.slice(0, 2000);
                      setVisitorNotes(v);
                      const err = v.trim().length === 0 ? '' : (liveCheck(longTextSchema, v) ?? '');
                      setErrors(p => ({ ...p, notes: err }));
                    }}
                  />
                  <div className="text-xs text-muted-foreground text-right">{visitorNotes.length}/2000</div>
                  <FieldError name="notes" errors={errors} />
                </div>
                <Button onClick={saveVisitor} className="w-full">{t('visitors.save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-sm text-muted-foreground">{t('visitors.totalVisitors')}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.new}</p><p className="text-sm text-muted-foreground">{t('visitors.newOnes')}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p><p className="text-sm text-muted-foreground">{t('visitors.contacted')}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.converted}</p><p className="text-sm text-muted-foreground">{t('visitors.converted')}</p></CardContent></Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'all', label: t('visitors.all') }, ...Object.entries(statusConfig).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
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
                      <TableHead>{t('visitors.visitor')}</TableHead>
                      <TableHead>{t('visitors.contact')}</TableHead>
                      <TableHead>{t('visitors.visitDate')}</TableHead>
                      <TableHead>{t('visitors.status')}</TableHead>
                      <TableHead>{t('visitors.responsible')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('visitors.noVisitorFound')}</TableCell></TableRow>
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
                                <SelectValue placeholder={t('visitors.assign')} />
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
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />{t('visitors.visit')}{format(new Date(selectedVisitor.visit_date), 'd MMMM yyyy', { locale: fr })}</div>
                  {selectedVisitor.how_heard && <div className="text-sm text-muted-foreground">{t('visitors.source')}{selectedVisitor.how_heard}</div>}
                  {selectedVisitor.notes && <div className="text-sm bg-muted p-2 rounded">{selectedVisitor.notes}</div>}

                  {/* Status update */}
                  <div>
                    <Label className="text-xs">{t('visitors.changeStatus')}</Label>
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
                      <h4 className="font-semibold text-sm">{t('visitors.followUpHistory')}</h4>
                      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />{t('visitors.addFollowUp')}</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>{t('visitors.addFollowUpTitle')}</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div><Label>{t('visitors.date')}</Label><Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></div>
                            <div>
                              <Label>{t('visitors.type')}</Label>
                              <Select value={followUpType} onValueChange={setFollowUpType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(followUpTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>{t('visitors.notes')}</Label><Textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} /></div>
                            <Button onClick={saveFollowUp} className="w-full">{t('visitors.save')}</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {followUps.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">{t('visitors.noFollowUp')}</p>
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
                  <p>{t('visitors.selectVisitorDetails')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
