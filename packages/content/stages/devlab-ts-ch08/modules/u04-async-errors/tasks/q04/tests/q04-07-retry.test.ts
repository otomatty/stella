// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { retry, type Task } from "../src/q04-07-retry";
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

test("問7 retry", async () => {
  const ok = flaky(2, 5);
  await expect(retry(ok.task, 3)).resolves.toBe(5);
  expect(ok.counter.calls).toBe(3);
  const ng = flaky(9, 5);
  await expect(retry(ng.task, 3)).rejects.toThrow("失敗 3");
  expect(ng.counter.calls).toBe(3);
  expectTypeOf(retry).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(retry).returns.toEqualTypeOf<Promise<number>>();
});
