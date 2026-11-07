// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { retryWithDelay, type Task } from "../src/q04-17-retry-with-delay";
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

test("問17 retryWithDelay", async () => {
  vi.useFakeTimers();
  const { counter, task } = flaky(2, 5);
  const result = retryWithDelay(task, 3, 100);
  await vi.advanceTimersByTimeAsync(99);
  expect(counter.calls).toBe(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(counter.calls).toBe(2);
  await vi.advanceTimersByTimeAsync(100);
  await expect(result).resolves.toBe(5);
  expect(counter.calls).toBe(3);
  expectTypeOf(retryWithDelay).parameters.toEqualTypeOf<[Task, number, number]>();
  expectTypeOf(retryWithDelay).returns.toEqualTypeOf<Promise<number>>();
});
