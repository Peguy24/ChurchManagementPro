export type AssistantRole = "pastor" | "secretary" | "treasurer" | "volunteer";

export const ASSISTANT_ROLE_ORDER: AssistantRole[] = ["pastor", "secretary", "treasurer", "volunteer"];

export const ROLE_LABELS: Record<string, Record<AssistantRole, string>> = {
  en: { pastor: "Pastor", secretary: "Secretary", treasurer: "Treasurer", volunteer: "Volunteer" },
  fr: { pastor: "Pasteur", secretary: "Secrétaire", treasurer: "Trésorier", volunteer: "Bénévole" },
  ht: { pastor: "Pastè", secretary: "Sekretè", treasurer: "Trezorye", volunteer: "Volontè" },
};

/** Guided starter questions, per role and per language. */
export const ROLE_STARTERS: Record<string, Record<AssistantRole, string[]>> = {
  en: {
    pastor: [
      "Who has missed the last four Sundays?",
      "Which members are most at risk of leaving?",
      "Who has a birthday this week?",
      "Which ministry is growing the fastest?",
      "Who should I visit or call this week?",
    ],
    secretary: [
      "Show first-time visitors from this month",
      "Which visitors still need a follow-up?",
      "Who has a birthday in the next 30 days?",
      "List active members with no phone or email",
      "How many members attended the last four Sundays?",
    ],
    treasurer: [
      "Generate a financial summary for last month",
      "Which members haven't given in six months?",
      "How much came in by donation type this year?",
      "Compare donations and expenses this quarter",
      "How many members have never given?",
    ],
    volunteer: [
      "Who has a birthday this week?",
      "Which ministries are growing right now?",
      "Show first-time visitors from this month",
      "Who has missed the last two Sundays?",
    ],
  },
  fr: {
    pastor: [
      "Qui a manqué les 4 derniers dimanches ?",
      "Quels membres risquent le plus de partir ?",
      "Qui fête son anniversaire cette semaine ?",
      "Quel ministère grandit le plus vite ?",
      "Qui devrais-je visiter ou appeler cette semaine ?",
    ],
    secretary: [
      "Montre les nouveaux visiteurs de ce mois-ci",
      "Quels visiteurs attendent encore un suivi ?",
      "Qui fête son anniversaire dans les 30 prochains jours ?",
      "Liste les membres actifs sans téléphone ni e-mail",
      "Combien de membres ont assisté aux 4 derniers dimanches ?",
    ],
    treasurer: [
      "Génère un résumé financier du mois dernier",
      "Quels membres n'ont pas donné depuis 6 mois ?",
      "Combien avons-nous reçu par type de don cette année ?",
      "Compare les dons et les dépenses de ce trimestre",
      "Combien de membres n'ont jamais donné ?",
    ],
    volunteer: [
      "Qui fête son anniversaire cette semaine ?",
      "Quels ministères grandissent en ce moment ?",
      "Montre les nouveaux visiteurs de ce mois-ci",
      "Qui a manqué les 2 derniers dimanches ?",
    ],
  },
  ht: {
    pastor: [
      "Kilès ki manke 4 dimanch ki sot pase yo ?",
      "Ki manm ki gen plis risk pou yo kite legliz la ?",
      "Kilès ki gen anivèsè semèn sa a ?",
      "Ki ministè k ap grandi pi vit ?",
      "Kilès pou m vizite oswa rele semèn sa a ?",
    ],
    secretary: [
      "Montre m vizitè nouvo mwa sa a",
      "Ki vizitè ki poko jwenn swivi ?",
      "Kilès ki gen anivèsè nan 30 jou k ap vini yo ?",
      "Bay lis manm aktif ki pa gen telefòn ni imel",
      "Konbyen manm ki te vini nan 4 dimanch ki sot pase yo ?",
    ],
    treasurer: [
      "Fè yon rezime finansye pou mwa pase a",
      "Ki manm ki pa bay depi 6 mwa ?",
      "Konbyen nou resevwa pa tip ofrann ane sa a ?",
      "Konpare ofrann ak depans pou trimès sa a",
      "Konbyen manm ki pa janm bay ?",
    ],
    volunteer: [
      "Kilès ki gen anivèsè semèn sa a ?",
      "Ki ministè k ap grandi kounye a ?",
      "Montre m vizitè nouvo mwa sa a",
      "Kilès ki manke 2 dimanch ki sot pase yo ?",
    ],
  },
};

/**
 * Suggested follow-ups keyed by the tool the assistant just used.
 * Falls back to role-based follow-ups when no tool was used.
 */
