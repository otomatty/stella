import type { ReviewDraftRequest, ReviewDraftResponse } from "@falcon/shared/review/types";
import { buildHeuristicReviewDraft } from "@falcon/shared/review/heuristic-draft";
import { getAccessToken } from "./auth-client";

function serverUrl(): string {
  const url = import.meta.env.VITE_SERVER_URL;
  if (!url) return "";
  return url.replace(/\/$/, "");
}

export async function fetchReviewDraft(req: ReviewDraftRequest): Promise<ReviewDraftResponse> {
  const base = serverUrl();
  if (!base) {
    return buildHeuristicReviewDraft(req.code);
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}/api/review-draft`, {
      method: "POST",
      headers,
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
