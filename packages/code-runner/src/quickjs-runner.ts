/**
 * ブラウザ向け QuickJS-WASM ランナー。
 * 旧 `api/_lib/quickjs-runner.ts` から実行ロジックを移植し、
 * WASM ヴァリアントだけブラウザ向け `@jitl/quickjs-singlefile-browser-release-sync` に差し替えている。
 */

import {
  isFail,
  memoizePromiseFactory,
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
  type QuickJSWASMModule,
} from "quickjs-emscripten-core";

import type { TestCase, TestKind, TestResult } from "@stella/shared/types";

export const MEMORY_LIMIT_MB = 32;
export const PER_TEST_WALL_TIMEOUT_MS = 3000;

/** WASM モジュールはタブのライフタイムで初回だけロードする (動的 import で code-split) */
export const getQuickJSModule = memoizePromiseFactory(() =>
  newQuickJSWASMModuleFromVariant(import("@jitl/quickjs-singlefile-browser-release-sync")),
);

export class QuickJsRunner {
  constructor(
    private readonly quickJS: QuickJSWASMModule,
    private readonly memoryLimitMb: number,
  ) {}

  runAll(
    code: string,
    tests: TestCase[],
    options: { testKind: TestKind; entryPoints?: string[] },
  ): TestResult[] {
    if (options.testKind === "stdout") {
      return this.runStdoutTestBatch(code, tests);
    }
    return tests.map((test) => this.runOne(code, test, options));
  }

  runFreeRun(code: string): TestResult {
    const captured = this.executeAndCaptureStdout(code);
    return {
      name: "freerun",
      passed: captured.error === undefined,
      stdout: captured.stdout,
      ...(captured.error !== undefined ? { error: captured.error } : {}),
    };
  }

  private runStdoutTestBatch(code: string, tests: TestCase[]): TestResult[] {
    let captured: { stdout: string; error?: string } | null = null;
    const results: TestResult[] = [];
    for (const test of tests) {
      if (test.expectedStdout === undefined) {
        results.push({
          name: test.name,
          passed: false,
          error: "INVALID_TEST_CASE: stdout tests require expectedStdout",
        });
        continue;
      }
      if (captured === null) {
        captured = this.executeAndCaptureStdout(code);
      }
      results.push(this.buildStdoutTestResult(test, captured));
    }
    return results;
  }

  private buildStdoutTestResult(
    test: TestCase,
    captured: { stdout: string; error?: string },
  ): TestResult {
    if (test.expectedStdout === undefined) {
      return {
        name: test.name,
        passed: false,
        error: "INVALID_TEST_CASE: stdout tests require expectedStdout",
      };
    }
    const expected = normalizeStdout(test.expectedStdout);
    if (captured.error !== undefined) {
      return {
        name: test.name,
        passed: false,
        stdout: captured.stdout,
        expectedStdout: expected,
        error: captured.error,
      };
    }
    return {
      name: test.name,
      passed: captured.stdout === expected,
      stdout: captured.stdout,
      expectedStdout: expected,
    };
  }

  private runOne(
    code: string,
    test: TestCase,
    options: { testKind: TestKind; entryPoints?: string[] },
  ): TestResult {
    switch (options.testKind) {
      case "stdout":
        return this.runStdoutTest(code, test);
      case "function":
        return this.runFunctionTest(code, test, options.entryPoints ?? []);
      case "sql":
        // QuickJS ランナは SQL を扱えない。 SQL 課題は sql-runner にディスパッチされる前提
        // (#100 / #109)。 ここに到達した場合は呼び出し側のディスパッチ漏れなので明示的にエラー化する。
        return {
          name: test.name,
          passed: false,
          error: "INVALID_TEST_KIND: sql tests must be routed to sql-runner",
        };
      case "mutation":
        // mutation testKind は vitest-runner が orchestrate して、 QuickJS への入力時には
        // mode: "freerun" に変換するため、 ここに直接 mutation が来ることはない。
        // 来た場合は呼び出し側のディスパッチ漏れなので明示的にエラー化する (#110)。
        return {
          name: test.name,
          passed: false,
          error: "INVALID_TEST_KIND: mutation tests must be routed to vitest-runner",
        };
      case "eslint-config":
        // eslint-config testKind は eslint-config-runner が browser ESLint Linter で
        // 直接採点するので、 QuickJS へは来ない。 来た場合はディスパッチ漏れ (#111)。
        return {
          name: test.name,
          passed: false,
          error: "INVALID_TEST_KIND: eslint-config tests must be routed to eslint-config-runner",
        };
      default: {
        const exhaustive: never = options.testKind;
        return exhaustive;
      }
    }
  }

