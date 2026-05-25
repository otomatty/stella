import type { ReviewDraftRequest } from "./types.js";

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
