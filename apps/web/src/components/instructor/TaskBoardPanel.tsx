import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AI_REVIEW_STATUS_LABELS,
  type AiReviewStatus,
  CONFIDENCE_LABELS,
  RUBRIC_RESULT_LABELS,
} from "@stella/shared/review/ai-review";
import {
  REVIEW_QUEUE_GROUP_LABELS,
  reviewQueueGroup,
  type TaskBoard,
} from "@stella/shared/review/review-desk";
import { ChevronLeft, Compass, Megaphone } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement } from "@/lib/notifications-api";
import { fetchTaskBoard, routeToDiscovery } from "@/lib/review-desk-api";
import { cn } from "@/lib/utils";

interface TaskBoardPanelProps {
  tenantId: string;
  taskId: string;
  assignedOnly: boolean;
  onOpen: (submissionId: string) => void;
  onClose: () => void;
  /** 発見教材の画面へ (下書きはそこで作る)。 */
  onOpenDiscovery: () => void;
}

const RESULT_VARIANT = { met: "success", unmet: "danger", undetermined: "warning" } as const;
const VERDICT_LABELS = { pass: "合格", resubmit: "再提出", fail: "不合格" } as const;

/**
 * 同じ課題の提出を並べて見る (#34、07 §6.4 の 5)。受講者ごとの最新の提出と、ルーブリックの
 * 項目ごとの「満たさない」の数を出す。共通のつまずきは、講座の受講者全体への補足 (お知らせ) か、
 * つまずき教材 (発見教材) の待ち行列に回す。
 */
export function TaskBoardPanel({
  tenantId,
  taskId,
  assignedOnly,
  onOpen,
  onClose,
  onOpenDiscovery,
}: TaskBoardPanelProps) {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setBoard(null);
    setError(null);
    fetchTaskBoard(taskId, assignedOnly, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setBoard(data);
        setTitle((prev) => prev || `「${data.task.title}」の補足`);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "提出を読み込めませんでした");
      });
    return () => controller.abort();
  }, [taskId, assignedOnly]);

  const postSupplement = async () => {
    if (!board || !title.trim() || !body.trim()) return;
    setPosting(true);
    try {
      await createAnnouncement({
        tenantId,
        stageId: board.task.stageId,
        title: title.trim(),
        body: body.trim(),
      });
      toast.success("講座の受講者全体に補足を送りました");
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "補足を送れませんでした");
    } finally {
      setPosting(false);
    }
  };

  const toDiscovery = async (rubricId: string | null) => {
    try {
      const { topic } = await routeToDiscovery(taskId, rubricId);
      toast.success(`発見教材の待ち行列に回しました: ${topic}`, {
        action: { label: "発見教材を開く", onClick: onOpenDiscovery },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "発見教材に回せませんでした");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1 mb-3 text-ink-3 text-[12.5px] hover:text-foreground"
      >
        <ChevronLeft size={14} />
        キューに戻る
      </button>
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
      {board === null ? (
        error ? null : (
          <p className="text-ink-3 text-[12.5px]">読み込んでいます…</p>
        )
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-0.5">{board.task.title}</h2>
          <p className="text-[12px] text-ink-3 mb-4">
            {board.task.stageTitle} · パターン {board.task.pattern} · 受講者{" "}
            {board.submissions.length}
            名の最新の提出
          </p>
          <div
            className="grid gap-4 mb-4"
            style={{ gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)" }}
          >
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>項目ごとの結果 (AI)</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>項目</TableHead>
                    <TableHead>満たす</TableHead>
                    <TableHead>満たさない</TableHead>
                    <TableHead>判断できない</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-ink-3 py-6">
                        この課題にはルーブリックの項目がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    board.items.map((item) => (
                      <TableRow
                        key={item.id}
                        // 半数以上が満たさない項目は共通のつまずきとして目立たせる。
                        className={cn(
                          item.unmet * 2 >=
                            Math.max(1, item.met + item.unmet + item.undetermined) &&
                            item.unmet > 0 &&
                            "bg-danger-soft/40",
                        )}
                      >
                        <TableCell>
                          <div className="text-[12.5px]">{item.criterion}</div>
                          <div className="text-[11px] text-ink-3 font-mono">
                            {item.id} · {item.required ? "必須" : "任意"}
                          </div>
                          {item.current ? null : (
                            // ルーブリックの改訂で今の版から外れた項目 (題名は判定した時点のもの)。
                            <Badge className="mt-0.5">前の版の項目</Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.met}</TableCell>
                        <TableCell>{item.unmet}</TableCell>
                        <TableCell>{item.undetermined}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            type="button"
                            disabled={
                              !item.current || (item.unmet === 0 && item.undetermined === 0)
                            }
                            title={
                              item.current
                                ? undefined
                                : "前の版の項目は発見教材に回せません (今の課題の項目で回してください)"
                            }
                            onClick={() => void toDiscovery(item.id)}
                          >
                            <Compass size={11} />
                            つまずき教材へ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="px-4 py-3">
                <Button size="sm" type="button" onClick={() => void toDiscovery(null)}>
                  <Compass size={11} />
                  課題全体をつまずき教材へ回す
                </Button>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>全体への補足</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4 text-[12.5px]">
                <p className="text-ink-3 mb-2">
                  講座「{board.task.stageTitle}
                  」の受講者全員にお知らせとして送ります。特定の受講者の名前や提出には触れないでください。
                </p>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="補足の題名"
                  className="mb-2"
                />
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  aria-label="補足の本文"
                  placeholder="共通のつまずきと、直し方の手がかり"
                  className="min-h-[120px] mb-2"
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={posting || !title.trim() || !body.trim()}
                  onClick={() => void postSupplement()}
                >
                  <Megaphone size={13} />
                  補足を送る
                </Button>
              </div>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受講者</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>確信度</TableHead>
                  <TableHead>満たさない項目</TableHead>
                  <TableHead>提出</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-ink-3 py-6">
                      提出はまだありません
                    </TableCell>
                  </TableRow>
                ) : (
                  board.submissions.map((s) => {
                    const unmet = Object.entries(s.rubric).filter(([, r]) => r !== "met");
                    return (
                      <TableRow
                        key={s.submissionId}
                        interactive
                        onClick={() => onOpen(s.submissionId)}
                      >
                        <TableCell className="font-medium">{s.studentName}</TableCell>
                        <TableCell>
                          {s.verdict ? (
                            <Badge variant={s.verdict === "pass" ? "success" : "warning"}>
                              {s.reviewSource === "ai" && s.verdict === "pass"
                                ? "AI で合格"
                                : VERDICT_LABELS[s.verdict]}
                            </Badge>
                          ) : s.aiReviewStatus === "escalated" ? (
                            <Badge variant="warning">
                              {
                                REVIEW_QUEUE_GROUP_LABELS[
                                  reviewQueueGroup({ taskId, routeReasons: s.routeReasons })
                                ]
                              }
                            </Badge>
                          ) : s.aiReviewStatus ? (
                            <Badge>
                              {AI_REVIEW_STATUS_LABELS[s.aiReviewStatus as AiReviewStatus]}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {s.confidence ? CONFIDENCE_LABELS[s.confidence] : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {unmet.length === 0
                              ? "-"
                              : unmet.map(([id, result]) => (
                                  <Badge key={id} variant={RESULT_VARIANT[result]}>
                                    {id} {RUBRIC_RESULT_LABELS[result]}
                                  </Badge>
                                ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-ink-3">
                          {s.attempt}回目 · {new Date(s.submittedAt).toLocaleDateString("ja-JP")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
