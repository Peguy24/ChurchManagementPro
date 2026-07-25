import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AiDenial = {
  denied: true;
  rule: string;
  table?: string | null;
  column?: string | null;
  requiredScope?: string | null;
  tool?: string | null;
};

/** Detect a structured denial payload returned by a guarded AI tool. */
export function asDenial(output: unknown): AiDenial | null {
  if (output && typeof output === "object" && (output as any).denied === true) {
    return output as AiDenial;
  }
  return null;
}

type Copy = {
  title: string;
  alternatives: string;
  reasons: Record<string, string>;
  fallbackReason: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "This request was blocked",
    alternatives: "Try one of these instead",
    fallbackReason: "The assistant is not allowed to run this request on your church data.",
    reasons: {
      table_not_allowed: "The assistant tried to read data it is not allowed to access.",
      scope_denied: "Your role does not give access to this type of information.",
      column_not_allowed: "The assistant asked for a field that is not available to it.",
      filter_not_allowed: "That filter is not permitted for this kind of question.",
      invalid_date: "The date used was not a valid YYYY-MM-DD date.",
      invalid_identifier: "One of the identifiers used was invalid.",
      too_many_values: "The request covered too many records at once.",
    },
  },
  fr: {
    title: "Cette demande a été bloquée",
    alternatives: "Essayez plutôt l'une de ces questions",
    fallbackReason: "L'assistant n'est pas autorisé à exécuter cette demande sur les données de votre église.",
    reasons: {
      table_not_allowed: "L'assistant a tenté de lire des données auxquelles il n'a pas accès.",
      scope_denied: "Votre rôle ne donne pas accès à ce type d'information.",
      column_not_allowed: "L'assistant a demandé un champ qui ne lui est pas accessible.",
      filter_not_allowed: "Ce filtre n'est pas autorisé pour ce type de question.",
      invalid_date: "La date utilisée n'était pas une date valide au format AAAA-MM-JJ.",
      invalid_identifier: "Un des identifiants utilisés était invalide.",
      too_many_values: "La demande portait sur trop d'enregistrements à la fois.",
    },
  },
  ht: {
    title: "Demann sa a bloke",
    alternatives: "Eseye youn nan kesyon sa yo",
    fallbackReason: "Asistan an pa gen dwa fè demann sa a sou done legliz ou a.",
    reasons: {
      table_not_allowed: "Asistan an te eseye li done li pa gen dwa wè.",
      scope_denied: "Wòl ou pa bay aksè a kalite enfòmasyon sa a.",
      column_not_allowed: "Asistan an te mande yon done ki pa disponib pou li.",
      filter_not_allowed: "Filtè sa a pa pèmèt pou kalite kesyon sa a.",
      invalid_date: "Dat la pa t yon dat valab nan fòma AAAA-MM-JJ.",
      invalid_identifier: "Youn nan idantifyan yo pa t valab.",
      too_many_values: "Demann lan te kouvri twòp dosye alafwa.",
    },
  },
};

/** Safe alternatives shown per denial rule / required scope. */
const ALTERNATIVES: Record<string, Record<string, string[]>> = {
  en: {
    finance: [
      "Who missed the last four Sundays?",
      "Show first-time visitors from this month.",
      "Who has a birthday this week?",
    ],
    members: [
      "Generate a monthly financial summary.",
      "What were our donations last month?",
    ],
    default: [
      "Who missed the last four Sundays?",
      "Which ministry is growing the fastest?",
      "Who has a birthday this week?",
    ],
  },
  fr: {
    finance: [
      "Qui a manqué les quatre derniers dimanches ?",
      "Montre les nouveaux visiteurs de ce mois-ci.",
      "Qui fête son anniversaire cette semaine ?",
    ],
    members: [
      "Génère un résumé financier mensuel.",
      "Quels ont été nos dons le mois dernier ?",
    ],
    default: [
      "Qui a manqué les quatre derniers dimanches ?",
      "Quel ministère grandit le plus vite ?",
      "Qui fête son anniversaire cette semaine ?",
    ],
  },
  ht: {
    finance: [
      "Kiyès ki manke kat dènye dimanch yo ?",
      "Montre m nouvo vizitè mwa sa a.",
      "Kiyès ki gen anivèsè semèn sa a ?",
    ],
    members: [
      "Fè yon rezime finansye mansyèl.",
      "Konbyen ofrann nou te resevwa mwa pase ?",
    ],
    default: [
      "Kiyès ki manke kat dènye dimanch yo ?",
      "Ki ministè k ap grandi pi vit ?",
      "Kiyès ki gen anivèsè semèn sa a ?",
    ],
  },
};

export default function AiDenialNotice({
  denial,
  language,
  onAsk,
}: {
  denial: AiDenial;
  language: string;
  onAsk?: (question: string) => void;
}) {
  const copy = COPY[language] ?? COPY.en;
  const reason = copy.reasons[denial.rule] ?? copy.fallbackReason;
  const pool = ALTERNATIVES[language] ?? ALTERNATIVES.en;
  const suggestions =
    (denial.rule === "scope_denied" && denial.requiredScope
      ? pool[denial.requiredScope]
      : undefined) ?? pool.default;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-2">
          <p className="font-medium text-destructive">{copy.title}</p>
          <p className="text-muted-foreground">{reason}</p>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.alternatives}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => onAsk?.(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
