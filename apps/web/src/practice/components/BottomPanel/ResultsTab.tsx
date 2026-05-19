/**
 * 下部パネル「採点結果」タブ。
 *
 * #107 で実装した本体。 `RunResultBody` を Dialog (celebration) と共有することで、
 * 採点結果を編集を続けながら確認できるパネル側 UI を提供する。 banner は出さず、
 * 「AI に質問する」 / 「次の問題へ」 のアクションを上部ヘッダに並べる。
 */

import { ArrowRight, Bot } from "lucide-react";

import type {
  ASTResult,
  Assignment,
  LintViolation,
} from "@falcon/shared/types";

import type { ExecutionResult } from "../../hooks/useGradeRunner.js";
import type { RunResultPhase } from "../../hooks/useRunResultReveal.js";
import { RunResultBody } from "../RunResultBody.js";
import { Button } from "@/components/ui/button";

interface Props {
  phase: RunResultPhase;
  revealedTests: number;
  running: boolean;
  result: ExecutionResult | null;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
  nextAssignment: Assignment | null;
  /** 埋め込みモード (LessonPlayer) で「次のレッスンへ」 CTA を出すフラグ。 */
  nextLessonAvailable?: boolean;
  onGoToNext: () => void;
  onAskAi?: () => void;
}

export function ResultsTab({
  phase,
  revealedTests,
  running,
  result,
  assignment,
  lint,
  ast,
  nextAssignment,
  nextLessonAvailable = false,
  onGoToNext,
  onAskAi,
}: Props) {
  const showActions = phase === "done" && result !== null;
  const showAskAi = showActions && !result?.evaluation.cleared && onAskAi;
  const showGoNext =
    showActions && result?.evaluation.cleared && (nextAssignment || nextLessonAvailable);
  const nextLabel = nextAssignment ? "次の問題へ" : "次のレッスンへ";
  const nextTitle = nextAssignment ? `次の問題: ${nextAssignment.title}` : "次のレッスンへ進む";

  return (
    <div className="flex max-h-[42vh] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/60 px-6 py-1.5">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          採点結果
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {showAskAi ? (
            <Button
              size="sm"
              variant="default"
              onClick={onAskAi}
              className="gap-2"
              title="この問題と提出コードについて AI に質問する"
            >
              <Bot className="size-3.5 shrink-0" />
              AI に質問する
            </Button>
          ) : null}
          {showGoNext ? (
            <Button
              size="sm"
              variant="default"
              onClick={onGoToNext}
              className="gap-2"
              title={nextTitle}
            >
              {nextLabel}
              <ArrowRight className="size-3.5 shrink-0" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-background px-6 py-4">
        {phase === "idle" ? (
          <p className="font-sans text-[12px] text-muted-foreground">
            「採点を実行」 を押すと、 ここに採点結果が表示されます。
          </p>
        ) : (
          <RunResultBody
            phase={phase}
            revealedTests={revealedTests}
            running={running}
            result={result}
            assignment={assignment}
            lint={lint}
            ast={ast}
            nextAssignment={nextAssignment}
            nextLessonAvailable={nextLessonAvailable}
            showBanner={false}
          />
        )}
      </div>
    </div>
  );
}
