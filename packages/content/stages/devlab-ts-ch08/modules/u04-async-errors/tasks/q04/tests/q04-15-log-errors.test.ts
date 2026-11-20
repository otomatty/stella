// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { logErrors } from "../src/q04-15-log-errors";
// 呼ばれた回数を数え、最初の failTimes 回は "失敗 1" のような Error で失敗する task を作る
const flaky = (failTimes: number, value: number) => {
  const counter = { calls: 0 };
  const task = async () => {
    counter.calls += 1;
    await Promise.resolve();
    if (counter.calls <= failTimes) {
      throw new Error(`失敗 ${counter.calls}`);
    }
    return value;
  };
  return { counter, task };
};

// いつも失敗する task
const failing = (message: string) => async (): Promise<number> => {
  await Promise.resolve();
  throw new Error(message);
};

// Error でないものを投げる task
const throwsText = async (): Promise<number> => {
  await Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};
afterEach(() => {
  vi.useRealTimers();
});

test("問15 logErrors", async () => {
  const log: string[] = [];
  await expect(
    logErrors([flaky(0, 1).task, failing("x"), flaky(0, 3).task, throwsText], log),
  ).resolves.toEqual([1, 3]);
  expect(log).toEqual(["x", "不明なエラー"]);
  expectTypeOf(logErrors).returns.toEqualTypeOf<Promise<number[]>>();
});
