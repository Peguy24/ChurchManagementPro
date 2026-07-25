import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Rating = "up" | "down";

const COPY: Record<string, Record<string, string>> = {
  en: {
    helpful: "Helpful",
    notHelpful: "Not helpful",
    thanks: "Thanks for your feedback",
    saved: "Feedback saved",
    error: "Could not save your feedback",
    placeholder: "What was wrong with this answer? (optional)",
    send: "Send",
    skip: "Skip",
  },
  fr: {
    helpful: "Utile",
    notHelpful: "Pas utile",
    thanks: "Merci pour votre retour",
    saved: "Retour enregistré",
    error: "Impossible d'enregistrer votre retour",
    placeholder: "Qu'est-ce qui n'allait pas dans cette réponse ? (facultatif)",
    send: "Envoyer",
    skip: "Ignorer",
  },
  ht: {
    helpful: "Itil",
    notHelpful: "Pa itil",
    thanks: "Mèsi pou opinyon w",
    saved: "Opinyon anrejistre",
    error: "Nou pa t kapab anrejistre opinyon w",
    placeholder: "Kisa ki pa t bon nan repons sa a ? (opsyonèl)",
    send: "Voye",
    skip: "Sote",
  },
};

interface Props {
  messageId: string;
  question: string;
  answer: string;
  language: string;
  assistantRole?: string;
}

export default function AiMessageFeedback({
  messageId,
  question,
  answer,
  language,
  assistantRole,
}: Props) {
  const copy = COPY[language] ?? COPY.en;
  const [rating, setRating] = useState<Rating | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (value: Rating, commentText?: string) => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();

      const { error } = await supabase.from("ai_assistant_feedback").upsert(
        {
          user_id: userId,
          tenant_id: profile?.tenant_id ?? null,
          message_id: messageId,
          rating: value,
          comment: commentText?.trim() || null,
          question: question.slice(0, 2000) || null,
          answer: answer.slice(0, 8000) || null,
          assistant_role: assistantRole ?? null,
          language,
        },
        { onConflict: "user_id,message_id" },
      );
      if (error) throw error;
      toast({ title: commentText !== undefined ? copy.saved : copy.thanks });
    } catch (e) {
      toast({
        title: copy.error,
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pick = (value: Rating) => {
    setRating(value);
    setShowComment(value === "down");
    void save(value);
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          aria-label={copy.helpful}
          aria-pressed={rating === "up"}
          className={cn("h-7 w-7 p-0 text-muted-foreground", rating === "up" && "text-primary")}
          onClick={() => pick("up")}
        >
          <ThumbsUp className={cn("h-3.5 w-3.5", rating === "up" && "fill-current")} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          aria-label={copy.notHelpful}
          aria-pressed={rating === "down"}
          className={cn("h-7 w-7 p-0 text-muted-foreground", rating === "down" && "text-destructive")}
          onClick={() => pick("down")}
        >
          <ThumbsDown className={cn("h-3.5 w-3.5", rating === "down" && "fill-current")} />
        </Button>
      </div>

      {showComment && (
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            placeholder={copy.placeholder}
            maxLength={1000}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={saving}
              onClick={async () => {
                await save(rating ?? "down", comment);
                setShowComment(false);
              }}
            >
              {copy.send}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowComment(false)}
            >
              {copy.skip}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