export const TOOL_FOLLOW_UPS: Record<string, Record<string, string[]>> = {
  get_absent_members: {
    en: [
      "Which of them are at risk of leaving?",
      "Do any of them have a birthday soon?",
      "Draft a short check-in message for them",
    ],
    fr: [
      "Lesquels risquent de partir ?",
      "Certains ont-ils bientôt leur anniversaire ?",
      "Rédige un court message de prise de nouvelles",
    ],
    ht: [
      "Kilès nan yo ki gen risk pou yo kite ?",
      "Èske gen nan yo ki gen anivèsè talè ?",
      "Ekri yon ti mesaj pou pran nouvèl yo",
    ],
  },
  get_visitors: {
    en: [
      "Which visitors have no follow-up yet?",
      "How many visitors became members?",
      "Draft a welcome message for new visitors",
    ],
    fr: [
      "Quels visiteurs n'ont pas encore de suivi ?",
      "Combien de visiteurs sont devenus membres ?",
      "Rédige un message de bienvenue pour les nouveaux visiteurs",
    ],
    ht: [
      "Ki vizitè ki poko gen swivi ?",
      "Konbyen vizitè ki vin manm ?",
      "Ekri yon mesaj byenveni pou vizitè nouvo yo",
    ],
  },
  get_birthdays: {
    en: [
      "Show birthdays for the next 30 days",
      "Draft a birthday greeting in our church's tone",
      "Which of them missed recent Sundays?",
    ],
    fr: [
      "Montre les anniversaires des 30 prochains jours",
      "Rédige un message d'anniversaire",
      "Lesquels ont manqué les derniers dimanches ?",
    ],
    ht: [
      "Montre m anivèsè pou 30 jou k ap vini yo",
      "Ekri yon mesaj anivèsè",
      "Kilès nan yo ki manke dènye dimanch yo ?",
    ],
  },
  get_ministry_growth: {
    en: [
      "Which ministry is shrinking?",
      "Compare growth over the last 12 months",
      "Suggest ways to strengthen the smallest ministry",
    ],
    fr: [
      "Quel ministère est en baisse ?",
      "Compare la croissance sur 12 mois",
      "Propose des idées pour renforcer le plus petit ministère",
    ],
    ht: [
      "Ki ministè k ap bese ?",
      "Konpare kwasans lan sou 12 mwa",
      "Bay ide pou ranfòse pi piti ministè a",
    ],
  },
  get_engagement_insights: {
    en: [
      "Show our most engaged members",
      "Why are these members at risk?",
      "Suggest a care plan for the top five",
    ],
    fr: [
      "Montre nos membres les plus engagés",
      "Pourquoi ces membres sont-ils à risque ?",
      "Propose un plan de suivi pour les cinq premiers",
    ],
    ht: [
      "Montre m manm ki pi angaje yo",
      "Poukisa manm sa yo an risk ?",
      "Pwopoze yon plan swivi pou senk premye yo",
    ],
  },
  get_lapsed_givers: {
    en: [
      "How many of them have never given?",
      "Are these members still attending?",
      "Draft a gentle stewardship message",
    ],
    fr: [
      "Combien d'entre eux n'ont jamais donné ?",
      "Ces membres viennent-ils encore au culte ?",
      "Rédige un message délicat sur la générosité",
    ],
    ht: [
      "Konbyen nan yo ki pa janm bay ?",
      "Èske manm sa yo toujou ap vini legliz ?",
      "Ekri yon mesaj dous sou jenerozite",
    ],
  },
  get_financial_summary: {
    en: [
      "Compare with the previous month",
      "Which expense category is the largest?",
      "Show donations by payment method",
    ],
    fr: [
      "Compare avec le mois précédent",
      "Quelle catégorie de dépenses est la plus élevée ?",
      "Montre les dons par mode de paiement",
    ],
    ht: [
      "Konpare ak mwa anvan an",
      "Ki kategori depans ki pi gwo a ?",
      "Montre ofrann yo pa metòd peman",
    ],
  },
};

export const ROLE_FOLLOW_UPS: Record<string, Record<AssistantRole, string[]>> = {
  en: {
    pastor: ["Who should I visit this week?", "Show members at risk of leaving", "Summarize this month's attendance"],
    secretary: ["Which visitors need follow-up?", "Who has a birthday soon?", "Show this month's new visitors"],
    treasurer: ["Summarize this month's finances", "Who hasn't given in six months?", "Show donations by type"],
    volunteer: ["Who has a birthday this week?", "Which ministries are growing?", "Show recent visitors"],
  },
  fr: {
    pastor: ["Qui devrais-je visiter cette semaine ?", "Montre les membres à risque", "Résume la présence de ce mois"],
    secretary: ["Quels visiteurs ont besoin d'un suivi ?", "Qui fête bientôt son anniversaire ?", "Montre les nouveaux visiteurs du mois"],
    treasurer: ["Résume les finances de ce mois", "Qui n'a pas donné depuis 6 mois ?", "Montre les dons par type"],
    volunteer: ["Qui fête son anniversaire cette semaine ?", "Quels ministères grandissent ?", "Montre les visiteurs récents"],
  },
  ht: {
    pastor: ["Kilès pou m vizite semèn sa a ?", "Montre manm ki an risk yo", "Rezime prezans mwa sa a"],
    secretary: ["Ki vizitè ki bezwen swivi ?", "Kilès ki gen anivèsè talè ?", "Montre vizitè nouvo mwa a"],
    treasurer: ["Rezime finans mwa sa a", "Kilès ki pa bay depi 6 mwa ?", "Montre ofrann pa tip"],
    volunteer: ["Kilès ki gen anivèsè semèn sa a ?", "Ki ministè k ap grandi ?", "Montre vizitè resan yo"],
  },
};

/** Picks the most specific role available to the signed-in user. */
export function resolveAssistantRole(roles: string[]): AssistantRole {
  if (roles.includes("pastor") || roles.includes("admin")) return "pastor";
  if (roles.includes("treasurer")) return "treasurer";
  if (roles.includes("secretary")) return "secretary";
  return "volunteer";
}

/** Roles the user may switch between in the starter-question tabs. */
export function availableAssistantRoles(roles: string[]): AssistantRole[] {
  if (roles.includes("admin")) return ASSISTANT_ROLE_ORDER;
  const owned = ASSISTANT_ROLE_ORDER.filter((r) => roles.includes(r));
  return owned.length ? owned : ["volunteer"];
}
