import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Link2, Copy, Check, Loader2, AlertTriangle, Shield } from "lucide-react";

interface SuperAdminInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperAdminInviteDialog({ open, onOpenChange }: SuperAdminInviteDialogProps) {
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
    if (!email) return;

    setIsLoading(true);
    setMode(skipEmail ? "link" : "email");

    try {
      const { data, error } = await supabase.functions.invoke('send-superadmin-invite', {
        body: {
          email,
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
        toast.error("Erreur: " + err.message);
      } else {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Inviter un Super Administrateur
          </DialogTitle>
          <DialogDescription>
            Invitez un nouvel administrateur de la plateforme avec un accès complet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="superadmin-email">Email du Super Administrateur</Label>
            <Input
              id="superadmin-email"
              type="email"
              placeholder="admin@example.com"
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

              <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <AlertTriangle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  <strong>Attention :</strong> Un Super Administrateur a accès à toutes les fonctionnalités de la plateforme, y compris la gestion de tous les tenants.
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
                    <li>Donne un accès Super Admin complet</li>
                    <li>Ne le partagez qu'avec la personne concernée</li>
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
