// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { firstSuccess } from "../src/q04-09-first-success";
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

test("問9 firstSuccess", async () => {
  const later = flaky(0, 8);
  await expect(firstSuccess([failing("x"), flaky(0, 7).task, later.task])).resolves.toBe(7);
  expect(later.counter.calls).toBe(0);
  await expect(firstSuccess([failing("x"), failing("y")])).rejects.toThrow("すべて失敗しました");
  await expect(firstSuccess([])).rejects.toThrow("すべて失敗しました");
  expectTypeOf(firstSuccess).returns.toEqualTypeOf<Promise<number>>();
});