  private runStdoutTest(code: string, test: TestCase): TestResult {
    if (test.expectedStdout === undefined) {
      return {
        name: test.name,
        passed: false,
        error: "INVALID_TEST_CASE: stdout tests require expectedStdout",
      };
    }
    const captured = this.executeAndCaptureStdout(code);
    return this.buildStdoutTestResult(test, captured);
  }

  private executeAndCaptureStdout(code: string): { stdout: string; error?: string } {
    const stdout: string[] = [];
    const wallDeadline = Date.now() + PER_TEST_WALL_TIMEOUT_MS;

    const runtime = this.quickJS.newRuntime({
      memoryLimitBytes: this.memoryLimitMb * 1024 * 1024,
      interruptHandler: shouldInterruptAfterDeadline(wallDeadline),
    });

    try {
      const context = runtime.newContext();
      try {
        const logFn = context.newFunction("__jsreview_log__", (lineHandle) => {
          stdout.push(context.getString(lineHandle));
        });
        context.setProp(context.global, "__jsreview_log__", logFn);
        try {
          const wrapped = `${consoleHookSource()}\n;(async () => {\n${code}\n})();\n`;

          let evalResult: ReturnType<QuickJSContext["evalCode"]>;
          try {
            evalResult = context.evalCode(wrapped, "user.js");
          } catch (e) {
            return {
              stdout: normalizeStdout(stdout.join("\n")),
              error: `COMPILE_ERROR: ${formatErr(e)}`,
            };
          }

          let handle: QuickJSHandle;
          try {
            handle = context.unwrapResult(evalResult);
          } catch (e) {
            return {
              stdout: normalizeStdout(stdout.join("\n")),
              error: formatEvalError(e),
            };
          }

          try {
            const drained = drainToFulfillment(context, runtime, handle, wallDeadline);
            if (!drained.ok) {
              return {
                stdout: normalizeStdout(stdout.join("\n")),
                error: drained.error,
              };
            }
            drained.value.dispose();
            return { stdout: normalizeStdout(stdout.join("\n")) };
          } finally {
            handle.dispose();
          }
        } finally {
          try {
            context.setProp(context.global, "__jsreview_log__", context.undefined);
          } catch {
            /* ignore */
          }
          logFn.dispose();
        }
      } finally {
        context.dispose();
      }
    } finally {
      runtime.dispose();
    }
  }

