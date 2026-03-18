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
import { useLanguage } from '@/contexts/LanguageContext';
import LoginOtpVerification from '@/components/LoginOtpVerification';

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    loading: 'Loading...',
    error: 'Error',
    fillAllFields: 'Please fill in all fields',
    loginError: 'Login Error',
    invalidCredentials: 'Incorrect email or password',
    loginSuccess: 'Login Successful!',
    welcomeMessage: 'Welcome to the management system',
    emailSent: 'Email Sent',
    checkMailbox: 'Check your mailbox to reset your password.',
    signupSuccess: 'Registration Successful!',
    accountCreated: 'Your account has been created. An administrator must approve your access.',
    alreadyExists: 'Account Already Exists',
    alreadyExistsDesc: 'An account with this email already exists. Please log in.',
    signupError: 'Registration Error',
    passwordMismatch: 'Passwords do not match',
    passwordTooShortAuth: 'Password must be at least 6 characters',
    superAdminInvite: 'Super Administrator Invitation',
    superAdminInviteDesc: 'You are invited to become Super Admin of the platform',
    invalidInvite: 'Invalid Invitation',
    invalidInviteDesc: 'This invitation link has expired or has already been used.',
    adminInvite: 'Administrator Invitation',
    adminInviteDesc: 'You are invited to manage',
    administration: 'Administration',
    superAdminPortal: 'Super Admin Portal',
    login: 'Login',
    signup: 'Sign Up',
    loginTitle: 'Login',
    loginDesc: 'Enter your information to log in',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    forgotPasswordDesc: 'Enter your email to receive a reset link',
    sendLink: 'Send Link',
    sending: 'Sending...',
    cancel: 'Cancel',
    logIn: 'Log In',
    createAccount: 'Create Account',
    createAccountDesc: 'Fill in your information to create a new account',
    firstName: 'First Name',
    lastName: 'Last Name',
    confirmPassword: 'Confirm Password',
    createBtn: 'Create Account',
    youAreNow: 'You are now',
    ofThePlatform: 'of the platform.',
    adminOf: 'administrator of',
    theChurch: 'the church',
    superAdmin: 'Super Administrator',
    financeAdmin: 'Finance Admin',
    moderator: 'Moderator',
    support: 'Technical Support',
    sales: 'Sales',
    administrator: 'Administrator',
    invitationInvalid: 'Invalid invitation',
    invitationExpired: 'This invitation link has expired or has already been used.',
  },
  fr: {
    loading: 'Chargement...',
    error: 'Erreur',
    fillAllFields: 'Veuillez remplir tous les champs',
    loginError: 'Erreur de connexion',
    invalidCredentials: 'Email ou mot de passe incorrect',
    loginSuccess: 'Connexion réussie!',
    welcomeMessage: 'Bienvenue dans le système de gestion',
    emailSent: 'Email envoyé',
    checkMailbox: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.',
    signupSuccess: 'Inscription réussie!',
    accountCreated: 'Votre compte a été créé. Un administrateur doit approuver votre accès.',
    alreadyExists: 'Compte déjà existant',
    alreadyExistsDesc: 'Un compte avec cet email existe déjà. Veuillez vous connecter.',
    signupError: "Erreur d'inscription",
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    passwordTooShortAuth: 'Le mot de passe doit contenir au moins 6 caractères',
    superAdminInvite: 'Invitation Super Administrateur',
    superAdminInviteDesc: 'Vous êtes invité à devenir Super Admin de la plateforme',
    invalidInvite: 'Invitation invalide',
    invalidInviteDesc: "Ce lien d'invitation est expiré ou a déjà été utilisé.",
    adminInvite: 'Invitation Administrateur',
    adminInviteDesc: 'Vous êtes invité à administrer',
    administration: 'Administration',
    superAdminPortal: 'Portail Super Admin',
    login: 'Connexion',
    signup: 'Inscription',
    loginTitle: 'Connexion',
    loginDesc: 'Entrez vos informations pour vous connecter',
    email: 'Email',
    emailPlaceholder: 'nom@exemple.com',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    forgotPasswordDesc: 'Entrez votre email pour recevoir un lien de réinitialisation',
    sendLink: 'Envoyer le lien',
    sending: 'Envoi...',
    cancel: 'Annuler',
    logIn: 'Se connecter',
    createAccount: 'Créer un Compte',
    createAccountDesc: 'Remplissez vos informations pour créer un nouveau compte',
    firstName: 'Prénom',
    lastName: 'Nom',
    confirmPassword: 'Confirmer le Mot de passe',
    createBtn: 'Créer le Compte',
    youAreNow: 'Vous êtes maintenant',
    ofThePlatform: 'de la plateforme.',
    adminOf: 'administrateur de',
    theChurch: "l'église",
    superAdmin: 'Super Administrateur',
    financeAdmin: 'Admin Finance',
    moderator: 'Modérateur',
    support: 'Support Technique',
    sales: 'Commercial',
    administrator: 'Administrateur',
    invitationInvalid: 'Invitation invalide',
    invitationExpired: "Ce lien d'invitation est expiré ou déjà utilisé.",
  },
  ht: {
    loading: 'Chajman...',
    error: 'Erè',
    fillAllFields: 'Tanpri ranpli tout chan yo',
    loginError: 'Erè koneksyon',
    invalidCredentials: 'Imèl oswa modpas pa kòrèk',
    loginSuccess: 'Koneksyon reyisi!',
    welcomeMessage: 'Byenveni nan sistèm jesyon an',
    emailSent: 'Imèl voye',
    checkMailbox: 'Verifye bwat imèl ou pou reyinisyalize modpas ou.',
    signupSuccess: 'Enskripsyon reyisi!',
    accountCreated: 'Kont ou kreye. Yon administratè dwe apwouve aksè ou.',
    alreadyExists: 'Kont deja egziste',
    alreadyExistsDesc: 'Yon kont ak imèl sa a deja egziste. Tanpri konekte ou.',
    signupError: 'Erè enskripsyon',
    passwordMismatch: 'Modpas yo pa menm',
    passwordTooShortAuth: 'Modpas la dwe gen omwen 6 karaktè',
    superAdminInvite: 'Envitasyon Super Administratè',
    superAdminInviteDesc: 'Ou envite pou vin Super Admin platfòm nan',
    invalidInvite: 'Envitasyon envalid',
    invalidInviteDesc: 'Lyen envitasyon sa a ekspire oswa deja itilize.',
    adminInvite: 'Envitasyon Administratè',
    adminInviteDesc: 'Ou envite pou administre',
    administration: 'Administrasyon',
    superAdminPortal: 'Pòtay Super Admin',
    login: 'Koneksyon',
    signup: 'Enskripsyon',
    loginTitle: 'Koneksyon',
    loginDesc: 'Antre enfòmasyon ou pou konekte',
    email: 'Imèl',
    emailPlaceholder: 'non@egzanp.com',
    password: 'Modpas',
    forgotPassword: 'Bliye modpas?',
    forgotPasswordDesc: 'Antre imèl ou pou resevwa yon lyen reyinisyalizasyon',
    sendLink: 'Voye lyen',
    sending: 'Anvwa...',
    cancel: 'Anile',
    logIn: 'Konekte',
    createAccount: 'Kreye yon Kont',
    createAccountDesc: 'Ranpli enfòmasyon ou pou kreye yon nouvo kont',
    firstName: 'Prenon',
    lastName: 'Non',
    confirmPassword: 'Konfime Modpas',
    createBtn: 'Kreye Kont',
    youAreNow: 'Ou se kounye a',
    ofThePlatform: 'nan platfòm nan.',
    adminOf: 'administratè',
    theChurch: 'legliz la',
    superAdmin: 'Super Administratè',
    financeAdmin: 'Admin Finans',
    moderator: 'Moderatè',
    support: 'Sipò Teknik',
    sales: 'Komèsyal',
    administrator: 'Administratè',
    invitationInvalid: 'Envitasyon envalid',
    invitationExpired: 'Lyen envitasyon sa a ekspire oswa deja itilize.',
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpPending, setOtpPending] = useState<{ email: string; userId: string } | null>(null);
  const [isCheckingOtp, setIsCheckingOtp] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations['en'][key] || key;
  
  // Get tenant info from URL params (from invitation link)
  const tenantId = searchParams.get('tenant');
  const invitedRole = searchParams.get('role');
  const superAdminInviteToken = searchParams.get('superadmin_invite');
  const platformRole = searchParams.get('role');
  
  const [tenantInfo, setTenantInfo] = useState<{ name: string; slug: string } | null>(null);
  const [superAdminInvite, setSuperAdminInvite] = useState<{ email: string; valid: boolean } | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Clear cached tenant branding on Auth page so default blue colors are shown
  useEffect(() => {
    try {
      sessionStorage.removeItem('tenant_cache');
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-light');
      root.style.removeProperty('--primary-dark');
      root.style.removeProperty('--ring');
    } catch (e) {}
  }, []);

  // Validate Super Admin invitation token
  useEffect(() => {
    const validateSuperAdminToken = async () => {
      if (superAdminInviteToken) {
        setIsValidatingToken(true);
        try {
          const { data, error } = await (supabase
            .rpc as any)('validate_super_admin_invitation', { _token: superAdminInviteToken });
          
          const row = Array.isArray(data) ? data[0] : data;
          if (!error && row) {
            setSuperAdminInvite({ email: row.email, valid: true });
          } else {
            setSuperAdminInvite({ email: '', valid: false });
            toast({
              title: lt('invitationInvalid'),
              description: lt('invitationExpired'),
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

  // Redirect if already logged in (skip during OTP check flow)
  useEffect(() => {
    if (!loading && user && !otpPending && !isCheckingOtp) {
      navigate('/');
    }
  }, [user, loading, navigate, otpPending, isCheckingOtp]);

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
        title: lt('error'),
        description: lt('fillAllFields'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Set flag BEFORE signIn to prevent redirect during OTP check
    setIsCheckingOtp(true);
    
    const { error } = await signIn(loginForm.email, loginForm.password);

    if (error) {
      toast({
        title: lt('loginError'),
        description: error.message === 'Invalid login credentials' 
          ? lt('invalidCredentials')
          : error.message,
        variant: 'destructive',
      });
      setIsCheckingOtp(false);
      setIsLoading(false);
      return;
    }

    // Successful password — check if user is admin/superadmin to require OTP
    try {
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        // Check if user is a tenant admin or super admin
        const { data: tenantRoles } = await supabase
          .from('tenant_user_roles')
          .select('role')
          .eq('user_id', loggedInUser.id)
          .eq('is_approved', true);

        const { data: platformRoles } = await supabase
          .from('platform_user_roles')
          .select('role')
          .eq('user_id', loggedInUser.id);

        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', loggedInUser.id);

        const isTenantAdmin = tenantRoles?.some(r => r.role === 'admin');
        const isPlatformRole = platformRoles && platformRoles.length > 0;
        const isSuperAdmin = userRoles?.some(r => r.role === 'admin');

        if (isTenantAdmin || isPlatformRole || isSuperAdmin) {
          // Sign out temporarily — user must verify OTP first
          await supabase.auth.signOut();
          
          // Send verification code
          try {
            await supabase.functions.invoke('send-login-verification', {
              body: { action: 'send', email: loginForm.email, userId: loggedInUser.id },
            });
          } catch (sendErr) {
            console.error('Failed to send verification code:', sendErr);
          }

          setOtpPending({ email: loginForm.email, userId: loggedInUser.id });
          setIsLoading(false);
          return;
        }

        // Not admin — proceed normally
        setIsCheckingOtp(false);
        const { data: approvedRoles } = await supabase
          .from('tenant_user_roles')
          .select('tenant_id')
          .eq('user_id', loggedInUser.id)
          .eq('is_approved', true);

        if (approvedRoles && approvedRoles.length > 1) {
          toast({ title: lt('loginSuccess'), description: lt('welcomeMessage') });
          navigate('/select-church');
          setIsLoading(false);
          return;
        }

        toast({ title: lt('loginSuccess'), description: lt('welcomeMessage') });
        navigate('/');
      }
    } catch (err) {
      console.error('Error in login flow:', err);
      setIsCheckingOtp(false);
      toast({ title: lt('loginSuccess'), description: lt('welcomeMessage') });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleOtpVerified = async () => {
    if (!otpPending) return;
    // Re-sign in the user after OTP verification
    const { error } = await signIn(loginForm.email, loginForm.password);
    if (error) {
      toast({ title: lt('loginError'), description: error.message, variant: 'destructive' });
      setOtpPending(null);
      return;
    }

    // Check multi-tenant
    try {
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        const { data: approvedRoles } = await supabase
          .from('tenant_user_roles')
          .select('tenant_id')
          .eq('user_id', loggedInUser.id)
          .eq('is_approved', true);

        if (approvedRoles && approvedRoles.length > 1) {
          toast({ title: lt('loginSuccess'), description: lt('welcomeMessage') });
          navigate('/select-church');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking multi-tenant:', err);
    }

    toast({ title: lt('loginSuccess'), description: lt('welcomeMessage') });
    setOtpPending(null);
    navigate('/');
  };

  const handleOtpResend = async () => {
    if (!otpPending) return;
    try {
      await supabase.functions.invoke('send-login-verification', {
        body: { action: 'send', email: otpPending.email, userId: otpPending.userId },
      });
    } catch (err) {
      console.error('Failed to resend code:', err);
    }
  };

  const handleOtpVerify = async (code: string): Promise<boolean> => {
    if (!otpPending) return false;
    try {
      const { data, error } = await supabase.functions.invoke('send-login-verification', {
        body: { action: 'verify', email: otpPending.email, userId: otpPending.userId, code },
      });
      return data?.valid === true;
    } catch (err) {
      console.error('Failed to verify code:', err);
      return false;
    }
  };

  const handleOtpCancel = async () => {
    setOtpPending(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: lt('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: lt('emailSent'), description: lt('checkMailbox') });
      setShowForgotPassword(false);
      setForgotEmail('');
    }
    setForgotLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signupForm.firstName || !signupForm.lastName || !signupForm.email || !signupForm.password) {
      toast({
        title: lt('error'),
        description: lt('fillAllFields'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: lt('error'),
        description: lt('passwordMismatch'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: lt('error'),
        description: lt('passwordTooShortAuth'),
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
          title: lt('alreadyExists'),
          description: lt('alreadyExistsDesc'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: lt('signupError'),
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      const userId = data?.user?.id;
      
      // Handle Super Admin / Platform invitation
      if (superAdminInviteToken && superAdminInvite?.valid && userId) {
        try {
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
          
          const validPlatformRoles = ['super_admin', 'finance_admin', 'moderator', 'support', 'sales'];
          if (platformRole && validPlatformRoles.includes(platformRole)) {
            await supabase
              .from('platform_user_roles')
              .insert({
                user_id: userId,
                role: platformRole as any,
                created_by: null,
              });
          }
          
          // Mark invitation as used
          await supabase
            .from('super_admin_invitations')
            .update({ used_at: new Date().toISOString() })
            .eq('token', superAdminInviteToken);
          
          const roleLabels: Record<string, string> = {
            super_admin: lt('superAdmin'),
            finance_admin: lt('financeAdmin'),
            moderator: lt('moderator'),
            support: lt('support'),
            sales: lt('sales'),
          };
          
          const roleLabel = platformRole ? roleLabels[platformRole] || lt('administrator') : lt('superAdmin');
          
          toast({
            title: lt('signupSuccess'),
            description: `${lt('youAreNow')} ${roleLabel} ${lt('ofThePlatform')}`,
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
          await supabase
            .from('profiles')
            .update({ tenant_id: tenantId })
            .eq('id', userId);
          
          await supabase
            .from('tenant_user_roles')
            .insert({
              user_id: userId,
              tenant_id: tenantId,
              role: 'admin',
              is_approved: true,
            });
          
          toast({
            title: lt('signupSuccess'),
            description: `${lt('youAreNow')} ${lt('adminOf')} ${tenantInfo?.name || lt('theChurch')}.`,
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
      }

      toast({
        title: lt('signupSuccess'),
        description: lt('accountCreated'),
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  // Show OTP verification screen
  if (otpPending) {
    return (
      <LoginOtpVerification
        email={otpPending.email}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
        onResend={handleOtpResend}
        onVerify={handleOtpVerify}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <img 
            src="/images/church-logo.png" 
            alt="Logo" 
            className="mx-auto h-16 w-16 animate-pulse"
          />
          <p className="mt-4 text-muted-foreground">{lt('loading')}</p>
        </div>
      </div>
    );
  }

  const renderForgotPasswordForm = () => (
    showForgotPassword && (
      <form onSubmit={handleForgotPassword} className="mt-4 space-y-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{lt('forgotPasswordDesc')}</p>
        <Input type="email" placeholder={lt('emailPlaceholder')} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={forgotLoading}>{forgotLoading ? lt('sending') : lt('sendLink')}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowForgotPassword(false)}>{lt('cancel')}</Button>
        </div>
      </form>
    )
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">{lt('email')}</Label>
        <Input
          id="login-email"
          type="email"
          placeholder={lt('emailPlaceholder')}
          value={loginForm.email}
          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
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
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          required
        />
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline">
          {lt('forgotPassword')}
        </button>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? lt('loading') : lt('logIn')}
      </Button>
    </form>
  );

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
                  <p className="font-semibold text-purple-600">{lt('superAdminInvite')}</p>
                  <p className="text-sm text-muted-foreground">{lt('superAdminInviteDesc')}</p>
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
                  <p className="font-semibold text-destructive">{lt('invalidInvite')}</p>
                  <p className="text-sm text-muted-foreground">{lt('invalidInviteDesc')}</p>
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
                  <p className="font-semibold text-primary">{lt('adminInvite')}</p>
                  <p className="text-sm text-muted-foreground">
                    {lt('adminInviteDesc')} <strong>{tenantInfo.name}</strong>
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
              <h1 className="text-xl font-bold text-foreground">{lt('administration')}</h1>
              <p className="text-sm text-muted-foreground">{lt('superAdminPortal')}</p>
            </div>
          </div>
        </div>

        {/* Only show signup tab if there's a valid invitation */}
        {(superAdminInvite?.valid || tenantInfo) ? (
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{lt('login')}</TabsTrigger>
              <TabsTrigger value="signup">{lt('signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{lt('loginTitle')}</CardTitle>
                  <CardDescription>{lt('loginDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLoginForm()}
                  {renderForgotPasswordForm()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>{lt('createAccount')}</CardTitle>
                  <CardDescription>{lt('createAccountDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">{lt('firstName')}</Label>
                        <Input
                          id="signup-firstname"
                          placeholder="Jean"
                          value={signupForm.firstName}
                          onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">{lt('lastName')}</Label>
                        <Input
                          id="signup-lastname"
                          placeholder="Pierre"
                          value={signupForm.lastName}
                          onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
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
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{lt('password')}</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
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
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? lt('loading') : lt('createBtn')}
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
              <CardTitle>{lt('loginTitle')}</CardTitle>
              <CardDescription>{lt('loginDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderLoginForm()}
              {renderForgotPasswordForm()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
