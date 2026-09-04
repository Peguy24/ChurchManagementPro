import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PolicyStatus {
  document_type: string;
  current_version: number;
  accepted_version: number | null;
  needs_acceptance: boolean;
}

const TXT = {
  fr: {
    title: "Nos politiques ont été mises à jour",
    desc: "Merci de lire et d'accepter les documents suivants pour continuer à utiliser la plateforme.",
    accept: "J'accepte",
    read: "Lire",
    confirm: "Confirmer l'acceptation",
    later: "Plus tard",
    saved: "Acceptation enregistrée. Merci !",
    error: "Impossible d'enregistrer l'acceptation",
    checkAll: "Veuillez cocher tous les documents",
    docs: {
      terms_of_use: "Conditions d'utilisation",
      privacy_policy: "Politique de confidentialité",
      payment_terms: "Conditions de paiement",
    } as Record<string, string>,
  },
  en: {
    title: "Our policies have been updated",
    desc: "Please read and accept the following documents to continue using the platform.",
    accept: "I accept",
    read: "Read",
    confirm: "Confirm acceptance",
    later: "Later",
    saved: "Acceptance recorded. Thank you!",
    error: "Could not record the acceptance",
    checkAll: "Please tick every document",
    docs: {
      terms_of_use: "Terms of Use",
      privacy_policy: "Privacy Policy",
      payment_terms: "Payment Terms",
    } as Record<string, string>,
  },
  ht: {
    title: "Politik nou yo mete ajou",
    desc: "Tanpri li epi aksepte dokiman sa yo pou kontinye itilize plataform la.",
    accept: "Mwen aksepte",
    read: "Li",
    confirm: "Konfime akseptasyon",
    later: "Pita",
    saved: "Akseptasyon anrejistre. Mèsi!",
    error: "Nou pa ka anrejistre akseptasyon an",
    checkAll: "Tanpri koche tout dokiman yo",
    docs: {
      terms_of_use: "Kondisyon Itilizasyon",
      privacy_policy: "Politik Konfidansyalite",
      payment_terms: "Kondisyon Peman",
    } as Record<string, string>,
  },
};

export default function PolicyReacceptanceBanner() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { tenant } = useCurrentTenant();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const t = TXT[(language as keyof typeof TXT)] || TXT.fr;

  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const tenantId = tenant?.id;
  const enabled = Boolean(user && tenantId && isAdmin && !isSuperAdmin);

  const { data: pending } = useQuery({
    queryKey: ["policy-status", tenantId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tenant_policy_status", {
        _tenant_id: tenantId,
      });
      if (error) throw error;
      return ((data || []) as PolicyStatus[]).filter((d) => d.needs_acceptance);
    },
  });

  if (!enabled || dismissed || !pending || pending.length === 0) return null;

  const handleConfirm = async () => {
    if (!pending.every((d) => checked[d.document_type])) {
      toast.error(t.checkAll);
      return;
    }
    setSaving(true);
    try {
      const profileName =
        (user?.user_metadata?.first_name || user?.user_metadata?.last_name)
          ? `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim()
          : user?.email || "";

      const rows = pending.map((d) => ({
        tenant_id: tenantId,
        document_type: d.document_type,
        document_version: d.current_version,
        accepted_by: user!.id,
        accepted_by_name: profileName,
        accepted_by_email: user?.email || null,
      }));

      const { error } = await (supabase as any).from("tenant_policy_acceptances").insert(rows);
      if (error) throw error;
      toast.success(t.saved);
      queryClient.invalidateQueries({ queryKey: ["policy-status", tenantId] });
      setDismissed(true);
    } catch (e: any) {
      console.error(e);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{t.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>

          <div className="mt-3 space-y-2">
            {pending.map((d) => (
              <div key={d.document_type} className="flex flex-wrap items-center gap-2 text-sm">
                <Checkbox
                  id={`policy-${d.document_type}`}
                  checked={!!checked[d.document_type]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [d.document_type]: v === true }))
                  }
                />
                <label htmlFor={`policy-${d.document_type}`} className="cursor-pointer">
                  {t.accept} — {t.docs[d.document_type] || d.document_type} (v{d.current_version})
                </label>
                <Link
                  to={`/legal/${d.document_type}`}
                  target="_blank"
                  className="text-primary underline underline-offset-2"
                >
                  {t.read}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={handleConfirm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.confirm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              {t.later}
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
