import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";

const SNOOZE_DAYS = 14;

export function AnnualUpgradePrompt() {
  const { tenantId } = useCurrentTenant();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<any>(null);

  const tt = (en: string, fr: string, ht: string) => (language === "fr" ? fr : language === "ht" ? ht : en);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data: s } = await supabase.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle();
      if (!s || s.status !== "active" || (s.price_monthly ?? 0) <= 0) return;
      // Only if active >= 30 days
      const start = s.current_period_start ? new Date(s.current_period_start) : null;
      if (!start || (Date.now() - start.getTime()) < 30 * 24 * 3600 * 1000) return;
      // Check last prompt
      const { data: last } = await supabase.from("annual_upgrade_prompts").select("*").eq("tenant_id", tenantId).order("shown_at", { ascending: false }).limit(1).maybeSingle();
      if (last) {
        if (last.action === "upgraded") return;
        const cutoff = last.remind_after ? new Date(last.remind_after) : new Date(new Date(last.shown_at).getTime() + SNOOZE_DAYS * 86400000);
        if (cutoff > new Date()) return;
      }
      setSub(s);
      setOpen(true);
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("annual_upgrade_prompts").insert({ tenant_id: tenantId, user_id: u.user?.id, shown_at: new Date().toISOString() });
    })();
  }, [tenantId]);

  const record = async (action: string) => {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("annual_upgrade_prompts").insert({
      tenant_id: tenantId!, user_id: u.user?.id, action,
      remind_after: action === "remind_later" ? new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() : null,
    });
  };

  if (!sub) return null;
  const monthly = Number(sub.price_monthly);
  const yearlyFull = monthly * 12;
  const yearlyDiscounted = Math.round(yearlyFull * 0.85);
  const savings = yearlyFull - yearlyDiscounted;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> {tt("Save 15% with annual billing", "Économisez 15% en payant à l'année", "Sove 15% ak fakti anyèl")}</DialogTitle>
          <DialogDescription>{tt("Switch to yearly and lock in a lower rate.", "Passez à l'année et bloquez un tarif réduit.", "Chanje ale anyèl epi bloke yon pri pi ba.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex justify-between text-sm"><span>{tt("Monthly × 12", "Mensuel × 12", "Chak mwa × 12")}</span><span className="line-through">${yearlyFull.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold"><span>{tt("Annual", "Annuel", "Anyèl")}</span><span className="text-primary">${yearlyDiscounted.toFixed(2)}</span></div>
          <div className="text-center text-sm bg-primary/10 text-primary rounded p-2">
            {tt(`You save $${savings.toFixed(2)} per year`, `Vous économisez $${savings.toFixed(2)} par an`, `Ou sove $${savings.toFixed(2)} pa ane`)}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { record("dismissed"); setOpen(false); }}>{tt("Not now", "Pas maintenant", "Pa kounye a")}</Button>
          <Button variant="outline" onClick={() => { record("remind_later"); setOpen(false); }}>{tt("Remind me later", "Rappeler plus tard", "Sonje pi ta")}</Button>
          <Button onClick={() => { record("upgraded"); setOpen(false); navigate("/subscription"); }}>{tt("Switch to yearly", "Passer à l'année", "Ale anyèl")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
