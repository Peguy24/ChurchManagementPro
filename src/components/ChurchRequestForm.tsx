import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Church, Send, Loader2, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChurchRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan?: string;
}

interface ProvisionResult {
  success: boolean;
  registrationLink: string;
  emailSent: boolean;
  message: string;
  slug: string;
}

export function ChurchRequestForm({ open, onOpenChange, selectedPlan = "basic" }: ChurchRequestFormProps) {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [policiesAccepted, setPoliciesAccepted] = useState<Record<string, boolean>>({
    terms_of_use: false,
    privacy_policy: false,
    payment_terms: false,
  });
  const [formData, setFormData] = useState({
    church_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    requested_plan: selectedPlan,
    message: "",
  });

  const { data: legalDocs } = useQuery({
    queryKey: ["legal-documents-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_documents")
        .select("*")
        .eq("is_active", true)
        .order("document_type");
      if (error) throw error;
      return data as any[];
    },
  });

  const lang = (language || "fr") as "fr" | "en" | "ht";
  const allPoliciesAccepted = Object.values(policiesAccepted).every(Boolean);

  const policyLabels: Record<string, Record<string, string>> = {
    terms_of_use: { fr: "Conditions d'Utilisation", en: "Terms of Use", ht: "Kondisyon Itilizasyon" },
    privacy_policy: { fr: "Politique de Confidentialité", en: "Privacy Policy", ht: "Politik Konfidansyalite" },
    payment_terms: { fr: "Conditions de Paiement", en: "Payment Terms", ht: "Kondisyon Peman" },
  };

  const policyAcceptText: Record<string, string> = {
    fr: "J'accepte les",
    en: "I accept the",
    ht: "Mwen aksepte",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.church_name || !formData.contact_name || !formData.contact_email) {
      toast.error(t("churchForm.requiredFields"));
      return;
    }

    if (!allPoliciesAccepted) {
      const msg: Record<string, string> = {
        fr: "Vous devez accepter toutes les politiques pour continuer",
        en: "You must accept all policies to continue",
        ht: "Ou dwe aksepte tout politik yo pou w kontinye",
      };
      toast.error(msg[lang] || msg.fr);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-provision-tenant', {
        body: {
          church_name: formData.church_name,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          requested_plan: formData.requested_plan,
          message: formData.message || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as ProvisionResult);

      // Record policy acceptances
      if (data?.tenantId || data?.slug) {
        try {
          const docTypes = ["terms_of_use", "privacy_policy", "payment_terms"];
          for (const docType of docTypes) {
            const doc = legalDocs?.find((d: any) => d.document_type === docType);
            await (supabase as any).from("tenant_policy_acceptances").insert({
              tenant_id: data.tenantId,
              document_type: docType,
              document_version: doc?.version || 1,
              accepted_by_name: formData.contact_name,
              accepted_by_email: formData.contact_email,
            });
          }
        } catch (err) {
          console.warn("Failed to record policy acceptances:", err);
        }
      }
      
      if (data.emailSent) {
        toast.success(t("churchForm.successWithEmail"));
      } else {
        toast.success(t("churchForm.successWithLink"));
      }
    } catch (error: any) {
      console.error("Error provisioning tenant:", error);
      toast.error(t("churchForm.errorCreating") + ": " + (error.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (result?.registrationLink) {
      navigator.clipboard.writeText(result.registrationLink);
      toast.success(t("churchForm.linkCopied"));
    }
  };

  const handleClose = () => {
    setResult(null);
    setPoliciesAccepted({ terms_of_use: false, privacy_policy: false, payment_terms: false });
    setFormData({
      church_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      requested_plan: "basic",
      message: "",
    });
    onOpenChange(false);
  };

  // Success screen
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t("churchForm.successTitle")}</h2>
              <p className="text-muted-foreground mt-2">
                {result.emailSent 
                  ? t("churchForm.successEmailMsg")
                  : t("churchForm.successLinkMsg")
                }
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">🔗 {t("churchForm.activationLink")}</p>
              <div className="flex gap-2">
                <Input 
                  value={result.registrationLink} 
                  readOnly 
                  className="text-xs bg-background"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                className="w-full" 
                onClick={() => window.open(result.registrationLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("churchForm.openActivationLink")}
              </Button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⏰ {t("churchForm.trialInfo")}
              </p>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              {t("churchForm.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            {t("churchForm.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("churchForm.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="church_name">{t("churchForm.churchName")} *</Label>
              <Input
                id="church_name"
                value={formData.church_name}
                onChange={(e) => setFormData({ ...formData, church_name: e.target.value })}
                placeholder={t("churchForm.churchNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">{t("churchForm.yourName")} *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder={t("churchForm.yourNamePlaceholder")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">{t("churchForm.email")} *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder={t("churchForm.emailPlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">{t("churchForm.phone")}</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder={t("churchForm.phonePlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("churchForm.address")}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t("churchForm.addressPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested_plan">{t("churchForm.desiredPlan")}</Label>
            <Select 
              value={formData.requested_plan} 
              onValueChange={(v) => setFormData({ ...formData, requested_plan: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{t("churchForm.planEssential")}</SelectItem>
                <SelectItem value="standard">{t("churchForm.planProfessional")}</SelectItem>
                <SelectItem value="premium">{t("churchForm.planEnterprise")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("churchForm.message")}</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t("churchForm.messagePlaceholder")}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("churchForm.submitting")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("churchForm.submitButton")}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
