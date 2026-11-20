// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { retryOnce, type Task } from "../src/q04-06-retry-once";
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

test("問6 retryOnce", async () => {
  const once = flaky(1, 5);
  await expect(retryOnce(once.task)).resolves.toBe(5);
  expect(once.counter.calls).toBe(2);
  const twice = flaky(2, 5);
  await expect(retryOnce(twice.task)).rejects.toThrow("失敗 2");
  expectTypeOf(retryOnce).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(retryOnce).returns.toEqualTypeOf<Promise<number>>();
});
