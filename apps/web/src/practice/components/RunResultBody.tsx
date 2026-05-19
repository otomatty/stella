/**
 * 採点結果本文 (Lint / AST / Tests の 3 行 + Banner)。
 *
 * 旧 `RunResultDialog` の中身を抽出 (#107)。 Dialog (celebration) と下部パネルの
 * 「採点結果」タブの両方で同一 markup を再利用するための共有コンポーネント。
 * reveal アニメーションの状態 (`phase`, `revealedTests`) は `useRunResultReveal`
 * から props として渡される (= 共有 state)。
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Loader2,
  Sparkles,
} from "lucide-react";

import type {
  ASTResult,
  Assignment,
  LintViolation,
  TestResult,
} from "@falcon/shared/types";
import {
  getLanguage,
  getStaticAnalysisSettings,
} from "@falcon/shared/assignment-helpers";

import { cn } from "@/lib/utils";
import type { ExecutionResult } from "../hooks/useGradeRunner";
import type { RunResultPhase } from "../hooks/useRunResultReveal";
import {
  describeForbiddenAstPattern,
  describeRequiredAstCheck,
} from "../lib/ast-messages";
import { describeLintViolation, lintSeverityLabel } from "../lib/lint-messages";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

type SectionStatus = "pending" | "evaluating" | "success" | "failure" | "error";

export interface RunResultBodyProps {
  /** `useRunResultReveal` から受け取る現在フェーズ。 */
  phase: RunResultPhase;
  /** `useRunResultReveal` から受け取る、 既に表示済みのテスト件数。 */
  revealedTests: number;
  running: boolean;
  result: ExecutionResult | null;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
  /** クリア時に banner で出す「次は X」テキスト用の課題情報。 */
  nextAssignment?: Assignment | null;
  /** 埋め込みモード (LessonPlayer) で次のレッスンが存在することを示すフラグ。 */
  nextLessonAvailable?: boolean;
  /** banner / celebration をレンダリングするか (Dialog は表示、 panel は非表示で OK)。 */
  showBanner?: boolean;
}

