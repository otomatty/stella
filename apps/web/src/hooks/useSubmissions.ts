import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Submission, ReviewVerdict } from "@stella/shared/review/types";
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

function getServerSnapshot() {
  return listSubmissions();
}

export function useSubmissions() {
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    getServerSnapshot,
    getServerSnapshot,
  );
  const update = useCallback(
    (id: string, patch: Partial<Submission>): Promise<Submission | undefined> =>
      updateSubmission(id, patch),
    [],
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
    ): Promise<Submission | undefined> => finalizeReview(id, verdict, patch, options),
    [],
  );

  const create = useCallback(
    (input: Parameters<typeof createSubmission>[0]) => createSubmission(input),
    [],
  );

  const getById = useCallback((id: string) => getSubmission(id), []);

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

export function usePendingReviewCount(): number {
  return useSyncExternalStore(subscribeSubmissions, countPending, countPending);
}

export function useSubmission(submissionId: string | null) {
  const read = useCallback(
    () => (submissionId ? getSubmission(submissionId) : undefined),
    [submissionId],
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
export function useSubmissionsAutoRefresh(enabled: boolean): void {
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    getServerSnapshot,
    getServerSnapshot,
  );
  const [visible, setVisible] = useState(isDocumentVisible);
  useEffect(() => {
    if (!enabled) return;
    void refreshSubmissions();
    const onVisibility = () => {
      const now = isDocumentVisible();
      setVisible(now);
      if (now) void refreshSubmissions();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);
  const polling = enabled && shouldPollSubmissions(submissions, visible);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => {
      if (isDocumentVisible()) void refreshSubmissions({ force: true });
    }, SUBMISSIONS_POLL_MS);
    return () => clearInterval(timer);
  }, [polling]);
}

/** 画面 (レビュー・ダッシュボード) を開いたときに提出一覧を取り直す (#34)。 */
export function useRefreshSubmissionsOnOpen(enabled: boolean): void {
  useEffect(() => {
    if (enabled) void refreshSubmissions();
  }, [enabled]);
}
