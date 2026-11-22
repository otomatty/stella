import { manualCompletionUrl } from "@/lib/manual-completion";
import { useEffect, useState } from "react";
import { AI_REVIEW_STATUS_LABELS, FINDING_SEVERITY_LABELS } from "@stella/shared/review/ai-review";
import type { Submission } from "@stella/shared/review/types";
import { ChevronDown, ChevronLeft } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSubmissionById } from "@/lib/submissions-api";
import { formatSubmittedAt } from "@/lib/submissions-store";
import { isBackendConfigured } from "@/lib/backend";
import { passByLabel } from "@/lib/review-queue";
import { buildAiFeedbackView } from "@/lib/ai-feedback-view";
import { AiFeedbackBadge, AiFeedbackResult } from "./AiFeedbackResult";

interface ReviewResultViewProps {
  staff?: boolean;
  submissionId: string;
  setPage: (page: string) => void;
  /**
   * 戻り先。受講者は現在のレッスン、それ以外は各自のホーム。
   * 受講者以外にレッスン (受講者専用) を指すと、戻った先が 403 になる。
   */
  back?: { page: string; label: string };
  /** 一覧から渡せる場合は初回表示を早くする。 */
  initial?: Submission | null;
}

const verdictMeta = {
  pass: { label: "合格", variant: "success" },
  resubmit: { label: "再提出", variant: "warning" },
  fail: { label: "不合格", variant: "danger" },
} as const;

