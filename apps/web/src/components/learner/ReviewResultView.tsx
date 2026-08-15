import { useEffect, useState } from "react";
import type { Submission } from "@falcon/shared/review/types";
import { ChevronLeft } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSubmissionById } from "@/lib/submissions-api";
import { formatSubmittedAt } from "@/lib/submissions-store";
import { isBackendConfigured } from "@/lib/backend";

interface ReviewResultViewProps {
  submissionId: string;
  setPage: (page: string) => void;
  /** 一覧から渡せる場合は初回表示を早くする。 */
  initial?: Submission | null;
}

const verdictMeta = {
  pass: { label: "合格", variant: "success" },
  resubmit: { label: "再提出", variant: "warning" },
  fail: { label: "不合格", variant: "danger" },
} as const;

export function ReviewResultView({ submissionId, setPage, initial = null }: ReviewResultViewProps) {
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
          onClick={() => setPage("dash")}
        >
          ダッシュボードに戻る
        </button>
      </div>
    );
  }

  const meta = submission.verdict ? verdictMeta[submission.verdict] : null;
  const suggestions = submission.aiSuggestions.filter((suggestion) => suggestion.adopted !== false);

  return (
    <div className="max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => setPage("dash")}
        className="flex items-center gap-1 mb-4 text-ink-3 text-[12.5px] hover:text-foreground"
      >
        <ChevronLeft size={14} />
        ダッシュボードに戻る
      </button>

      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-[24px] tracking-tight font-semibold">{submission.assignmentTitle}</h1>
          <p className="text-[12.5px] text-ink-3 mt-1">
            {submission.courseTitle} · 提出 {formatSubmittedAt(submission.submittedAt)} ·{" "}
            {submission.attempt}回目
          </p>
        </div>
        <div className="flex-1" />
        {meta ? (
          <Badge variant={meta.variant}>{meta.label}</Badge>
        ) : (
          <Badge variant="info">添削待ち</Badge>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>講師からの総評</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">
                {submission.reviewNotes || "総評はまだありません。"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ルーブリック</CardTitle>
            </CardHeader>
            <CardContent>
              {submission.rubric.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">採点結果はまだありません。</p>
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
          <pre className="overflow-auto p-4 bg-sunken text-[12px] leading-relaxed font-mono">
            {submission.codeLines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 行番号が同一性
              <span key={index} className="block">
                <span className="inline-block w-8 mr-3 text-right text-ink-4 select-none">
                  {index + 1}
                </span>
                {line || " "}
              </span>
            ))}
          </pre>
        </Card>
      </div>
    </div>
  );
}
