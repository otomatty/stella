// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { failedIndexes } from "../src/q04-16-failed-indexes";
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

test("問16 failedIndexes", async () => {
  await expect(
    failedIndexes([flaky(0, 1).task, failing("x"), flaky(0, 3).task, failing("y")]),
  ).resolves.toEqual([1, 3]);
  expectTypeOf(failedIndexes).returns.toEqualTypeOf<Promise<number[]>>();
});
