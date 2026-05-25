import type { ReviewDraftRequest } from "./types.js";

/** 推論コスト抑制のための提出コード上限 (文字数) */
export const MAX_REVIEW_CODE_LENGTH = 80_000;

type Result =
  | { ok: true; body: ReviewDraftRequest }
  | { ok: false; status: 400; message: string };

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
  const language =
    o.language === "sql" || o.language === "js" ? o.language : undefined;
  const courseTitle =
    typeof o.courseTitle === "string" ? o.courseTitle : undefined;
  return {
    ok: true,
    body: {
      assignmentTitle: o.assignmentTitle.trim(),
      code: o.code,
      language,
      courseTitle,
    },
  };
}
