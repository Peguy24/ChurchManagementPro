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
import { Users, Shield, Check, X, UserPlus, Crown, Mail, Send, Link2, Copy, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  const [inviteRole, setInviteRole] = useState('volunteer');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMode, setInviteMode] = useState<'email' | 'link' | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dateLocale = language === 'fr' ? fr : language === 'ht' ? fr : enUS;

  const ROLE_LABELS: Record<string, string> = {
    admin: t('tenant.roleAdmin'),
    pastor: t('tenant.rolePastor'),
    treasurer: t('tenant.roleTreasurer'),
    secretary: t('tenant.roleSecretary'),
    volunteer: t('tenant.roleVolunteer'),
    
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
            .select('first_name, last_name, email')
            .eq('id', role.user_id)
            .single();

          return {
            ...role,
            profile,
            user_email: (profile as any)?.email || `user-${role.user_id.slice(0, 8)}`,
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

  async function handleDeleteUser(userId: string) {
    try {
      const { error } = await supabase
        .from('tenant_user_roles')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ tenant_id: null })
        .eq('id', userId);

      toast({
        title: t('tenant.userDeleted'),
        description: t('tenant.userRemoved'),
      });
      
      fetchTenantUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast({
        title: t('common.error'),
        description: t('tenant.deleteUserError'),
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

  const resetInviteState = () => {
    setInviteEmail('');
    setInviteRole('volunteer');
    setInvitationLink(null);
    setCopied(false);
    setInviteMode(null);
    setSendingInvite(false);
  };

  const handleInviteDialogClose = (open: boolean) => {
    if (!open) {
      resetInviteState();
    }
    setInviteDialogOpen(open);
  };

  async function handleGenerateInvite(skipEmail: boolean) {
    if (!inviteEmail || !tenantId || !tenant) return;

    setSendingInvite(true);
    setInviteMode(skipEmail ? 'link' : 'email');

    try {
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: inviteEmail,
          tenantId: tenantId,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          role: inviteRole,
          inviterName: user?.user_metadata?.first_name && user?.user_metadata?.last_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
            : user?.email,
          skipEmail,
          language,
        },
      });

      if (error) {
        // Check if the response body contains our custom error
        if (data?.error === 'EMAIL_ALREADY_HAS_ROLE') {
          toast({
            title: t('common.error'),
            description: data.message,
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      if (skipEmail && data?.invitationLink) {
        setInvitationLink(data.invitationLink);
        toast({
          title: t('tenant.linkGenerated'),
          description: t('tenant.linkGeneratedDesc'),
        });
      } else if (!skipEmail) {
        toast({
          title: t('tenant.invitationSent'),
          description: `${t('tenant.invitationSentTo')} ${inviteEmail}`,
        });
        handleInviteDialogClose(false);
      }
    } catch (err: any) {
      console.error('Error generating invite:', err);
      // Try to parse error context for EMAIL_ALREADY_HAS_ROLE
      try {
        const parsed = JSON.parse(err?.context?.body || '{}');
        if (parsed?.error === 'EMAIL_ALREADY_HAS_ROLE') {
          toast({
            title: t('common.error'),
            description: parsed.message,
            variant: 'destructive',
          });
          return;
        }
      } catch {}
      
      if (!skipEmail) {
        toast({
          title: t('common.error'),
          description: t('tenant.inviteErrorTryLink'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('tenant.inviteError'),
          variant: 'destructive',
        });
      }
    } finally {
      setSendingInvite(false);
    }
  }

  const copyInvitationLink = async () => {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast({
        title: t('tenant.linkCopied'),
        description: t('tenant.linkCopiedDesc'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t('common.error'),
          description: t('tenant.copyError'),
          variant: 'destructive',
      });
    }
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('tenant.userManagementTitle')}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('tenant.userManagementSubtitle')}
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} className="w-full sm:w-auto">
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
                <CardContent className="overflow-x-auto">
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
                            <div>
                              <div>{pendingUser.profile?.first_name} {pendingUser.profile?.last_name}</div>
                              <div className="text-xs text-muted-foreground">{pendingUser.user_email}</div>
                            </div>
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
                  <div className="overflow-x-auto"><Table>
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
                            <div className="flex gap-1 justify-end">
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
                              {approvedUser.user_id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('tenant.deleteUserTitle')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('tenant.deleteUserConfirm')} {approvedUser.profile?.first_name} {approvedUser.profile?.last_name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDeleteUser(approvedUser.user_id)}
                                      >
                                        {t('common.delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
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
      <Dialog open={inviteDialogOpen} onOpenChange={handleInviteDialogClose}>
        <DialogContent className="sm:max-w-md">
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
                placeholder={t('tenant.emailExample')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={!!invitationLink}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('tenant.role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={!!invitationLink}>
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

            {!invitationLink ? (
              <>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleGenerateInvite(false)}
                    disabled={!inviteEmail || sendingInvite}
                  >
                    {sendingInvite && inviteMode === 'email' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {t('tenant.sendByEmail')}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={() => handleGenerateInvite(true)}
                    disabled={!inviteEmail || sendingInvite}
                  >
                    {sendingInvite && inviteMode === 'link' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    {t('tenant.generateLink')}
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>{t('tenant.tip')} :</strong> {t('tenant.tipText')}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('tenant.invitationLink')}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={invitationLink}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyInvitationLink}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    <p><strong>{t('tenant.secureLink')}</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>{t('tenant.validFor')}</li>
                      <li>{t('tenant.shareOnly')}</li>
                      <li>{t('tenant.shareVia')}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => handleInviteDialogClose(false)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}