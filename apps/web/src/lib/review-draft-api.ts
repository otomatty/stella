import type {
  ReviewDraftRequest,
  ReviewDraftResponse,
} from "@falcon/shared/review/types";
import { buildHeuristicReviewDraft } from "@falcon/shared/review/heuristic-draft";

function serverUrl(): string {
  const url = import.meta.env.VITE_SERVER_URL;
  if (!url) return "";
  return url.replace(/\/$/, "");
}

export async function fetchReviewDraft(
  req: ReviewDraftRequest,
): Promise<ReviewDraftResponse> {
  const base = serverUrl();
  if (!base) {
    return buildHeuristicReviewDraft(req.code);
  }
  try {
    const res = await fetch(`${base}/api/review-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : `HTTP ${res.status}`,
      );
    }
    return (await res.json()) as ReviewDraftResponse;
  } catch (err) {
    console.warn("[fetchReviewDraft] fallback to heuristic", err);
    return buildHeuristicReviewDraft(req.code);
  }
}