export function RunResultBody({
  phase,
  revealedTests,
  running,
  result,
  assignment,
  lint,
  ast,
  nextAssignment = null,
  nextLessonAvailable = false,
  showBanner = true,
}: RunResultBodyProps) {
  const displayedLint = result?.lintAtRun ?? lint;
  const displayedAst = result?.astAtRun ?? ast;
  const testResults = result?.testResults ?? [];
  const totalTests = testResults.length;
  const visibleTests = testResults.slice(0, revealedTests);

  // SQL 等の非 JS 課題は採点が「テストのみ」 で、 Lint/AST は対象外。
  // JS 用 ESLint/Babel を SQL に当てると無意味な構文エラーが出るため、 表示も含めて省略する
  // (codex P2 対応 / #109)。
  const isJavaScript = getLanguage(assignment) === "javascript";

  // result がまだ無い状態でも phase は時間経過で進むため、Lint/AST の判定は
  // displayedLint/displayedAst から都度計算してフォールバックする。
  const localLintPassed = displayedLint.every((v) => v.severity !== 2);
  const localAstPassed =
    !displayedAst.parseError &&
    displayedAst.required.every((r) => r.found) &&
    displayedAst.forbidden.length === 0;

  const lintPassed = result?.evaluation.checks.lintPassed ?? localLintPassed;
  const astPassed = result?.evaluation.checks.astPassed ?? localAstPassed;

  const lintStatus: SectionStatus =
    phase === "lint" ? "evaluating" : lintPassed ? "success" : "failure";

  const astStatus: SectionStatus = (() => {
    if (phase === "lint") {return "pending";}
    if (phase === "ast") {return "evaluating";}
    if (displayedAst.parseError) {return "error";}
    return astPassed ? "success" : "failure";
  })();

  const testsStatus: SectionStatus = (() => {
    if (!isJavaScript) {
      // 非 JS は Lint/AST フェーズを飛ばすので、 phase に関わらず tests に直接入る。
      if (phase === "lint" || phase === "ast") {return "evaluating";}
    } else if (phase === "lint" || phase === "ast") {
      return "pending";
    }
    if (phase === "tests") {return "evaluating";}
    if (result?.errorMessage) {return "error";}
    if (!result) {return "evaluating";}
    return result.evaluation.checks.testsPassed ? "success" : "failure";
  })();

  return (
    <>
      {showBanner ? (
        <ResultBanner
          phase={phase}
          result={result}
          nextAssignment={nextAssignment}
          nextLessonAvailable={nextLessonAvailable}
        />
      ) : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        {isJavaScript ? (
          <>
            <LintRow lint={displayedLint} status={lintStatus} />
            <AstRow
              ast={displayedAst}
              assignment={assignment}
              status={astStatus}
            />
          </>
        ) : null}
        <TestsRow
          status={testsStatus}
          running={running}
          result={result}
          visibleTests={visibleTests}
          revealedTests={revealedTests}
          totalTests={totalTests}
          isLast
        />
      </div>
    </>
  );
}

function ResultBanner({
  phase,
  result,
  nextAssignment,
  nextLessonAvailable = false,
}: {
  phase: RunResultPhase;
  result: ExecutionResult | null;
  nextAssignment: Assignment | null;
  nextLessonAvailable?: boolean;
}) {
  if (phase !== "done" || !result) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        評価中です...
      </div>
    );
  }

  if (result.evaluation.cleared) {
    return (
      <div
        className="relative mb-4 overflow-hidden rounded-xl p-[1.5px] shadow-[0_10px_30px_-12px_rgba(4,50,255,0.40),0_10px_28px_-14px_rgba(255,38,0,0.38)]"
        style={{ background: "var(--gradient-acial)" }}
      >
        <div className="relative overflow-hidden rounded-[10.5px] bg-card px-5 py-4">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "var(--gradient-acial-soft)" }}
          />
          <span aria-hidden className="celebrate-shimmer" />
          <div className="relative flex items-center gap-4">
            <div
              className="celebrate-pop relative flex size-12 shrink-0 items-center justify-center rounded-full gradient-bg shadow-[0_6px_18px_-6px_rgba(255,38,0,0.55)]"
              aria-hidden
            >
              <Sparkles className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Cleared
              </div>
              <strong className="font-jp text-xl font-bold leading-tight tracking-[-0.01em] text-foreground">
                クリアしました
              </strong>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {nextAssignment
                  ? `次は「${nextAssignment.title}」に進めます。`
                  : nextLessonAvailable
                    ? "次のレッスンに進めます。"
                    : "お疲れさまでした！"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <CircleX className="size-5 shrink-0" />
      <div>
        <strong className="font-jp text-base font-bold">未クリア</strong>
        <p className="text-xs text-destructive/80">
          失敗しているチェックを確認して修正しましょう。
        </p>
      </div>
    </div>
  );
}

