import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, Check, X, UserPlus, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

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

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  pastor: 'Pasteur',
  treasurer: 'Trésorier',
  secretary: 'Secrétaire',
  volunteer: 'Volontaire',
  user: 'Utilisateur',
};

export default function TenantUserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    fetchCurrentUserTenant();
  }, [user]);

  useEffect(() => {
    if (tenantId) {
      fetchTenantUsers();
    }
  }, [tenantId]);

  async function fetchCurrentUserTenant() {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
      }
    } catch (err) {
      console.error('Error fetching user tenant:', err);
    }
  }

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

          // Get user email from auth (we'll use the profile data we have)
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
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
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
        title: 'Utilisateur approuvé',
        description: "L'utilisateur peut maintenant accéder au système",
      });
      
      fetchTenantUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast({
        title: 'Erreur',
        description: "Impossible d'approuver l'utilisateur",
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
        title: 'Utilisateur rejeté',
        description: "L'utilisateur a été supprimé",
      });
      
      fetchTenantUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast({
        title: 'Erreur',
        description: "Impossible de rejeter l'utilisateur",
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
        title: 'Rôle mis à jour',
        description: `Le rôle a été changé en ${ROLE_LABELS[selectedRole]}`,
      });
      
      setEditingUser(null);
      fetchTenantUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle',
        variant: 'destructive',
      });
    }
  }

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground">
              Gérez les utilisateurs de votre église
            </p>
          </div>
        </div>

        {pendingUsers.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <UserPlus className="h-5 w-5" />
                Demandes en attente ({pendingUsers.length})
              </CardTitle>
              <CardDescription>
                Ces utilisateurs attendent votre approbation pour accéder au système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle demandé</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        {new Date(pendingUser.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(pendingUser.user_id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(pendingUser.user_id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeter
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
              Utilisateurs actifs ({approvedUsers.length})
            </CardTitle>
            <CardDescription>
              Liste des utilisateurs approuvés de votre église
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Chargement...
              </div>
            ) : approvedUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Aucun utilisateur actif
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        {new Date(approvedUser.created_at).toLocaleDateString('fr-FR')}
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
                          Modifier le rôle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changez le rôle de {editingUser?.profile?.first_name} {editingUser?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
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
              Annuler
            </Button>
            <Button onClick={handleUpdateRole}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
