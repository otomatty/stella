// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { attemptsNeeded, type Task } from "../src/q04-08-attempts-needed";
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

test("問8 attemptsNeeded", async () => {
  await expect(attemptsNeeded(flaky(2, 5).task, 5)).resolves.toBe(3);
  await expect(attemptsNeeded(flaky(0, 5).task, 5)).resolves.toBe(1);
  await expect(attemptsNeeded(flaky(9, 5).task, 2)).rejects.toThrow("失敗 2");
  expectTypeOf(attemptsNeeded).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(attemptsNeeded).returns.toEqualTypeOf<Promise<number>>();
});
