// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { withContext, type Task } from "../src/q04-05-with-context";
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

test("問5 withContext", async () => {
  await expect(withContext(flaky(0, 5).task, "保存")).resolves.toBe(5);
  const original = new Error("x");
  const error: unknown = await withContext(() => Promise.reject(original), "保存").catch(
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(Error);
  expect(error).toHaveProperty("message", "保存: x");
  expect(error).toHaveProperty("cause", original);
  expectTypeOf(withContext).parameters.toEqualTypeOf<[Task, string]>();
  expectTypeOf(withContext).returns.toEqualTypeOf<Promise<number>>();
});
