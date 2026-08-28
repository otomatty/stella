/**
 * 面談対策 (Interview Prep) — 想定質問の型とカテゴリ定数。
 *
 * 質問データの正本は同ディレクトリの `questions.json` (上司提案の想定質問集 + FW別追記の 197 問)。
 * D1 へは seed (upsert/prune) で投入し、 API / web はこの型を共有する。
 */

export interface InterviewQuestion {
  no: number;
  /** 案件種別タグ (階層値)。 COMMON_CATEGORY を含む場合は全員へ表示 */
  categories: string[];
  subcategory: string;
  /** 優先度: A 必修 / B 推奨 / C 参考 */
  freq: "A" | "B" | "C";
  question: string;
  /** 目安回答時間 (例: "30秒") */
  time: string | null;
  keywords: string | null;
  /** 面談官の質問意図 */
  intent: string | null;
  /** 共通「回答の型」(プレーンテキスト。 Issue #206 で blank span を廃止) */
  answer_template: string | null;
  /** 避けたい回答 */
  ng: string | null;
  /** 評価軸 */
  criteria: string | null;
  /** 逆質問 (エンジニア側から聞く質問) */
  is_reverse: boolean;
}

/**
 * 講師が受講者へ割当できる案件種別タグ。 共通カテゴリは割当対象外で常時表示。
 * 階層は "/" 区切り (例: "PHP/Laravel")。 FW を増やすときはここに文字列を足すだけでよい。
 */
export const ASSIGNABLE_CATEGORIES = [
  "PHP",
  "PHP/Laravel",
  "PHP/CakePHP",
  "PHP/スクラッチ",
  "JS",
  "JS/React",
  "JS/Vue",
  "JS/jQuery",
  "SQL",
  "テスト",
] as const;
export type AssignableCategory = (typeof ASSIGNABLE_CATEGORIES)[number];

export const COMMON_CATEGORY = "全案件共通";

export function isAssignableCategory(v: unknown): v is AssignableCategory {
  return typeof v === "string" && (ASSIGNABLE_CATEGORIES as readonly string[]).includes(v);
}
