import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Church, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get tenant info from URL params (from invitation link)
  const tenantId = searchParams.get('tenant');
  const invitedRole = searchParams.get('role');
  const superAdminInviteToken = searchParams.get('superadmin_invite');
  const platformRole = searchParams.get('role'); // For platform roles (super_admin, finance_admin, etc.)
  
  const [tenantInfo, setTenantInfo] = useState<{ name: string; slug: string } | null>(null);
  const [superAdminInvite, setSuperAdminInvite] = useState<{ email: string; valid: boolean } | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Validate Super Admin invitation token
  useEffect(() => {
    const validateSuperAdminToken = async () => {
      if (superAdminInviteToken) {
        setIsValidatingToken(true);
        try {
          const { data, error } = await supabase
            .from('super_admin_invitations')
            .select('email, expires_at, used_at')
            .eq('token', superAdminInviteToken)
            .single();
          
          if (!error && data && !data.used_at && new Date(data.expires_at) > new Date()) {
            setSuperAdminInvite({ email: data.email, valid: true });
          } else {
            setSuperAdminInvite({ email: '', valid: false });
            toast({
              title: 'Invitation invalide',
              description: 'Ce lien d\'invitation est expiré ou déjà utilisé.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('Failed to validate token:', err);
          setSuperAdminInvite({ email: '', valid: false });
        }
        setIsValidatingToken(false);
      }
    };
    validateSuperAdminToken();
  }, [superAdminInviteToken, toast]);

  // Fetch tenant info if tenant param exists
  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (tenantId) {
        const { data, error } = await supabase
          .from('tenants')
          .select('name, slug')
          .eq('id', tenantId)
          .single();
        
        if (!error && data) {
          setTenantInfo(data);
        }
      }
    };
    fetchTenantInfo();
  }, [tenantId]);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: superAdminInvite?.email || '',
    password: '',
    confirmPassword: '',
  });

  // Update signup form email when super admin invite is validated
  useEffect(() => {
    if (superAdminInvite?.email) {
      setSignupForm(prev => ({ ...prev, email: superAdminInvite.email }));
    }
  }, [superAdminInvite]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!loginForm.email || !loginForm.password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(loginForm.email, loginForm.password);

    if (error) {
      toast({
        title: 'Erreur de connexion',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou mot de passe incorrect' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Connexion réussie!',
        description: 'Bienvenue dans le système de gestion',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!signupForm.firstName || !signupForm.lastName || !signupForm.email || !signupForm.password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error, data } = await signUp(
      signupForm.email,
      signupForm.password,
      signupForm.firstName,
      signupForm.lastName
    );

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Compte déjà existant',
          description: 'Un compte avec cet email existe déjà. Veuillez vous connecter.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      const userId = data?.user?.id;
      
      // Handle Super Admin / Platform invitation
      if (superAdminInviteToken && superAdminInvite?.valid && userId) {
        try {
          // Always assign legacy admin role for backward compatibility
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'user');
            
          await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'admin',
            });
          
          // If a specific platform role was provided, assign it
          const validPlatformRoles = ['super_admin', 'finance_admin', 'moderator', 'support', 'sales'];
          if (platformRole && validPlatformRoles.includes(platformRole)) {
            await supabase
              .from('platform_user_roles')
              .insert({
                user_id: userId,
                role: platformRole as any,
                created_by: null, // Will be set by the system
              });
          }
          
          // Mark invitation as used
          await supabase
            .from('super_admin_invitations')
            .update({ used_at: new Date().toISOString() })
            .eq('token', superAdminInviteToken);
          
          const roleLabels: Record<string, string> = {
            super_admin: 'Super Administrateur',
            finance_admin: 'Admin Finance',
            moderator: 'Modérateur',
            support: 'Support Technique',
            sales: 'Commercial',
          };
          
          const roleLabel = platformRole ? roleLabels[platformRole] || 'Administrateur' : 'Super Administrateur';
          
          toast({
            title: 'Inscription réussie!',
            description: `Vous êtes maintenant ${roleLabel} de la plateforme.`,
          });
          navigate('/');
          setIsLoading(false);
          return;
        } catch (assignError) {
          console.error('Failed to assign platform role:', assignError);
        }
      }
      
      // If this is a tenant admin invitation, assign user to tenant
      if (tenantId && invitedRole === 'admin' && userId) {
        try {
          // Update user profile with tenant_id
          await supabase
            .from('profiles')
            .update({ tenant_id: tenantId })
            .eq('id', userId);
          
          // Assign admin role for this tenant
          await supabase
            .from('tenant_user_roles')
            .insert({
              user_id: userId,
              tenant_id: tenantId,
              role: 'admin',
              is_approved: true,
            });
          
          toast({
            title: 'Inscription réussie!',
            description: `Vous êtes maintenant administrateur de ${tenantInfo?.name || 'l\'église'}.`,
          });
          navigate('/');
          setIsLoading(false);
          return;
        } catch (assignError) {
          console.error('Failed to assign admin role:', assignError);
        }
      }
      
      // Notify admins about new user
      try {
        await supabase.functions.invoke('notify-admin-new-user', {
          body: {
            userId: userId,
            userEmail: signupForm.email,
            firstName: signupForm.firstName,
            lastName: signupForm.lastName,
          },
        });
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
        // Don't block signup if notification fails
      }

      toast({
        title: 'Inscription réussie!',
        description: 'Votre compte a été créé. Un administrateur doit approuver votre accès.',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <img 
            src="/images/church-logo.png" 
            alt="Logo de l'église" 
            className="mx-auto h-16 w-16 animate-pulse"
          />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E40AF]/5 via-background to-[#C5A033]/5 p-4">
      <div className="w-full max-w-md">
        {/* Super Admin invitation banner */}
        {superAdminInvite?.valid && (
          <Card className="mb-4 border-purple-500/50 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-600">Invitation Super Administrateur</p>
                  <p className="text-sm text-muted-foreground">
                    Vous êtes invité à devenir Super Admin de la plateforme
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {superAdminInvite && !superAdminInvite.valid && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Invitation invalide</p>
                  <p className="text-sm text-muted-foreground">
                    Ce lien d'invitation est expiré ou a déjà été utilisé.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tenant invitation banner */}
        {tenantInfo && (
          <Card className="mb-4 border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-primary">Invitation Administrateur</p>
                  <p className="text-sm text-muted-foreground">
                    Vous êtes invité à administrer <strong>{tenantInfo.name}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Administration</h1>
              <p className="text-sm text-muted-foreground">Portail Super Admin</p>
            </div>
          </div>
        </div>

        {/* Only show signup tab if there's a valid invitation */}
        {(superAdminInvite?.valid || tenantInfo) ? (
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Connexion</CardTitle>
                  <CardDescription>
                    Entrez vos informations pour vous connecter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nom@exemple.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Chargement...' : 'Se connecter'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Créer un Compte</CardTitle>
                  <CardDescription>
                    Remplissez vos informations pour créer un nouveau compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">Prénom</Label>
                        <Input
                          id="signup-firstname"
                          placeholder="Jean"
                          value={signupForm.firstName}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, firstName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">Nom</Label>
                        <Input
                          id="signup-lastname"
                          placeholder="Pierre"
                          value={signupForm.lastName}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, lastName: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="nom@exemple.com"
                        value={signupForm.email}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.password}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmer le Mot de passe</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.confirmPassword}
                        onChange={(e) =>
                          setSignupForm({
                            ...signupForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Chargement...' : 'Créer le Compte'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Login only - no signup tab without invitation */
          <Card>
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>
                Entrez vos informations pour vous connecter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Chargement...' : 'Se connecter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