function LintRow({
  lint,
  status,
}: {
  lint: LintViolation[];
  status: SectionStatus;
}) {
  const errorCount = lint.filter((v) => v.severity === 2).length;
  const warnCount = lint.length - errorCount;

  const meta = (() => {
    if (status === "pending") {return "待機中";}
    if (status === "evaluating") {return "評価中...";}
    if (lint.length === 0) {return "指摘なし";}
    return `エラー ${errorCount} ・ ヒント ${warnCount}`;
  })();

  return (
    <CheckRow title="Lint チェック" status={status} meta={meta} isLast={false}>
      {status === "evaluating" ? (
        <p className="text-sm text-muted-foreground">
          ESLint で書き方の指摘を確認しています...
        </p>
      ) : lint.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          文法や基本的な書き方の指摘はありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {lint.map((violation, index) => {
            const message = describeLintViolation(violation);
            return (
              <li
                key={`${violation.ruleId ?? "lint"}-${violation.line}-${index}`}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      violation.severity === 2
                        ? "text-destructive"
                        : "text-warn"
                    }
                    aria-hidden
                  >
                    {violation.severity === 2 ? "✗" : "!"}
                  </span>
                  <strong className="text-sm">{message.title}</strong>
                  <Badge variant="default" className="font-medium">
                    {violation.line}行目
                  </Badge>
                  <Badge
                    variant={
                      violation.severity === 2 ? "danger" : "default"
                    }
                  >
                    {lintSeverityLabel(violation.severity)}
                  </Badge>
                </div>
                {message.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {message.description}
                  </p>
                ) : null}
                {message.hint ? (
                  <p className="mt-2 text-sm text-primary">{message.hint}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </CheckRow>
  );
}

function AstRow({
  ast,
  assignment,
  status,
}: {
  ast: ASTResult;
  assignment: Assignment;
  status: SectionStatus;
}) {
  const settings = getStaticAnalysisSettings(assignment);
  const hasForbiddenRules = (settings.ast.forbidden?.length ?? 0) > 0;
  const hasAnyAstRule = ast.required.length > 0 || hasForbiddenRules;
  const requiredPassed = ast.required.filter((check) => check.found).length;

  const meta = (() => {
    if (status === "pending") {return "待機中";}
    if (status === "evaluating") {return "評価中...";}
    if (ast.parseError) {return "構文エラー";}
    return `必須 ${requiredPassed}/${ast.required.length} ・ 違反 ${ast.forbidden.length}`;
  })();

  return (
    <CheckRow
      title="コード構造チェック"
      status={status}
      meta={meta}
      isLast={false}
    >
      {status === "pending" ? (
        <p className="text-sm text-muted-foreground">
          Lint チェックの後に評価します。
        </p>
      ) : status === "evaluating" ? (
        <p className="text-sm text-muted-foreground">
          AST を解析して、必須・禁止の書き方を確認しています...
        </p>
      ) : ast.parseError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <strong className="text-sm text-destructive">
            コードに構文エラーがあります
          </strong>
          <p className="mt-2 text-sm text-muted-foreground">
            まず括弧、カンマ、クォートの閉じ忘れがないか確認しましょう。
          </p>
          <p className="mt-2 font-mono text-xs text-destructive">
            {ast.parseError}
          </p>
        </div>
      ) : !hasAnyAstRule ? (
        <p className="text-sm text-muted-foreground">
          この課題では、コード構造の追加条件はありません。
        </p>
      ) : (
        <>
          {ast.required.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">やること</h4>
              <ul className="space-y-2">
                {ast.required.map((check, index) => {
                  const message = describeRequiredAstCheck(check);
                  return (
                    <li
                      key={`required-${index}`}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            check.found ? "text-success" : "text-destructive"
                          }
                          aria-hidden
                        >
                          {check.found ? "✓" : "✗"}
                        </span>
                        <strong className="text-sm">{message.title}</strong>
                      </div>
                      {message.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {message.description}
                        </p>
                      ) : null}
                      {message.hint ? (
                        <p className="mt-2 text-sm text-primary">
                          {message.hint}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {hasForbiddenRules ? (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">避けること</h4>
              {ast.forbidden.length === 0 ? (
                <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                  <span className="text-ok">✓</span>{" "}
                  避けたい書き方は見つかりませんでした。
                </div>
              ) : (
                <ul className="space-y-2">
                  {ast.forbidden.map((violation, index) => {
                    const message = describeForbiddenAstPattern(
                      violation.pattern,
                      violation.label,
                    );
                    return (
                      <li
                        key={`forbidden-${violation.line}-${index}`}
                        className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-destructive">✗</span>
                          <strong className="text-sm">{message.title}</strong>
                          <Badge variant="default">
                            {violation.line}行目
                          </Badge>
                        </div>
                        {message.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {message.description}
                          </p>
                        ) : null}
                        {message.hint ? (
                          <p className="mt-2 text-sm text-primary">
                            {message.hint}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </CheckRow>
  );
}

function TestsRow({
  status,
  running,
  result,
  visibleTests,
  revealedTests,
  totalTests,
  isLast,
}: {
  status: SectionStatus;
  running: boolean;
  result: ExecutionResult | null;
  visibleTests: TestResult[];
  revealedTests: number;
  totalTests: number;
  isLast: boolean;
}) {
  const passedCount = visibleTests.filter((test) => test.passed).length;

  const meta = (() => {
    if (status === "pending") {return "待機中";}
    if (status === "evaluating") {
      if (!result) {return "サーバで実行中...";}
      return `${revealedTests}/${totalTests}件 表示中`;
    }
    if (status === "error") {return "実行に失敗";}
    return `${passedCount}/${totalTests}件 PASS`;
  })();

  return (
    <CheckRow title="テスト実行" status={status} meta={meta} isLast={isLast}>
      {status === "pending" ? (
        <p className="text-sm text-muted-foreground">
          コード構造の確認が終わってからテストを実行します。
        </p>
      ) : null}

      {status === "evaluating" && (running || !result) ? (
        <p className="text-sm text-muted-foreground">
          テストを実行しています...
        </p>
      ) : null}

      {status === "evaluating" && result && totalTests > 0 ? (
        <p className="text-sm text-muted-foreground">
          テスト結果を 1 件ずつ表示しています...
        </p>
      ) : null}

      {result?.errorMessage ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {result.errorMessage}
        </p>
      ) : null}

      {visibleTests.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {visibleTests.map((test, index) => {
            const showStdoutDiff =
              !test.passed && !test.error && test.expectedStdout !== undefined;
            return (
              <li
                key={`${test.name}-${index}`}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      test.passed ? "text-success" : "text-destructive"
                    }
                    aria-hidden
                  >
                    {test.passed ? "✓" : "✗"}
                  </span>
                  <strong className="text-sm">{test.name}</strong>
                  <Badge variant={test.passed ? "default" : "danger"}>
                    {test.passed ? "PASS" : "FAIL"}
                  </Badge>
                </div>
                {test.error ? (
                  <p className="mt-2 rounded bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive">
                    {test.error}
                  </p>
                ) : null}
                {showStdoutDiff ? (
                  <div className="mt-2 grid gap-2">
                    <div>
                      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        期待される出力
                      </div>
                      <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-success-bg px-2 py-1.5 font-mono text-xs text-success dark:bg-success/10">
                        {test.expectedStdout || "(空)"}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        実際の出力
                      </div>
                      <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-destructive/10 px-2 py-1.5 font-mono text-xs text-destructive">
                        {test.stdout && test.stdout.length > 0
                          ? test.stdout
                          : "(出力なし)"}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </CheckRow>
  );
}

function CheckRow({
  title,
  status,
  meta,
  isLast,
  children,
}: {
  title: string;
  status: SectionStatus;
  meta: string;
  isLast: boolean;
  children: ReactNode;
}) {
  const autoOpen = shouldAutoOpen(status);
  const [open, setOpen] = useAutoControlledOpen(status, autoOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "border-b last:border-b-0",
        isLast ? "border-b-0" : undefined,
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-100/50 dark:hover:bg-ink-700/50",
            status === "pending" && "text-muted-foreground",
          )}
        >
          <StatusIcon status={status} />
          <span className="flex-1 truncate font-jp text-sm font-semibold">
            {title}
          </span>
          <span className="font-sans text-xs text-muted-foreground">
            {meta}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t bg-muted/20 px-4 py-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="size-5 shrink-0 text-muted-foreground" />;
    case "evaluating":
      return <Loader2 className="size-5 shrink-0 animate-spin text-blue-500" />;
    case "success":
      return <CircleCheck className="size-5 shrink-0 text-success" />;
    case "failure":
      return <CircleX className="size-5 shrink-0 text-destructive" />;
    case "error":
      return <CircleAlert className="size-5 shrink-0 text-destructive" />;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function shouldAutoOpen(status: SectionStatus): boolean {
  switch (status) {
    case "pending":
      return false;
    case "evaluating":
      return true;
    case "success":
      return false;
    case "failure":
      return true;
    case "error":
      return true;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/**
 * ステータスに応じた自動開閉と、ユーザーのトグル操作を両立させる。
 */
function useAutoControlledOpen(
  status: SectionStatus,
  autoOpen: boolean,
): [boolean, (next: boolean) => void] {
  const [open, setOpen] = useState(autoOpen);
  const lastStatus = useRef<SectionStatus>(status);

  useEffect(() => {
    if (lastStatus.current !== status) {
      lastStatus.current = status;
      setOpen(autoOpen);
    }
  }, [status, autoOpen]);

  return [open, setOpen];
}
