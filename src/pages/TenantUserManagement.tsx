import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Check, X, UserPlus, Crown, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import TenantRolePermissionsManager from '@/components/TenantRolePermissionsManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface TenantUser {
  id: string;
  user_id: string;
  role: string;
  is_approved: boolean;
  created_at: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  user_email: string;
}

export default function TenantUserManagement() {
  const { user } = useAuth();
  const { tenantId, tenant } = useCurrentTenant();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [sendingInvite, setSendingInvite] = useState(false);

  const dateLocale = language === 'fr' ? fr : language === 'ht' ? fr : enUS;

  const ROLE_LABELS: Record<string, string> = {
    admin: t('tenant.roleAdmin'),
    pastor: t('tenant.rolePastor'),
    treasurer: t('tenant.roleTreasurer'),
    secretary: t('tenant.roleSecretary'),
    volunteer: t('tenant.roleVolunteer'),
    user: t('tenant.roleUser'),
  };

  useEffect(() => {
    if (tenantId) {
      fetchTenantUsers();
    }
  }, [tenantId]);

  async function fetchTenantUsers() {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data: tenantRoles, error } = await supabase
        .from('tenant_user_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each user
      const usersWithProfiles = await Promise.all(
        (tenantRoles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', role.user_id)
            .single();

          return {
            ...role,
            profile,
            user_email: `user-${role.user_id.slice(0, 8)}`,
          };
        })
      );

      setUsers(usersWithProfiles);
    } catch (err) {
      console.error('Error fetching tenant users:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    try {
      const { error } = await supabase
        .from('tenant_user_roles')
        .update({ is_approved: true })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: t('tenant.userApproved'),
        description: t('tenant.userCanAccess'),
      });
      
      fetchTenantUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.approveError'),
        variant: 'destructive',
      });
    }
  }

  async function handleReject(userId: string) {
    try {
      const { error } = await supabase
        .from('tenant_user_roles')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: t('tenant.userRejected'),
        description: t('tenant.userRemoved'),
      });
      
      fetchTenantUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.rejectError'),
        variant: 'destructive',
      });
    }
  }

  async function handleUpdateRole() {
    if (!editingUser || !selectedRole) return;

    try {
      const { error } = await supabase
        .from('tenant_user_roles')
        .update({ role: selectedRole as 'admin' | 'pastor' | 'treasurer' | 'secretary' | 'volunteer' | 'user' })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: t('tenant.roleUpdated'),
        description: `${t('tenant.roleChangedTo')} ${ROLE_LABELS[selectedRole]}`,
      });
      
      setEditingUser(null);
      fetchTenantUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.updateRoleError'),
        variant: 'destructive',
      });
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail || !tenantId || !tenant) return;

    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: inviteEmail,
          tenantId: tenantId,
          tenantName: tenant.name,
          role: inviteRole,
          inviterName: user?.email,
        },
      });

      if (error) throw error;

      toast({
        title: t('tenant.invitationSent'),
        description: `${t('tenant.invitationSentTo')} ${inviteEmail}`,
      });
      
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
    } catch (err) {
      console.error('Error sending invite:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.inviteError'),
        variant: 'destructive',
      });
    } finally {
      setSendingInvite(false);
    }
  }

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('tenant.userManagementTitle')}</h1>
            <p className="text-muted-foreground">
              {t('tenant.userManagementSubtitle')}
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            {t('tenant.inviteUser')}
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('tenant.usersTab')}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('tenant.permissionsTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {pendingUsers.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <UserPlus className="h-5 w-5" />
                    {t('tenant.pendingRequests')} ({pendingUsers.length})
                  </CardTitle>
                  <CardDescription>
                    {t('tenant.pendingRequestsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('tenant.requestedRole')}</TableHead>
                        <TableHead>{t('tenant.registrationDate')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((pendingUser) => (
                        <TableRow key={pendingUser.id}>
                          <TableCell className="font-medium">
                            {pendingUser.profile?.first_name} {pendingUser.profile?.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ROLE_LABELS[pendingUser.role]}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(pendingUser.created_at), 'PP', { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(pendingUser.user_id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {t('tenant.approve')}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(pendingUser.user_id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t('tenant.reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('tenant.activeUsers')} ({approvedUsers.length})
                </CardTitle>
                <CardDescription>
                  {t('tenant.activeUsersDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : approvedUsers.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {t('tenant.noActiveUsers')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('tenant.role')}</TableHead>
                        <TableHead>{t('tenant.registrationDate')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedUsers.map((approvedUser) => (
                        <TableRow key={approvedUser.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {approvedUser.profile?.first_name} {approvedUser.profile?.last_name}
                              {approvedUser.role === 'admin' && (
                                <Crown className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={approvedUser.role === 'admin' ? 'default' : 'secondary'}
                            >
                              {ROLE_LABELS[approvedUser.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(approvedUser.created_at), 'PP', { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(approvedUser);
                                setSelectedRole(approvedUser.role);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              {t('tenant.modifyRole')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <TenantRolePermissionsManager />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tenant.modifyRole')}</DialogTitle>
            <DialogDescription>
              {t('tenant.changeRoleFor')} {editingUser?.profile?.first_name} {editingUser?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder={t('tenant.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateRole}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('tenant.inviteUser')}
            </DialogTitle>
            <DialogDescription>
              {t('tenant.inviteUserDesc')} {tenant?.name || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('tenant.emailAddress')}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('tenant.role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder={t('tenant.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail || sendingInvite}>
              {sendingInvite ? (
                t('tenant.sending')
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('tenant.sendInvitation')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}