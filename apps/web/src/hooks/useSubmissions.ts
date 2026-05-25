import { useCallback, useSyncExternalStore } from "react";
import type { Submission, ReviewVerdict } from "@falcon/shared/review/types";
import type { Tenant } from "@/data/types";
import {
  listSubmissions,
  getSubmission,
  updateSubmission,
  createSubmission,
  finalizeReview,
  countPending,
  subscribeSubmissions,
} from "@/lib/submissions-store";

function getServerSnapshot(tenantId: Tenant["id"]) {
  return listSubmissions(tenantId);
}

export function useSubmissions(tenantId: Tenant["id"]) {
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    () => getServerSnapshot(tenantId),
    () => getServerSnapshot(tenantId),
  );

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const aiReadyCount = submissions.filter(
    (s) => s.status === "pending" && s.aiReady,
  ).length;

  return {
    submissions,
    pendingCount,
    aiReadyCount,
    getById: (id: string) => getSubmission(tenantId, id),
    update: (id: string, patch: Partial<Submission>) =>
      updateSubmission(tenantId, id, patch),
    create: (
      input: Parameters<typeof createSubmission>[1],
    ) => createSubmission(tenantId, input),
    finalize: (
      id: string,
      verdict: ReviewVerdict,
      patch: {
        reviewNotes: string;
        aiSuggestions: Submission["aiSuggestions"];
        rubric: Submission["rubric"];
      },
    ) => finalizeReview(tenantId, id, verdict, patch),
  };
}

export function usePendingReviewCount(tenantId: Tenant["id"]): number {
  return useSyncExternalStore(
    subscribeSubmissions,
    () => countPending(tenantId),
    () => countPending(tenantId),
  );
}

export function useSubmission(
  tenantId: Tenant["id"],
  submissionId: string | null,
) {
  const read = useCallback(
    () => (submissionId ? getSubmission(tenantId, submissionId) : undefined),
    [tenantId, submissionId],
  );
  return useSyncExternalStore(subscribeSubmissions, read, read);
}
