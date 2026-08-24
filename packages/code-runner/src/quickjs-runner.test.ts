/**
 * QuickJS ランナーの採点経路の回帰テスト。
 *
 * `function` 採点は、 評価結果が Promise かどうかで handle の扱いが変わる。
 * 非 Promise のとき `getPromiseState` は渡した handle を dup せずそのまま返すため、
 * 呼び出し側が二重に dispose すると `QuickJSUseAfterFree` が飛び、 採点が
 * すべて `RUNNER_ERROR` に落ちる。 一度実際に踏んだので、 ここで固定する。
 */

import { describe, expect, it } from "vitest";

import { getQuickJSModule, MEMORY_LIMIT_MB, QuickJsRunner } from "./quickjs-runner.js";

const ADD = "function add(a, b) { return a + b; }";

async function newRunner(): Promise<QuickJsRunner> {
  return new QuickJsRunner(await getQuickJSModule(), MEMORY_LIMIT_MB);
}

describe("QuickJsRunner (function 採点)", () => {
  it("Promise でない評価結果でも二重解放にならず合否が返る", async () => {
    const runner = await newRunner();
    const results = runner.runAll(
      ADD,
      [
        { name: "合格", code: "add(1, 2) === 3" },
        { name: "不合格", code: "add(1, 2) === 4" },
      ],
      { testKind: "function", entryPoints: ["add"] },
    );

    expect(results.map((r) => r.passed)).toEqual([true, false]);
    for (const result of results) {
      expect(result.error ?? "").not.toMatch(/UseAfterFree|Lifetime/);
    }
  });

  it("Promise を返す評価結果も解決してから判定する", async () => {
    const runner = await newRunner();
    const results = runner.runAll(
      ADD,
      [{ name: "promise", code: "Promise.resolve(add(1, 2) === 3)" }],
      { testKind: "function", entryPoints: ["add"] },
    );

    expect(results[0].passed).toBe(true);
  });

  it("無限ループはタイムアウトとして返る", async () => {
    const runner = await newRunner();
    const results = runner.runAll(
      "function spin() { while (true) {} }",
      [{ name: "timeout", code: "spin() === 1" }],
      { testKind: "function", entryPoints: ["spin"] },
    );

    expect(results[0].passed).toBe(false);
    expect(results[0].error).toMatch(/TIMEOUT/);
  });

  it("stdout 採点は期待出力と突き合わせる", async () => {
    const runner = await newRunner();
    const results = runner.runAll(
      'console.log("hello");',
      [
        { name: "一致", expectedStdout: "hello" },
        { name: "不一致", expectedStdout: "bye" },
      ],
      { testKind: "stdout" },
    );

    expect(results.map((r) => r.passed)).toEqual([true, false]);
  });
});
