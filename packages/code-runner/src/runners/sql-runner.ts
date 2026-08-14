/**
 * SQL 採点ランナ (sql.js / SQLite, ブラウザ完結) (#109 → #105 で `CodeRunner` 化)。
 *
 * - sql.js は dynamic import + memoize で初回のみロード (~250KB の JS + ~645KB の wasm)
 * - `sql-wasm.wasm` は Vite プラグイン (`copy-sqljs-wasm`) が `/sqljs/sql-wasm.wasm` に配置する
 * - **採点 DB の分離**: テスト毎に新規 `Database` を生成し、 `sqlSeed` を流してから
 *   学習者 SQL → アサーション SQL の順に実行。 終了時に `db.close()` で破棄する。
 *   これにより前のテストの副作用が次に伝播せず、 ターミナルとも独立 (#109 受け入れ条件)。
 *
 * `CodeRunner` 経由で呼ばれ、 `RunInput.files[entryFile]` が学習者 SQL、
 * `RunInput.sqlSeed` が DDL + seed SQL に対応する。
 */

import type {
  CodeRunner,
  RunInput,
  RunOutput,
} from "@falcon/shared/runner/types";
import type {
  SqlRow,
  SqlTestCase,
  TestResult,
} from "@falcon/shared/types";

import { memoizePromiseFactory } from "quickjs-emscripten-core";

// sql.js の型定義は default export だが、 ESM dynamic import 時に default を取り出して呼ぶ。
type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<{
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}>;

interface SqlJsDatabase {
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  close(): void;
}

let locateSqlJsFile = (file: string) => `/sqljs/${file}`;

/** Grader WebView など、バンドル後の wasm URL を差し替える。 */
export function setSqlJsLocateFile(locateFile: (file: string) => string): void {
  locateSqlJsFile = locateFile;
}

export function sqlJsFileUrl(file: string): string {
  return locateSqlJsFile(file);
}

const getSqlJs = memoizePromiseFactory(async () => {
  const mod = (await import("sql.js")) as unknown as { default: InitSqlJs };
  const init = mod.default;
  return init({
    // 既定は Vite publicDir (`/sqljs/sql-wasm.wasm`)。拡張は setSqlJsLocateFile で上書きする。
    locateFile: (file: string) => sqlJsFileUrl(file),
  });
});

export const sqlRunner: CodeRunner = {
  language: "sql",
  async run(input: RunInput): Promise<RunOutput> {
    if (input.mode === "freerun") {
      // SQL 課題は UI 上で freerun ボタンを無効化している (PracticePage の freeRunDisabled)。
      // ここに到達した場合は呼び出し側の不整合なので明示的にエラー化する。
      throw new Error("SQL ランナは freerun モードに対応していません (採点モードでのみ利用可能)");
    }
    // 設定ミスを「空コードで採点」として黙って通さないよう、 入力を明示的に検証して
    // 不整合は構造化エラーとして返す (例外を投げると採点 UI が RUNNER_ERROR で全停止する)。
    if (!Object.prototype.hasOwnProperty.call(input.files, input.entryFile)) {
      const known = Object.keys(input.files).join(", ") || "(none)";
      return {
        durationMs: 0,
        results: [
          {
            name: "runner-input",
            passed: false,
            error: `SQL_ERROR: entryFile "${input.entryFile}" not found in files (known: ${known})`,
          },
        ],
      };
    }
    if (!Array.isArray(input.tests)) {
      return {
        durationMs: 0,
        results: [
          { name: "runner-input", passed: false, error: "SQL_ERROR: tests is not an array" },
        ],
      };
    }
    const code = input.files[input.entryFile] ?? "";
    return runSqlTests(code, input.tests as SqlTestCase[], input.sqlSeed);
  },
};

async function runSqlTests(
  code: string,
  tests: SqlTestCase[],
  seed: string | undefined,
): Promise<RunOutput> {
  const SQL = await getSqlJs();
  const startedAt = performance.now();
  const results: TestResult[] = tests.map((t) =>
    runOneSqlTest(SQL, code, t, seed ?? ""),
  );
  return {
    durationMs: Math.round(performance.now() - startedAt),
    results,
  };
}

function runOneSqlTest(
  SQL: { Database: new () => SqlJsDatabase },
  learnerSql: string,
  test: SqlTestCase,
  seed: string,
): TestResult {
  const db = new SQL.Database();
  try {
    if (seed.trim().length > 0) {
      db.exec(seed);
    }
    // 学習者 SQL を実行 (空ならスキップ)。 結果セットは `query` 未指定時に比較対象として使う。
    let learnerResult: Array<{ columns: string[]; values: unknown[][] }> = [];
    if (learnerSql.trim().length > 0) {
      learnerResult = db.exec(learnerSql);
    }
    // `query` 指定時: 学習者 SQL は副作用のために走らせ、 アサーション query の結果を比較。
    // `query` 未指定時: 学習者 SQL の最終結果セットを直接比較。
    const target =
      typeof test.query === "string" && test.query.trim().length > 0
        ? db.exec(test.query)
        : learnerResult;
    const last = target[target.length - 1];
    const rows = last?.values ?? [];
    const columns = last?.columns ?? [];
    const actualRows = rows.map(normalizeRow);
    const expectedRows = test.expectedRows.map(normalizeRow);
    const columnsOk = checkColumns(columns, test.expectedColumns);
    const rowsOk = deepEqualRows(actualRows, expectedRows);
    return {
      name: test.name,
      passed: columnsOk && rowsOk,
      stdout: formatRows(actualRows),
      expectedStdout: formatRows(expectedRows),
    };
  } catch (e) {
    return {
      name: test.name,
      passed: false,
      error: `SQL_ERROR: ${formatErr(e)}`,
    };
  } finally {
    db.close();
  }
}

function normalizeRow(row: unknown[]): SqlRow {
  return row.map((v): SqlRow[number] => {
    if (v === null || v === undefined) {return null;}
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      return v;
    }
    // SQLite の INT カラムは sql.js から bigint で返ることがある。 課題の
    // `expectedRows` は number で書かれているため、 安全整数範囲なら number に変換
    // して値ベースの比較を通す。 範囲外は精度を失わないよう string にフォールバック。
    if (typeof v === "bigint") {
      if (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(v);
      }
      return v.toString();
    }
    try {
      return JSON.stringify(v) ?? "";
    } catch {
      return "";
    }
  });
}

function checkColumns(actual: string[], expected?: string[]): boolean {
  if (!expected) {return true;}
  if (actual.length !== expected.length) {return false;}
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {return false;}
  }
  return true;
}

function deepEqualRows(a: SqlRow[], b: SqlRow[]): boolean {
  if (a.length !== b.length) {return false;}
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) {return false;}
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) {return false;}
    }
  }
  return true;
}

function formatRows(rows: SqlRow[]): string {
  if (rows.length === 0) {return "(no rows)";}
  return rows.map((r) => r.map(formatCell).join(" | ")).join("\n");
}

function formatCell(v: SqlRow[number]): string {
  if (v === null) {return "NULL";}
  if (typeof v === "boolean") {return v ? "true" : "false";}
  return String(v);
}

function formatErr(e: unknown): string {
  if (e instanceof Error) {return e.message;}
  return String(e);
}