export function ReviewResultView({
  submissionId,
  setPage,
  staff = false,
  back = { page: "dash", label: "ホームに戻る" },
  initial = null,
}: ReviewResultViewProps) {
  const [submission, setSubmission] = useState<Submission | null>(initial);
  const [loading, setLoading] = useState(!initial && isBackendConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setError("バックエンド未設定のため提出詳細を表示できません");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchSubmissionById(submissionId)
      .then((row) => {
        if (cancelled) return;
        setSubmission(row);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubmission(null);
        setError(err instanceof Error ? err.message : "提出の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading && !submission) {
    return <SkeletonRows rows={4} className="py-6" />;
  }

  if (error || !submission) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error ?? "提出が見つかりません"}</p>
        <button
          type="button"
          className="text-[12.5px] text-brand underline underline-offset-2"
          onClick={() => setPage(back.page)}
        >
          {back.label}
        </button>
      </div>
    );
  }

  if (submission.reviewSource === "manual")
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          type="button"
          className="text-sm text-brand underline"
          onClick={() => setPage(back.page)}
        >
          {back.label}
        </button>
        <h1 className="text-2xl font-semibold">{submission.assignmentTitle}</h1>
        <p className="text-sm text-ink-3">
          {submission.stageTitle} · {formatSubmittedAt(submission.submittedAt)}
        </p>
        <p>{staff ? "管理者が手で済みにしました" : "管理者が済みにしました（引き継ぎ）"}</p>
        {staff ? (
          <>
            <p className="whitespace-pre-wrap break-words text-sm">
              理由: {submission.reviewNotes}
            </p>
            {submission.stageId && submission.studentId ? (
              <a
                className="text-brand underline"
                href={manualCompletionUrl(submission.stageId, submission.studentId)}
              >
                手で済みを取り消す画面を開く
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    );

  const feedback = submission.aiFeedback ?? null;
  const aiView = feedback && !staff ? buildAiFeedbackView(feedback, submission.verdict) : null;
  if (aiView) {
    return (
      <div
        data-testid="submission-result"
        className="mx-auto w-full min-w-0 max-w-[880px] space-y-5 wrap-anywhere"
      >
        <button
          type="button"
          onClick={() => setPage(back.page)}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-2 hover:text-foreground hover:underline"
        >
          <ChevronLeft size={14} className="shrink-0" aria-hidden="true" />
          {back.label}
        </button>

        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 basis-60">
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
              {submission.assignmentTitle}
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {submission.stageTitle} · {submission.attempt}回目の提出 · AI が確認しました
            </p>
          </div>
          <AiFeedbackBadge resubmit={aiView.resubmit} />
        </header>

        <AiFeedbackResult view={aiView} taskId={submission.taskId} />
        <StaffComments comments={submission.staffComments} />

        <details className="group overflow-hidden rounded-xl border border-border bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-semibold hover:bg-sunken [&::-webkit-details-marker]:hidden">
            提出したコードをすべて見る
            <ChevronDown size={16} className="shrink-0 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <SubmittedCode lines={submission.codeLines} />
        </details>

        <footer className="text-sm leading-relaxed text-ink-2">
          このレビューは AI が行いました。内容に納得できないときは、人に確認を頼めます。 VS Code
          の結果のパネルから管理者に相談できます。
        </footer>
      </div>
    );
  }

  const meta = submission.verdict ? verdictMeta[submission.verdict] : null;
  // サーバーは講師が採用した指摘だけを返す。古い応答に備えて画面でも採用済みだけに絞る。
  const suggestions = submission.aiSuggestions.filter((suggestion) => suggestion.adopted === true);
  // 判定前は状態だけを出す。人に回した提出の AI の所見はサーバーが返さない (07 §6.3)。
  const pendingLabel =
    submission.aiReviewStatus && submission.aiReviewStatus !== "confirmed"
      ? AI_REVIEW_STATUS_LABELS[submission.aiReviewStatus]
      : "レビュー待ち";
  const passLabel = passByLabel(submission);

  return (
    <div data-testid="submission-result" className="max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => setPage(back.page)}
        className="flex items-center gap-1 mb-4 text-ink-3 text-[12.5px] hover:text-foreground"
      >
        <ChevronLeft size={14} />
        {back.label}
      </button>

      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-[24px] tracking-tight font-semibold">{submission.assignmentTitle}</h1>
          <p className="text-[12.5px] text-ink-3 mt-1">
            {submission.stageTitle} · 提出 {formatSubmittedAt(submission.submittedAt)} ·{" "}
            {submission.attempt}回目
          </p>
        </div>
        <div className="flex-1" />
        {meta ? (
          <Badge variant={meta.variant}>{passLabel ?? meta.label}</Badge>
        ) : (
          <Badge variant="info">{pendingLabel}</Badge>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="flex flex-col gap-4">
          {feedback ? (
            <Card>
              <CardHeader>
                <CardTitle>AI のレビュー</CardTitle>
              </CardHeader>
              <CardContent className="text-[13px] leading-relaxed text-ink-2">
                <p className="whitespace-pre-wrap">{feedback.message}</p>
                {feedback.goodPoints.length > 0 ? (
                  <>
                    <h3 className="text-[12px] font-semibold mt-3 mb-1">良かった点</h3>
                    <ul className="list-disc pl-5">
                      {feedback.goodPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {feedback.nextSteps.length > 0 ? (
                  <>
                    <h3 className="text-[12px] font-semibold mt-3 mb-1">次に試すこと</h3>
                    <ul className="list-disc pl-5">
                      {feedback.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {feedback.findings.map((finding) => (
                  <div
                    key={`${finding.file}:${finding.startLine}:${finding.comment}`}
                    className="py-2 border-t border-border mt-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>
                        {finding.file} {finding.startLine}
                        {finding.endLine !== finding.startLine ? `〜${finding.endLine}` : ""}行
                      </Badge>
                      <span className="text-[11.5px] font-semibold">
                        {FINDING_SEVERITY_LABELS[finding.severity]}
                      </span>
                    </div>
                    <p className="text-[12.5px]">{finding.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>管理者からの総評</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">
                  {submission.reviewNotes ||
                    (submission.aiReviewStatus === "queued"
                      ? "AI が確認しています。結果が出たら通知します。"
                      : submission.aiReviewStatus === "escalated" && !meta
                        ? "管理者が確認しています。確認待ちの間も、次の課題へ進めます。"
                        : "総評はまだありません。")}
                </p>
              </CardContent>
            </Card>
          )}

          <StaffComments comments={submission.staffComments} />

          <Card>
            <CardHeader>
              <CardTitle>ルーブリック</CardTitle>
            </CardHeader>
            <CardContent>
              {submission.rubric.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">レビュー結果はまだありません。</p>
              ) : (
                submission.rubric.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{criterion.name}</div>
                      {criterion.desc ? (
                        <div className="text-[11.5px] text-ink-3 mt-0.5">{criterion.desc}</div>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold">
                      {criterion.score}
                      <span className="text-[11px] text-ink-3 font-normal">/{criterion.max}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>レビューコメント</CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">コメントはありません。</p>
              ) : (
                suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="py-2.5 border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>Line {suggestion.line}</Badge>
                      <span className="text-[11.5px] font-semibold">{suggestion.category}</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-ink-2">{suggestion.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>提出コード</CardTitle>
          </CardHeader>
          <SubmittedCode lines={submission.codeLines} />
        </Card>
      </div>
    </div>
  );
}

function StaffComments({ comments }: { comments: Submission["staffComments"] }) {
  if (!comments?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>管理者からのコメント</CardTitle>
      </CardHeader>
      <CardContent className="text-[13px] leading-relaxed text-ink-2">
        {comments.map((c) => (
          <div
            key={`${c.createdAt}:${c.comment}`}
            className="py-2 border-b border-border last:border-b-0"
          >
            <p className="whitespace-pre-wrap">{c.comment}</p>
            <p className="text-[11.5px] text-ink-3 mt-1">
              {new Date(c.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SubmittedCode({ lines }: { lines: Submission["codeLines"] }) {
  return (
    <pre className="overflow-auto p-4 bg-sunken text-[12px] leading-relaxed font-mono">
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 行番号が同一性
        <span key={index} className="block">
          <span className="inline-block w-8 mr-3 text-right text-ink-4 select-none">
            {index + 1}
          </span>
          {line || " "}
        </span>
      ))}
    </pre>
  );
}
