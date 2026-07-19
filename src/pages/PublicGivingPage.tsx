import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, HeartHandshake, CreditCard, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Config {
  tenant_id: string;
  tenant_name: string;
  logo_url: string | null;
  primary_color: string | null;
  currency: string;
  stripe_enabled: boolean;
  moncash_enabled: boolean;
  min_amount: number;
  suggested_amounts: number[];
  thank_you_message: Record<string, string>;
  cover_image_url: string | null;
}

const copy = {
  en: {
    heading: "Give to", subtitle: "Your gift supports our mission and ministry.",
    amount: "Amount", donorName: "Your name (optional)", donorEmail: "Email (for receipt)",
    message: "Message (optional)", method: "Payment method", card: "Credit / Debit Card",
    moncash: "MonCash", give: "Give now", loading: "Redirecting...",
    unavailable: "Online giving is not available for this church.",
    minAmount: "Minimum amount is",
  },
  fr: {
    heading: "Faire un don à", subtitle: "Votre don soutient notre mission et notre ministère.",
    amount: "Montant", donorName: "Votre nom (optionnel)", donorEmail: "E-mail (pour le reçu)",
    message: "Message (optionnel)", method: "Méthode de paiement", card: "Carte bancaire",
    moncash: "MonCash", give: "Donner maintenant", loading: "Redirection...",
    unavailable: "Les dons en ligne ne sont pas disponibles pour cette église.",
    minAmount: "Le montant minimum est",
  },
  ht: {
    heading: "Bay don pou", subtitle: "Don ou sipòte misyon nou.",
    amount: "Montan", donorName: "Non ou (opsyonèl)", donorEmail: "Imèl (pou resi)",
    message: "Mesaj (opsyonèl)", method: "Metòd peman", card: "Kat kredi/debi",
    moncash: "MonCash", give: "Bay kounye a", loading: "N ap voye ou...",
    unavailable: "Don an liy pa disponib pou legliz sa a.",
    minAmount: "Montan minimòm se",
  },
};

export default function PublicGivingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (copy as any)[language] || copy.en;

  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<"card" | "moncash">("card");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_giving_config", { _slug: slug });
      if (error || !data || data.length === 0) {
        setConfig(null);
      } else {
        const c = data[0] as any;
        setConfig(c);
        setAmount(c.suggested_amounts?.[0] ?? c.min_amount ?? 10);
        setMethod(c.stripe_enabled ? "card" : "moncash");
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    if (amount < Number(config.min_amount)) {
      toast.error(`${t.minAmount} ${config.min_amount} ${config.currency}`);
      return;
    }
    if (!donorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
      toast.error("Invalid email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          slug,
          amount,
          method,
          donor_name: donorName || null,
          donor_email: donorEmail,
          message: message || null,
          language,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t.unavailable}</p>
            <Button className="mt-4" onClick={() => navigate(`/site/${slug}`)}>← Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primary = config.primary_color || "hsl(var(--primary))";

  return (
    <div className="min-h-screen bg-muted/30">
      {config.cover_image_url && (
        <div className="h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${config.cover_image_url})` }} />
      )}
      <div className="container max-w-xl py-8">
        <div className="flex items-center gap-3 mb-6">
          {config.logo_url && <img src={config.logo_url} alt="" className="h-14 w-14 rounded-full object-cover border" />}
          <div>
            <h1 className="text-2xl font-bold">{t.heading} {config.tenant_name}</h1>
            <p className="text-muted-foreground text-sm">{t.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5" style={{ color: primary }} /> {t.give}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>{t.amount} ({config.currency})</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-3">
                  {config.suggested_amounts?.map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={amount === a ? "default" : "outline"}
                      onClick={() => setAmount(a)}
                      style={amount === a ? { backgroundColor: primary, borderColor: primary } : undefined}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={config.min_amount}
                  step="0.01"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label>{t.donorName}</Label>
                <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} maxLength={100} />
              </div>

              <div>
                <Label>{t.donorEmail} *</Label>
                <Input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} required maxLength={200} />
              </div>

              <div>
                <Label>{t.message}</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={500} />
              </div>

              <div>
                <Label>{t.method}</Label>
                <RadioGroup value={method} onValueChange={(v: "card" | "moncash") => setMethod(v)} className="mt-2 space-y-2">
                  {config.stripe_enabled && (
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="card" id="m-card" />
                      <Label htmlFor="m-card" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-4 w-4" /> {t.card}
                      </Label>
                    </div>
                  )}
                  {config.moncash_enabled && (
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="moncash" id="m-moncash" />
                      <Label htmlFor="m-moncash" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Smartphone className="h-4 w-4" /> {t.moncash}
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={submitting} style={{ backgroundColor: primary, borderColor: primary }}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.loading}</> : t.give}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
