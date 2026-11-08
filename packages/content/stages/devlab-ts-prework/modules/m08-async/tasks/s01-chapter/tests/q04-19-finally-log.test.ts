// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { finallyLog, type Task } from "../src/q04-19-finally-log";
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

test("問19 finallyLog", async () => {
  const okLog: string[] = [];
  await expect(finallyLog(flaky(0, 5).task, okLog)).resolves.toBe(5);
  expect(okLog).toEqual(["開始", "成功", "終了"]);
  const ngLog: string[] = [];
  await expect(finallyLog(failing("x"), ngLog)).rejects.toThrow("x");
  expect(ngLog).toEqual(["開始", "失敗", "終了"]);
  expectTypeOf(finallyLog).parameters.toEqualTypeOf<[Task, string[]]>();
  expectTypeOf(finallyLog).returns.toEqualTypeOf<Promise<number>>();
});
