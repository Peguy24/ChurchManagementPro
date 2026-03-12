import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Mail, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const otpTranslations: Record<string, Record<string, string>> = {
  en: {
    title: 'Verification Required',
    description: 'A 6-digit code has been sent to your email',
    enterCode: 'Enter verification code',
    verify: 'Verify',
    verifying: 'Verifying...',
    resend: 'Resend code',
    resending: 'Sending...',
    resent: 'Code resent!',
    invalidCode: 'Invalid or expired code. Please try again.',
    codeExpires: 'Code expires in 10 minutes',
    checkSpam: 'Check your spam folder if you don\'t see the email.',
    cancel: 'Cancel',
  },
  fr: {
    title: 'Vérification requise',
    description: 'Un code à 6 chiffres a été envoyé à votre email',
    enterCode: 'Entrez le code de vérification',
    verify: 'Vérifier',
    verifying: 'Vérification...',
    resend: 'Renvoyer le code',
    resending: 'Envoi...',
    resent: 'Code renvoyé !',
    invalidCode: 'Code invalide ou expiré. Veuillez réessayer.',
    codeExpires: 'Le code expire dans 10 minutes',
    checkSpam: 'Vérifiez votre dossier spam si vous ne voyez pas l\'email.',
    cancel: 'Annuler',
  },
  ht: {
    title: 'Verifikasyon obligatwa',
    description: 'Yon kòd 6 chif voye nan imèl ou',
    enterCode: 'Antre kòd verifikasyon an',
    verify: 'Verifye',
    verifying: 'Verifikasyon...',
    resend: 'Revoye kòd',
    resending: 'Anvwa...',
    resent: 'Kòd revoye!',
    invalidCode: 'Kòd envalid oswa ekspire. Tanpri eseye ankò.',
    codeExpires: 'Kòd la ekspire nan 10 minit',
    checkSpam: 'Tcheke dosye spam ou si ou pa wè imèl la.',
    cancel: 'Anile',
  },
};

interface LoginOtpVerificationProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<boolean>;
}

export default function LoginOtpVerification({
  email,
  onVerified,
  onCancel,
  onResend,
  onVerify,
}: LoginOtpVerificationProps) {
  const { language } = useLanguage();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const lt = (key: string) => otpTranslations[language]?.[key] || otpTranslations['en'][key] || key;

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeStr = fullCode || code.join('');
    if (codeStr.length !== 6) return;

    setIsVerifying(true);
    setError('');

    const valid = await onVerify(codeStr);
    if (valid) {
      onVerified();
    } else {
      setError(lt('invalidCode'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setIsVerifying(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    setResent(false);
    setError('');
    await onResend();
    setIsResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E40AF]/5 via-background to-[#C5A033]/5 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{lt('title')}</CardTitle>
            <CardDescription>
              {lt('description')}
              <br />
              <span className="mt-1 inline-flex items-center gap-1 font-medium text-foreground">
                <Mail className="h-3 w-3" /> {maskedEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-center text-muted-foreground">
                {lt('enterCode')}
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-14 w-12 text-center text-2xl font-bold"
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            {resent && (
              <p className="text-center text-sm text-green-600">{lt('resent')}</p>
            )}

            <Button
              onClick={() => handleVerify()}
              className="w-full"
              disabled={isVerifying || code.join('').length !== 6}
            >
              {isVerifying ? lt('verifying') : lt('verify')}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
                className="text-muted-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                {isResending ? lt('resending') : lt('resend')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground"
              >
                {lt('cancel')}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {lt('codeExpires')}<br />{lt('checkSpam')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
