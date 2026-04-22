import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Link2, Copy, Check, Loader2, AlertTriangle, Shield, Wallet, MessageSquare, HeadphonesIcon, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Database } from "@/integrations/supabase/types";
import { FieldError } from "@/components/FieldError";
import { validateForm, inviteSchema, firstErrorMessage } from "@/lib/validation";

type PlatformRole = Database["public"]["Enums"]["platform_role"];

interface PlatformInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_ROLE_ICONS: Record<PlatformRole, React.ReactNode> = {
  super_admin: <Shield className="h-4 w-4" />,
  finance_admin: <Wallet className="h-4 w-4" />,
  moderator: <MessageSquare className="h-4 w-4" />,
  support: <HeadphonesIcon className="h-4 w-4" />,
  sales: <TrendingUp className="h-4 w-4" />,
};

const PLATFORM_ROLES: PlatformRole[] = ["super_admin", "finance_admin", "moderator", "support", "sales"];

export function PlatformInviteDialog({ open, onOpenChange }: PlatformInviteDialogProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("support");
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"email" | "link" | null>(null);

  const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
    super_admin: t("platform.roleSuperAdmin"),
    finance_admin: t("platform.roleFinanceAdmin"),
    moderator: t("platform.roleModerator"),
    support: t("platform.roleSupport"),
    sales: t("platform.roleSales"),
  };

  const PLATFORM_ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
    super_admin: t("platform.roleSuperAdminDesc"),
    finance_admin: t("platform.roleFinanceAdminDesc"),
    moderator: t("platform.roleModeratorDesc"),
    support: t("platform.roleSupportDesc"),
    sales: t("platform.roleSalesDesc"),
  };

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
    const validation = validateForm(inviteSchema, { email });
    if (!validation.success) {
      setEmailError(validation.fieldErrors.email || "");
      toast.error(firstErrorMessage(validation.fieldErrors) || t("common.error"));
      return;
    }
    setEmailError("");

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
        toast.success(t("platform.inviteLinkGenerated"));
      } else {
        toast.success(`${t("platform.inviteEmailSent")} ${email}`);
        handleClose(false);
      }
    } catch (err: any) {
      console.error("Error generating invitation:", err);
      if (skipEmail) {
        toast.error(t("common.error") + ": " + err.message);
      } else {
        toast.error(t("platform.emailErrorTryLink"));
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
      toast.success(t("platform.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t("platform.copyError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            {t("platform.invitePlatformAdmin")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.invitePlatformAdminDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-email">{t("common.email")}</Label>
            <Input
              id="platform-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              disabled={!!invitationLink}
            />
            <FieldError name="email" errors={emailError ? { email: emailError } : {}} />
          </div>

          <div className="space-y-2">
            <Label>{t("tenant.role")}</Label>
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
                  {t("platform.sendByEmail")}
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
                  {t("platform.generateLink")}
                </Button>
              </div>

              {selectedRole === "super_admin" && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <strong>{t("platform.warning")}:</strong> {t("platform.superAdminWarning")}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t("platform.invitationLink")}</Label>
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
                  <p><strong>{t("platform.secureLink")}</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>{t("platform.validFor7Days")}</li>
                    <li>{t("platform.assignedRole")}: <strong>{PLATFORM_ROLE_LABELS[selectedRole]}</strong></li>
                    <li>{t("platform.shareOnlyWithPerson")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}