import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const texts = {
  en: { success: "Thank you for your gift!", cancel: "Donation cancelled.", back: "Back to church site", default: "Your generosity makes a difference." },
  fr: { success: "Merci pour votre don !", cancel: "Don annulé.", back: "Retour au site", default: "Votre générosité fait la différence." },
  ht: { success: "Mèsi pou don ou!", cancel: "Don anile.", back: "Retounen", default: "Jenerozite ou fè yon diferans." },
};

export default function GivingResult({ status }: { status: "success" | "cancel" }) {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (texts as any)[language] || texts.en;
  const [thankYou, setThankYou] = useState<string>("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.rpc("get_public_giving_config", { _slug: slug });
      if (data && data[0]?.thank_you_message?.[language]) {
        setThankYou(data[0].thank_you_message[language]);
      }
    })();
  }, [slug, language]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {status === "success" ? (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h1 className="text-2xl font-bold">{t.success}</h1>
              <p className="text-muted-foreground">{thankYou || t.default}</p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 mx-auto text-muted-foreground" />
              <h1 className="text-2xl font-bold">{t.cancel}</h1>
            </>
          )}
          <Button onClick={() => navigate(`/site/${slug}`)}>{t.back}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
