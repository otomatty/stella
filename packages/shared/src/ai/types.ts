/**
 * AI チャット機能の共有型定義。
 *
 * このモジュールはランタイム依存を持たず、Vercel Serverless API ハンドラと
 * クライアントの両方から import される。Anthropic SDK へは一切依存しない。
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** 表示用のタイムスタンプ (Date.now())。永続化された履歴のみ持つ。 */
  ts?: number;
}

/**
 * AIChatBot のコンテキスト種別。
 *
 * - `general`: ダッシュボード等のコンテキスト無し
 * - `lesson`: ビデオ/スライド等のレッスン視聴中 (採点対象なし)
 * - `practice`: コード演習中 (採点失敗サマリと提出コードを付帯)
 */
export type ChatContext =
  | { kind: "general" }
  | { kind: "lesson"; lessonTitle: string; courseTitle: string }
  | {
      kind: "practice";
      assignmentId: string;
      summary: GradingSummary;
      userCode: string;
    };

export interface ChatRequest {
  /**
   * practice context のときに必須。 backward-compat のため optional。
   * 旧クライアント (context 未指定) は practice として扱う。
   */
  assignmentId?: string;
  /** 省略時は general 扱い。 */
  context?: ChatContext;
  messages: { role: ChatRole; content: string }[];
}

/**
 * SSE ストリームで流すイベント。クライアントは text を delta として追記し、
 * done で完了、 error でエラー表示に切り替える。
 */
export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * 採点失敗のサマリ。`PracticePage` で `ExecutionResult` から抽出して
 * `ChatPage` に `location.state` で渡す。
 */
export interface GradingSummary {
  cleared: boolean;
  lintFailures: LintFailure[];
  astFailures: AstFailure[];
  testFailures: TestFailure[];
}

export interface LintFailure {
  ruleId: string | null;
  line: number;
  message: string;
}

export interface AstFailure {
  /** "required-missing" は未充足、 "forbidden-found" は禁止構文が検出された。 */
  kind: "required-missing" | "forbidden-found";
  label: string;
  line?: number;
}

export interface TestFailure {
  name: string;
  error?: string;
  expectedStdout?: string;
  actualStdout?: string;
}
