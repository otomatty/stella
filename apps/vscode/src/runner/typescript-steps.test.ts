import { readFileSync } from "node:fs";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunnerId } from "@stella/shared/tasks/runners";
import { describe, expect, it } from "vitest";
import { parseTscDiagnostics } from "./parsers.js";
import { buildPlan } from "./plans.js";
import type { ProcessOutcome } from "./process.js";
import { requiredPackages, tscOutcome } from "./steps.js";

function textFixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
}

function outcome(overrides: Partial<ProcessOutcome> = {}): ProcessOutcome {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    truncated: false,
    timedOut: false,
    aborted: false,
    durationMs: 0,
    ...overrides,
  };
}

function task(runner: RunnerId, checks: { lint: boolean; format: boolean }): TaskManifest {
  return {
    schemaVersion: 1,
    id: "typescript-basics/u01/q01",
    title: "挨拶する",
    kind: "basic",
    runner,
    submit: { files: ["src/**/*.ts"] },
    protected: ["tests/**", "tsconfig.json"],
    checks,
  };
}

const ROOT = "/work/task";
const HOME = "/Users/yamada";

const TSC_ERRORS = [
  {
    file: "src/greet.ts",
    line: 1,
    column: 23,
    ruleId: "TS7006",
    message: "パラメーター 'name' の型は暗黙的に 'any' になります。",
    severity: "error" as const,
  },
  {
    file: "src/greet.ts",
    line: 2,
    column: 9,
    ruleId: "TS2322",
    message: "型 'string' を型 'number' に割り当てることはできません。",
    severity: "error" as const,
  },
  {
    file: "tests/greet.test.ts",
    line: 6,
    column: 48,
    ruleId: "TS2344",
    message: [
      "型 '[string]' は制約 '{ 0: never; }' を満たしていません。",
      "プロパティ '0' の型に互換性がありません。",
      "型 'string' を型 'never' に割り当てることはできません。",
    ].join("\n"),
    severity: "error" as const,
  },
  {
    file: "tests/greet.test.ts",
    line: 7,
    column: 45,
    ruleId: "TS2344",
    message: `型 'string' は制約 '"Expected: string, Actual: number"' を満たしていません。`,
    severity: "error" as const,
  },
];

describe("parseTscDiagnostics", () => {
  it("error TS を 4 件読み、続きの行を 3 件目の message につなぐ", () => {
    const output = textFixture("tsc-errors.txt");
    expect(parseTscDiagnostics(output, ROOT, "linux")).toEqual(TSC_ERRORS);
    expect(parseTscDiagnostics(output.replace(/\n/g, "\r\n"), ROOT, "linux")).toEqual(TSC_ERRORS);
  });

  it("絶対パスは課題フォルダーからの相対パスになり、ユーザー名を残さない", () => {
    const winRoot = "C:\\Users\\yamada\\web-training\\a";
    const macRoot = "/Users/yamada/web-training/a";
    const win =
      "C:\\Users\\yamada\\web-training\\a\\src\\greet.ts(1,1): error TS1005: ';' が必要です。";
    const mac = "/Users/yamada/web-training/a/src/greet.ts(1,1): error TS1005: ';' が必要です。";
    const expected = {
      file: "src/greet.ts",
      line: 1,
      column: 1,
      ruleId: "TS1005",
      message: "';' が必要です。",
      severity: "error",
    };
    const winFindings = parseTscDiagnostics(win, winRoot, "win32");
    const macFindings = parseTscDiagnostics(mac, macRoot, "darwin");
    expect(winFindings).toEqual([expected]);
    expect(macFindings).toEqual([expected]);
    expect(JSON.stringify(winFindings)).not.toContain("yamada");
    expect(JSON.stringify(macFindings)).not.toContain("yamada");
  });
});

describe("tscOutcome", () => {
  it("終了コード 0 は合格", () => {
    expect(tscOutcome(outcome({ exitCode: 0 }), ROOT, "linux", HOME)).toEqual({
      status: "passed",
      summary: "型の確認が通りました",
    });
  });

  it("終了コード 2 で診断があれば要修正", () => {
    const stdout = textFixture("tsc-errors.txt");
    const result = tscOutcome(outcome({ exitCode: 2, stdout }), ROOT, "linux", HOME);
    expect(result.status).toBe("failed");
    expect(result.summary).toBe("型のエラーが 4 件あります。エラーの行を直して保存してください");
    expect(result.lint).toEqual(TSC_ERRORS);
  });

  it("終了コード 1 で位置の無い TS5058 だけなら環境の問題", () => {
    const stdout = textFixture("tsc-config-error.txt");
    const result = tscOutcome(outcome({ exitCode: 1, stdout }), ROOT, "linux", HOME);
    expect(result.status).toBe("error");
    expect(result.summary).toBe(
      "型の確認を実行できませんでした (tsconfig.json を確認してください)",
    );
    expect(result.lint).toBeUndefined();
  });
});

describe("ts-test の手順", () => {
  it("lint と整形があるときは deps, lint, format, typecheck, test", () => {
    const ids = buildPlan(task("ts-test", { lint: true, format: true })).map((step) => step.id);
    expect(ids).toEqual(["deps", "lint", "format", "typecheck", "test"]);
  });

  it("lint と整形が無いときは deps, typecheck, test", () => {
    const ids = buildPlan(task("ts-test", { lint: false, format: false })).map((step) => step.id);
    expect(ids).toEqual(["deps", "typecheck", "test"]);
  });

  it("lint ありの ts-test は TypeScript の道具を足し、node-test は前と同じ", () => {
    expect(requiredPackages(task("ts-test", { lint: true, format: true }))).toEqual([
      "vitest",
      "typescript",
      "typescript-eslint",
      "eslint",
      "prettier",
    ]);
    expect(requiredPackages(task("node-test", { lint: true, format: true }))).toEqual([
      "vitest",
      "eslint",
      "prettier",
    ]);
    expect(requiredPackages(task("node-test", { lint: false, format: false }))).toEqual(["vitest"]);
  });
});
