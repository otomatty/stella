/**
 * 問題演習ワークスペース (LessonPlayer 埋め込み用)。
 *
 * 元 `js-review-prototype` の `pages/PracticePage.tsx` を、 react-router 非依存の
 * 埋め込みコンポーネントとして移植したもの。 LessonPlayer から `<PracticeWorkspace
 * assignmentId={...} embedded onCleared onAskAi onGoToNextLesson />` で呼び出す。
 *
 * 主な差分:
 * - react-router-dom (useParams / useNavigate / Navigate) を削除し props 経由
 * - stage-unlock guard / `[` `]` ショートカット / stage-clear redirect は embedded 時に無効化
 * - AppHeader / リセット行の見た目は embedded 時に簡略化
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { findAssignment } from "@falcon/shared/assignments";
import type { Assignment } from "@falcon/shared/types";
import {
  getEntryFile,
  getStarterFiles,
  getStaticAnalysisSettings,
} from "@falcon/shared/assignment-helpers";
import type { GradingSummary } from "@falcon/shared/ai/types";
import { getRunner } from "@falcon/code-runner";

import { Editor } from "./components/Editor.js";
import { AssignmentView } from "./components/AssignmentView.js";
import {
  BottomPanel,
  type BottomPanelTab,
} from "./components/BottomPanel/index.js";
import { FileTabs } from "./components/FileTabs.js";
import { RunResultDialog } from "./components/RunResultDialog.js";
import { Button } from "@/components/ui/button";

import { useStaticAnalysis } from "./hooks/useStaticAnalysis.js";
import {
  useGradeRunner,
  type ExecutionResult,
} from "./hooks/useGradeRunner.js";
import { useProgress } from "./hooks/useProgress.js";
import { useRunResultReveal } from "./hooks/useRunResultReveal.js";

export interface PracticeWorkspaceProps {
  /** 演習対象の assignment ID (LessonPlayer が解決済みのもの)。 */
  assignmentId: string;
  /** LessonPlayer 埋め込みモード。 ヘッダー/ショートカット/ステージ遷移を無効化する。 */
  embedded?: boolean;
  /**
   * cleared が false→true に遷移した瞬間に呼ばれる。
   * LessonPlayer が `useLessonProgress.markComplete` を呼ぶフックポイント。
   */
  onCleared?: (assignmentId: string) => void;
  /**
   * 不正解時 (cleared !== true) に「AI に質問する」 を押したとき呼ばれる。
   * LessonPlayer は受け取ったコンテキストを AIChatBot へ流す。
   */
  onAskAi?: (ctx: {
    assignment: Assignment;
    userCode: string;
    summary: GradingSummary;
  }) => void;
  /**
   * 「次のレッスンへ」ボタン。 embedded モードでは PracticeWorkspace 内部の
   * nextAssignment 探索ではなく、 LessonPlayer のセクション順 next を使う。
   */
  onGoToNextLesson?: () => void;
}

export function PracticeWorkspace({
  assignmentId,
  embedded = false,
  onCleared,
  onAskAi,
  onGoToNextLesson,
}: PracticeWorkspaceProps) {
  const assignment = useMemo(
    () => findAssignment(assignmentId),
    [assignmentId],
  );

  if (!assignment) {
    return (
      <div className="p-10 text-sm text-ink-3">
        課題が見つかりません: <code>{assignmentId}</code>
      </div>
    );
  }
  return (
    <PracticeWorkspaceInner
      assignment={assignment}
      embedded={embedded}
      onCleared={onCleared}
      onAskAi={onAskAi}
      onGoToNextLesson={onGoToNextLesson}
    />
  );
}

interface InnerProps {
  assignment: Assignment;
  embedded: boolean;
  onCleared?: (assignmentId: string) => void;
  onAskAi?: (ctx: {
    assignment: Assignment;
    userCode: string;
    summary: GradingSummary;
  }) => void;
  onGoToNextLesson?: () => void;
}

