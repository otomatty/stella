import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_GROUPS, type GroupSummary } from "@/lib/admin-groups-api";
import { apiFetch } from "@/lib/api-client";
import { GroupKind, GroupTime } from "./group-display";

export function GroupsAdmin({ clientId }: { clientId?: string }) {
  const navigate = useNavigate();
  const nameId = useId();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [listError, setListError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt は再読み込みのトリガー。
  useEffect(() => {
    const controller = new AbortController();
    const query = clientId === undefined ? "" : `?clientId=${encodeURIComponent(clientId)}`;
    void apiFetch<{ groups: GroupSummary[] }>(ADMIN_GROUPS + query, { signal: controller.signal })
      .then((data) => setGroups(data.groups))
      .catch(() => {
        if (!controller.signal.aborted) setListError(true);
      });
    return () => controller.abort();
  }, [clientId, attempt]);

  async function createGroup() {
    if (creating || !name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { group } = await apiFetch<{ group: GroupSummary }>(ADMIN_GROUPS, {
        method: "POST",
        body: { name },
      });
      toast.success("グループを作成しました");
      await navigate({ to: "/admin/groups/$groupId", params: { groupId: group.id } });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "グループを作成できませんでした");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader title="グループ" />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>グループを作る</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createGroup();
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-0 sm:max-w-sm">
                <Label htmlFor={nameId}>グループ名</Label>
                <Input
                  id={nameId}
                  className="min-h-11"
                  required
                  maxLength={200}
                  value={name}
                  disabled={creating}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <Button
                className="min-h-11"
                variant="accent"
                type="submit"
                disabled={creating || !name.trim()}
              >
                グループを作る
              </Button>
            </div>
            {createError && <Notice role="alert">{createError}</Notice>}
          </form>
        </CardContent>
      </Card>
      {clientId !== undefined && (
        <Notice tone="info" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="min-w-0 break-all">
              {groups?.[0]?.clientName ?? "指定した連携クライアント"}のグループに絞り込み中
            </span>
            <Button asChild className="min-h-11" variant="outline">
              <Link to="/admin/groups" search={{}}>
                絞り込みを解除
              </Link>
            </Button>
          </div>
        </Notice>
      )}
      {listError ? (
        <div className="space-y-3">
          <Notice role="alert">グループの一覧を取得できませんでした。</Notice>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              setListError(false);
              setAttempt(attempt + 1);
            }}
          >
            再読み込み
          </Button>
        </div>
      ) : groups === null ? (
        <p role="status" className="text-sm text-ink-2">
          グループを読み込んでいます…
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-2">グループはありません。</p>
      ) : (
        <Card>
          <Table aria-label="グループ一覧">
            <TableHeader>
              <TableRow>
                {["名前", "種類", "人数", "ステージ数", "公開", "更新日時（日本時間）"].map(
                  (label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <Link
                      to="/admin/groups/$groupId"
                      params={{ groupId: group.id }}
                      className="inline-flex min-h-11 max-w-64 items-center break-all font-medium text-primary underline underline-offset-2"
                    >
                      {group.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <GroupKind group={group} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{group.memberCount} 人</TableCell>
                  <TableCell>{group.stageCount}</TableCell>
                  <TableCell>
                    <Badge variant={group.shareProgress ? "success" : "default"}>
                      {group.shareProgress ? "オン" : "オフ"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <GroupTime value={group.updatedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
