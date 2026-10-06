import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Submission, ReviewVerdict } from "@stella/shared/review/types";
import type { Tenant } from "@/data/types";
import {
  listSubmissions,
  getSubmission,
  updateSubmission,
  createSubmission,
  finalizeReview,
  countPending,
  refreshSubmissions,
  subscribeSubmissions,
} from "@/lib/submissions-store";
import { SUBMISSIONS_POLL_MS, shouldPollSubmissions } from "@/lib/submissions-refresh";
import { hasAiDraft } from "@/lib/ai-draft";
import { needsHumanReview } from "@/lib/review-queue";

function getServerSnapshot(tenantId: Tenant["id"]) {
  return listSubmissions(tenantId);
}

export function useSubmissions(tenantId: Tenant["id"]) {
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    () => getServerSnapshot(tenantId),
    () => getServerSnapshot(tenantId),
  );
  const update = useCallback(
    (id: string, patch: Partial<Submission>): Promise<Submission | undefined> =>
      updateSubmission(tenantId, id, patch),
    [tenantId],
  );

  const finalize = useCallback(
    (
      id: string,
      verdict: ReviewVerdict,
      patch: {
        reviewNotes: string;
        aiSuggestions: Submission["aiSuggestions"];
        rubric: Submission["rubric"];
      },
      options: { expectUndecided?: boolean } = {},
    ): Promise<Submission | undefined> => finalizeReview(tenantId, id, verdict, patch, options),
    [tenantId],
  );

  const create = useCallback(
    (input: Parameters<typeof createSubmission>[1]) => createSubmission(tenantId, input),
    [tenantId],
  );

  const getById = useCallback((id: string) => getSubmission(tenantId, id), [tenantId]);

  const pendingCount = submissions.filter(needsHumanReview).length;
  const aiReadyCount = submissions.filter((s) => needsHumanReview(s) && hasAiDraft(s)).length;

  return {
    submissions,
    pendingCount,
    aiReadyCount,
    getById,
    update,
    create,
    finalize,
  };
}

export function usePendingReviewCount(tenantId: Tenant["id"]): number {
  return useSyncExternalStore(
    subscribeSubmissions,
    () => countPending(tenantId),
    () => countPending(tenantId),
  );
}

export function useSubmission(tenantId: Tenant["id"], submissionId: string | null) {
  const read = useCallback(
    () => (submissionId ? getSubmission(tenantId, submissionId) : undefined),
    [tenantId, submissionId],
  );
  return useSyncExternalStore(subscribeSubmissions, read, read);
}

function isDocumentVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * staff の提出一覧を新しく保つ (#34)。AppShell が staff のときに 1 つだけ使う。
 * - 開いたとき・タブが見えるようになったときに取り直す (直前に読んだばかりなら取りに行かない)。
 * - AI が確認中の提出があるあいだは、タブが見えているときだけ控えめな間隔で取り直す。
 */
export function useSubmissionsAutoRefresh(tenantId: Tenant["id"], enabled: boolean): void {
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    () => getServerSnapshot(tenantId),
    () => getServerSnapshot(tenantId),
  );
  const [visible, setVisible] = useState(isDocumentVisible);
  useEffect(() => {
    if (!enabled) return;
    void refreshSubmissions(tenantId);
    const onVisibility = () => {
      const now = isDocumentVisible();
      setVisible(now);
      if (now) void refreshSubmissions(tenantId);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tenantId, enabled]);
  const polling = enabled && shouldPollSubmissions(submissions, visible);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => {
      if (isDocumentVisible()) void refreshSubmissions(tenantId, { force: true });
    }, SUBMISSIONS_POLL_MS);
    return () => clearInterval(timer);
  }, [polling, tenantId]);
}

/** 画面 (レビュー・ダッシュボード) を開いたときに提出一覧を取り直す (#34)。 */
export function useRefreshSubmissionsOnOpen(tenantId: Tenant["id"], enabled: boolean): void {
  useEffect(() => {
    if (enabled) void refreshSubmissions(tenantId);
  }, [tenantId, enabled]);
}
