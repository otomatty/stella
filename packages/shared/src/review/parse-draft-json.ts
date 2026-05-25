import type { ReviewDraftResponse, ReviewSuggestion, RubricCriterion } from "./types.js";

/**
 * モデル応答から JSON を抽出して ReviewDraftResponse に正規化する。
 */
export function parseReviewDraftJson(text: string): ReviewDraftResponse | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const suggestions = normalizeSuggestions(raw.suggestions);
    const rubric = normalizeRubric(raw.rubric);
    const notes = typeof raw.notes === "string" ? raw.notes : "";
    if (!suggestions.length || !rubric.length) return null;
    return { suggestions, rubric, notes };
  } catch {
    return null;
  }
}

function normalizeSuggestions(raw: unknown): ReviewSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ReviewSuggestion[] = [];
  let n = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const line = typeof o.line === "number" ? Math.max(1, Math.floor(o.line)) : 1;
    const severity =
      o.severity === "high" || o.severity === "med" || o.severity === "low"
        ? o.severity
        : "med";
    const category = typeof o.category === "string" ? o.category : "指摘";
    const body = typeof o.body === "string" ? o.body : "";
    if (!body) continue;
    out.push({
      id: typeof o.id === "string" ? o.id : `ai${++n}`,
      line,
      severity,
      category,
      body,
      adopted: null,
    });
  }
  return out;
}

function normalizeRubric(raw: unknown): RubricCriterion[] {
  if (!Array.isArray(raw)) return [];
  const out: RubricCriterion[] = [];
  let n = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : `項目${++n}`;
    const desc = typeof o.desc === "string" ? o.desc : "";
    const max = typeof o.max === "number" ? Math.min(10, Math.max(1, o.max)) : 4;
    const score =
      typeof o.score === "number"
        ? Math.min(max, Math.max(0, Math.floor(o.score)))
        : 0;
    out.push({
      id: typeof o.id === "string" ? o.id : `rb${n}`,
      name,
      desc,
      max,
      score,
    });
  }
  return out;
}
