// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { retryIf, type Task } from "../src/q04-18-retry-if";
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
afterEach(() => {
  vi.useRealTimers();
});

test("問18 retryIf", async () => {
  const ok = flaky(2, 5);
  await expect(retryIf(ok.task, 3, () => true)).resolves.toBe(5);
  const stop = flaky(2, 5);
  await expect(retryIf(stop.task, 3, () => false)).rejects.toThrow("失敗 1");
  expect(stop.counter.calls).toBe(1);
  const some = flaky(9, 5);
  const onlyFirst = (error: unknown) => error instanceof Error && error.message === "失敗 1";
  await expect(retryIf(some.task, 5, onlyFirst)).rejects.toThrow("失敗 2");
  expect(some.counter.calls).toBe(2);
  expectTypeOf(retryIf).parameters.toEqualTypeOf<[Task, number, (error: unknown) => boolean]>();
  expectTypeOf(retryIf).returns.toEqualTypeOf<Promise<number>>();
});
