import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Church, Crown, Users, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface InvitationData {
  id: string;
  email: string;
  tenant_id: string;
  expires_at: string;
  used_at: string | null;
}

export default function TenantAuth() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Fetch tenant info and validate invitation
  useEffect(() => {
    if (slug) {
      fetchTenantAndInvitation();
    }
  }, [slug, inviteToken]);

  // Redirect if already logged in and has access to tenant
  useEffect(() => {
    if (!authLoading && user && tenant) {
      checkUserTenantAccess();
    }
  }, [user, authLoading, tenant]);

  async function fetchTenantAndInvitation() {
    try {
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color')
        .eq('slug', slug)
        .single();
      
      if (fetchError) {
        setError('Église non trouvée');
        setLoading(false);
        return;
      }
      
      setTenant(data);
      
      // Check if tenant has admin
      const { data: adminExists } = await supabase
        .rpc('tenant_has_admin', { _tenant_id: data.id });
      setHasAdmin(!!adminExists);

      // Validate invitation token if present
      if (inviteToken) {
        const { data: inviteData, error: inviteError } = await supabase
          .from('admin_invitations')
          .select('id, email, tenant_id, expires_at, used_at')
          .eq('token', inviteToken)
          .eq('tenant_id', data.id)
          .single();

        if (inviteError || !inviteData) {
          setInvitationValid(false);
          console.log('Invalid invitation token');
        } else if (inviteData.used_at) {
          setInvitationValid(false);
          console.log('Invitation already used');
        } else if (new Date(inviteData.expires_at) < new Date()) {
          setInvitationValid(false);
          console.log('Invitation expired');
        } else {
          setInvitation(inviteData);
          setInvitationValid(true);
          // Pre-fill email from invitation
          setSignupForm(prev => ({ ...prev, email: inviteData.email }));
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement');
      setLoading(false);
    }
  }

  async function checkUserTenantAccess() {
    if (!user || !tenant) return;
    
    const { data: role } = await supabase
      .from('tenant_user_roles')
      .select('is_approved')
      .eq('tenant_id', tenant.id)
      .eq('user_id', user.id)
      .single();
    
    if (role?.is_approved) {
      navigate('/');
    }
  }

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
        description: `Bienvenue sur ${tenant?.name}`,
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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

    // Check if user has a valid invitation
    const hasValidInvitation = invitationValid && invitation && 
      invitation.email.toLowerCase() === signupForm.email.toLowerCase();

    // If no admin exists AND no valid invitation, block signup for admin role
    if (!hasAdmin && !hasValidInvitation) {
      toast({
        title: 'Inscription non autorisée',
        description: 'Seul un administrateur invité peut créer le premier compte. Contactez le Super Admin.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Sign up the user
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
      setIsLoading(false);
      return;
    }

    // Link user to tenant and assign role
    if (data?.user && tenant) {
      try {
        // Update profile with tenant_id
        await supabase
          .from('profiles')
          .update({ tenant_id: tenant.id })
          .eq('id', data.user.id);
        
        // Determine role based on invitation
        const isAdminInvite = hasValidInvitation;
        const roleToAssign = isAdminInvite ? 'admin' : 'user';
        const isAutoApproved = isAdminInvite; // Only invited admins are auto-approved
        
        await supabase
          .from('tenant_user_roles')
          .insert({
            tenant_id: tenant.id,
            user_id: data.user.id,
            role: roleToAssign,
            is_approved: isAutoApproved,
          });

        // Mark invitation as used if applicable
        if (isAdminInvite && invitation) {
          await supabase
            .from('admin_invitations')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invitation.id);
        }

        if (isAdminInvite) {
          toast({
            title: 'Félicitations!',
            description: `Vous êtes maintenant l'administrateur de ${tenant.name}. Votre compte est actif.`,
          });
        } else {
          toast({
            title: 'Inscription réussie!',
            description: `Votre compte a été créé. Un administrateur de ${tenant.name} doit approuver votre accès.`,
          });
        }
        
        navigate('/');
      } catch (err) {
        console.error('Error linking user to tenant:', err);
        toast({
          title: 'Erreur',
          description: "Compte créé mais erreur lors de l'association à l'église",
          variant: 'destructive',
        });
      }
    }

    setIsLoading(false);
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Church className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Church className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="text-destructive">Église non trouvée</CardTitle>
            <CardDescription>
              L'église "{slug}" n'existe pas ou n'est plus disponible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/select-tenant')} 
              className="w-full"
            >
              Choisir une église
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation status messages
  const renderInvitationAlert = () => {
    if (!inviteToken) return null;

    if (invitationValid === false) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Lien d'invitation invalide ou expiré.</strong> Contactez le Super Admin pour obtenir une nouvelle invitation.
          </AlertDescription>
        </Alert>
      );
    }

    if (invitationValid && invitation) {
      return (
        <Alert className="mb-4 border-green-500/50 bg-green-50 dark:bg-green-950">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Invitation valide!</strong> Vous êtes invité en tant qu'administrateur. Créez votre compte avec l'email: <strong>{invitation.email}</strong>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  // Determine what signup options to show
  const canSignupAsAdmin = invitationValid === true && invitation !== null;
  const canSignupAsUser = hasAdmin; // Regular users can only signup if admin exists
  const showSignupTab = canSignupAsAdmin || canSignupAsUser;

  return (
    <div 
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: tenant.primary_color 
          ? `linear-gradient(135deg, ${tenant.primary_color}10 0%, transparent 50%, ${tenant.primary_color}05 100%)`
          : undefined
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-4">
            {tenant.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-20 w-20 object-contain rounded-lg"
              />
            ) : (
              <div 
                className="h-20 w-20 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: tenant.primary_color || '#6366f1' }}
              >
                <Church className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
              <p className="text-sm text-muted-foreground">Système de gestion</p>
            </div>
          </div>
          
          {renderInvitationAlert()}
          
          {!hasAdmin && !canSignupAsAdmin && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Aucun administrateur configuré.</strong> Seule une personne avec une invitation valide peut créer le compte administrateur.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Tabs defaultValue={canSignupAsAdmin ? "signup" : "login"} className="w-full">
          <TabsList className={`grid w-full ${showSignupTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="login">Connexion</TabsTrigger>
            {showSignupTab && (
              <TabsTrigger value="signup" className="flex items-center gap-2">
                Inscription
                {canSignupAsAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Connexion</CardTitle>
                <CardDescription>
                  Connectez-vous à votre espace {tenant.name}
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
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    style={{ backgroundColor: tenant.primary_color || undefined }}
                  >
                    {isLoading ? 'Chargement...' : 'Se connecter'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {showSignupTab && (
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {canSignupAsAdmin ? (
                      <>
                        <Crown className="h-5 w-5 text-primary" />
                        Devenir Administrateur
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5" />
                        Créer un Compte
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {canSignupAsAdmin 
                      ? `Créez votre compte pour administrer ${tenant.name}`
                      : `Rejoignez ${tenant.name} - un admin doit approuver votre accès`
                    }
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
                        disabled={canSignupAsAdmin} // Lock email if from invitation
                      />
                      {canSignupAsAdmin && (
                        <p className="text-xs text-muted-foreground">
                          L'email est verrouillé car il provient de votre invitation.
                        </p>
                      )}
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
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                      style={{ backgroundColor: tenant.primary_color || undefined }}
                    >
                      {isLoading 
                        ? 'Chargement...' 
                        : canSignupAsAdmin 
                          ? 'Créer mon compte Admin'
                          : 'Créer le Compte'
                      }
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
