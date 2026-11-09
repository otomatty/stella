import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { TASK_KIND_LABELS } from "@stella/shared/tasks/manifest";
import type { StaffTaskDetail as Detail } from "@stella/shared/tasks/staff-stage";
import { useAppShell } from "@/components/shell/app-shell-context";
import { TaskBoardPanel } from "@/components/instructor/TaskBoardPanel";
import { LessonMarkdown } from "@/components/learner/MarkdownSlides";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { fetchStaffTaskDetail } from "@/lib/staff-stage-api";
import { StaffEnrollButton } from "./StaffEnrollButton";
import { taskSupportLabel } from "./staff-stage-detail";
import {
  firstReadmeParagraph,
  parseStaffTaskTab,
  staffTaskCounts,
  taskGithubUrl,
  type StaffTaskTab,
} from "./staff-task-detail";

const tabs: { value: StaffTaskTab; label: string }[] = [
  { value: "overview", label: "概要" },
  { value: "statement", label: "課題文" },
  { value: "submissions", label: "提出の状況" },
  { value: "variants", label: "類題" },
  { value: "revisions", label: "版の履歴" },
];

export function StaffTaskDetail({ stageId, taskId }: { stageId: string; taskId: string }) {
  const shell = useAppShell();
  const { tab } = useSearch({ from: "/_app/stages/$stageId/tasks/$" });
  const navigate = useNavigate({ from: "/stages/$stageId/tasks/$" });
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedOnly, setAssignedOnly] = useState(false);
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
      const detail = await fetchStaffTaskDetail(taskId, signal);
      if (signal.aborted) return;
      if (detail.stage.id !== stageId) throw new Error("このステージの課題ではありません");
      setData(detail);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [stageId, taskId]);
  useEffect(() => {
    void load();
    return () => pending.current?.abort();
  }, [load]);
  const changeTab = (value: string) => void navigate({ search: { tab: parseStaffTaskTab(value) } });
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 p-4 md:p-6">
      <nav
        aria-label="パンくず"
        className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-2"
      >
        <div className="flex flex-wrap gap-2">
          <Link to="/stages" className="hover:underline">
            ステージ管理
          </Link>
          {data ? (
            <>
              <span aria-hidden="true">›</span>
              <Link
                to="/stages/$stageId"
                params={{ stageId }}
                search={{ tab: "tasks" }}
                className="hover:underline"
              >
                {data.stage.title}
              </Link>
              <span aria-hidden="true">›</span>
              <span>{data.section.title}</span>
            </>
          ) : null}
        </div>
        {data ? (
          <div className="flex flex-wrap gap-4">
            {data.neighbors.previous ? (
              <TaskLink stageId={stageId} taskId={data.neighbors.previous.id}>
                ← 前の課題: {data.neighbors.previous.title}
              </TaskLink>
            ) : null}
            {data.neighbors.next ? (
              <TaskLink stageId={stageId} taskId={data.neighbors.next.id}>
                次の課題: {data.neighbors.next.title} →
              </TaskLink>
            ) : null}
          </div>
        ) : null}
      </nav>
      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <Button onClick={() => void load()}>再読み込み</Button>
        </div>
      ) : data ? (
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{TASK_KIND_LABELS[data.task.kind]}</Badge>
              <Badge>{data.task.manifest.runner}</Badge>
              <Badge>{environmentLabel(data.task.manifest.environment)}</Badge>
              <Badge>目安 {data.task.estimatedMinutes} 分</Badge>
            </div>
            <h1 className="break-words text-xl font-bold">{data.task.title}</h1>
            <p className="break-all font-mono text-xs text-ink-3">{data.task.id}</p>
            {data.task.parentTaskId ? (
              <p className="text-[13px] text-ink-2">
                <TaskLink stageId={stageId} taskId={data.task.parentTaskId}>
                  {data.task.parentTaskId}
                </TaskLink>{" "}
                の類題
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <StaffEnrollButton stageId={stageId} onOpenAsLearner={shell.openStageAsLearner} />
              <Button asChild variant="outline">
                <a href={taskGithubUrl(data.sourcePath)} target="_blank" rel="noopener noreferrer">
                  GitHub で開く
                </a>
              </Button>
            </div>
          </header>
          <Tabs value={tab} onValueChange={changeTab}>
            <TabsList aria-label="課題詳細">
              {tabs.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview">
              <Overview data={data} onStatement={() => changeTab("statement")} />
            </TabsContent>
            <TabsContent value="statement">
              <Card className="space-y-4 p-4 md:p-6">
                <p className="text-xs text-ink-3">
                  受講者には課題文レッスンと VS Code の課題パネルで同じ文章が出る
                </p>
                {data.readme === null ? (
                  <p className="text-sm text-ink-3">課題文がありません</p>
                ) : (
                  <LessonMarkdown>{data.readme}</LessonMarkdown>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="submissions">
              <div className="space-y-4">
                <label
                  className="flex items-center gap-2 text-[13px]"
                  htmlFor="staff-task-assigned"
                >
                  <input
                    id="staff-task-assigned"
                    type="checkbox"
                    checked={assignedOnly}
                    onChange={(event) => setAssignedOnly(event.target.checked)}
                  />
                  担当の受講者だけ
                </label>
                <TaskBoardPanel
                  embedded
                  taskId={taskId}
                  assignedOnly={assignedOnly}
                  onOpen={(submissionId) =>
                    void navigate({ to: "/reviews/$submissionId", params: { submissionId } })
                  }
                  onOpenDiscovery={() => void navigate({ to: "/discovery" })}
                />
              </div>
            </TabsContent>
            <TabsContent value="variants">
              <Panel title="類題">
                {data.variants.length ? (
                  <ul className="space-y-3">
                    {data.variants.map((variant) => (
                      <li key={variant.id} className="space-y-1">
                        <TaskLink stageId={stageId} taskId={variant.id}>
                          {variant.title}
                        </TaskLink>{" "}
                        {variant.active ? null : <Badge>無効</Badge>}
                        <p className="break-all font-mono text-xs text-ink-3">{variant.id}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p>類題はまだありません</p>
                    <ExternalLink href={taskGithubUrl(data.sourcePath, "variants")}>
                      GitHub で類題のフォルダーを開く
                    </ExternalLink>
                  </>
                )}
              </Panel>
            </TabsContent>
            <TabsContent value="revisions">
              <Card className="space-y-4 p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ハッシュ</TableHead>
                      <TableHead>日時</TableHead>
                      <TableHead>版</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revisions.map((revision) => (
                      <TableRow key={revision.contentHash}>
                        <TableCell className="font-mono" title={revision.contentHash}>
                          {revision.contentHash.slice(0, 8)}
                        </TableCell>
                        <TableCell>{dateLabel(revision.createdAt)}</TableCell>
                        <TableCell>
                          {revision.contentHash === data.task.contentHash ? (
                            <Badge variant="success">いまの版</Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.revisions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3}>版の履歴はありません</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <ExternalLink href={taskGithubUrl(data.sourcePath, "history")}>
                  GitHub で変更の履歴を見る
                </ExternalLink>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

function TaskLink({
  stageId,
  taskId,
  children,
}: {
  stageId: string;
  taskId: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/stages/$stageId/tasks/$"
      params={{ stageId, _splat: taskId }}
      search={{ tab: "overview" }}
      className="break-words text-brand hover:underline"
    >
      {children}
    </Link>
  );
}
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
      {children}
    </a>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0 space-y-3 p-4 text-[13px]">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}
function environmentLabel(environment: Detail["task"]["manifest"]["environment"]) {
  if (!environment) return "環境の指定なし";
  return (
    environment.id ??
    Object.entries(environment)
      .map(([tool, requirement]) => `${tool}: ${JSON.stringify(requirement)}`)
      .join(" · ")
  );
}

function Overview({ data, onStatement }: { data: Detail; onStatement: () => void }) {
  const { task } = data;
  const { manifest } = task;
  const paragraph = firstReadmeParagraph(data.readme);
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Panel title="求めること">
            {paragraph ? <p>{paragraph}</p> : null}
            <Button variant="outline" size="sm" onClick={onStatement}>
              課題文を全部読む
            </Button>
          </Panel>
          <Panel title="判定の項目">
            {manifest.problems?.length ? (
              <>
                <p>
                  全 {manifest.problems.length} 問のテストが通ると合格します。AI
                  のレビューには回しません。
                </p>
                <ol className="list-decimal space-y-3 pl-5">
                  {manifest.problems.map((problem) => (
                    <li key={problem.id}>
                      {problem.title} <code className="break-all">{problem.id}</code>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <h3 className="font-medium">ルーブリック</h3>
                {data.rubric.length ? (
                  <ul className="space-y-3">
                    {data.rubric.map((item) => (
                      <li key={item.id} className="space-y-1">
                        <code className="break-all">{item.id}</code>{" "}
                        {item.required ? <Badge>必須</Badge> : null}
                        <p>{item.criterion}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-3">ルーブリックの指定なし</p>
                )}
                <h3 className="font-medium">コーディング規則</h3>
                {data.codingRules.length ? (
                  <ul className="space-y-3">
                    {data.codingRules.map((rule) => (
                      <li key={rule.id} className="space-y-1">
                        <code className="break-all">{rule.id}</code>{" "}
                        {rule.required ? <Badge>必須</Badge> : null}
                        <p className="font-medium">{rule.title}</p>
                        <p>{rule.statement}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-3">コーディング規則の指定なし</p>
                )}
              </>
            )}
          </Panel>
          <Panel title="提出と手元の確認">
            <dl className="space-y-3">
              <div>
                <dt className="text-ink-3">提出するファイル</dt>
                <dd className="break-all font-mono">
                  {manifest.submit.files.join("、") || "なし"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">説明</dt>
                <dd>{data.submission.explanation ? "必須" : "不要"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">デバッグの記録</dt>
                <dd>{data.submission.debuggingRecord ? "必須" : "不要"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">変えられないファイル</dt>
                <dd className="break-all font-mono">{manifest.protected.join("、") || "なし"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">runner と環境</dt>
                <dd className="break-words">
                  {manifest.runner} · {environmentLabel(manifest.environment)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">lint / 整形の確認</dt>
                <dd>
                  lint: {manifest.checks.lint ? "あり" : "なし"} / 整形:{" "}
                  {manifest.checks.format ? "あり" : "なし"}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
        <div className="min-w-0 space-y-4">
          <Panel title="受講者の状況">
            <dl className="grid grid-cols-2 gap-3">
              {staffTaskCounts(data.counts).map(({ label, count }) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt>{label}</dt>
                  <dd className="font-semibold tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-ink-3">受講者だけの人数です。講師・管理者は含みません。</p>
          </Panel>
          <Panel title="ヒントと解答の出し方">
            <p>{taskSupportLabel(data.support)}</p>
            <p>
              {[
                ...(data.support
                  ? Array.from({ length: data.support.hintLevels }, (_, index) => index + 1)
                  : data.helpOpens.hints.map((hint) => hint.level)
                ).map(
                  (level) =>
                    `ヒント${level} ${data.helpOpens.hints.find((hint) => hint.level === level)?.learners ?? 0} 人`,
                ),
                `解答例 ${data.helpOpens.solution} 人`,
                `解説 ${data.helpOpens.explanation} 人`,
              ].join(" · ")}
            </p>
            <p className="text-xs text-ink-3">中身は受講者と同じ VS Code の課題パネルで確かめる</p>
          </Panel>
          <Panel title="スキルと出典">
            <dl className="space-y-3">
              <div>
                <dt className="text-ink-3">使うスキル (uses)</dt>
                <dd className="break-words">{task.skills.uses.join("、") || "なし"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">確認するスキル (assesses)</dt>
                <dd className="break-words">{task.skills.assesses.join("、") || "なし"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">pattern</dt>
                <dd className="break-all font-mono">{task.pattern}</dd>
              </div>
            </dl>
            {manifest.references?.length ? (
              <ul className="space-y-3">
                {manifest.references.map((source) => (
                  <li key={source.id}>
                    <ExternalLink href={source.url}>{source.title}</ExternalLink>
                    <p className="text-xs text-ink-3">
                      {source.publisher} · {source.section} · {source.documentVersion}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-3">出典の指定なし</p>
            )}
          </Panel>
          <Panel title="版">
            <p className="font-mono" title={task.contentHash}>
              {task.contentHash.slice(0, 8)}
            </p>
            <p className="text-ink-3">
              最新の記録: {data.revisions[0] ? dateLabel(data.revisions[0].createdAt) : "なし"}
            </p>
          </Panel>
        </div>
      </div>
      {data.reviewNotes !== null ? (
        <Card>
          <details>
            <summary className="cursor-pointer p-4 text-[13px] font-semibold">
              レビューの観点 <Badge>受講者には出ない</Badge>
            </summary>
            <div className="border-t border-border p-4">
              <LessonMarkdown>{data.reviewNotes}</LessonMarkdown>
            </div>
          </details>
        </Card>
      ) : null}
    </div>
  );
}
