/**
 * 新形式の課題 (`.stella/task.json`) を受講者の端末で確かめる実行定義 (runner) の一覧。
 *
 * 課題が指定できるのは runnerId だけで、実際に走らせるコマンドは VS Code 拡張に
 * 同梱した固定の手順が決める (`apps/vscode/src/runner/plans.ts`)。課題ファイルや
 * WebView から受け取った文字列をコマンドとして実行しない (docs/curriculum/04 §6)。
 *
 * サーバーではコードを実行しない。動くかどうかは受講者が手元の結果で確かめ、
 * 提出後の AI・人のレビューはコーディング規則などを見る
 * (docs/curriculum/07-stella-adoption-redesign.md §5・§6)。
 */

export const RUNNER_IDS = [
  "static-preview",
  "env-diagnose",
  "node-test",
  "dom-test",
  "http-mock",
  "react-test",
  "storybook",
  "api-test",
  "db",
  "e2e",
  "next-app",
  "ci-deploy",
] as const;

export type RunnerId = (typeof RUNNER_IDS)[number];

/**
 * 拡張が持つ手順の種類。runnerId は課題の意図 (DOM の課題か、API の課題か) を表し、
 * 手順はこちらで共有する。たとえば dom-test と react-test はどちらも Vitest の手順で、
 * jsdom や Testing Library の違いは課題の配布ファイル (vitest の設定) が持つ。
 */
export type RunnerPlanKind = "static" | "diagnose" | "vitest" | "playwright" | "next" | "ci";

export interface RunnerSpec {
  id: RunnerId;
  /** 画面に出す名前。 */
  label: string;
  plan: RunnerPlanKind;
  /**
   * 受講者が入れた Node.js が要るか。false の runner は、Node.js を入れる前の単元
   * (dev-env-basics の前半) でも動く。
   */
  requiresNode: boolean;
  /** 手元で実行するか。ci-deploy は CI の結果を使うので手元では実行しない。 */
  runsLocally: boolean;
}

export const RUNNERS: Readonly<Record<RunnerId, RunnerSpec>> = {
  "static-preview": {
    id: "static-preview",
    label: "HTML の確認",
    plan: "static",
    requiresNode: false,
    runsLocally: true,
  },
  "env-diagnose": {
    id: "env-diagnose",
    label: "開発環境の診断",
    plan: "diagnose",
    requiresNode: false,
    runsLocally: true,
  },
  "node-test": {
    id: "node-test",
    label: "JavaScript のテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  "dom-test": {
    id: "dom-test",
    label: "画面操作のテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  "http-mock": {
    id: "http-mock",
    label: "通信のテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  "react-test": {
    id: "react-test",
    label: "React 部品のテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  storybook: {
    id: "storybook",
    label: "部品の状態見本",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  "api-test": {
    id: "api-test",
    label: "API のテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  db: {
    id: "db",
    label: "データベースのテスト",
    plan: "vitest",
    requiresNode: true,
    runsLocally: true,
  },
  e2e: {
    id: "e2e",
    label: "ブラウザでの操作テスト",
    plan: "playwright",
    requiresNode: true,
    runsLocally: true,
  },
  "next-app": {
    id: "next-app",
    label: "Next.js アプリのビルドと操作テスト",
    plan: "next",
    requiresNode: true,
    runsLocally: true,
  },
  "ci-deploy": {
    id: "ci-deploy",
    label: "CI と公開",
    plan: "ci",
    requiresNode: false,
    runsLocally: false,
  },
};

export function isRunnerId(value: unknown): value is RunnerId {
  return typeof value === "string" && (RUNNER_IDS as readonly string[]).includes(value);
}
