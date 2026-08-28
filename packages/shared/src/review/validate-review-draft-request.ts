import type { ReviewDraftLanguage, ReviewDraftRequest } from "./types.js";

/** 推論コスト抑制のための提出コード上限 (文字数) */
export const MAX_REVIEW_CODE_LENGTH = 80_000;

/** 採点サマリはコードより短い前提。 超過分は落とす。 */
export const MAX_REVIEW_SUMMARY_LENGTH = 8_000;

const LANGUAGES: readonly ReviewDraftLanguage[] = ["js", "ts", "sql", "fe-pseudo"];

function toLanguage(value: unknown): ReviewDraftLanguage | undefined {
  return LANGUAGES.find((lang) => lang === value);
}

type Result = { ok: true; body: ReviewDraftRequest } | { ok: false; status: 400; message: string };

export function validateReviewDraftRequest(raw: unknown): Result {
  if (!raw || typeof raw !== "object") {
    return { ok: false, status: 400, message: "Request body must be an object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.assignmentTitle !== "string" || !o.assignmentTitle.trim()) {
    return { ok: false, status: 400, message: "assignmentTitle is required" };
  }
  if (typeof o.code !== "string") {
    return { ok: false, status: 400, message: "code is required" };
  }
  if (o.code.length > MAX_REVIEW_CODE_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `code exceeds maximum length (${MAX_REVIEW_CODE_LENGTH})`,
    };
  }
  if (typeof o.gradingSummary === "string" && o.gradingSummary.length > MAX_REVIEW_SUMMARY_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `gradingSummary exceeds maximum length (${MAX_REVIEW_SUMMARY_LENGTH})`,
    };
  }
  const language = toLanguage(o.language);
  const stageTitle = typeof o.stageTitle === "string" ? o.stageTitle : undefined;
  const gradingSummary =
    typeof o.gradingSummary === "string" && o.gradingSummary.trim() ? o.gradingSummary : undefined;
  return {
    ok: true,
    body: {
      assignmentTitle: o.assignmentTitle.trim(),
      code: o.code,
      language,
      stageTitle,
      gradingSummary,
    },
  };
}