  private runFunctionTest(code: string, test: TestCase, entryPoints: string[]): TestResult {
    if (!("code" in test)) {
      return {
        name: test.name,
        passed: false,
        error: "INVALID_TEST_CASE: function tests require code",
      };
    }

    const wallDeadline = Date.now() + PER_TEST_WALL_TIMEOUT_MS;

    const runtime = this.quickJS.newRuntime({
      memoryLimitBytes: this.memoryLimitMb * 1024 * 1024,
      interruptHandler: shouldInterruptAfterDeadline(wallDeadline),
    });

    try {
      const context = runtime.newContext();
      try {
        const exposeStmts = entryPoints
          .map((n) => `try { __jsreview_scope__.${n} = ${n}; } catch (_e) {}`)
          .join("\n");
        // `with` は strict mode で SyntaxError。 学習者コードが "use strict" を含む
        // (or class / module 構文を使う) と全体が strict 扱いになり採点不能になるため、
        // 各エントリ識別子を明示的に const 束縛するスタイルに切り替える。
        const bindingDecls = entryPoints.map((n) => `const ${n} = __s.${n};`).join("\n");

        const source = `
        ${code}
        var __jsreview_scope__ = {};
        ${exposeStmts}
        (function (__s) {
          ${bindingDecls}
          return (${test.code});
        })(__jsreview_scope__);
      `;

        let evalResult: ReturnType<QuickJSContext["evalCode"]>;
        try {
          evalResult = context.evalCode(source, "fn-test.js");
        } catch (e) {
          return {
            name: test.name,
            passed: false,
            error: `COMPILE_ERROR: ${formatErr(e)}`,
          };
        }

        let handle: QuickJSHandle;
        try {
          handle = context.unwrapResult(evalResult);
        } catch (e) {
          return {
            name: test.name,
            passed: false,
            error: `COMPILE_ERROR: ${formatEvalError(e)}`,
          };
        }

        try {
          const drained = drainToFulfillment(context, runtime, handle, wallDeadline);
          if (!drained.ok) {
            return {
              name: test.name,
              passed: false,
              error: drained.error,
            };
          }
          try {
            const passed = Boolean(context.dump(drained.value));
            return {
              name: test.name,
              passed,
            };
          } finally {
            // 評価結果が Promise でないとき、 `getPromiseState` は渡した handle を
            // dup せずそのまま返す。 その場合ここで dispose すると外側の
            // `handle.dispose()` と二重解放になり、 QuickJSUseAfterFree が飛んで
            // 採点全体が RUNNER_ERROR になる。 別ハンドルのときだけ捨てる。
            if (drained.value !== handle) {
              drained.value.dispose();
            }
          }
        } finally {
          handle.dispose();
        }
      } finally {
        context.dispose();
      }
    } finally {
      runtime.dispose();
    }
  }
}

function drainToFulfillment(
  context: QuickJSContext,
  runtime: QuickJSRuntime,
  handle: QuickJSHandle,
  wallDeadline: number,
): { ok: true; value: QuickJSHandle } | { ok: false; error: string } {
  for (;;) {
    if (Date.now() >= wallDeadline) {
      return { ok: false, error: "TIMEOUT" };
    }

    const state = context.getPromiseState(handle);

    if (state.type === "fulfilled") {
      return { ok: true, value: state.value };
    }

    if (state.type === "rejected") {
      const msg = errorHandleToMessage(context, state.error);
      return { ok: false, error: msg };
    }

    const jobs = runtime.executePendingJobs(-1);
    try {
      if (isFail(jobs)) {
        const err = jobs.error;
        const msg = errorHandleToMessage(context, err);
        return { ok: false, error: msg };
      }
    } finally {
      jobs.dispose();
    }

    const nextState = context.getPromiseState(handle);
    if (nextState.type === "fulfilled") {
      return { ok: true, value: nextState.value };
    }
    if (nextState.type === "rejected") {
      const msg = errorHandleToMessage(context, nextState.error);
      return { ok: false, error: msg };
    }

    if (!runtime.hasPendingJob() && nextState.type === "pending") {
      return { ok: false, error: "TIMEOUT" };
    }
  }
}

function errorHandleToMessage(context: QuickJSContext, errHandle: QuickJSHandle): string {
  try {
    const dumped: unknown = context.dump(errHandle);
    if (typeof dumped === "object" && dumped !== null && "message" in dumped) {
      return String(Reflect.get(dumped, "message"));
    }
    return String(dumped);
  } finally {
    errHandle.dispose();
  }
}

function formatEvalError(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "InternalError" && e.message === "interrupted") {
      return "TIMEOUT";
    }
    return e.message;
  }
  return String(e);
}

function formatErr(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}

function normalizeStdout(output: string): string {
  return output.replace(/\r\n/g, "\n").replace(/\n+$/g, "");
}

function consoleHookSource(): string {
  return `
    function __jsreview_format_console_arg__(value) {
      if (value === undefined) return "undefined";
      if (value === null) return "null";
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch (_e) {
          return String(value);
        }
      }
      return String(value);
    }

    globalThis.console = {
      log: function (...args) {
        const line = args.map(__jsreview_format_console_arg__).join(" ");
        __jsreview_log__(line);
      }
    };
  `;
}
