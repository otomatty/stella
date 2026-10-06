/** 提出時の支援記録の種類と表示名。解答本文や提出の検証処理には依存しない。 */
const OPTIONS = [
  { kind: "hint", label: "解法のヒント" },
  { kind: "solution", label: "解答の表示" },
  { kind: "fixed-start", label: "固定した開始点" },
  { kind: "instructor", label: "講師からの実装支援" },
  { kind: "ai-answer", label: "AI による解答生成" },
] as const;

export const SUPPORT_KINDS = OPTIONS.map((option) => option.kind);
export const SUPPORT_LABELS = Object.fromEntries(
  OPTIONS.map((option) => [option.kind, option.label]),
) as Record<(typeof SUPPORT_KINDS)[number], string>;
