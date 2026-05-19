/**
 * 採点結果のモーダル表示。
 *
 * #107 で本文を `RunResultBody` に抽出し、 reveal 状態は `useRunResultReveal` を
 * 親 (PracticePage) で 1 回呼んで共有する形に再構成した。 このダイアログは:
 *
 * - 「クリアおめでとう」 celebration を含む banner を出す
 * - 「次の問題へ」 / 「AI に質問する」 のアクションを保持する
 * - 通常の採点結果表示の主役は下部パネル (#106 / #107) の「採点結果」タブが担う
 *
 * クリア時 (`result.evaluation.cleared === true`) に自動で開く運用が想定。
 */

import { ArrowRight, Bot } from "lucide-react";
import type {
  ASTResult,
  Assignment,
  LintViolation,
} from "@falcon/shared/types";

import type { ExecutionResult } from "../hooks/useGradeRunner";
import type { RunResultPhase } from "../hooks/useRunResultReveal";
import { RunResultBody } from "./RunResultBody.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RunResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  running: boolean;
  result: ExecutionResult | null;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
  phase: RunResultPhase;
  revealedTests: number;
  nextAssignment: Assignment | null;
  onGoToNext: () => void;
  /**
   * 不正解時に表示する「AI に質問する」ボタンのハンドラ。
   * Phase 4 (#107) の運用ではダイアログはクリア時のみ自動オープンするため、
   * AI 質問ボタンはダイアログには出ない (下部パネル側の `ResultsTab` ヘッダに置く)。
   * 親が明示的にダイアログを開いた場合のフォールバックとしてこの prop を受ける。
   */
  onAskAi?: () => void;
}

export function RunResultDialog({
  open,
  onOpenChange,
  running,
  result,
  assignment,
  lint,
  ast,
  phase,
  revealedTests,
  nextAssignment,
  onGoToNext,
  onAskAi,
}: RunResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="run-result-dialog-description">
        <DialogHeader>
          <DialogTitle className="font-jp text-[22px] font-bold tracking-[-0.01em]">
            実行結果
          </DialogTitle>
          <DialogDescription id="run-result-dialog-description">
            Lint・コード構造・テストの 3 つのチェックを順番に評価します。すべて通過するとクリアです。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-13rem)] overflow-y-auto px-6 py-5">
          <RunResultBody
            phase={phase}
            revealedTests={revealedTests}
            running={running}
            result={result}
            assignment={assignment}
            lint={lint}
            ast={ast}
            nextAssignment={nextAssignment}
            showBanner
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            {running ? "実行中..." : "閉じる"}
          </Button>
          {phase === "done" &&
          result &&
          !result.evaluation.cleared &&
          onAskAi ? (
            <Button
              variant="default"
              onClick={onAskAi}
              className="gap-2"
              title="この問題と提出コードについて AI に質問する"
            >
              <Bot className="size-4 shrink-0" />
              AI に質問する
            </Button>
          ) : null}
          {phase === "done" && result?.evaluation.cleared && nextAssignment ? (
            <Button
              onClick={onGoToNext}
              className="gap-2"
              title={`次の問題: ${nextAssignment.title}`}
            >
              次の問題へ
              <ArrowRight className="size-4 shrink-0" />
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
