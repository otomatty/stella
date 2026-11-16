import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  completeManually,
  fetchManualCompletion,
  revokeManualCompletion,
  type CompletionView,
} from "@/lib/manual-completion-api";
import {
  completionBatches,
  completionCounts,
  manualReasonSummary,
  completionSourceLabel,
  eligibleTargets,
  selectedItems,
  selectionState,
  sendCompletionBatches,
  targetKey,
  toggleTargets,
  validCompletionReason,
  type CompletionMode,
  type CompletionTarget,
  type CompletionTask,
} from "@/lib/manual-completion";

function Selection({
  targets,
  selected,
  onToggle,
  label,
}: {
  targets: CompletionTarget[];
  selected: ReadonlySet<string>;
  onToggle: (targets: CompletionTarget[]) => void;
  label: string;
}) {
  const state = selectionState(targets, selected);
  return (
    <input
      type="checkbox"
      aria-label={label}
      aria-checked={state.mixed ? "mixed" : state.checked}
      checked={state.checked}
      disabled={state.disabled}
      ref={(node) => {
        if (node) node.indeterminate = state.mixed;
      }}
      onChange={() => onToggle(targets)}
      className="size-5 shrink-0"
    />
  );
}

function TaskRow({
  task,
  mode,
  selected,
  onToggle,
}: {
  task: CompletionTask;
  mode: CompletionMode;
  selected: ReadonlySet<string>;
  onToggle: (targets: CompletionTarget[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const source = completionSourceLabel(task.reviewSource);
  const counts = completionCounts([task]);
  const reasons = manualReasonSummary(task);
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <Selection
          targets={eligibleTargets([task], mode)}
          selected={selected}
          onToggle={onToggle}
          label={`${task.title}をすべて選ぶ`}
        />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-11 min-w-0 flex-1 text-left font-semibold break-words"
        >
          {open ? "▾" : "▸"} {task.title}
        </button>
      </div>
      <p className="text-sm text-ink-3">
        {source ? `合格（${source}）` : "まだ"}
        {task.problems.length ? ` · ${counts.passed}/${counts.total} 問` : ""}
        {counts.manual > 0 ? `・手で済み ${counts.manual}` : ""}
      </p>
      {reasons.mixed || reasons.reason ? (
        <p className="whitespace-pre-wrap break-words text-sm text-ink-3">
          {reasons.mixed ? "理由が複数あります" : `理由: ${reasons.reason}`}
        </p>
      ) : null}
      {open ? (
        <ul className="mt-3 divide-y divide-border">
          {task.problems.map((problem) => {
            const target = { taskId: task.id, problemId: problem.id };
            const allowed =
              mode === "complete" ? problem.status !== "passed" : problem.source === "manual";
            return (
              <li key={problem.id} className="flex items-start gap-3 py-2">
                <Selection
                  targets={allowed ? [target] : []}
                  selected={selected}
                  onToggle={onToggle}
                  label={`${problem.title}を選ぶ`}
                />
                <div className="min-w-0 flex-1 break-words text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="min-w-0 break-words">{problem.title}</span>
                    <span className="min-w-0 break-words text-xs text-ink-3">
                      {problem.status !== "passed"
                        ? "まだ"
                        : problem.source === "manual"
                          ? "済み（手で）"
                          : "済み（テスト）"}
                      {problem.source === "manual" ? (
                        <>
                          ・{problem.manualByName ?? "管理者"}・
                          {problem.manualAt
                            ? new Date(problem.manualAt).toLocaleDateString("ja-JP")
                            : "日時なし"}
                        </>
                      ) : null}
                    </span>
                  </div>
                  {reasons.mixed && problem.source === "manual" ? (
                    <p className="whitespace-pre-wrap break-words text-xs text-ink-3">
                      理由: {problem.manualReason ?? "記録なし"}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {task.problems.length === 0 ? (
            <li className="text-sm text-ink-3">問題のない課題です。課題全体を選んで操作します。</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
function UnitRow({
  unit,
  mode,
  selected,
  onToggle,
}: {
  unit: CompletionView["units"][number];
  mode: CompletionMode;
  selected: ReadonlySet<string>;
  onToggle: (targets: CompletionTarget[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const counts = completionCounts(unit.tasks);
  return (
    <section className="rounded-lg border border-border p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <Selection
          targets={eligibleTargets(unit.tasks, mode)}
          selected={selected}
          onToggle={onToggle}
          label={`${unit.title}をすべて選ぶ`}
        />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-11 min-w-0 flex-1 text-left font-semibold break-words"
        >
          {open ? "▾" : "▸"} {unit.title}（{unit.tasks.length} 課題）
        </button>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3 tabular-nums">
        <span>
          {counts.passed}/{counts.total} 問・手で済み {counts.manual}
        </span>
        {counts.complete ? <span className="font-semibold text-brand">✓ すべて済み</span> : null}
      </p>
      {open ? (
        <div className="mt-3 space-y-3">
          {unit.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              mode={mode}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ManualCompletionPage({ userId, stageId }: { userId: string; stageId: string }) {
  const [data, setData] = useState<CompletionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<CompletionMode>("complete");
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const resultTasks = useRef<CompletionTask[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<Awaited<ReturnType<typeof sendCompletionBatches>> | null>(
    null,
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setData(null);
      setSelected(new Set());
      try {
        const value = await fetchManualCompletion(userId, stageId, signal);
        if (!signal?.aborted) setData(value);
      } catch (err) {
        if (!signal?.aborted)
          setError(err instanceof Error ? err.message : "一覧の取得に失敗しました");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [userId, stageId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const tasks = data?.units.flatMap((u) => u.tasks) ?? [];
  const problems = tasks.flatMap((t) => t.problems);
  const items = selectedItems(tasks, mode, selected);
  const toggle = (targets: CompletionTarget[]) =>
    setSelected((prev) => toggleTargets(targets, prev));
  const send = async () => {
    if (sending.current || !items.length || (mode === "complete" && !validCompletionReason(reason)))
      return;
    sending.current = true;
    setBusy(true);
    setConfirm(false);
    setResult(null);
    resultTasks.current = tasks;
    setProgress({ completed: 0, total: completionBatches(items).length });
    try {
      const outcome = await sendCompletionBatches(
        items,
        async (batch) => {
          const body = { userId, stageId, items: batch };
          if (mode === "complete") {
            const r = await completeManually({ ...body, reason: reason.trim() });
            return { changed: r.inserted, skipped: r.skipped };
          }
          const r = await revokeManualCompletion(body);
          return { changed: r.deleted, blocked: r.blocked };
        },
        (completed, total) => setProgress({ completed, total }),
      );
      setResult(outcome);
      await load();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const taskTitle = (id: string) => resultTasks.current.find((t) => t.id === id)?.title ?? id;
  const problemTitle = (tid: string, pid: string) =>
    resultTasks.current.find((t) => t.id === tid)?.problems.find((p) => p.id === pid)?.title ?? pid;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        to="/stages/$stageId"
        params={{ stageId }}
        className="text-[13px] text-ink-2 hover:underline"
      >
        ← ステージの詳細に戻る
      </Link>
      <h1 className="text-2xl font-semibold">手で済みにする</h1>
      {data ? (
        <div>
          <h2 className="text-lg font-semibold break-words">
            {data.userName} · {data.stageTitle}
          </h2>
          <p className="text-sm text-ink-3">
            {problems.length} 問中 {problems.filter((p) => p.status === "passed").length}{" "}
            問済み（うち手で済み {problems.filter((p) => p.source === "manual").length} 問）
          </p>
        </div>
      ) : null}
      {busy ? (
        <p role="status">
          送信中: {progress.total} 回中 {progress.completed}{" "}
          回完了。操作を終えるまでお待ちください。
        </p>
      ) : null}
      {result ? (
        <div
          role="status"
          className="rounded-md border border-border bg-card p-4 text-sm break-words"
        >
          <p>
            {result.total} 回中 {result.completed} 回完了 · 反映 {result.changed} 件 · 変更なし{" "}
            {result.skipped} 件
          </p>
          {result.error ? (
            <p className="text-destructive">{result.error}</p>
          ) : (
            <p>完了しました。</p>
          )}
          <ul className="mt-2 space-y-2">
            {result.blocked.map((b) => (
              <li key={targetKey({ taskId: b.taskId, problemId: b.problemId })}>
                {taskTitle(b.taskId)}
                {b.problemId ? ` / ${problemTitle(b.taskId, b.problemId)}` : ""}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          <p className="text-destructive">一覧の取得に失敗しました: {error}</p>
          <Button type="button" disabled={busy} onClick={() => void load()}>
            再読み込み
          </Button>
        </div>
      ) : null}
      {loading ? <p>読み込み中…</p> : null}
      <fieldset disabled={busy || loading || !data} className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            操作{" "}
            <select
              className="h-11 rounded-md border border-border bg-card px-3"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as CompletionMode);
                setSelected(new Set());
                setResult(null);
              }}
            >
              <option value="complete">済みにする</option>
              <option value="revoke">取り消す</option>
            </select>
          </label>
          <p className="text-sm">
            {selected.size} 件を選択（{items.length} 課題）
          </p>
          <Button
            type="button"
            disabled={!items.length}
            onClick={() => {
              setReason("");
              setConfirm(true);
            }}
          >
            {mode === "complete" ? "済みにする…" : "取り消す…"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected.size}
            onClick={() => setSelected(new Set())}
          >
            選択を解除
          </Button>
        </div>
        <p className="text-sm text-ink-3">
          {mode === "complete"
            ? "まだ済んでいない問題・課題だけを選べます。"
            : "手で済みにした問題・課題だけを選べます。"}
        </p>
        {data?.units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} mode={mode} selected={selected} onToggle={toggle} />
        ))}
        {data && tasks.length === 0 ? <p>対象の課題はありません。</p> : null}
      </fieldset>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "complete" ? "選んだ分を済みにする" : "手で済みを取り消す"}
            </DialogTitle>
            <DialogDescription>
              {selected.size} 件（{items.length} 課題）を操作します。
              {mode === "revoke"
                ? "課題の合格が戻り、修了証が取り消されることがあります。本人の提出やレビューで合格した課題では取り消せません。"
                : "理由を入力してください（必須・1,000文字まで）。"}
            </DialogDescription>
          </DialogHeader>
          {mode === "complete" ? (
            <div className="px-6">
              <label htmlFor="manual-reason" className="text-sm">
                理由
              </label>
              <Textarea
                id="manual-reason"
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 別の環境での提出を引き継ぎ"
                className="mt-2"
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(false)}>
              戻る
            </Button>
            <Button
              type="button"
              disabled={
                busy || !items.length || (mode === "complete" && !validCompletionReason(reason))
              }
              onClick={() => void send()}
            >
              {mode === "complete" ? "済みにする" : "取り消す"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
