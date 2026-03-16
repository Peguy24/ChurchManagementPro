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
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Edit, Trash2, Calendar, Users, UserCheck } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface ServiceRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

interface VolunteerSchedule {
  id: string;
  service_role_id: string;
  member_id: string;
  service_date: string;
  status: string;
  notes: string | null;
  service_roles?: { name: string; color: string };
  members?: { first_name: string; last_name: string };
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
}

export default function VolunteerScheduling() {
  const { tenantId, forInsert } = useCurrentTenant();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  if (!planLoading && !hasFeature("volunteerScheduling")) {
    return (
      <Layout>
        <FeatureLockedCard featureName="Planification des bénévoles" featureDescription="Gérez les horaires et les rôles des bénévoles" requiredPlan="professionnel" icon={<Users className="w-8 h-8 text-muted-foreground" />} />
      </Layout>
    );
  }
  const dateLocale = language === 'fr' || language === 'ht' ? fr : enUS;

  const v = (key: string) => t(`volunteers.${key}`);

  const [roles, setRoles] = useState<ServiceRole[]>([]);
  const [schedules, setSchedules] = useState<VolunteerSchedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ServiceRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#3B82F6');

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (tenantId) fetchAll();
  }, [tenantId, currentWeek]);

  async function fetchAll() {
    setLoading(true);
    const [rolesRes, schedulesRes, membersRes] = await Promise.all([
      supabase.from('service_roles').select('*').eq('tenant_id', tenantId!).order('name'),
      supabase.from('volunteer_schedules').select('*, service_roles(name, color), members(first_name, last_name)')
        .eq('tenant_id', tenantId!)
        .gte('service_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('service_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('service_date'),
      supabase.from('members').select('id, first_name, last_name').eq('tenant_id', tenantId!).eq('status', 'active').order('first_name'),
    ]);

    if (rolesRes.data) setRoles(rolesRes.data);
    if (schedulesRes.data) setSchedules(schedulesRes.data as any);
    if (membersRes.data) setMembers(membersRes.data);
    setLoading(false);
  }

  async function saveRole() {
    if (!roleName.trim()) return;
    try {
      if (editingRole) {
        await supabase.from('service_roles').update({ name: roleName, description: roleDescription || null, color: roleColor }).eq('id', editingRole.id);
      } else {
        await supabase.from('service_roles').insert(forInsert({ name: roleName, description: roleDescription || null, color: roleColor }));
      }
      toast({ title: editingRole ? v('roleUpdated') : v('roleCreated') });
      resetRoleDialog();
      fetchAll();
    } catch (err) {
      toast({ title: v('error'), variant: 'destructive' });
    }
  }

  async function deleteRole(id: string) {
    await supabase.from('service_roles').delete().eq('id', id);
    toast({ title: v('roleDeleted') });
    fetchAll();
  }

  async function saveSchedule() {
    if (!selectedRoleId || !selectedMemberId || !selectedDate) return;
    try {
      await supabase.from('volunteer_schedules').insert(forInsert({
        service_role_id: selectedRoleId,
        member_id: selectedMemberId,
        service_date: selectedDate,
        notes: scheduleNotes || null,
      }));
      toast({ title: v('volunteerScheduled') });
      resetScheduleDialog();
      fetchAll();
    } catch (err) {
      toast({ title: v('error'), variant: 'destructive' });
    }
  }

  async function deleteSchedule(id: string) {
    await supabase.from('volunteer_schedules').delete().eq('id', id);
    toast({ title: v('scheduleDeleted') });
    fetchAll();
  }

  async function toggleStatus(schedule: VolunteerSchedule) {
    const newStatus = schedule.status === 'scheduled' ? 'confirmed' : schedule.status === 'confirmed' ? 'completed' : 'scheduled';
    await supabase.from('volunteer_schedules').update({ status: newStatus }).eq('id', schedule.id);
    fetchAll();
  }

  function resetRoleDialog() {
    setRoleDialogOpen(false);
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#3B82F6');
  }

  function resetScheduleDialog() {
    setScheduleDialogOpen(false);
    setSelectedRoleId('');
    setSelectedMemberId('');
    setSelectedDate('');
    setScheduleNotes('');
  }

  function openEditRole(role: ServiceRole) {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleColor(role.color);
    setRoleDialogOpen(true);
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-muted text-muted-foreground',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  const statusLabels: Record<string, string> = {
    scheduled: v('scheduled'),
    confirmed: v('confirmed'),
    completed: v('completed'),
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{v('title')}</h1>
            <p className="text-muted-foreground">{v('subtitle')}</p>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />{v('calendar')}</TabsTrigger>
            <TabsTrigger value="roles"><Users className="h-4 w-4 mr-2" />{v('serviceRoles')}</TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>← {v('previousWeek')}</Button>
              <h2 className="text-lg font-semibold">
                {format(weekStart, 'd MMM', { locale: dateLocale })} - {format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>{v('nextWeek')} →</Button>
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />{v('schedule')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{v('scheduleVolunteer')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{v('serviceRole')}</Label>
                        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                          <SelectTrigger><SelectValue placeholder={v('selectRole')} /></SelectTrigger>
                          <SelectContent>
                            {roles.filter(r => r.is_active).map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{v('member')}</Label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                          <SelectTrigger><SelectValue placeholder={v('selectMember')} /></SelectTrigger>
                          <SelectContent>
                            {members.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{v('serviceDate')}</Label>
                        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>{v('notes')}</Label>
                        <Textarea value={scheduleNotes} onChange={e => setScheduleNotes(e.target.value)} placeholder={v('notesPlaceholder')} />
                      </div>
                      <Button onClick={saveSchedule} className="w-full">{v('save')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Weekly grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const daySchedules = schedules.filter(s => s.service_date === dateStr);
                const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                return (
                  <Card key={dateStr} className={isToday ? 'border-primary' : ''}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm font-medium">
                        {format(day, 'EEE d', { locale: dateLocale })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-1">
                      {daySchedules.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">{v('none')}</p>
                      )}
                      {daySchedules.map(s => (
                        <div
                          key={s.id}
                          className="text-xs p-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleStatus(s)}
                        >
                          <div className="font-medium" style={{ color: (s as any).service_roles?.color }}>
                            {(s as any).service_roles?.name}
                          </div>
                          <div className="text-muted-foreground">
                            {(s as any).members?.first_name} {(s as any).members?.last_name}
                          </div>
                          <Badge variant="outline" className={`text-[10px] mt-1 ${statusColors[s.status]}`}>
                            {statusLabels[s.status] || s.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* List view */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{v('weekDetails')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{v('date')}</TableHead>
                      <TableHead>{v('role')}</TableHead>
                      <TableHead>{v('volunteer')}</TableHead>
                      <TableHead>{v('status')}</TableHead>
                      <TableHead>{v('notes')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{v('noScheduleThisWeek')}</TableCell></TableRow>
                    ) : schedules.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.service_date), 'd MMM yyyy', { locale: dateLocale })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ borderColor: (s as any).service_roles?.color, color: (s as any).service_roles?.color }}>
                            {(s as any).service_roles?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{(s as any).members?.first_name} {(s as any).members?.last_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[s.status]} onClick={() => toggleStatus(s)} style={{ cursor: 'pointer' }}>
                            {statusLabels[s.status] || s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.notes || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={roleDialogOpen} onOpenChange={(open) => { if (!open) resetRoleDialog(); else setRoleDialogOpen(true); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />{v('newRole')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRole ? v('editRole') : v('newServiceRole')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{v('roleName')}</Label>
                      <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder={v('roleNamePlaceholder')} />
                    </div>
                    <div>
                      <Label>{v('description')}</Label>
                      <Textarea value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder={v('descriptionPlaceholder')} />
                    </div>
                    <div>
                      <Label>{v('color')}</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)} className="w-16 h-10" />
                        <span className="text-sm text-muted-foreground">{roleColor}</span>
                      </div>
                    </div>
                    <Button onClick={saveRole} className="w-full">{editingRole ? v('edit') : v('create')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map(role => (
                <Card key={role.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
                        <div>
                          <h3 className="font-semibold text-foreground">{role.name}</h3>
                          {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditRole(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRole(role.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {roles.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{v('noRolesCreated')}</p>
                    <p className="text-sm">{v('noRolesHint')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
