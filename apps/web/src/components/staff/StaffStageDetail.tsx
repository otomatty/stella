import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { StageWithChildren, StageGradebook, StageMaterialRow } from "@stella/shared/cms/types";
import { TASK_KIND_LABELS, type TaskKind } from "@stella/shared/tasks/manifest";
import type { StaffStageTasksResponse } from "@stella/shared/tasks/staff-stage";
import { useAppShell } from "@/components/shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getStageWithChildren,
  listStageMaterials,
  downloadLessonMaterial,
  listLessonMaterialVersions,
  downloadLessonMaterialVersion,
} from "@/lib/cms-api";
import { fetchStageGradebook } from "@/lib/certificates-api";
import { toast } from "sonner";
import { getStaffSkillMap, type StaffSkillMapStageNode } from "@/lib/skill-map-api";
import { fetchStaffStageTasks } from "@/lib/staff-stage-api";
import { StaffEnrollButton } from "./StaffEnrollButton";
import { StageGrantEditor } from "./StageGrantEditor";
import { stageAudienceLabel, stageStatusLabel } from "./stage-management";
import {
  filterStaffStageTasks,
  groupStageSections,
  groupStageMaterials,
  prerequisitesLabel,
  LESSON_TYPE_LABELS,
  parseStaffStageTab,
  taskSupportLabel,
  type StaffTaskFilter,
  type StaffStageSection,
} from "./staff-stage-detail";

interface DetailData extends StaffStageTasksResponse {
  content: StageWithChildren;
  node: StaffSkillMapStageNode;
  nodes: StaffSkillMapStageNode[];
}

