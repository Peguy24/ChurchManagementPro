import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { FieldError } from '@/components/FieldError';
import { validateForm, resetPasswordSchema, firstErrorMessage } from '@/lib/validation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Listen for the recovery event from the auth link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setChecking(false);
      }
    });

    // Also check if already in a session (user may have clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(resetPasswordSchema, { password, confirmPassword });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast({
        title: t('common.error'),
        description: firstErrorMessage(validation.fieldErrors) || t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }
    setErrors({});

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('auth.passwordUpdated'), description: t('auth.passwordUpdatedDesc') });
      navigate('/auth');
    }
    setIsLoading(false);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E40AF]/5 via-background to-[#C5A033]/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{t('auth.noRecoverySession')}</p>
            <Button onClick={() => navigate('/auth')}>{t('auth.backToLogin')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E40AF]/5 via-background to-[#C5A033]/5 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPassword')}</CardTitle>
            <CardDescription>{t('auth.resetPasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })); }}
                />
                <FieldError name="password" errors={errors} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('auth.confirmNewPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                />
                <FieldError name="confirmPassword" errors={errors} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.updating') : t('auth.updatePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
