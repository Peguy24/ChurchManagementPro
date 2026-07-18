import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";

const DAYS = 90;
const cycle = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

export function NpsPrompt() {
  const { tenantId } = useCurrentTenant();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const tt = (en: string, fr: string, ht: string) => (language === "fr" ? fr : language === "ht" ? ht : en);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      // Check tenant admin
      const { data: isAdmin } = await supabase.rpc("is_tenant_admin", { _user_id: u.user.id });
      if (!isAdmin) return;
      // Check dismissal
      const { data: dis } = await supabase.from("nps_dismissals").select("dismissed_until").eq("user_id", u.user.id).maybeSingle();
      if (dis && new Date(dis.dismissed_until) > new Date()) return;
      // Check last submission
      const { data: last } = await supabase.from("nps_surveys").select("submitted_at").eq("user_id", u.user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      if (last && (Date.now() - new Date(last.submitted_at).getTime()) < DAYS * 86400000) return;
      setTimeout(() => setVisible(true), 5000);
    })();
  }, []);

  const submit = async () => {
    if (score === null || !userId) return;
    const { error } = await supabase.from("nps_surveys").insert({
      user_id: userId, tenant_id: tenantId, score, comment: comment || null, survey_cycle: cycle(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success(tt("Thanks for your feedback!", "Merci pour votre retour !", "Mèsi pou fidbak ou!"));
    setVisible(false);
  };

  const snooze = async () => {
    if (!userId) return;
    await supabase.from("nps_dismissals").upsert({ user_id: userId, dismissed_until: new Date(Date.now() + 30 * 86400000).toISOString() });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium">
              {tt("How likely are you to recommend us? (0-10)", "Nous recommanderiez-vous ? (0-10)", "Ki chans w ap rekòmande nou? (0-10)")}
            </p>
            <Button size="icon" variant="ghost" className="h-6 w-6 -mt-1 -mr-1" onClick={snooze}><X className="w-3 h-3" /></Button>
          </div>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} onClick={() => setScore(i)}
                className={`h-8 rounded text-xs font-medium border ${score === i ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                {i}
              </button>
            ))}
          </div>
          {score !== null && (
            <>
              <Textarea placeholder={tt("Anything else? (optional)", "Un commentaire ? (optionnel)", "Yon lòt bagay? (opsyonèl)")} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button size="sm" className="w-full" onClick={submit}>{tt("Submit", "Envoyer", "Voye")}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
