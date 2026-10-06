import {
  AI_FAILURE_LABELS,
  AI_REVIEW_STATUS_LABELS,
  type AiReviewRecord,
  type AiReviewStatus,
  CONFIDENCE_LABELS,
  FINDING_SEVERITY_LABELS,
  formatLearnerReply,
  RUBRIC_RESULT_LABELS,
  ROUTE_REASON_LABELS,
} from "@stella/shared/review/ai-review";
import { AlertTriangle, Loader2, Sparkles } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AiReviewPanelProps {
  status: AiReviewStatus | null | undefined;
  review: AiReviewRecord | null | undefined;
  /** 返信案を総評へ入れる。 */
  onUseReply: (text: string) => void;
}

/**
 * 新形式の提出の AI 一次レビュー (07 §6.4 の 1・2)。人に回した理由・確信度・ルーブリックの
 * 結果と根拠・所見・受講者への返信案を並べる。下書きは提出直後に作られている。
 */
export const AiReviewPanel = ({ status, review, onUseReply }: AiReviewPanelProps) => {
  if (!review) {
    return (
      <div className="text-ink-3 text-[12.5px] flex items-center gap-2">
        {status === "queued" ? <Loader2 size={14} className="animate-spin" /> : null}
        {status === "queued"
          ? "AI が確認しています。結果が出るまで少し待ってください。"
          : "AI の一次レビューの結果はありません。"}
      </div>
    );
  }
  const reply = review.learnerReply;
  const leaked = (review.leakCheck?.hits.length ?? 0) > 0;
  return (
    <div className="text-[12.5px] leading-relaxed">
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Badge variant={review.outcome === "confirmed" ? "success" : "warning"}>
          <Sparkles size={10} />
          {review.outcome === "confirmed" ? "AI で確定" : "人に回した"}
        </Badge>
        {status ? <Badge>{AI_REVIEW_STATUS_LABELS[status]}</Badge> : null}
        {review.confidence ? <Badge>確信度 {CONFIDENCE_LABELS[review.confidence]}</Badge> : null}
        {review.proposedVerdict ? (
          <Badge>判定案 {review.proposedVerdict === "pass" ? "合格" : "再提出"}</Badge>
        ) : null}
        {review.disposition === "superseded" ? <Badge>当てはめ対象外</Badge> : null}
      </div>
      {review.routeReasons.length > 0 ? (
        <section className="mb-3">
          <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1">人に回した理由</h3>
          <ul className="list-disc pl-5">
            {review.routeReasons.map((reason) => (
              <li key={reason}>{ROUTE_REASON_LABELS[reason]}</li>
            ))}
          </ul>
          {review.failure ? (
            <p className="text-warning mt-1">{AI_FAILURE_LABELS[review.failure]}</p>
          ) : null}
        </section>
      ) : null}
      {review.rubricResults.length > 0 ? (
        <section className="mb-3">
          <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1">ルーブリック</h3>
          {review.rubricResults.map((item) => (
            <div key={item.id} className="py-1.5 border-b border-border last:border-b-0">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={
                    item.result === "met"
                      ? "success"
                      : item.result === "unmet"
                        ? "danger"
                        : "warning"
                  }
                >
                  {RUBRIC_RESULT_LABELS[item.result]}
                </Badge>
                <span className="font-mono text-[11px]">{item.id}</span>
                <span className="text-ink-3">{item.required ? "必須" : "任意"}</span>
              </div>
              <p className="mt-0.5">{item.criterion}</p>
              {item.note ? <p className="text-ink-3">{item.note}</p> : null}
              {item.evidence.length > 0 ? (
                <p className="text-ink-3 font-mono text-[11px]">
                  根拠:{" "}
                  {item.evidence.map((e) => `${e.file}:${e.startLine}-${e.endLine}`).join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {review.findings.length > 0 ? (
        <section className="mb-3">
          <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1">所見</h3>
          {review.findings.map((finding) => (
            <div
              key={`${finding.file}:${finding.startLine}:${finding.comment}`}
              className="py-1.5 border-b border-border last:border-b-0"
            >
              <span className="font-mono text-[11px]">
                {finding.file}:{finding.startLine}-{finding.endLine}
              </span>{" "}
              <Badge>{FINDING_SEVERITY_LABELS[finding.severity]}</Badge>
              <p>{finding.comment}</p>
            </div>
          ))}
        </section>
      ) : null}
      {reply ? (
        <section className="mb-3">
          <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1">受講者への返信案</h3>
          {leaked ? (
            <p className="text-warning flex items-center gap-1 mb-1">
              <AlertTriangle size={12} />
              AI の返信・所見が解答例と重なったため、受講者向けの文から外しています。
            </p>
          ) : null}
          <p className="whitespace-pre-wrap">{reply.message}</p>
          <Button
            size="sm"
            type="button"
            className="mt-2"
            onClick={() => onUseReply(formatLearnerReply(reply))}
          >
            返信案を総評に入れる
          </Button>
        </section>
      ) : null}
      <p className="text-ink-4 text-[11px]">
        {review.model ?? "モデルなし"} · 指示 {review.promptVersion} · しきい値{" "}
        {review.thresholdVersion}
      </p>
    </div>
  );
};
