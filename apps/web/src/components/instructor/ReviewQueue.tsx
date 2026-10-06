import { useMemo, useState } from "react";
import { CONFIDENCE_LABELS, ROUTE_REASON_LABELS } from "@stella/shared/review/ai-review";
import {
  REVIEW_QUEUE_GROUP_LABELS,
  REVIEW_QUEUE_GROUPS,
  REVIEW_QUEUE_SORT_LABELS,
  REVIEW_QUEUE_SORTS,
  type ReviewQueueGroup,
  type ReviewQueueSort,
} from "@stella/shared/review/review-desk";
import type { Submission } from "@stella/shared/review/types";
import { BarChart, CheckCheck, ChevronRight, Edit, ListTree, Sparkles } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useAssignedScope } from "@/hooks/useAssignedScope";
import { hasAiDraft } from "@/lib/ai-draft";
import {
  formatWaiting,
  isAiChecking,
  needsHumanReview,
  queueGroupOf,
  sortQueue,
} from "@/lib/review-queue";
import type { Tenant } from "@/data/types";
import type { AvatarTone } from "@/data/types";
import { AssignedScopeToggle } from "./AssignedScopeToggle";
import { AiPassedList } from "./AiPassedList";
import { ReviewMetricsPanel } from "./ReviewMetricsPanel";
import { TaskBoardPanel } from "./TaskBoardPanel";

interface ReviewQueueProps {
  tenantId: Tenant["id"];
  setPage: (p: string) => void;
  onOpenReview: (submissionId: string) => void;
  currentUserId?: string | null;
  backendEnabled?: boolean;
}

type GroupFilter = "all" | ReviewQueueGroup | "ai-checking";

/**
 * 講師のレビュー画面 (#34、07 §6.4)。講師と管理者が使う。
 *
 * - 人に回した提出: 人に回した理由で分け、待ち時間・理由・担当者で並べる。行から開いて 1 回の
 *   操作で確定する。同じ課題の提出を並べて見て、共通のつまずきを全体への補足・発見教材に回す。
 * - AI が合格にした提出: いつでも確認できる (確認済み・コメント・覆す)。
 * - 見直しの数字: しきい値の月次見直しに使う割合。
 */
