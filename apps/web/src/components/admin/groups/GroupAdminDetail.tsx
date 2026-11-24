import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupRequest, type GroupDetail } from "@/lib/admin-groups-api";
import { GroupKind } from "./group-display";
import { GroupMembers } from "./GroupMembers";
import { GroupOverview } from "./GroupOverview";
import { GroupProgress } from "./GroupProgress";
import { GroupStages } from "./GroupStages";

export function GroupAdminDetail({ groupId }: { groupId: string }) {
  const request = useMemo(() => groupRequest(groupId), [groupId]);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState("overview");
  const [progressVersion, setProgressVersion] = useState(0);
  const [stagesOpened, setStagesOpened] = useState(false);
  const [membersOpened, setMembersOpened] = useState(false);
  const back = (
    <Link
      className="inline-flex min-h-11 items-center underline underline-offset-2"
      to="/admin/groups"
      search={{}}
    >
      グループ一覧へ
    </Link>
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt は再読み込みのトリガー。
  useEffect(() => {
    const controller = new AbortController();
    void request<GroupDetail>("", { signal: controller.signal })
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("グループを取得できませんでした。");
      });
    return () => controller.abort();
  }, [request, attempt]);

  if (!detail) {
    return (
      <>
        <PageHeader title="グループ詳細" back={back} />
        {loadError ? (
          <div className="space-y-3">
            <Notice role="alert">{loadError}</Notice>
            <Button
              className="min-h-11"
              type="button"
              onClick={() => {
                setLoadError(null);
                setAttempt(attempt + 1);
              }}
            >
              再読み込み
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-ink-2">
            グループを読み込んでいます…
          </p>
        )}
      </>
    );
  }

  const { group, members, stages } = detail;
  const editable = group.kind === "admin";
  return (
    <div className="min-w-0">
      <PageHeader title={group.name} back={back} eyebrow={<GroupKind group={group} />} />
      {!editable && (
        <Notice tone="info" className="mb-4">
          メンバーとステージは連携元のアプリで管理しています
        </Notice>
      )}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          if (value === "members") setMembersOpened(true);
          if (value === "stages") setStagesOpened(true);
        }}
      >
        <TabsList aria-label="グループの設定と進捗" className="flex w-full">
          <TabsTrigger className="min-h-11" value="overview">
            概要
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="members" count={members.length}>
            メンバー
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="stages" count={stages.length}>
            ステージ
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="progress">
            進捗
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
          <GroupOverview
            group={group}
            request={request}
            onChange={(changes) =>
              setDetail(
                (current) =>
                  current && {
                    ...current,
                    group: { ...current.group, ...changes },
                  },
              )
            }
            onDelete={async () => {
              await request("", { method: "DELETE" });
              toast.success("グループを削除しました");
              await navigate({ to: "/admin/groups", search: {} });
            }}
          />
        </TabsContent>
        <TabsContent value="members" forceMount className="min-w-0 data-[state=inactive]:hidden">
          {membersOpened && (
            <GroupMembers
              members={members}
              editable={editable}
              request={request}
              onMembersChanged={async () => {
                const updated = await request<GroupDetail>();
                setDetail((current) => current && { ...current, members: updated.members });
                setProgressVersion((version) => version + 1);
              }}
              onPeerNameChanged={(id, peerName) =>
                setDetail(
                  (current) =>
                    current && {
                      ...current,
                      members: current.members.map((member) =>
                        member.id === id ? { ...member, peerName } : member,
                      ),
                    },
                )
              }
            />
          )}
        </TabsContent>
        <TabsContent value="stages" forceMount className="min-w-0 data-[state=inactive]:hidden">
          {stagesOpened && (
            <GroupStages
              stages={stages}
              editable={editable}
              request={request}
              onSaved={(saved) => {
                setDetail((current) => current && { ...current, stages: saved });
                setProgressVersion((version) => version + 1);
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="progress" className="min-w-0">
          {tab === "progress" && (
            <GroupProgress key={progressVersion} stages={stages} request={request} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
