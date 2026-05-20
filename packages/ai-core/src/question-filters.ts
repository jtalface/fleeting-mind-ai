/** Maps question keywords to vehicle name substring filters (same idea as Flespi deviceNameIncludes). */
const NAME_FILTER_RULES: Array<{ terms: string[]; needle: string }> = [
  { terms: ["sweeper", "sweepers"], needle: "Sweeper" }
];

const FOLLOW_UP_PRONOUNS = /\b(their|those|these|them|the same|that group|the sweepers?|the vehicles?)\b/i;

export function inferNameFilterFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase();
  for (const rule of NAME_FILTER_RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.needle;
    }
  }
  return null;
}

/** Reuse name filter from recent turns when the user asks a follow-up (e.g. "their plate numbers"). */
export function inferNameFilterFromContext(question: string, history: string[]): string | null {
  const fromQuestion = inferNameFilterFromQuestion(question);
  if (fromQuestion) {
    return fromQuestion;
  }
  if (!FOLLOW_UP_PRONOUNS.test(question)) {
    return null;
  }
  const recentText = history.slice(-8).join(" ");
  return inferNameFilterFromQuestion(recentText);
}

export function questionAsksForPlateNumbers(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["plate", "plates", "plate number", "license", "registration", "vin"].some((term) =>
    normalized.includes(term)
  );
}
