// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { safeRun, type Task } from "../src/q04-01-safe-run";
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

test("問1 safeRun", async () => {
  await expect(safeRun(flaky(0, 5).task)).resolves.toBe(5);
  await expect(safeRun(failing("x"))).resolves.toBeUndefined();
  expectTypeOf(safeRun).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(safeRun).returns.toEqualTypeOf<Promise<number | undefined>>();
});
