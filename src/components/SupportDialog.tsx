import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Headphones } from "lucide-react";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  plan?: string | null;
}

export default function SupportDialog({ open, onOpenChange, onSuccess, plan }: SupportDialogProps) {
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  // Auto-elevate priority based on plan
  useEffect(() => {
    if (plan === "entreprise") {
      setPriority("high");
    } else if (plan === "professionnel") {
      setPriority("high");
    } else {
      setPriority("medium");
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supportTier = plan === "entreprise" ? "24/7" : plan === "professionnel" ? "prioritaire" : "standard";

      const response = await supabase.functions.invoke("send-support-email", {
        body: {
          action: "create_ticket",
          subject: subject.trim(),
          message: message.trim(),
          priority,
          category,
          tenantId,
          supportTier,
        },
      });

      if (response.error) throw response.error;

      setSubject("");
      setMessage("");
      setCategory("general");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      console.error("Failed to create ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  const isValid = subject.trim().length >= 5 && message.trim().length >= 20;

  const getSupportTierInfo = () => {
    if (plan === "entreprise") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Headphones className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Support 24/7</span>
          <Badge className="bg-primary text-primary-foreground text-xs">Entreprise</Badge>
        </div>
      );
    }
    if (plan === "professionnel") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
          <Shield className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium">Support Prioritaire</span>
          <Badge variant="secondary" className="text-xs">Professionnel</Badge>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("layout.supportNewTicket")}</DialogTitle>
          <DialogDescription>
            {plan === "entreprise"
              ? "Votre ticket sera traité en priorité absolue (24/7)."
              : plan === "professionnel"
              ? "Votre ticket sera traité en priorité."
              : "Décrivez votre problème, notre équipe vous répondra par email."}
          </DialogDescription>
        </DialogHeader>

        {getSupportTierInfo()}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("layout.supportSubject")}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("layout.supportCategory")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("layout.supportGeneral")}</SelectItem>
                  <SelectItem value="billing">{t("layout.supportBilling")}</SelectItem>
                  <SelectItem value="technical">{t("layout.supportTechnical")}</SelectItem>
                  <SelectItem value="feature_request">{t("layout.supportFeatureRequest")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("layout.supportPriority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" disabled={plan === "entreprise" || plan === "professionnel"}>
                    {t("layout.supportLow")}
                  </SelectItem>
                  <SelectItem value="medium" disabled={plan === "entreprise"}>
                    {t("layout.supportMedium")}
                  </SelectItem>
                  <SelectItem value="high">{t("layout.supportHigh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("layout.supportMessage")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="..."
              required
            />
            <p className="text-xs text-muted-foreground">{message.length}/2000</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("layout.supportSendTicket")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
