import { useState } from "react";
import { AI_REVIEW_STATUS_LABELS } from "@stella/shared/review/ai-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { ChevronRight } from "@/lib/icons";
import { formatSubmittedAt } from "@/lib/submissions-store";

/** 添削を見直して学習に戻れるよう、提出履歴はレッスン内で開く。 */
export function SubmissionHistory({
  onOpenSubmission,
}: {
  onOpenSubmission: (submissionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="mb-6 rounded-lg border border-border"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        提出・添削を確認する
      </summary>
      {open ? <SubmissionList onOpenSubmission={onOpenSubmission} /> : null}
    </details>
  );
}

function SubmissionList({
  onOpenSubmission,
}: {
  onOpenSubmission: (submissionId: string) => void;
}) {
  const { submissions, loading, error, reload } = useMySubmissions(true);
  if (loading) return <SkeletonRows rows={3} className="p-4" />;
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4">
        <p role="alert" className="text-sm text-destructive">
          提出履歴の取得に失敗しました: {error}
        </p>
        <Button variant="outline" size="sm" onClick={reload}>
          再試行
        </Button>
      </div>
    );
  }
  if (submissions.length === 0) {
    return <p className="p-4 text-sm text-ink-3">提出はまだありません。</p>;
  }
  return (
    <div>
      {submissions.map((submission) => {
        const meta = submission.verdict ? VERDICT_META[submission.verdict] : null;
        const pendingLabel =
          submission.aiReviewStatus && submission.aiReviewStatus !== "confirmed"
            ? AI_REVIEW_STATUS_LABELS[submission.aiReviewStatus]
            : "添削待ち";
        return (
          <button
            type="button"
            key={submission.id}
            onClick={() => onOpenSubmission(submission.id)}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left hover:bg-sunken"
          >
            <Badge variant={meta?.variant ?? "info"}>{meta?.label ?? pendingLabel}</Badge>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{submission.assignmentTitle}</span>
              <span className="block text-[11.5px] text-ink-3">
                {submission.stageTitle} · {formatSubmittedAt(submission.submittedAt)}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-ink-4" />
          </button>
        );
      })}
    </div>
  );
}

const VERDICT_META = {
  pass: { label: "合格", variant: "success" },
  resubmit: { label: "再提出", variant: "warning" },
  fail: { label: "不合格", variant: "danger" },
} as const;
