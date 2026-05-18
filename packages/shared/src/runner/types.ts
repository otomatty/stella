/**
 * 言語別ランナーの共通インタフェース (#105 / #100)。
 *
 * 既存実装 (JavaScript: QuickJS in Worker, SQL: sql.js in browser) と、
 * 将来追加される Python (Pyodide) / PHP (php-wasm) / Vitest / ESLint 教材ランナーを、
 * 採点呼び出し側 (`runners/index.ts` → `useGradeRunner`) から一様に扱うための抽象。
 *
 * Lint / AST / 採点判定 (`evaluate`) はランナー外で計算し、 ランナーは「コードを動かしてテスト結果を返す」
 * 純粋な実行責務に限定する。
 */

import type {
  Language,
  MutationConfig,
  RunTestsResponse,
  TestCase,
  TestKind,
} from "../types.js";

export interface RunInput {
  /**
   * 提出時の仮想ワークスペース (path → content)。
   * `entryFile` のキーは必ず含まれる前提 (呼び出し側で保証)。
   */
  files: Record<string, string>;
  /** ランナーが実行する入口ファイルのパス。 */
  entryFile: string;
  /**
   * 採点対象のテストケース。
   * `mode === "freerun"` のときは無視され、 ランナーは `entryFile` を実行して
   * stdout (またはランナー固有の出力) を 1 件だけ返す。
   */
  tests: TestCase[];
  testKind: TestKind;
  /**
   * `"test"` … `tests` を採点する通常モード。
   * `"freerun"` … テストを無視してコードを実行し、 stdout だけを取得する自由実行モード。
   */
  mode: "test" | "freerun";
  /**
   * function 採点で「lint で未使用扱いしない名前」 = 提出コードから取り出して評価式に
   * 露出する識別子 (関数名 / クラス名)。
   */
  entryPoints?: string[];
  /** SQL 課題の DDL + seed SQL (採点ごとに新規 DB に流す)。 */
  sqlSeed?: string;
  /**
   * Vitest mutation testing 課題の正解実装 + mutants (#110)。
   * `testKind: "mutation"` のときに必須。 ランナーは reference + 各 mutant を順に実行し、
   * 学習者のテストが reference では全 pass、 各 mutant では 1 件以上 fail (kill) するかを集約する。
   */
  mutation?: MutationConfig;
}

export type RunOutput = RunTestsResponse;

/**
 * 言語別ランナーの共通契約。
 *
 * 各実装 (`js-runner.ts` / `sql-runner.ts` / 未実装ランナー) はこのインタフェースを満たし、
 * `getRunner(language)` から取得して `run(input)` を呼ぶ。
 */
export interface CodeRunner {
  readonly language: Language;
  run(input: RunInput): Promise<RunOutput>;
}
