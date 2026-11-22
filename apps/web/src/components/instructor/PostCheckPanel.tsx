import { useState } from "react";
import { toast } from "sonner";
import {
  CHECK_RESULT_LABELS,
  type CheckAction,
  MAX_CHECK_COMMENT,
  type SubmissionCheckRecord,
} from "@stella/shared/review/review-desk";
import { CheckCheck, MessageCircle, RotateCcw } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkSubmission } from "@/lib/review-desk-api";
import { CommentTemplatePicker } from "./CommentTemplatePicker";

interface PostCheckPanelProps {
  submissionId: string;
  /** 今の AI の判定。覆したあとは記録だけを出す。 */
  aiVerdict: "pass" | "resubmit" | null;
  checks: SubmissionCheckRecord[] | undefined;
  stageId: string | null | undefined;
  pattern: string | null | undefined;
  /** 操作のあとに提出を取り直す。 */
  onChanged: (action: CheckAction) => Promise<void> | void;
}

const ACTION_DONE: Record<Exclude<CheckAction, "overturn">, string> = {
  confirm: "確認済みにしました",
  comment: "コメントを足し、受講者に知らせました",
};

const RESULT_VARIANT = { confirmed: "success", commented: "info", overturned: "danger" } as const;

/**
 * AI が判定した提出の事後確認 (#34、07 §6.4 の 6)。期間は限らない。
 * 人ができるのは 3 つ: 確認済みにする / 判定を変えずにコメントを足す (受講者へ通知) /
 * 合格または再提出に覆す。確認の記録は残る。
 */
export function PostCheckPanel({
  submissionId,
  aiVerdict,
  checks,
  stageId,
  pattern,
  onChanged,
}: PostCheckPanelProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<CheckAction | null>(null);

  const overturnLabel = aiVerdict === "resubmit" ? "合格に覆す" : "再提出に覆す";
  const act = async (action: CheckAction) => {
    if (busy) return;
    if (action !== "confirm" && !text.trim()) {
      toast.error(action === "overturn" ? "覆す理由を書いてください" : "コメントを書いてください");
      return;
    }
    setBusy(action);
    try {
      await checkSubmission(submissionId, action, text);
      toast.success(
        action === "overturn"
          ? aiVerdict === "resubmit"
            ? "合格に覆し、受講者に知らせました"
            : "再提出に覆し、理由を受講者に知らせました"
          : ACTION_DONE[action],
      );
      setText("");
      await onChanged(action);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存できませんでした");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="text-[12.5px] leading-relaxed">
      {aiVerdict ? (
        <p className="text-ink-3 mb-3">
          {aiVerdict === "pass"
            ? "覆すと、この提出の合格とスキルの証拠を取り消し、理由を受講者に知らせます。"
            : "合格に覆すと、進捗とスキルの証拠に反映し、受講者に知らせます。"}
        </p>
      ) : null}
      <section className="mb-4">
        <h3 className="text-[11.5px] font-semibold text-ink-3 mb-1">確認の記録</h3>
        {checks === undefined ? (
          <p className="text-ink-3">読み込んでいます…</p>
        ) : checks.length === 0 ? (
          <p className="text-ink-3">まだ誰も確認していません。</p>
        ) : (
          <ul>
            {checks.map((c) => (
              <li key={c.id} className="py-1.5 border-b border-border last:border-b-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant={RESULT_VARIANT[c.result]}>{CHECK_RESULT_LABELS[c.result]}</Badge>
                  <span>{c.reviewerName ?? "削除された管理者"}</span>
                  <span className="text-ink-3 ml-auto">
                    {new Date(c.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                {c.comment ? <p className="whitespace-pre-wrap mt-0.5">{c.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {aiVerdict ? (
        <>
          <CommentTemplatePicker
            stageId={stageId}
            pattern={pattern}
            currentText={text}
            onInsert={(body) => setText((prev) => (prev.trim() ? `${prev}\n\n${body}` : body))}
          />
          <Label htmlFor="post-check-text">
            コメント・覆す理由 (受講者に知らせます。確認済みに添えたメモは管理者だけが読みます)
          </Label>
          <Textarea
            id="post-check-text"
            className="min-h-[120px] mb-3"
            value={text}
            maxLength={MAX_CHECK_COMMENT}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void act("confirm")} disabled={busy !== null}>
              <CheckCheck size={13} />
              確認済みにする
            </Button>
            <Button type="button" onClick={() => void act("comment")} disabled={busy !== null}>
              <MessageCircle size={13} />
              コメントを足す
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void act("overturn")}
              disabled={busy !== null}
            >
              <RotateCcw size={13} />
              {overturnLabel}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-ink-3">現在は管理者の判定が適用されています。</p>
      )}
    </div>
  );
}
