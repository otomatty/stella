import type { ReviewDraftRequest, ReviewDraftResponse } from "@stella/shared/review/types";
import { buildHeuristicReviewDraft } from "@stella/shared/review/heuristic-draft";
import { authFetch, isApiConfigured } from "./api-client";

export async function fetchReviewDraft(req: ReviewDraftRequest): Promise<ReviewDraftResponse> {
  if (!isApiConfigured()) {
    return buildHeuristicReviewDraft(req.code);
  }
  try {
    const res = await authFetch("/api/review-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}) as { error?: string });
      const message = typeof errBody.error === "string" ? errBody.error : `HTTP ${res.status}`;
      const error = new Error(message) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return (await res.json()) as ReviewDraftResponse;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) throw err;
    console.warn("[fetchReviewDraft] fallback to heuristic", err);
    return buildHeuristicReviewDraft(req.code);
  }
}
