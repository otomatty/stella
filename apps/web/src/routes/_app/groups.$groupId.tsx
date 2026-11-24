import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { GroupPeerProgress } from "@stella/shared/groups/types";
import { AccessDeniedScreen } from "@/components/common/AccessDeniedScreen";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiClientError } from "@/lib/api-client";
import { getGroupPeers } from "@/lib/groups-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/groups/$groupId")({
  component: GroupProgressPage,
});

function GroupProgressPage() {
  const { groupId } = Route.useParams();
  const { backendEnabled, currentUserId, profileRole } = useAppShell();
  if (profileRole === "admin") return <AccessDeniedScreen allow={["learner"]} />;

  return (
    <RoleGuard allow={["learner"]}>
      <GroupProgress
        key={JSON.stringify([currentUserId, groupId])}
        groupId={groupId}
        enabled={backendEnabled && currentUserId !== null && profileRole === "student"}
      />
    </RoleGuard>
  );
}

type PeerResult = { data: GroupPeerProgress } | { error: string };

function GroupProgress({ groupId, enabled }: { groupId: string; enabled: boolean }) {
  const [result, setResult] = useState<PeerResult | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;
    void getGroupPeers(groupId, signal).then(
      (data) => {
        if (!signal.aborted) setResult({ data });
      },
      (error: unknown) => {
        if (signal.aborted) return;
        setResult({
          error:
            error instanceof ApiClientError && error.status === 404
              ? "このグループは表示できません"
              : "仲間の進捗を読み込めませんでした",
        });
      },
    );
    return () => controller.abort();
  }, [enabled, groupId]);

  const progress = enabled && result && "data" in result ? result.data : null;
  const error = enabled
    ? result && "error" in result && result.error
    : "このグループは表示できません";
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <Link to="/groups" className="inline-flex min-h-11 items-center text-sm text-brand underline">
        グループ一覧に戻る
      </Link>
      <header className="space-y-2">
        <h1 className="break-words text-2xl font-bold">{progress?.group.name ?? "グループ"}</h1>
        <p className="text-sm text-ink-3">
          このグループのメンバーには、あなたの表示名・修了したステージ・進捗の割合が見えます。
        </p>
      </header>
      {progress ? (
        <PeerTable progress={progress} />
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <p role="status">仲間の進捗を読み込んでいます</p>
      )}
    </div>
  );
}

function PeerTable({ progress }: { progress: GroupPeerProgress }) {
  // API はプロフィール ID を返さないので、同名のメンバーは応答内の出現順で区別する。
  const occurrences = new Map<string, number>();
  return (
    <section
      aria-label="仲間の進捗"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: キーボードで表を横スクロールできるようにする。
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-brand"
    >
      <Table aria-label="ステージの進捗" containerClassName="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-36 min-w-32">メンバー</TableHead>
            {progress.stages.map((stage) => (
              <TableHead key={stage.id} className="min-w-36 whitespace-normal">
                {stage.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {progress.members.map((member) => {
            const occurrence = (occurrences.get(member.name) ?? 0) + 1;
            occurrences.set(member.name, occurrence);
            const progressByStage = new Map(member.stages.map((stage) => [stage.id, stage]));
            return (
              <TableRow
                key={JSON.stringify([member.name, occurrence])}
                className={member.isMe ? "bg-brand-soft" : undefined}
              >
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 border-b border-border px-4 py-3 text-left font-medium [tr:last-child_&]:border-b-0",
                    member.isMe ? "bg-brand-soft" : "bg-card",
                  )}
                >
                  <span className="block max-w-40 break-words">{member.name}</span>
                  {member.isMe && <Badge variant="accent">あなた</Badge>}
                </th>
                {progress.stages.map(({ id }) => {
                  const stage = progressByStage.get(id);
                  return (
                    <TableCell key={id}>
                      {stage && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 tabular-nums">
                            <span>{stage.percent}%</span>
                            {stage.cleared && <Badge variant="success">修了</Badge>}
                          </div>
                          <div
                            aria-hidden="true"
                            className="h-1 overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className="h-full bg-brand"
                              style={{ width: `${stage.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
