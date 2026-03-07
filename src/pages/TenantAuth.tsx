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
import { useLanguage } from '@/contexts/LanguageContext';

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading...",
    churchNotFound: "Church Not Found",
    churchNotFoundDesc: "The church \"{slug}\" does not exist or is no longer available.",
    chooseChurch: "Choose a Church",
    managementSystem: "Management System",
    login: "Login",
    signup: "Sign Up",
    loginTitle: "Login",
    loginDesc: "Log in to your {name} space",
    email: "Email",
    emailPlaceholder: "name@example.com",
    password: "Password",
    confirmPassword: "Confirm Password",
    connecting: "Loading...",
    connectButton: "Log In",
    firstName: "First Name",
    firstNamePlaceholder: "John",
    lastName: "Last Name",
    lastNamePlaceholder: "Doe",
    becomeAdmin: "Become Administrator",
    createAccount: "Create an Account",
    adminSignupDesc: "Create your account to manage {name}",
    userSignupDesc: "Join {name} - an admin must approve your access",
    emailLockedInvite: "Email is locked because it comes from your invitation.",
    createAdminAccount: "Create My Admin Account",
    createAccountButton: "Create Account",
    errorTitle: "Error",
    fillAllFields: "Please fill in all fields.",
    loginError: "Login Error",
    invalidCredentials: "Incorrect email or password",
    loginSuccess: "Login Successful!",
    welcomeTo: "Welcome to {name}",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    signupUnauthorized: "Registration Not Authorized",
    signupUnauthorizedDesc: "Only an invited administrator can create the first account. Contact the Super Admin.",
    accountExists: "Account Already Exists",
    accountExistsDesc: "An account with this email already exists. Please log in.",
    signupError: "Registration Error",
    congratulations: "Congratulations!",
    adminCreatedDesc: "You are now the administrator of {name}. Your account is active.",
    signupSuccess: "Registration Successful!",
    signupSuccessDesc: "Your account has been created. An administrator of {name} must approve your access.",
    linkError: "Account created but error linking to the church",
    invalidInvite: "Invalid or expired invitation link. Contact the Super Admin for a new invitation.",
    validInvite: "Valid invitation! You are invited as an administrator. Create your account with the email:",
    noAdminConfigured: "No administrator configured.",
    noAdminConfiguredDesc: "Only a person with a valid invitation can create the administrator account.",
    admin: "Admin",
    errorLoading: "Error loading",
  },
  fr: {
    loading: "Chargement...",
    churchNotFound: "Église non trouvée",
    churchNotFoundDesc: "L'église \"{slug}\" n'existe pas ou n'est plus disponible.",
    chooseChurch: "Choisir une église",
    managementSystem: "Système de gestion",
    login: "Connexion",
    signup: "Inscription",
    loginTitle: "Connexion",
    loginDesc: "Connectez-vous à votre espace {name}",
    email: "Email",
    emailPlaceholder: "nom@exemple.com",
    password: "Mot de passe",
    confirmPassword: "Confirmer le Mot de passe",
    connecting: "Chargement...",
    connectButton: "Se connecter",
    firstName: "Prénom",
    firstNamePlaceholder: "Jean",
    lastName: "Nom",
    lastNamePlaceholder: "Pierre",
    becomeAdmin: "Devenir Administrateur",
    createAccount: "Créer un Compte",
    adminSignupDesc: "Créez votre compte pour administrer {name}",
    userSignupDesc: "Rejoignez {name} - un admin doit approuver votre accès",
    emailLockedInvite: "L'email est verrouillé car il provient de votre invitation.",
    createAdminAccount: "Créer mon compte Admin",
    createAccountButton: "Créer le Compte",
    errorTitle: "Erreur",
    fillAllFields: "Veuillez remplir tous les champs",
    loginError: "Erreur de connexion",
    invalidCredentials: "Email ou mot de passe incorrect",
    loginSuccess: "Connexion réussie!",
    welcomeTo: "Bienvenue sur {name}",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
    signupUnauthorized: "Inscription non autorisée",
    signupUnauthorizedDesc: "Seul un administrateur invité peut créer le premier compte. Contactez le Super Admin.",
    accountExists: "Compte déjà existant",
    accountExistsDesc: "Un compte avec cet email existe déjà. Veuillez vous connecter.",
    signupError: "Erreur d'inscription",
    congratulations: "Félicitations!",
    adminCreatedDesc: "Vous êtes maintenant l'administrateur de {name}. Votre compte est actif.",
    signupSuccess: "Inscription réussie!",
    signupSuccessDesc: "Votre compte a été créé. Un administrateur de {name} doit approuver votre accès.",
    linkError: "Compte créé mais erreur lors de l'association à l'église",
    invalidInvite: "Lien d'invitation invalide ou expiré. Contactez le Super Admin pour obtenir une nouvelle invitation.",
    validInvite: "Invitation valide! Vous êtes invité en tant qu'administrateur. Créez votre compte avec l'email:",
    noAdminConfigured: "Aucun administrateur configuré.",
    noAdminConfiguredDesc: "Seule une personne avec une invitation valide peut créer le compte administrateur.",
    admin: "Admin",
    errorLoading: "Erreur lors du chargement",
  },
  ht: {
    loading: "Chajman...",
    churchNotFound: "Legliz pa Jwenn",
    churchNotFoundDesc: "Legliz \"{slug}\" pa egziste oswa li pa disponib ankò.",
    chooseChurch: "Chwazi yon legliz",
    managementSystem: "Sistèm Jesyon",
    login: "Koneksyon",
    signup: "Enskripsyon",
    loginTitle: "Koneksyon",
    loginDesc: "Konekte nan espas {name} ou a",
    email: "Imèl",
    emailPlaceholder: "non@egzanp.com",
    password: "Mo de pas",
    confirmPassword: "Konfime Mo de pas",
    connecting: "Chajman...",
    connectButton: "Konekte",
    firstName: "Prenon",
    firstNamePlaceholder: "Jan",
    lastName: "Non",
    lastNamePlaceholder: "Pyè",
    becomeAdmin: "Vin Administratè",
    createAccount: "Kreye yon Kont",
    adminSignupDesc: "Kreye kont ou pou jere {name}",
    userSignupDesc: "Rejwenn {name} - yon admin dwe apwouve aksè ou",
    emailLockedInvite: "Imèl la bloke paske li soti nan envitasyon ou a.",
    createAdminAccount: "Kreye Kont Admin Mwen",
    createAccountButton: "Kreye Kont",
    errorTitle: "Erè",
    fillAllFields: "Tanpri ranpli tout chan yo.",
    loginError: "Erè Koneksyon",
    invalidCredentials: "Imèl oswa mo de pas pa kòrèk",
    loginSuccess: "Koneksyon Reyisi!",
    welcomeTo: "Byenveni nan {name}",
    passwordMismatch: "Mo de pas yo pa menm",
    passwordTooShort: "Mo de pas la dwe gen omwen 6 karaktè",
    signupUnauthorized: "Enskripsyon pa Otorize",
    signupUnauthorizedDesc: "Sèlman yon administratè envite ka kreye premye kont la. Kontakte Super Admin.",
    accountExists: "Kont Deja Egziste",
    accountExistsDesc: "Yon kont ak imèl sa a deja egziste. Tanpri konekte.",
    signupError: "Erè Enskripsyon",
    congratulations: "Felisitasyon!",
    adminCreatedDesc: "Ou se administratè {name} kounye a. Kont ou aktif.",
    signupSuccess: "Enskripsyon Reyisi!",
    signupSuccessDesc: "Kont ou kreye. Yon administratè {name} dwe apwouve aksè ou.",
    linkError: "Kont kreye men erè lè yo ap asosye ak legliz la",
    invalidInvite: "Lyen envitasyon envalid oswa ekspire. Kontakte Super Admin pou jwenn yon nouvo envitasyon.",
    validInvite: "Envitasyon valid! Yo envite ou kòm administratè. Kreye kont ou ak imèl:",
    noAdminConfigured: "Pa gen administratè konfigire.",
    noAdminConfiguredDesc: "Sèlman yon moun ki gen yon envitasyon valid ka kreye kont administratè a.",
    admin: "Admin",
    errorLoading: "Erè pandan chajman",
  },
};

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
  const { language } = useLanguage();

  const lt = (key: string, replacements?: Record<string, string>) => {
    let text = localTranslations[language]?.[key] || localTranslations.en[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };
  
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
      console.log('Fetching tenant with slug:', slug);
      console.log('Invite token from URL:', inviteToken);
      
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color')
        .eq('slug', slug)
        .single();
      
      if (fetchError) {
        console.error('Error fetching tenant:', fetchError);
        setError(lt('churchNotFound'));
        setLoading(false);
        return;
      }
      
      console.log('Tenant found:', data);
      setTenant(data);
      
      // Check if tenant has admin
      const { data: adminExists } = await supabase
        .rpc('tenant_has_admin', { _tenant_id: data.id });
      console.log('Tenant has admin:', adminExists);
      setHasAdmin(!!adminExists);

      // Validate invitation token if present
      if (inviteToken) {
        console.log('Validating invitation token...');
        const { data: inviteData, error: inviteError } = await supabase
          .from('admin_invitations')
          .select('id, email, tenant_id, expires_at, used_at')
          .eq('token', inviteToken)
          .eq('tenant_id', data.id)
          .single();

        console.log('Invitation query result:', { inviteData, inviteError });

        if (inviteError || !inviteData) {
          console.log('Invalid invitation token - error or no data');
          setInvitationValid(false);
        } else if (inviteData.used_at) {
          console.log('Invitation already used at:', inviteData.used_at);
          setInvitationValid(false);
        } else if (new Date(inviteData.expires_at) < new Date()) {
          console.log('Invitation expired at:', inviteData.expires_at);
          setInvitationValid(false);
        } else {
          console.log('Invitation is valid! Email:', inviteData.email);
          setInvitation(inviteData);
          setInvitationValid(true);
          // Pre-fill email from invitation
          setSignupForm(prev => ({ ...prev, email: inviteData.email }));
        }
      } else {
        console.log('No invite token in URL');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchTenantAndInvitation:', err);
      setError(lt('errorLoading'));
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
        title: lt('errorTitle'),
        description: lt('fillAllFields'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(loginForm.email, loginForm.password);

    if (error) {
      toast({
        title: lt('loginError'),
        description: error.message === 'Invalid login credentials' 
          ? lt('invalidCredentials')
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: lt('loginSuccess'),
        description: lt('welcomeTo', { name: tenant?.name || '' }),
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
        title: lt('errorTitle'),
        description: lt('fillAllFields'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: lt('errorTitle'),
        description: lt('passwordMismatch'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: lt('errorTitle'),
        description: lt('passwordTooShort'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Check if user has a valid invitation
    const hasValidInvitation = invitationValid && invitation && 
      invitation.email.toLowerCase().trim() === signupForm.email.toLowerCase().trim();

    console.log('Signup validation:', {
      invitationValid,
      hasInvitation: !!invitation,
      invitationEmail: invitation?.email,
      formEmail: signupForm.email,
      emailsMatch: invitation?.email?.toLowerCase().trim() === signupForm.email.toLowerCase().trim(),
      hasValidInvitation,
      hasAdmin
    });

    // If no admin exists AND no valid invitation, block signup for admin role
    if (!hasAdmin && !hasValidInvitation) {
      toast({
        title: lt('signupUnauthorized'),
        description: lt('signupUnauthorizedDesc'),
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
          title: lt('accountExists'),
          description: lt('accountExistsDesc'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: lt('signupError'),
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
            title: lt('congratulations'),
            description: lt('adminCreatedDesc', { name: tenant.name }),
          });
        } else {
          toast({
            title: lt('signupSuccess'),
            description: lt('signupSuccessDesc', { name: tenant.name }),
          });
        }
        
        navigate('/');
      } catch (err) {
        console.error('Error linking user to tenant:', err);
        toast({
          title: lt('errorTitle'),
          description: lt('linkError'),
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
          <p className="mt-4 text-muted-foreground">{lt('loading')}</p>
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
            <CardTitle className="text-destructive">{lt('churchNotFound')}</CardTitle>
            <CardDescription>
              {lt('churchNotFoundDesc', { slug: slug || '' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/select-tenant')} 
              className="w-full"
            >
              {lt('chooseChurch')}
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
            <strong>{lt('invalidInvite')}</strong>
          </AlertDescription>
        </Alert>
      );
    }

    if (invitationValid && invitation) {
      return (
        <Alert className="mb-4 border-green-500/50 bg-green-50 dark:bg-green-950">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>{lt('validInvite')}</strong> <strong>{invitation.email}</strong>
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
              <p className="text-sm text-muted-foreground">{lt('managementSystem')}</p>
            </div>
          </div>
          
          {renderInvitationAlert()}
          
          {!hasAdmin && !canSignupAsAdmin && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>{lt('noAdminConfigured')}</strong> {lt('noAdminConfiguredDesc')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Tabs defaultValue={canSignupAsAdmin ? "signup" : "login"} className="w-full">
          <TabsList className={`grid w-full ${showSignupTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="login">{lt('login')}</TabsTrigger>
            {showSignupTab && (
              <TabsTrigger value="signup" className="flex items-center gap-2">
                {lt('signup')}
                {canSignupAsAdmin && <Badge variant="secondary" className="text-xs">{lt('admin')}</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{lt('loginTitle')}</CardTitle>
                <CardDescription>
                  {lt('loginDesc', { name: tenant.name })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{lt('email')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={lt('emailPlaceholder')}
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{lt('password')}</Label>
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
                    {isLoading ? lt('connecting') : lt('connectButton')}
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
                        {lt('becomeAdmin')}
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5" />
                        {lt('createAccount')}
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {canSignupAsAdmin 
                      ? lt('adminSignupDesc', { name: tenant.name })
                      : lt('userSignupDesc', { name: tenant.name })
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">{lt('firstName')}</Label>
                        <Input
                          id="signup-firstname"
                          placeholder={lt('firstNamePlaceholder')}
                          value={signupForm.firstName}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, firstName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">{lt('lastName')}</Label>
                        <Input
                          id="signup-lastname"
                          placeholder={lt('lastNamePlaceholder')}
                          value={signupForm.lastName}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, lastName: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{lt('email')}</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={lt('emailPlaceholder')}
                        value={signupForm.email}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, email: e.target.value })
                        }
                        required
                        disabled={canSignupAsAdmin} // Lock email if from invitation
                      />
                      {canSignupAsAdmin && (
                        <p className="text-xs text-muted-foreground">
                          {lt('emailLockedInvite')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{lt('password')}</Label>
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
                      <Label htmlFor="signup-confirm">{lt('confirmPassword')}</Label>
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
                        ? lt('connecting')
                        : canSignupAsAdmin 
                          ? lt('createAdminAccount')
                          : lt('createAccountButton')
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
