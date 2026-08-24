/**
 * 面談対策 — 質問ごとの学習ステータスの導出。
 *
 * DB (interview_progress) が持つのは read / confident のみ。 表示上の 4 段階は
 *   未着手 (none) → 型を読んだ (read) → 回答作成済み (drafted) → 練習OK (confident)
 * で、「回答作成済み」は個別回答の型 (interview_personal_templates) の有無から導出する。
 * 準備率 = 割当範囲の A 必修 (逆質問を除く) のうち confident の割合。
 */

export type StoredProgressStatus = "read" | "confident";

export type QuestionPrepStatus = "none" | "read" | "drafted" | "confident";

export const PREP_STATUS_LABELS: Record<QuestionPrepStatus, string> = {
  none: "未着手",
  read: "型を読んだ",
  drafted: "回答作成済み",
  confident: "練習OK",
};

export function deriveQuestionPrepStatus(input: {
  hasPersonalTemplate: boolean;
  progressStatus: StoredProgressStatus | null | undefined;
}): QuestionPrepStatus {
  if (input.progressStatus === "confident") return "confident";
  if (input.hasPersonalTemplate) return "drafted";
  if (input.progressStatus === "read") return "read";
  return "none";
}

export interface PrepRateInput {
  freq: "A" | "B" | "C";
  is_reverse: boolean;
  status: QuestionPrepStatus;
}

/**
 * 準備率の分子・分母。 対象は A 必修のみ (逆質問は「聞く質問」なので除外)。
 * 内訳は 4 状態それぞれを数える — 表示側で `total - confident - drafted` のように
 * 引き算すると `read` (型を読んだ) が未着手に混ざるため、 ここで別々に返す。
 */
export function prepRate(questions: PrepRateInput[]): {
  confident: number;
  drafted: number;
  read: number;
  none: number;
  total: number;
  /** 0〜100 の整数。 total 0 のときは 0。 */
  percent: number;
} {
  const targets = questions.filter((q) => q.freq === "A" && !q.is_reverse);
  const countOf = (status: QuestionPrepStatus) => targets.filter((q) => q.status === status).length;
  const confident = countOf("confident");
  const total = targets.length;
  return {
    confident,
    drafted: countOf("drafted"),
    read: countOf("read"),
    none: countOf("none"),
    total,
    percent: total === 0 ? 0 : Math.round((confident / total) * 100),
  };
}
