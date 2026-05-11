import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type ExistingReview = {
  id: string;
  rating: number;
  text: string;
  reviewer_name: string;
  reviewer_role: string | null;
  church_name: string;
  city: string | null;
  country: string | null;
  status: "pending" | "approved" | "rejected" | string;
  moderation_notes: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaveReviewDialog({ open, onOpenChange }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<ExistingReview | null>(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [church, setChurch] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }
      // Prefill from profile + tenant
      const [{ data: profile }, { data: review }] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, tenant_id")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("client_reviews")
          .select("id, rating, text, reviewer_name, reviewer_role, church_name, city, country, status, moderation_notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (review) {
        setExisting(review as ExistingReview);
        setRating(review.rating);
        setName(review.reviewer_name);
        setRole(review.reviewer_role ?? "");
        setChurch(review.church_name);
        setCity(review.city ?? "");
        setCountry(review.country ?? "");
        setText(review.text);
        setConsent(true);
      } else {
        setExisting(null);
        setName(
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim(),
        );
        if (profile?.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", profile.tenant_id)
            .maybeSingle();
          if (tenant?.name) setChurch(tenant.name);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast({
        title: t("dashboard.leaveReview.errorShort"),
        variant: "destructive",
      });
      return;
    }
    if (!consent) {
      toast({
        title: t("dashboard.leaveReview.errorConsent"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (existing && existing.status !== "rejected") {
        const { error } = await supabase
          .from("client_reviews")
          .update({
            rating,
            reviewer_name: name.trim(),
            reviewer_role: role.trim() || null,
            church_name: church.trim(),
            city: city.trim() || null,
            country: country.trim() || null,
            text: text.trim(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        toast({ title: t("dashboard.leaveReview.updated") });
      } else {
        const { data, error } = await supabase.functions.invoke("submit-client-review", {
          body: {
            reviewer_name: name.trim(),
            reviewer_role: role.trim() || null,
            church_name: church.trim(),
            city: city.trim() || null,
            country: country.trim() || null,
            rating,
            text: text.trim(),
            language,
            consent_public_display: true,
          },
        });
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        toast({ title: t("dashboard.leaveReview.submitted") });
      }
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: t("dashboard.leaveReview.errorGeneric"),
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = existing && (
    <Badge variant={existing.status === "approved" ? "default" : existing.status === "rejected" ? "destructive" : "secondary"}>
      {t(`dashboard.leaveReview.status_${existing.status}`)}
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("dashboard.leaveReview.title")}
            {statusBadge}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.leaveReview.description")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("common.loading")}
          </p>
        ) : (
          <div className="space-y-4">
            {existing?.status === "rejected" && existing.moderation_notes && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium mb-1">{t("dashboard.leaveReview.rejectedTitle")}</p>
                <p className="text-muted-foreground">{existing.moderation_notes}</p>
              </div>
            )}

            <div>
              <Label className="mb-2 block">{t("dashboard.leaveReview.rating")}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        n <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rv-name">{t("dashboard.leaveReview.name")}</Label>
                <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="rv-role">{t("dashboard.leaveReview.role")}</Label>
                <Input
                  id="rv-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={60}
                  placeholder={t("dashboard.leaveReview.rolePlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rv-church">{t("dashboard.leaveReview.church")}</Label>
              <Input id="rv-church" value={church} onChange={(e) => setChurch(e.target.value)} maxLength={120} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rv-city">{t("dashboard.leaveReview.city")}</Label>
                <Input id="rv-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
              </div>
              <div>
                <Label htmlFor="rv-country">{t("dashboard.leaveReview.country")}</Label>
                <Input id="rv-country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="rv-text">{t("dashboard.leaveReview.text")}</Label>
                <span className="text-xs text-muted-foreground">{text.length}/500</span>
              </div>
              <Textarea
                id="rv-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                rows={5}
                maxLength={500}
                placeholder={t("dashboard.leaveReview.textPlaceholder")}
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                {t("dashboard.leaveReview.consent")}
              </span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || submitting}>
            {submitting
              ? t("common.saving")
              : existing && existing.status !== "rejected"
              ? t("dashboard.leaveReview.update")
              : t("dashboard.leaveReview.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
