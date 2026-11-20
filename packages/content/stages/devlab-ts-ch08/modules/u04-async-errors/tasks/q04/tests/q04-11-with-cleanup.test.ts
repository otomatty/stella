// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { withCleanup, type Task } from "../src/q04-11-with-cleanup";
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

test("問11 withCleanup", async () => {
  const log: string[] = [];
  const cleanup = () => {
    log.push("片付け");
  };
  await expect(withCleanup(flaky(0, 5).task, cleanup)).resolves.toBe(5);
  await expect(withCleanup(failing("x"), cleanup)).rejects.toThrow("x");
  expect(log).toEqual(["片付け", "片付け"]);
  expectTypeOf(withCleanup).parameters.toEqualTypeOf<[Task, () => void]>();
  expectTypeOf(withCleanup).returns.toEqualTypeOf<Promise<number>>();
});
