import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";

export type AttributionModel = "first_click" | "last_click";

export default function ReferralAttributionSettings({
  onChange,
}: {
  onChange?: (model: AttributionModel) => void;
}) {
  const [model, setModel] = useState<AttributionModel>("last_click");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "referral_attribution_model")
        .maybeSingle();
      const value = (data?.setting_value as string) === "first_click" ? "first_click" : "last_click";
      setModel(value);
      onChange?.(value);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ setting_value: model, updated_at: new Date().toISOString() })
        .eq("setting_key", "referral_attribution_model");
      if (error) throw error;
      onChange?.(model);
      toast.success("Attribution model saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save attribution model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Attribution settings
        </CardTitle>
        <CardDescription>
          Decides which referring church gets credit when a visitor clicked more than one referral link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <RadioGroup value={model} onValueChange={(v) => setModel(v as AttributionModel)} className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="last_click" id="attr-last" className="mt-1" />
                <div>
                  <Label htmlFor="attr-last" className="font-medium">Last click</Label>
                  <p className="text-sm text-muted-foreground">
                    The most recent referral link the visitor opened before signing up gets the credit.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="first_click" id="attr-first" className="mt-1" />
                <div>
                  <Label htmlFor="attr-first" className="font-medium">First click</Label>
                  <p className="text-sm text-muted-foreground">
                    The first referral link the visitor ever opened (within 30 days) gets the credit.
                  </p>
                </div>
              </div>
            </RadioGroup>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save attribution model
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
