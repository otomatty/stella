import { Filter, Sliders, ChevronRight, Sparkles } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { formatSubmittedAt } from "@/lib/submissions-store";
import type { Tenant } from "@/data/types";
import type { AvatarTone } from "@/data/types";
import { AssignedScopeToggle } from "./AssignedScopeToggle";

interface ReviewQueueProps {
  tenantId: Tenant["id"];
  setPage: (p: string) => void;
  onOpenReview: (submissionId: string) => void;
  currentUserId?: string | null;
  backendEnabled?: boolean;
}

export const ReviewQueue = ({
  tenantId,
  setPage,
  onOpenReview,
  currentUserId = null,
  backendEnabled = false,
}: ReviewQueueProps) => {
  const { submissions } = useSubmissions(tenantId);
  const scope = useAssignedScope(currentUserId, backendEnabled);
  const allPending = submissions.filter((s) => s.status === "pending");
  // 担当だけに絞っても、ほかの受講者の提出が残っていることは件数で見えるようにする。
  const pending = scope.assignedOnly
    ? allPending.filter((s) => s.studentId && scope.assignedIds.has(s.studentId))
    : allPending;
  const others = allPending.length - pending.length;
  const aiReadyCount = pending.filter((s) => s.aiReady).length;

  return (
    <>
      <PageHeader
        title="添削待ちキュー"
        sub={`${pending.length}件の提出物 · うちAI下書き準備済 ${aiReadyCount}件${scope.assignedOnly && others > 0 ? ` · ほかの受講者 ${others}件` : ""}`}
        actions={
          <>
            <AssignedScopeToggle scope={scope} />
            <Button type="button" variant="ghost" disabled title="今後対応">
              <Filter size={14} />
              フィルター
            </Button>
            <Button type="button" variant="ghost" disabled title="今後対応">
              <Sliders size={14} />
              ソート
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>受講者</TableHead>
              <TableHead>課題</TableHead>
              <TableHead>ステージ</TableHead>
              <TableHead>提出日時</TableHead>
              <TableHead>AI</TableHead>
              <TableHead>優先度</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-3 py-10">
                  添削待ちの提出物はありません
                </TableCell>
              </TableRow>
            ) : (
              pending.map((r) => (
                <TableRow
                  key={r.id}
                  interactive
                  onClick={() => {
                    onOpenReview(r.id);
                    setPage("review");
                  }}
                >
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
                  <TableCell>{r.assignmentTitle}</TableCell>
                  <TableCell className="text-ink-3">{r.stageTitle}</TableCell>
                  <TableCell className="text-ink-3">{formatSubmittedAt(r.submittedAt)}</TableCell>
                  <TableCell>
                    {r.aiReady ? (
                      <Badge variant="accent">
                        <Sparkles size={10} />
                        準備済
                      </Badge>
                    ) : (
                      // 下書きは講師が Editor を開いた時に生成する。 提出直後は「未生成」。
                      <span className="text-ink-3 text-[11.5px]">未生成</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.priority === "high" ? (
                      <Badge variant="warning">優先</Badge>
                    ) : r.priority === "low" ? (
                      <Badge>低</Badge>
                    ) : (
                      <Badge variant="info">通常</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight size={14} className="text-ink-4" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
