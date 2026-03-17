import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function LegalPage() {
  const { docType } = useParams<{ docType: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["legal-doc", docType],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_documents")
        .select("*")
        .eq("document_type", docType)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!docType,
  });

  const lang = language as "fr" | "en" | "ht";
  const title = doc?.[`title_${lang}`] || doc?.title_fr || "";
  const content = doc?.[`content_${lang}`] || doc?.content_fr || "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <LanguageSelector />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-6">{title}</h1>
        
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-foreground/80 leading-relaxed">
          {content}
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          Version {doc?.version || 1} — {doc?.updated_at ? new Date(doc.updated_at).toLocaleDateString() : ""}
        </div>
      </div>
    </div>
  );
}
