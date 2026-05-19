/**
 * 演習画面の下部固定パネル (VSCode 風 3 タブ統合)。
 *
 * - **出力**: 自由実行 (`▶ 実行` / `▶ 関数を試す`) の stdout / error
 * - **採点結果**: 採点結果 (#107)。 reveal アニメは親から渡される `phase` / `revealedTests` を消費する
 * - **ターミナル**: SQL 課題用の REPL (#109 で本実装)
 *
 * `data-bottom-panel` 属性を付与しており、 PracticePage の `[`/`]` キー除外セレクタが
 * これを参照する (フォーカスが Terminal や Tabs 内のときに課題ナビが暴発しないように)。
 */

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type {
  ASTResult,
  Assignment,
  LintViolation,
} from "@falcon/shared/types";

import { cn } from "@/lib/utils";
import type { ExecutionResult } from "../../hooks/useGradeRunner.js";
import type { RunResultPhase } from "../../hooks/useRunResultReveal.js";

import { OutputTab } from "./OutputTab.js";
import { ResultsTab } from "./ResultsTab.js";
import { TerminalTab } from "./TerminalTab.js";

export type BottomPanelTab = "output" | "results" | "terminal";

interface Props {
  activeTab: BottomPanelTab;
  onTabChange: (tab: BottomPanelTab) => void;
  /** OutputTab に渡す自由実行ステート。 */
  freeRun: { stdout?: string; error?: string } | null;
  freeRunPending: boolean;
  onClearOutput: () => void;
  // ─── 採点結果タブ用 ───
  result: ExecutionResult | null;
  running: boolean;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
  phase: RunResultPhase;
  revealedTests: number;
  nextAssignment: Assignment | null;
  onGoToNext: () => void;
  onAskAi?: () => void;
  /** ターミナル機能が有効な課題かどうか (SQL 等)。 false なら disabled 表示。 */
  terminalEnabled?: boolean;
  /** ターミナルセッションを (assignmentId, seedHash) でメモ化するためのキー。 */
  terminalAssignmentId: string;
  /** ターミナルセッション初期化時に流す DDL+seed (SQL 課題用)。 */
  terminalSeed: string;
}

const TAB_HEADER_CLASS = cn(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-[12px] font-sans font-medium",
  "text-muted-foreground transition-colors hover:text-foreground",
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  "disabled:pointer-events-none disabled:opacity-50",
);

export function BottomPanel({
  activeTab,
  onTabChange,
  freeRun,
  freeRunPending,
  onClearOutput,
  result,
  running,
  assignment,
  lint,
  ast,
  phase,
  revealedTests,
  nextAssignment,
  onGoToNext,
  onAskAi,
  terminalEnabled = false,
  terminalAssignmentId,
  terminalSeed,
}: Props) {
  return (
    <div
      data-bottom-panel
      className="flex min-h-0 flex-col border-t border-border bg-card"
    >
      <TabsPrimitive.Root
        value={activeTab}
        onValueChange={(v) => onTabChange(v as BottomPanelTab)}
        className="flex min-h-0 flex-col"
      >
        <TabsPrimitive.List
          aria-label="下部パネル タブ"
          className="inline-flex items-center gap-1 border-b border-border bg-muted/40 px-3 py-1.5"
        >
          <TabsPrimitive.Trigger value="output" className={TAB_HEADER_CLASS}>
            出力
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="results" className={TAB_HEADER_CLASS}>
            採点結果
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="terminal"
            className={TAB_HEADER_CLASS}
            disabled={!terminalEnabled}
            title={
              terminalEnabled
                ? undefined
                : "ターミナルは SQL 課題で利用できます (#109)"
            }
          >
            ターミナル
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>
        <TabsPrimitive.Content
          value="output"
          forceMount
          className="min-h-0 data-[state=inactive]:hidden"
        >
          <OutputTab
            stdout={freeRun?.stdout}
            error={freeRun?.error}
            running={freeRunPending}
            onClear={onClearOutput}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          value="results"
          forceMount
          className="min-h-0 data-[state=inactive]:hidden"
        >
          <ResultsTab
            phase={phase}
            revealedTests={revealedTests}
            running={running}
            result={result}
            assignment={assignment}
            lint={lint}
            ast={ast}
            nextAssignment={nextAssignment}
            onGoToNext={onGoToNext}
            onAskAi={onAskAi}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          value="terminal"
          forceMount
          className="min-h-0 data-[state=inactive]:hidden"
        >
          <TerminalTab
            enabled={terminalEnabled}
            assignmentId={terminalAssignmentId}
            seed={terminalSeed}
          />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
