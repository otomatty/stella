// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { runOr, type Task } from "../src/q04-02-run-or";
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
afterEach(() => {
  vi.useRealTimers();
});

test("問2 runOr", async () => {
  await expect(runOr(flaky(0, 5).task, 0)).resolves.toBe(5);
  await expect(runOr(failing("x"), -1)).resolves.toBe(-1);
  expectTypeOf(runOr).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(runOr).returns.toEqualTypeOf<Promise<number>>();
});
