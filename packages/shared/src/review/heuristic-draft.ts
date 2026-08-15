/**
 * Anthropic API 未設定時のルールベース添削下書き (Issue #8 デモ用)。
 */

import type { ReviewDraftResponse, ReviewSuggestion, RubricCriterion } from "./types.js";

const DEFAULT_RUBRIC: Omit<RubricCriterion, "score">[] = [
  { id: "rb1", name: "機能要件の達成", desc: "仕様どおり動作すること", max: 4 },
  { id: "rb2", name: "コード可読性", desc: "命名・構造・一貫性", max: 4 },
  { id: "rb3", name: "保守性・設計", desc: "関数分割・責務の分離", max: 4 },
  { id: "rb4", name: "セキュリティ配慮", desc: "XSS・入力検証など", max: 4 },
];

export function buildHeuristicReviewDraft(code: string): ReviewDraftResponse {
  const lines = code.split("\n");
  const suggestions: ReviewSuggestion[] = [];
  let id = 0;

  const push = (
    line: number,
    severity: ReviewSuggestion["severity"],
    category: string,
    body: string,
  ) => {
    suggestions.push({
      id: `h${++id}`,
      line,
      severity,
      category,
      body,
      adopted: null,
    });
  };

  lines.forEach((line, i) => {
    const n = i + 1;
    if (/innerHTML/.test(line)) {
      push(
        n,
        "high",
        "XSS脆弱性",
        "`innerHTML` にユーザー入力を直接挿入すると XSS の危険があります。`textContent` やサニタイズを検討してください。",
      );
    }
    if (/==(?!=)/.test(line) && !/===/.test(line)) {
      push(
        n,
        "med",
        "等価演算子",
        "`==` ではなく `===` を使うと型変換による予期しない挙動を防げます。",
      );
    }
    if (/\bvar\b/.test(line)) {
      push(n, "low", "ES2015+", "`let` / `const` の使用を推奨します。");
    }
  });

  if (suggestions.length === 0) {
    push(
      1,
      "low",
      "全体",
      "大きな問題は見当たりません。命名やコメントで意図を補足するとより良くなります。",
    );
  }

  const securityPenalty = suggestions.some((s) => s.severity === "high") ? 2 : 0;
  const stylePenalty = suggestions.filter((s) => s.severity !== "low").length;

  const rubric: RubricCriterion[] = DEFAULT_RUBRIC.map((r, idx) => {
    let score = 3;
    if (r.id === "rb4") score = Math.max(1, 4 - securityPenalty);
    if (r.id === "rb3") score = Math.max(2, 4 - Math.min(2, stylePenalty));
    if (idx === 0 && lines.length < 5) score = 2;
    return { ...r, score };
  });

  const total = rubric.reduce((a, r) => a + r.score, 0);
  const max = rubric.reduce((a, r) => a + r.max, 0);

  return {
    suggestions,
    rubric,
    notes: `コードはおおむね理解できています（AI下書き: ${total}/${max}）。指摘事項を確認のうえ、講師の判断で最終採点してください。`,
  };
}