function PracticeWorkspaceInner({
  assignment,
  embedded,
  onCleared,
  onAskAi,
  onGoToNextLesson,
}: InnerProps) {
  const activeAssignmentIdRef = useRef(assignment.id);
  useLayoutEffect(() => {
    activeAssignmentIdRef.current = assignment.id;
  }, [assignment.id]);

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [freeRun, setFreeRun] = useState<{
    stdout?: string;
    error?: string;
  } | null>(null);
  const [freeRunPending, setFreeRunPending] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>("output");
  const [gradingSession, setGradingSession] = useState(0);

  const starterFiles = useMemo(() => getStarterFiles(assignment), [assignment]);
  const entryFile = useMemo(() => getEntryFile(assignment), [assignment]);
  const {
    files,
    activeFile,
    setActiveFile,
    updateFile,
    cleared,
    recordResult,
    clear,
  } = useProgress({
    assignmentId: assignment.id,
    starterFiles,
    entryFile,
  });
  const code = files[entryFile] ?? "";
  const editorCode = files[activeFile] ?? "";
  const activeStarterFile = useMemo(
    () => starterFiles.find((f) => f.path === activeFile),
    [starterFiles, activeFile],
  );
  const activeFileReadOnly = activeStarterFile?.readonly === true;
  const activeFileLanguage =
    activeStarterFile?.language ?? assignment.language ?? "javascript";

  const staticAnalysis = useMemo(
    () => getStaticAnalysisSettings(assignment),
    [assignment],
  );
  const { lint, ast } = useStaticAnalysis(code, assignment);
  const { running, result, run, reset } = useGradeRunner();
  const { phase, revealedTests } = useRunResultReveal(gradingSession, result);

  // cleared false→true 遷移を親に通知 (markComplete トリガ)
  const lastClearedRef = useRef(cleared);
  useEffect(() => {
    if (!lastClearedRef.current && cleared) {
      onCleared?.(assignment.id);
    }
    lastClearedRef.current = cleared;
  }, [cleared, assignment.id, onCleared]);

  // 採点完了でクリアになった瞬間に celebration ダイアログを自動オープン。
  // 通常結果 (未クリア) は下部パネルの「採点結果」タブに表示する。
  useEffect(() => {
    if (phase !== "done" || !result?.evaluation.cleared) {return;}
    setResultDialogOpen(true);
  }, [phase, result]);

  const handleGoToNext = useCallback(() => {
    setResultDialogOpen(false);
    onGoToNextLesson?.();
  }, [onGoToNextLesson]);

  const handleAskAi = useCallback(() => {
    if (!result) {return;}
    const summary: GradingSummary = buildGradingSummary(result);
    setResultDialogOpen(false);
    onAskAi?.({ assignment, userCode: code, summary });
  }, [result, assignment, code, onAskAi]);

  // 課題切替時、結果表示と自由実行出力をクリア
  useEffect(() => {
    reset();
    setFreeRun(null);
    setFreeRunPending(false);
  }, [assignment.id, reset]);

  // `[` / `]` 前後ショートカット (元実装) — embedded モードでは LessonPlayer の
  // 前後レッスン操作と衝突するため無効化。
  useEffect(() => {
    if (embedded) {return;}
    // embedded=false (スタンドアロン) は当面サポートしないため何もしない。
    // 将来単独ページ化する場合はここに元実装の前後ショートカットを復元する。
  }, [embedded, assignment.id]);

  const handleReset = useCallback(() => {
    const wipeStorage = window.confirm(
      "編集中のコードと保存済みの進捗 (クリア状態を含む) を消去して、初期コードに戻しますか?\n\n" +
        "[OK] 保存も含めてリセット\n" +
        "[キャンセル] このまま編集を続ける",
    );
    if (!wipeStorage) {return;}
    clear();
    reset();
  }, [clear, reset]);

  const handleRun = useCallback(async () => {
    const submittedFiles: Record<string, string> = { ...files };
    const submittedCode = submittedFiles[entryFile] ?? "";
    reset();
    setGradingSession((n) => n + 1);
    setBottomTab("results");
    const res = await run({
      files: submittedFiles,
      assignment,
      lint,
      ast,
    });
    recordResult(res.evaluation.cleared, submittedCode);
  }, [files, entryFile, assignment, lint, ast, reset, run, recordResult]);

  const isSqlAssignment = (assignment.language ?? "javascript") === "sql";
  const freeRunDisabled =
    isSqlAssignment ||
    (assignment.testKind === "function" && !assignment.demoCall);
  const handleFreeRun = useCallback(async () => {
    const submittedCode = code;
    const targetAssignmentId = assignment.id;
    setBottomTab("output");
    setFreeRunPending(true);
    setFreeRun({ stdout: undefined, error: undefined });
    const codeToRun =
      assignment.testKind === "function" && assignment.demoCall
        ? `${submittedCode}\n\n${assignment.demoCall}\n`
        : submittedCode;
    try {
      const language = assignment.language ?? "javascript";
      const runner = getRunner(language);
      const response = await runner.run({
        files: { ...files, [entryFile]: codeToRun },
        entryFile,
        tests: [],
        testKind: assignment.testKind,
        mode: "freerun",
        entryPoints: assignment.entryPoints,
        sqlSeed: assignment.sqlSeed,
        mutation: assignment.mutation,
      });
      if (activeAssignmentIdRef.current !== targetAssignmentId) {return;}
      const res = response.results[0] ?? { name: "freerun", passed: true, stdout: "" };
      setFreeRun({
        stdout: res.stdout ?? "",
        error: res.error,
      });
    } catch (e) {
      if (activeAssignmentIdRef.current !== targetAssignmentId) {return;}
      setFreeRun({
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      if (activeAssignmentIdRef.current === targetAssignmentId) {
        setFreeRunPending(false);
      }
    }
  }, [
    code,
    files,
    entryFile,
    assignment.id,
    assignment.language,
    assignment.testKind,
    assignment.demoCall,
    assignment.entryPoints,
    assignment.sqlSeed,
    assignment.mutation,
  ]);

  return (
    <div className={embedded ? "grid h-full grid-rows-[auto_1fr]" : "grid h-screen grid-rows-[auto_1fr]"}>
      {embedded ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            <span
              className={
                cleared
                  ? "inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success-soft px-2.5 py-0.5 text-success-ink font-medium"
                  : "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-ink-3"
              }
              title="この課題のクリア状態 (localStorage に保存)"
            >
              {cleared ? "クリア済み" : "未クリア"}
            </span>
          </div>
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1 text-[12px] font-medium text-foreground hover:bg-sunken"
            onClick={handleReset}
          >
            リセット
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-[380px_1fr] overflow-hidden max-md:grid-cols-1 max-md:grid-rows-[auto_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-card max-md:max-h-[40vh] max-md:border-b max-md:border-r-0">
          <AssignmentView assignment={assignment} />
        </aside>

        <section className="grid grid-rows-[auto_1fr_auto_auto] overflow-hidden bg-background">
          <FileTabs
            files={starterFiles}
            activeFile={activeFile}
            onSelect={setActiveFile}
          />
          <div className="flex min-h-0 flex-col overflow-hidden bg-background">
            <div className="flex-1 overflow-auto">
              <Editor
                code={editorCode}
                onChange={(next) => updateFile(activeFile, next)}
                eslintRules={staticAnalysis.eslintRules}
                entryPoints={staticAnalysis.ignoredUnusedNames}
                language={activeFileLanguage}
                readOnly={activeFileReadOnly}
              />
            </div>
          </div>
          <BottomPanel
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            freeRun={freeRun}
            freeRunPending={freeRunPending}
            onClearOutput={() => setFreeRun(null)}
            result={result}
            running={running}
            assignment={assignment}
            lint={lint}
            ast={ast}
            phase={phase}
            revealedTests={revealedTests}
            nextAssignment={null}
            nextLessonAvailable={embedded && Boolean(onGoToNextLesson)}
            onGoToNext={handleGoToNext}
            onAskAi={handleAskAi}
            terminalEnabled={isSqlAssignment}
            terminalAssignmentId={assignment.id}
            terminalSeed={assignment.sqlSeed ?? ""}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleFreeRun}
                disabled={freeRunPending || running || freeRunDisabled}
                title={
                  freeRunDisabled
                    ? "function 採点課題: 「採点を実行」 を使ってテストを動かしてください"
                    : undefined
                }
              >
                {freeRunPending
                  ? "実行中..."
                  : assignment.testKind === "function"
                    ? "▶ 関数を試す"
                    : "▶ 実行"}
              </Button>
              <Button
                variant="accent"
                size="lg"
                onClick={handleRun}
                disabled={running}
              >
                {running ? "採点中..." : "✓ 採点を実行"}
              </Button>
            </div>
          </div>

          <RunResultDialog
            open={resultDialogOpen}
            onOpenChange={setResultDialogOpen}
            running={running}
            result={result}
            assignment={assignment}
            lint={lint}
            ast={ast}
            phase={phase}
            revealedTests={revealedTests}
            nextAssignment={null}
            nextLessonAvailable={embedded && Boolean(onGoToNextLesson)}
            onGoToNext={handleGoToNext}
            onAskAi={handleAskAi}
          />
        </section>
      </div>
    </div>
  );
}

function buildGradingSummary(result: ExecutionResult): GradingSummary {
  return {
    cleared: result.evaluation.cleared,
    lintFailures: result.lintAtRun
      .filter((v) => v.severity === 2)
      .map((v) => ({
        ruleId: v.ruleId,
        line: v.line,
        message: v.message,
      })),
    astFailures: [
      ...result.astAtRun.required
        .filter((r) => !r.found)
        .map((r) => ({
          kind: "required-missing" as const,
          label: r.label,
        })),
      ...result.astAtRun.forbidden.map((f) => ({
        kind: "forbidden-found" as const,
        label: f.label,
        line: f.line,
      })),
    ],
    testFailures: result.testResults
      .filter((t) => !t.passed)
      .map((t) => ({
        name: t.name,
        error: t.error,
        expectedStdout: t.expectedStdout,
        actualStdout: t.stdout,
      })),
  };
}