export const ReviewQueue = ({
  tenantId,
  setPage,
  onOpenReview,
  currentUserId = null,
  backendEnabled = false,
}: ReviewQueueProps) => {
  const { submissions } = useSubmissions(tenantId);
  const scope = useAssignedScope(currentUserId, backendEnabled);
  const [tab, setTab] = useState("queue");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [sort, setSort] = useState<ReviewQueueSort>("wait");
  const [boardTaskId, setBoardTaskId] = useState<string | null>(null);

  const { pending, others, aiChecking } = useMemo(() => {
    const inScope = (s: Submission) =>
      !scope.assignedOnly || (s.studentId != null && scope.assignedIds.has(s.studentId));
    const all = submissions.filter(needsHumanReview);
    // 担当だけに絞っても、ほかの受講者の提出が残っていることは件数で見えるようにする。
    const mine = all.filter(inScope);
    return {
      pending: mine,
      others: all.length - mine.length,
      aiChecking: submissions.filter((s) => isAiChecking(s) && inScope(s)),
    };
  }, [submissions, scope.assignedOnly, scope.assignedIds]);
  const aiReadyCount = pending.filter(hasAiDraft).length;
  const counts = useMemo(() => {
    const map = new Map<ReviewQueueGroup, number>();
    for (const s of pending) map.set(queueGroupOf(s), (map.get(queueGroupOf(s)) ?? 0) + 1);
    return map;
  }, [pending]);
  const rows = sortQueue(
    group === "ai-checking"
      ? aiChecking
      : group === "all"
        ? pending
        : pending.filter((s) => queueGroupOf(s) === group),
    sort,
  );

  const open = (id: string) => {
    onOpenReview(id);
    setPage("review");
  };

  if (boardTaskId) {
    return (
      <TaskBoardPanel
        tenantId={tenantId}
        taskId={boardTaskId}
        assignedOnly={scope.assignedOnly}
        onOpen={open}
        onClose={() => setBoardTaskId(null)}
        onOpenDiscovery={() => setPage("discovery")}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="レビュー"
        sub={`人に回した提出 ${pending.length}件 · うちAI下書き準備済 ${aiReadyCount}件${scope.assignedOnly && others > 0 ? ` · ほかの受講者 ${others}件` : ""}`}
        actions={<AssignedScopeToggle scope={scope} />}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="queue" icon={<Edit />} count={pending.length}>
            人に回した提出
          </TabsTrigger>
          {backendEnabled ? (
            <>
              <TabsTrigger value="ai-passed" icon={<CheckCheck />}>
                AI が合格にした提出
              </TabsTrigger>
              <TabsTrigger value="metrics" icon={<BarChart />}>
                見直しの数字
              </TabsTrigger>
            </>
          ) : null}
        </TabsList>

        <TabsContent value="queue">
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <fieldset className="flex flex-wrap items-center gap-1.5 border-0 p-0 m-0">
              <legend className="sr-only">人に回した理由</legend>
              <Chip active={group === "all"} onClick={() => setGroup("all")}>
                すべて ({pending.length})
              </Chip>
              {REVIEW_QUEUE_GROUPS.map((g) =>
                counts.get(g) ? (
                  <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                    {REVIEW_QUEUE_GROUP_LABELS[g]} ({counts.get(g)})
                  </Chip>
                ) : null,
              )}
              {aiChecking.length > 0 ? (
                <Chip active={group === "ai-checking"} onClick={() => setGroup("ai-checking")}>
                  AI が確認中 ({aiChecking.length})
                </Chip>
              ) : null}
            </fieldset>
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-[12px] text-ink-3">
              並べ方
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ReviewQueueSort)}
                className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
              >
                {REVIEW_QUEUE_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {REVIEW_QUEUE_SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {group === "ai-checking" ? (
            <p className="text-[12px] text-ink-3 mb-2">
              AI が確認している提出です。人が先に確定することもできます (AI
              の結果は記録だけします)。
            </p>
          ) : null}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受講者</TableHead>
                  <TableHead>課題</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead>待ち時間</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-ink-3 py-10">
                      人のレビューを待っている提出はありません
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} interactive onClick={() => open(r.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback tone={r.avatarTone as AvatarTone}>
                              {r.studentInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{r.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{r.assignmentTitle}</div>
                        <div className="text-[11.5px] text-ink-3">{r.stageTitle}</div>
                      </TableCell>
                      <TableCell>
                        {r.aiReviewStatus === "queued" ? (
                          <Badge variant="info">AI が確認中</Badge>
                        ) : (
                          <Badge
                            variant={queueGroupOf(r) === "legacy" ? "default" : "warning"}
                            title={(r.routeReasons ?? [])
                              .map((reason) => ROUTE_REASON_LABELS[reason])
                              .join(" / ")}
                          >
                            {REVIEW_QUEUE_GROUP_LABELS[queueGroupOf(r)]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.aiConfidence ? (
                          <div className="flex flex-wrap gap-1">
                            <Badge>確信度 {CONFIDENCE_LABELS[r.aiConfidence]}</Badge>
                            {r.aiProposedVerdict ? (
                              <Badge
                                variant={r.aiProposedVerdict === "pass" ? "success" : "warning"}
                              >
                                案 {r.aiProposedVerdict === "pass" ? "合格" : "再提出"}
                              </Badge>
                            ) : null}
                          </div>
                        ) : hasAiDraft(r) ? (
                          <Badge variant="accent">
                            <Sparkles size={10} />
                            下書き
                          </Badge>
                        ) : (
                          // 旧形式の下書きは講師が Editor を開いた時に生成する。
                          <span className="text-ink-3 text-[11.5px]">
                            {r.taskId ? "記録なし" : "未生成"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-ink-3">{formatWaiting(r.submittedAt)}</TableCell>
                      <TableCell className="text-ink-3">{r.assigneeName ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.taskId ? (
                            <Button
                              size="sm"
                              type="button"
                              variant="ghost"
                              title="同じ課題の提出を並べて見る"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoardTaskId(r.taskId ?? null);
                              }}
                            >
                              <ListTree size={12} />
                              並べて見る
                            </Button>
                          ) : null}
                          <ChevronRight size={14} className="text-ink-4" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {backendEnabled ? (
          <>
            <TabsContent value="ai-passed">
              <AiPassedList
                submissions={submissions}
                assignedOnly={scope.assignedOnly}
                onOpen={open}
              />
            </TabsContent>
            <TabsContent value="metrics">
              <ReviewMetricsPanel />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </>
  );
};
