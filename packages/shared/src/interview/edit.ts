/**
 * 面談対策 — 想定質問の編集 (admin / sales)。
 *
 * 質問バンクの正本は `questions.json` だが、 面談の現場で言い回しを直したいことが
 * あるため、 admin と営業は D1 上の質問を直接編集できる (Issue #237)。 手で直した行は
 * `interview_questions.edited_at` が入り、 seed の upsert が上書きしなくなる。
 *
 * 検証は API 側の正本だが、 web でも同じ関数を通してから送ることで、
 * 「長すぎる」「空にした」を保存前に同じ文言で出せるようにここへ置く。
 */

import { COMMON_CATEGORY, isAssignableCategory } from "./types.js";

/** 編集できるテキスト項目。 `no` と作成日時は変えられない (音声キー・履歴の同一性)。 */
export const INTERVIEW_QUESTION_TEXT_FIELDS = [
  "question",
  "subcategory",
  "time",
  "keywords",
  "intent",
  "answer_template",
  "ng",
  "criteria",
] as const;

export type InterviewQuestionTextField = (typeof INTERVIEW_QUESTION_TEXT_FIELDS)[number];

/** 空にできない項目 (DB が NOT NULL、 かつ空だと一覧が読めなくなる)。 */
const REQUIRED_TEXT_FIELDS: readonly InterviewQuestionTextField[] = ["question"];

/**
 * 項目ごとの上限文字数。 現行データの最長 (answer_template 152 / ng 105) に対して
 * 十分な余裕を取りつつ、 D1 の行サイズと読み上げの長さが暴れないところで止める。
 */
export const INTERVIEW_QUESTION_MAX_LENGTH: Record<InterviewQuestionTextField, number> = {
  question: 400,
  subcategory: 80,
  time: 40,
  keywords: 400,
  intent: 800,
  answer_template: 2000,
  ng: 1000,
  criteria: 1000,
};

/** 項目の表示名 (エラー文言と編集フォームのラベルで共用)。 */
export const INTERVIEW_QUESTION_FIELD_LABELS: Record<InterviewQuestionTextField, string> = {
  question: "質問文",
  subcategory: "小分類",
  time: "目安時間",
  keywords: "キーワード",
  intent: "質問意図",
  answer_template: "回答の型",
  ng: "避けたい回答",
  criteria: "評価軸",
};

/** 検証済みのパッチ。 未指定の項目はキーごと落ちる (= 変更しない)。 */
export interface InterviewQuestionPatch {
  question?: string;
  subcategory?: string;
  time?: string | null;
  keywords?: string | null;
  intent?: string | null;
  answer_template?: string | null;
  ng?: string | null;
  criteria?: string | null;
  categories?: string[];
  freq?: "A" | "B" | "C";
  is_reverse?: boolean;
}

export class InterviewQuestionPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewQuestionPatchError";
  }
}

function normalizeText(field: InterviewQuestionTextField, raw: unknown): string | null {
  if (raw !== null && typeof raw !== "string") {
    throw new InterviewQuestionPatchError(
      `${INTERVIEW_QUESTION_FIELD_LABELS[field]}は文字列で指定してください`,
    );
  }
  // 前後の空白と CRLF を落として比較を安定させる (見えない差分で音声を作り直さない)。
  const value = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (value.length > INTERVIEW_QUESTION_MAX_LENGTH[field]) {
    throw new InterviewQuestionPatchError(
      `${INTERVIEW_QUESTION_FIELD_LABELS[field]}は ${INTERVIEW_QUESTION_MAX_LENGTH[field]} 文字以内で入力してください`,
    );
  }
  if (value === "") {
    if (REQUIRED_TEXT_FIELDS.includes(field)) {
      throw new InterviewQuestionPatchError(`${INTERVIEW_QUESTION_FIELD_LABELS[field]}は必須です`);
    }
    // NOT NULL の項目は空文字、 それ以外は null (seed と同じ表現に寄せる)。
    return field === "subcategory" ? "" : null;
  }
  return value;
}

/**
 * リクエスト body を検証済みパッチにする。 未知のキーは黙って捨てず 400 にする
 * (`no` を送って番号を変えたつもりになる、 のような取り違えを見逃さない)。
 */
export function normalizeInterviewQuestionPatch(raw: unknown): InterviewQuestionPatch {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new InterviewQuestionPatchError("更新内容が不正です");
  }
  const body = raw as Record<string, unknown>;
  const patch: InterviewQuestionPatch = {};

  for (const key of Object.keys(body)) {
    const known =
      (INTERVIEW_QUESTION_TEXT_FIELDS as readonly string[]).includes(key) ||
      key === "categories" ||
      key === "freq" ||
      key === "is_reverse";
    if (!known) {
      throw new InterviewQuestionPatchError(`${key} は編集できません`);
    }
  }

  for (const field of INTERVIEW_QUESTION_TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = normalizeText(field, body[field]);
    // subcategory / question は string、 それ以外は string | null。
    (patch as Record<string, unknown>)[field] = value;
  }

  if ("categories" in body) {
    const value = body.categories;
    if (!Array.isArray(value) || value.some((c) => typeof c !== "string")) {
      throw new InterviewQuestionPatchError("案件種別は文字列の配列で指定してください");
    }
    const categories = [...new Set(value as string[])];
    const unknown = categories.find((c) => c !== COMMON_CATEGORY && !isAssignableCategory(c));
    if (unknown !== undefined) {
      throw new InterviewQuestionPatchError(`案件種別 "${unknown}" は選べません`);
    }
    if (categories.length === 0) {
      // 空にすると誰にも表示されない質問になる。 全員向けなら共通カテゴリを選ばせる。
      throw new InterviewQuestionPatchError(
        `案件種別は 1 つ以上選んでください (全員に出すなら「${COMMON_CATEGORY}」)`,
      );
    }
    patch.categories = categories;
  }

  if ("freq" in body) {
    if (body.freq !== "A" && body.freq !== "B" && body.freq !== "C") {
      throw new InterviewQuestionPatchError("優先度は A / B / C で指定してください");
    }
    patch.freq = body.freq;
  }

  if ("is_reverse" in body) {
    if (typeof body.is_reverse !== "boolean") {
      throw new InterviewQuestionPatchError("逆質問フラグは真偽値で指定してください");
    }
    patch.is_reverse = body.is_reverse;
  }

  if (Object.keys(patch).length === 0) {
    throw new InterviewQuestionPatchError("更新する項目がありません");
  }
  return patch;
}

/**
 * 編集の前後で **読み上げテキスト (= 質問文) が変わったか**。
 *
 * 1 質問 = 1 音声なので判定は質問文の一致だけ。 前後の空白は
 * `normalizeInterviewQuestionPatch` が落としているので、 見えない差分で
 * 音声を作り直すことはない。
 */
export function questionAudioChanged(before: string, after: string): boolean {
  return before !== after;
}
