import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Link2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FieldError } from "@/components/FieldError";
import { validateForm, inviteSchema, firstErrorMessage } from "@/lib/validation";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    inviteAdmin: "Invite an administrator",
    inviteAdminFor: "Invite an administrator for",
    adminEmail: "Administrator email",
    sendByEmail: "Send by email",
    generateLink: "Generate link",
    tip: "Tip",
    tipText: "If email sending fails, use \"Generate link\" to get a link you can share via WhatsApp, SMS, etc.",
    invitationLink: "Invitation link",
    secureLink: "Secure and single-use link",
    validFor: "Valid for 7 days",
    shareOnly: "Share only with the intended person",
    shareVia: "Can be shared via WhatsApp, SMS, etc.",
    close: "Close",
    linkGenerated: "Invitation link generated successfully",
    emailSent: "Invitation email sent to",
    errorSending: "Email sending error. Try 'Generate link' instead.",
    error: "Error",
    linkCopied: "Link copied to clipboard",
    copyError: "Unable to copy link",
    emailAlreadyRegistered: "This email is already registered as",
    approvedStatus: "approved",
    pendingStatus: "pending approval",
  },
  fr: {
    inviteAdmin: "Inviter un administrateur",
    inviteAdminFor: "Invitez un administrateur pour",
    adminEmail: "Email de l'administrateur",
    sendByEmail: "Envoyer par email",
    generateLink: "Générer le lien",
    tip: "Conseil",
    tipText: "Si l'envoi d'email échoue, utilisez \"Générer le lien\" pour obtenir un lien que vous pouvez partager via WhatsApp, SMS, etc.",
    invitationLink: "Lien d'invitation",
    secureLink: "Lien sécurisé et à usage unique",
    validFor: "Valide pendant 7 jours",
    shareOnly: "Ne le partagez qu'avec la personne concernée",
    shareVia: "Peut être partagé via WhatsApp, SMS, etc.",
    close: "Fermer",
    linkGenerated: "Lien d'invitation généré avec succès",
    emailSent: "Email d'invitation envoyé à",
    errorSending: "Erreur d'envoi email. Essayez 'Générer le lien' à la place.",
    error: "Erreur",
    linkCopied: "Lien copié dans le presse-papiers",
    copyError: "Impossible de copier le lien",
    emailAlreadyRegistered: "Cet email est déjà enregistré comme",
    approvedStatus: "approuvé",
    pendingStatus: "en attente d'approbation",
  },
  ht: {
    inviteAdmin: "Envite yon administratè",
    inviteAdminFor: "Envite yon administratè pou",
    adminEmail: "Imèl administratè a",
    sendByEmail: "Voye pa imèl",
    generateLink: "Jenere lyen",
    tip: "Konsèy",
    tipText: "Si anvwa imèl la pa mache, itilize \"Jenere lyen\" pou jwenn yon lyen ou ka pataje pa WhatsApp, SMS, elatriye.",
    invitationLink: "Lyen envitasyon",
    secureLink: "Lyen sekirize ak itilizasyon inik",
    validFor: "Valab pandan 7 jou",
    shareOnly: "Pataje li sèlman ak moun ki konsène a",
    shareVia: "Ka pataje pa WhatsApp, SMS, elatriye.",
    close: "Fèmen",
    linkGenerated: "Lyen envitasyon jenere avèk siksè",
    emailSent: "Imèl envitasyon voye bay",
    errorSending: "Erè nan anvwa imèl. Eseye 'Jenere lyen' pito.",
    error: "Erè",
    linkCopied: "Lyen kopye nan pres-papye",
    copyError: "Enposib kopye lyen nan",
    emailAlreadyRegistered: "Imèl sa a deja anrejistre kòm",
    approvedStatus: "apwouve",
    pendingStatus: "ap tann apwobasyon",
  },
};

interface AdminInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function AdminInviteDialog({ open, onOpenChange, tenant }: AdminInviteDialogProps) {
  const { language, t } = useLanguage();
  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"email" | "link" | null>(null);

  const resetState = () => {
    setEmail("");
    setInvitationLink(null);
    setIsLoading(false);
    setCopied(false);
    setMode(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const generateInvitation = async (skipEmail: boolean) => {
    if (!tenant) return;
    const validation = validateForm(inviteSchema, { email });
    if (!validation.success) {
      setEmailError(validation.fieldErrors.email || "");
      toast.error(firstErrorMessage(validation.fieldErrors, t) || lt("error"));
      return;
    }
    setEmailError("");

    setIsLoading(true);
    setMode(skipEmail ? "link" : "email");

    try {
      const { data, error } = await supabase.functions.invoke('send-admin-invite', {
        body: {
          email,
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          skipEmail,
          language,
        },
      });

      if (error) {
        // Check if the error contains alreadyExists info (409 response)
        const errorBody = typeof error === 'object' && error !== null ? error : {};
        const errorMsg = (error as any)?.message || '';
        
        // supabase.functions.invoke puts non-2xx body in data when there's a FunctionsHttpError
        if (data?.alreadyExists) {
          const roleLabel = data.role || 'admin';
          const statusLabel = data.isApproved ? lt("approvedStatus") || 'approved' : lt("pendingStatus") || 'pending';
          toast.error(`${lt("emailAlreadyRegistered") || "This email is already registered as"} ${roleLabel} (${statusLabel})`);
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorMsg || 'Unknown error');
      }

      if (skipEmail) {
        setInvitationLink(data.invitationLink);
        toast.success(lt("linkGenerated"));
      } else {
        toast.success(`${lt("emailSent")} ${email}`);
        handleClose(false);
      }
    } catch (err: any) {
      console.error("Error generating invitation:", err);
      if (skipEmail) {
        toast.error(`${lt("error")}: ${err.message}`);
      } else {
        toast.error(lt("errorSending"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success(lt("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(lt("copyError"));
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lt("inviteAdmin")}</DialogTitle>
          <DialogDescription>
            {lt("inviteAdminFor")} <strong>{tenant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">{lt("adminEmail")}</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@eglise.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              disabled={!!invitationLink}
            />
            <FieldError name="email" errors={emailError ? { email: emailError } : {}} />
          </div>

          {!invitationLink ? (
            <>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => generateInvitation(false)}
                  disabled={!email || isLoading}
                >
                  {isLoading && mode === "email" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {lt("sendByEmail")}
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => generateInvitation(true)}
                  disabled={!email || isLoading}
                >
                  {isLoading && mode === "link" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  {lt("generateLink")}
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>{lt("tip")} :</strong> {lt("tipText")}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{lt("invitationLink")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={invitationLink}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
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
                  <p><strong>{lt("secureLink")}</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>{lt("validFor")}</li>
                    <li>{lt("shareOnly")}</li>
                    <li>{lt("shareVia")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  {lt("close")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
