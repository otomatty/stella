import type { IntegrationProgress } from "@stella/shared/integrations/types";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/common/Notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroupStage } from "@/lib/admin-group-stages";
import type { GroupRequest } from "@/lib/admin-groups-api";

type Member = IntegrationProgress["members"][number];
type StageProgress = Member["stages"][number];

const STATUS = { assigned: "未着手", started: "受講中", cleared: "修了" };

export function GroupProgress({
  stages,
  request,
}: {
  stages: GroupStage[];
  request: GroupRequest;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const moreRequest = useRef<AbortController | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt は再読み込みのトリガー。
  useEffect(() => {
    const controller = new AbortController();
    void request<IntegrationProgress>("/progress", { signal: controller.signal })
      .then((page) => {
        setMembers(page.members);
        setNext(page.hasMore ? page.next : null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      moreRequest.current?.abort();
    };
  }, [request, attempt]);

  async function loadMore() {
    if (!next || busy) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    setBusy(true);
    setError(false);
    try {
      const page = await request<IntegrationProgress>(
        `/progress?cursor=${encodeURIComponent(next)}`,
        {
          signal: controller.signal,
        },
      );
      setMembers((current) => [...(current ?? []), ...page.members]);
      setNext(page.hasMore ? page.next : null);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {error && <Notice role="alert">進捗を取得できませんでした。</Notice>}
        {members === null ? (
          busy ? (
            <p role="status" className="text-sm text-ink-2">
              進捗を読み込んでいます…
            </p>
          ) : (
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                setError(false);
                setBusy(true);
                setAttempt(attempt + 1);
              }}
            >
              再読み込み
            </Button>
          )
        ) : members.length === 0 ? (
          <p className="text-sm text-ink-2">メンバーはいません。</p>
        ) : (
          <>
            {stages.length === 0 && (
              <p className="text-sm text-ink-2">ステージは設定されていません。</p>
            )}
            <Table aria-label="メンバーのステージ別進捗">
              <TableHeader>
                <TableRow>
                  <TableHead>メンバー</TableHead>
                  {stages.map((stage) => (
                    <TableHead
                      key={stage.id}
                      className="max-w-56 min-w-28 whitespace-normal break-all"
                    >
                      {stage.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const progress = new Map(member.stages.map((stage) => [stage.slug, stage]));
                  return (
                    <TableRow key={member.id}>
                      <th
                        scope="row"
                        className="max-w-48 break-all border-b border-border px-4 py-3 text-left font-medium [tr:last-child_&]:border-b-0"
                      >
                        {member.displayName}
                      </th>
                      {stages.map((stage) => (
                        <TableCell key={stage.id}>
                          <ProgressCell progress={progress.get(stage.slug)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {next && (
              <Button
                type="button"
                className="min-h-11"
                disabled={busy}
                onClick={() => void loadMore()}
              >
                {busy ? "読み込んでいます…" : "さらに読み込む"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressCell({ progress }: { progress?: StageProgress }) {
  if (!progress) return "—";
  const tasks = progress.units.flatMap((unit) => unit.tasks);
  return (
    <div className="space-y-1 whitespace-nowrap">
      <Badge variant={progress.status === "cleared" ? "success" : "default"}>
        {STATUS[progress.status]}
      </Badge>
      <p className="text-xs text-ink-2">
        課題 {tasks.filter((task) => task.passed).length} / {tasks.length}
      </p>
    </div>
  );
}
