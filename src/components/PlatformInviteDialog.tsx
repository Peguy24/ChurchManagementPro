import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Link2, Copy, Check, Loader2, AlertTriangle, Shield, Wallet, MessageSquare, HeadphonesIcon, TrendingUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PlatformRole = Database["public"]["Enums"]["platform_role"];

interface PlatformInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: "Super Administrateur",
  finance_admin: "Admin Finance",
  moderator: "Modérateur",
  support: "Support Technique",
  sales: "Commercial / Ventes",
};

const PLATFORM_ROLE_ICONS: Record<PlatformRole, React.ReactNode> = {
  super_admin: <Shield className="h-4 w-4" />,
  finance_admin: <Wallet className="h-4 w-4" />,
  moderator: <MessageSquare className="h-4 w-4" />,
  support: <HeadphonesIcon className="h-4 w-4" />,
  sales: <TrendingUp className="h-4 w-4" />,
};

const PLATFORM_ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  super_admin: "Accès complet à toutes les fonctionnalités de la plateforme",
  finance_admin: "Consulter les données financières globales et les revenus",
  moderator: "Modérer les contenus et gérer les signalements",
  support: "Accéder aux tenants pour le support technique",
  sales: "Gérer les prospects et effectuer des démonstrations",
};

const PLATFORM_ROLES: PlatformRole[] = ["super_admin", "finance_admin", "moderator", "support", "sales"];

export function PlatformInviteDialog({ open, onOpenChange }: PlatformInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("support");
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"email" | "link" | null>(null);

  const resetState = () => {
    setEmail("");
    setSelectedRole("support");
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
          platformRole: selectedRole,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Inviter un Administrateur Plateforme
          </DialogTitle>
          <DialogDescription>
            Invitez un nouvel administrateur avec un rôle spécifique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-email">Email</Label>
            <Input
              id="platform-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitationLink}
            />
          </div>

          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as PlatformRole)}
              disabled={!!invitationLink}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {PLATFORM_ROLE_ICONS[role]}
                      <span>{PLATFORM_ROLE_LABELS[role]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PLATFORM_ROLE_DESCRIPTIONS[selectedRole]}
            </p>
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

              {selectedRole === "super_admin" && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <strong>Attention :</strong> Un Super Administrateur a accès à TOUTES les fonctionnalités, 
                    y compris la gestion des autres admins et tous les tenants.
                  </p>
                </div>
              )}
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
                    <li>Rôle assigné : <strong>{PLATFORM_ROLE_LABELS[selectedRole]}</strong></li>
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
