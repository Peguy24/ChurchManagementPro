import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Copy, Gift, Share2, Loader2, Users, CheckCircle2, Sparkles } from "lucide-react";

interface ReferralRow {
  id: string;
  referred_tenant_id: string;
  status: string;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  referred_name?: string;
}

export default function Referrals() {
  const { t, language } = useLanguage();
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ invited: 0, qualified: 0, rewarded: 0, free_months_earned: 0 });
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  const tt = (en: string, fr: string, ht: string) => (language === "fr" ? fr : language === "ht" ? ht : en);

  const shareLink = code ? `${window.location.origin}/?ref=${code}` : "";

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
      const tenantId = profile?.tenant_id;
      if (!tenantId) return;

      const { data: existing } = await (supabase as any)
        .from("referral_codes")
        .select("code, is_active")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (existing) setCode(existing.code);

      const { data: statsData } = await (supabase as any).rpc("get_tenant_referral_stats", { _tenant_id: tenantId });
      if (statsData) setStats(statsData);

      const { data: refs } = await (supabase as any)
        .from("referrals")
        .select("id, referred_tenant_id, status, created_at, qualified_at, rewarded_at")
        .eq("referrer_tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (refs && refs.length) {
        const ids = refs.map((r: any) => r.referred_tenant_id);
        const { data: tenants } = await (supabase as any).from("tenants").select("id, name").in("id", ids);
        const nameMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
        setReferrals(refs.map((r: any) => ({ ...r, referred_name: nameMap.get(r.referred_tenant_id) || "—" })));
      } else {
        setReferrals([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-referral-code");
      if (error) throw error;
      if ((data as any)?.code) setCode((data as any).code);
      toast.success(tt("Referral code ready!", "Code de parrainage prêt !", "Kòd referans pare!"));
      await load();
    } catch (e: any) {
      toast.error(e?.message || tt("Could not generate code", "Impossible de générer le code", "Pa kapab jenere kòd la"));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(tt("Copied!", "Copié !", "Kopye!"));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: tt("Pending", "En attente", "K ap tann"), variant: "secondary" },
      qualified: { label: tt("Qualified", "Qualifié", "Kalifye"), variant: "default" },
      rewarded: { label: tt("Rewarded", "Récompensé", "Rekonpanse"), variant: "default" },
      expired: { label: tt("Expired", "Expiré", "Ekspire"), variant: "outline" },
      rejected: { label: tt("Rejected", "Rejeté", "Rejte"), variant: "destructive" },
    };
    const cfg = map[status] || map.pending;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-7 w-7 text-primary" />
            {tt("Refer a Church", "Parrainer une Église", "Refere yon Legliz")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {tt(
              "Invite another church and you both get 1 month free when they subscribe.",
              "Invitez une autre église et vous obtenez tous les deux 1 mois gratuit lors de leur abonnement.",
              "Envite yon lòt legliz epi tou de a w ap jwenn 1 mwa gratis lè yo abònen."
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardDescription>{tt("Churches invited", "Églises invitées", "Legliz envite")}</CardDescription><CardTitle className="text-3xl">{stats.invited}</CardTitle></CardHeader>
            <CardContent><Users className="h-5 w-5 text-muted-foreground" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>{tt("Qualified", "Qualifiées", "Kalifye")}</CardDescription><CardTitle className="text-3xl">{stats.qualified}</CardTitle></CardHeader>
            <CardContent><CheckCircle2 className="h-5 w-5 text-muted-foreground" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>{tt("Free months earned", "Mois gratuits gagnés", "Mwa gratis ou genyen")}</CardDescription><CardTitle className="text-3xl">{stats.free_months_earned}</CardTitle></CardHeader>
            <CardContent><Sparkles className="h-5 w-5 text-muted-foreground" /></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tt("Your referral link", "Votre lien de parrainage", "Lyen referans ou")}</CardTitle>
            <CardDescription>
              {tt("Share this link with another church. When they subscribe to a paid plan, you both get +30 days.",
                "Partagez ce lien avec une autre église. Quand elles s'abonnent à un plan payant, vous obtenez tous les deux +30 jours.",
                "Pataje lyen sa a ak yon lòt legliz. Lè yo abònen a yon plan peye, tou de jwenn +30 jou.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : code ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tt("Code", "Code", "Kòd")}</label>
                  <div className="flex gap-2">
                    <Input value={code} readOnly className="font-mono text-lg" />
                    <Button variant="outline" size="icon" onClick={() => copy(code)}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tt("Shareable link", "Lien à partager", "Lyen pou pataje")}</label>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copy(shareLink)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => {
                      if (navigator.share) navigator.share({ url: shareLink, title: tt("Join us on Church Management Pro", "Rejoignez-nous sur Church Management Pro", "Vin jwenn nou sou Church Management Pro") }).catch(() => {});
                      else copy(shareLink);
                    }}><Share2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </>
            ) : (
              <Button onClick={generateCode} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
                {tt("Generate my referral code", "Générer mon code de parrainage", "Jenere kòd referans mwen")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tt("Churches you referred", "Églises que vous avez parrainées", "Legliz ou refere")}</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tt("No referrals yet — share your link to get started.", "Aucun parrainage pour l'instant — partagez votre lien pour commencer.", "Pa gen referans toujou — pataje lyen ou pou kòmanse.")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt("Church", "Église", "Legliz")}</TableHead>
                    <TableHead>{tt("Status", "Statut", "Estati")}</TableHead>
                    <TableHead>{tt("Invited on", "Invité le", "Envite nan")}</TableHead>
                    <TableHead>{tt("Rewarded on", "Récompensé le", "Rekonpanse nan")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.referred_name}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{r.rewarded_at ? new Date(r.rewarded_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
