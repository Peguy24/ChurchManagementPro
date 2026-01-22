import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Link2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";

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
  const [email, setEmail] = useState("");
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
    if (!tenant || !email) return;

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
        },
      });

      if (error) throw error;

      if (skipEmail) {
        setInvitationLink(data.invitationLink);
        toast.success("Lien d'invitation généré avec succès");
      } else {
        toast.success(`Email d'invitation envoyé à ${email}`);
        handleClose(false);
      }
    } catch (err: any) {
      console.error("Error generating invitation:", err);
      if (skipEmail) {
        // Even if there's an error, try to show the link if we got one
        toast.error("Erreur: " + err.message);
      } else {
        // For email sending, suggest using the link option
        toast.error("Erreur d'envoi email. Essayez 'Générer le lien' à la place.");
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
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Impossible de copier le lien");
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un administrateur</DialogTitle>
          <DialogDescription>
            Invitez un administrateur pour <strong>{tenant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email de l'administrateur</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@eglise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitationLink}
            />
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
                  Envoyer par email
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
                  Générer le lien
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Conseil :</strong> Si l'envoi d'email échoue, utilisez "Générer le lien" pour obtenir un lien que vous pouvez partager via WhatsApp, SMS, etc.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Lien d'invitation</Label>
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
                  <p><strong>Lien sécurisé et à usage unique</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Valide pendant 7 jours</li>
                    <li>Ne le partagez qu'avec la personne concernée</li>
                    <li>Peut être partagé via WhatsApp, SMS, etc.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}