export function StaffStageDetail({ stageId }: { stageId: string }) {
  const shell = useAppShell();
  const { tab } = useSearch({ from: "/_app/stages/$stageId/" });
  const navigate = useNavigate({ from: "/stages/$stageId/" });
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visited, setVisited] = useState({
    stageId,
    learners: tab === "learners",
    materials: tab === "materials",
  });
  useEffect(() => {
    setVisited((previous) => {
      if (previous.stageId !== stageId)
        return { stageId, learners: tab === "learners", materials: tab === "materials" };
      return tab === "learners" || tab === "materials"
        ? previous[tab]
          ? previous
          : { ...previous, [tab]: true }
        : previous;
    });
  }, [tab, stageId]);
  const [grantOpen, setGrantOpen] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const [content, map, taskData] = await Promise.all([
        getStageWithChildren(stageId, signal),
        getStaffSkillMap(signal),
        fetchStaffStageTasks(stageId, signal),
      ]);
      if (signal.aborted) return;
      const node = map.stages.find((stage) => stage.id === stageId);
      if (!content || !node) throw new Error("ステージが見つかりません");
      setData({ content, node, nodes: map.stages, ...taskData });
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [stageId]);
  useEffect(() => {
    void load();
    return () => pending.current?.abort();
  }, [load]);

  const sections = data ? groupStageSections(data.content, data.tasks) : [];
  const stage = data?.content.stage;
  const node = data?.node;
  const waiting = data?.tasks.reduce((sum, task) => sum + task.counts.waiting, 0) ?? 0;
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 p-4 md:p-6">
      <Link to="/stages" className="text-[13px] text-ink-2 hover:underline">
        ← ステージ管理
      </Link>
      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <Button onClick={() => void load()}>再読み込み</Button>
        </div>
      ) : data && stage && node ? (
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {node.category ? <Badge>{node.category}</Badge> : null}
              <Badge variant={node.audience === "granted" ? "accent" : "default"}>
                {stageAudienceLabel(node.audience)}
              </Badge>
              <Badge
                variant={
                  node.status === "published"
                    ? "success"
                    : node.status === "archived"
                      ? "danger"
                      : "default"
                }
              >
                {stageStatusLabel(node.status)}
              </Badge>
            </div>
            <h1 className="break-words text-xl font-bold">{stage.title}</h1>
            <p className="break-all font-mono text-xs text-ink-3">{stage.slug}</p>
            <p className="text-[13px] text-ink-2">
              {sections.length} 単元 ·{" "}
              {sections.reduce((sum, section) => sum + section.lessonCount, 0)} レッスン ·{" "}
              {data.tasks.length} 課題 · 目安 {stage.duration_hours ?? "—"} 時間 · 前提:{" "}
              {prerequisitesLabel(data.prerequisites)}
            </p>
            <div className="flex flex-wrap gap-2">
              {node.audience === "granted" ? (
                <Button onClick={() => setGrantOpen(true)}>受講者を割り当てる</Button>
              ) : null}
              {node.status === "published" ? (
                <StaffEnrollButton stageId={stageId} onOpenAsLearner={shell.openStageAsLearner} />
              ) : null}
              <Button asChild variant="outline">
                <a
                  href={`https://github.com/otomatty/stella/tree/main/packages/content/stages/${encodeURIComponent(stage.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub で開く
                </a>
              </Button>
            </div>
          </header>
          <Card className="flex flex-wrap gap-x-8 gap-y-3 p-4 text-[13px] tabular-nums">
            {node.audience === "granted" ? (
              <span>
                割り当て <strong>{node.granted_count}</strong>
              </span>
            ) : null}
            <span>
              受講中 <strong>{node.enrolled_count}</strong>
            </span>
            <span>
              人の確認待ち <WaitingCount count={waiting} />
            </span>
            <span>
              類題のある課題{" "}
              <strong>
                {data.tasks.filter((task) => task.variantCount > 0).length} / {data.tasks.length}
              </strong>
            </span>
          </Card>
          <Tabs
            value={tab}
            onValueChange={(value) => void navigate({ search: { tab: parseStaffStageTab(value) } })}
          >
            <TabsList aria-label="ステージ詳細">
              <TabsTrigger value="tasks" count={data.tasks.length}>
                課題
              </TabsTrigger>
              <TabsTrigger value="outline">構成</TabsTrigger>
              <TabsTrigger value="learners">受講者</TabsTrigger>
              <TabsTrigger value="materials">配布資料</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
              <TasksTab sections={sections} slug={stage.slug} />
            </TabsContent>
            <TabsContent value="outline">
              <OutlineTab sections={sections} />
            </TabsContent>
            <TabsContent value="learners" forceMount hidden={tab !== "learners"}>
              {visited.stageId === stageId && visited.learners ? (
                <LearnersTab key={stageId} stageId={stageId} />
              ) : null}
            </TabsContent>
            <TabsContent value="materials" forceMount hidden={tab !== "materials"}>
              {visited.stageId === stageId && visited.materials ? (
                <MaterialsTab key={stageId} stageId={stageId} />
              ) : null}
            </TabsContent>
          </Tabs>
          <StageGrantEditor
            stageId={stageId}
            stageTitle={stage.title}
            open={grantOpen}
            onClose={() => setGrantOpen(false)}
            onSaved={() => void load()}
            stageTitleOf={(id) => data.nodes.find((candidate) => candidate.id === id)?.title}
          />
        </>
      ) : null}
    </div>
  );
}

function WaitingCount({ count }: { count: number }) {
  return count > 0 ? (
    <Badge variant="warning" className="tabular-nums">
      {count}
    </Badge>
  ) : (
    <span className="tabular-nums">0</span>
  );
}

function TasksTab({ sections, slug }: { sections: StaffStageSection[]; slug: string }) {
  const [filter, setFilter] = useState<StaffTaskFilter>({
    kind: "all",
    waitingOnly: false,
    query: "",
  });
  const filtering = filter.kind !== "all" || filter.waitingOnly || filter.query.trim() !== "";
  const matches = sections.map((section) => ({
    ...section,
    visible: filterStaffStageTasks(section.tasks, filter),
  }));
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end gap-4 text-[13px]">
        <label className="flex flex-col gap-1" htmlFor="staff-task-kind">
          種別
          <select
            id="staff-task-kind"
            className="h-8 rounded border border-border bg-card px-2"
            value={filter.kind}
            onChange={(event) =>
              setFilter({ ...filter, kind: event.target.value as TaskKind | "all" })
            }
          >
            <option value="all">すべて</option>
            {Object.entries(TASK_KIND_LABELS).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1" htmlFor="staff-task-query">
          題か ID を検索
          <Input
            id="staff-task-query"
            value={filter.query}
            onChange={(event) => setFilter({ ...filter, query: event.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 py-1.5" htmlFor="staff-task-waiting">
          <input
            id="staff-task-waiting"
            type="checkbox"
            checked={filter.waitingOnly}
            onChange={(event) => setFilter({ ...filter, waitingOnly: event.target.checked })}
          />
          人の確認待ちがある課題だけ
        </label>
      </div>
      <Card className="min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "課題",
                "種別",
                "目安 (分)",
                "着手",
                "提出",
                "合格",
                "確認待ち",
                "ヒント / 解答例",
                "類題",
              ].map((title, index) => (
                <TableHead
                  key={title}
                  className={(index >= 2 && index <= 6) || index === 8 ? "text-right" : ""}
                >
                  {title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches
              .filter((section) => !filtering || section.visible.length > 0)
              .map((section) => (
                <Fragment key={section.section.id}>
                  <TableRow className="bg-sunken">
                    <TableCell colSpan={9} className="font-semibold">
                      {section.section.title} · {section.lessonCount} レッスン ·{" "}
                      {section.tasks.length} 課題
                    </TableCell>
                  </TableRow>
                  {section.visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-ink-3">
                        この単元に課題はありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    section.visible.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <span className="block max-w-72 whitespace-normal break-words font-medium">
                            {task.title}
                          </span>
                          <span className="font-mono text-[11px] text-ink-3">
                            {task.id.split(/[/:]/).at(-1)}
                          </span>
                        </TableCell>
                        <TableCell>{TASK_KIND_LABELS[task.kind]}</TableCell>
                        {[
                          task.estimatedMinutes,
                          task.counts.started,
                          task.counts.submitted,
                          task.counts.passed,
                        ].map((count, i) => (
                          <TableCell
                            key={["minutes", "started", "submitted", "passed"][i]}
                            className="text-right tabular-nums"
                          >
                            {count}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <WaitingCount count={task.counts.waiting} />
                        </TableCell>
                        <TableCell className="min-w-48 whitespace-normal text-xs text-ink-2">
                          {taskSupportLabel(task.support)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {task.variantCount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </Fragment>
              ))}
            {matches.every((section) => (filtering ? section.visible.length === 0 : false)) ? (
              <TableRow>
                <TableCell colSpan={9} className="text-ink-3">
                  該当する課題はありません
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
      <p className="break-words text-xs text-ink-3">
        課題を足す・直すときは{" "}
        <code className="break-all">
          packages/content/stages/{slug}/modules/&lt;単元&gt;/tasks/&lt;課題&gt;/
        </code>{" "}
        を PR で直す
      </p>
    </div>
  );
}

function OutlineTab({ sections }: { sections: StaffStageSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.section.id}>
          <details open>
            <summary className="cursor-pointer space-y-1 p-4 text-[13px] font-semibold">
              {section.section.title}
              <span className="ml-3 inline-block text-xs font-normal text-ink-3">
                {section.lessonCount} レッスン · {section.tasks.length} 課題 · 確認待ち{" "}
                {section.waiting}
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border text-[13px]">
              {section.lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <Badge>{LESSON_TYPE_LABELS[lesson.type]}</Badge>
                  <span className="min-w-0 break-words">{lesson.title}</span>
                </li>
              ))}
              {section.tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <Badge variant="accent">課題</Badge>
                  <span className="min-w-0 break-words font-medium">{task.title}</span>
                  <Badge>{TASK_KIND_LABELS[task.kind]}</Badge>
                  <span className="text-xs text-ink-3 tabular-nums">
                    提出 {task.counts.submitted} · 合格 {task.counts.passed}
                  </span>
                  {task.counts.waiting > 0 ? (
                    <Badge variant="warning">確認待ち {task.counts.waiting}</Badge>
                  ) : null}
                </li>
              ))}
              {section.lessons.length === 0 && section.tasks.length === 0 ? (
                <li className="p-4 text-ink-3">この単元に教材はありません</li>
              ) : null}
            </ul>
          </details>
        </Card>
      ))}
    </div>
  );
}

// タブの初回表示時にマウントし、取得済みの内容はタブを切り替えても保持する。
function useTabData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    load().then(
      (value) => {
        if (alive) {
          setData(value);
          setLoaded(true);
        }
      },
      (err) => {
        if (alive) setError(err instanceof Error ? err.message : "取得に失敗しました");
      },
    );
    return () => {
      alive = false;
    };
  }, [load]);
  return { data, error, loaded };
}

function LearnersTab({ stageId }: { stageId: string }) {
  const load = useCallback(() => fetchStageGradebook(stageId), [stageId]);
  const { data, error, loaded } = useTabData<StageGradebook | null>(load);
  return (
    <div className="space-y-4">
      <Link to="/gradebook" className="text-sm text-brand hover:underline">
        成績台帳で開く
      </Link>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : !loaded ? (
        <SkeletonRows />
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-ink-3">まだ受講者はいません</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {["受講者", "状態", "レッスン", "課題", "修了"].map((title) => (
                  <TableHead key={title}>{title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const c = row.completion;
                return (
                  <TableRow key={row.user_id}>
                    <TableCell>
                      <div className="font-medium">{row.display_name}</div>
                      <div className="text-xs text-ink-3">{row.email}</div>
                    </TableCell>
                    <TableCell>
                      {
                        { active: "受講中", completed: "完了", expired: "期限切れ" }[
                          row.enrollment_status
                        ]
                      }
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {c ? `${c.completed_lessons}/${c.total_lessons}` : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {c ? `${c.passed_assignments}/${c.total_assignments}` : "—"}
                    </TableCell>
                    <TableCell>
                      {c?.has_certificate ? (
                        <Badge variant="success">発行済み</Badge>
                      ) : c?.met ? (
                        "達成"
                      ) : (
                        "未達成"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function MaterialsTab({ stageId }: { stageId: string }) {
  const load = useCallback(() => listStageMaterials(stageId), [stageId]);
  const { data, error } = useTabData(load);
  if (error)
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  if (!data) return <SkeletonRows />;
  if (data.length === 0) return <p className="text-sm text-ink-3">配布資料はまだありません</p>;
  return (
    <div className="space-y-4">
      {groupStageMaterials(data).map((section) => (
        <Card key={section.title} className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">{section.title}</h2>
          {section.lessons.map((lesson) => (
            <div key={lesson.id} className="space-y-2">
              <h3 className="text-[13px] font-medium">{lesson.title}</h3>
              {lesson.materials.map((material) => (
                <MaterialItem key={material.id} material={material} />
              ))}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

async function downloadMaterial(material: StageMaterialRow, version?: number) {
  try {
    if (version === undefined) await downloadLessonMaterial(material);
    else await downloadLessonMaterialVersion(material, version);
  } catch (err) {
    toast.error(`ダウンロードに失敗: ${err instanceof Error ? err.message : "失敗"}`);
  }
}

function MaterialItem({ material }: { material: StageMaterialRow }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return (
    <div className="rounded border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-[13px]">{material.file_name}</span>
        <Button size="sm" variant="outline" onClick={() => void downloadMaterial(material)}>
          ダウンロード
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => {
            setVisited(true);
            setOpen(!open);
          }}
        >
          版履歴
        </Button>
      </div>
      {visited ? (
        <div hidden={!open}>
          <MaterialVersionHistory material={material} />
        </div>
      ) : null}
    </div>
  );
}

function MaterialVersionHistory({ material }: { material: StageMaterialRow }) {
  const load = useCallback(() => listLessonMaterialVersions(material.id), [material.id]);
  const { data, error } = useTabData(load);
  if (error)
    return (
      <p role="alert" className="text-xs text-danger">
        {error}
      </p>
    );
  if (!data) return <SkeletonRows rows={2} />;
  if (data.length === 0) return <p className="mt-2 text-xs text-ink-3">版履歴はまだありません</p>;
  return (
    <ul className="mt-3 divide-y divide-border">
      {data.map((v, index) => (
        <li key={v.version} className="flex flex-wrap items-center gap-2 py-2 text-xs text-ink-2">
          <span className="font-medium">v{v.version}</span>
          {index === 0 ? <Badge>最新</Badge> : null}
          <span>{new Date(v.created_at).toLocaleString("ja-JP")}</span>
          <span>{(v.size_bytes / 1024).toFixed(1)} KB</span>
          {v.lesson_revision !== null ? <span>本文 rev.{v.lesson_revision}</span> : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void downloadMaterial(material, v.version)}
          >
            v{v.version} をダウンロード
          </Button>
        </li>
      ))}
    </ul>
  );
}
