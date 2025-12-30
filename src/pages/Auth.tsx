import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Church, Building2 } from 'lucide-react';
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
  const [tenantInfo, setTenantInfo] = useState<{ name: string; slug: string } | null>(null);

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
    email: '',
    password: '',
    confirmPassword: '',
  });

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
            <img 
              src="/images/church-logo.png" 
              alt="Logo de l'église" 
              className="h-24 w-24 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">Church of God</h1>
              <p className="text-sm text-muted-foreground">Ministry of Prayer and of The Word Inc.</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
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
      </div>
    </div>
  );
}
