// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { toResult, type Task, type Result } from "../src/q04-04-to-result";
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

// Error でないものを投げる task
const throwsText = async (): Promise<number> => {
  await Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};
afterEach(() => {
  vi.useRealTimers();
});

test("問4 toResult", async () => {
  await expect(toResult(flaky(0, 5).task)).resolves.toEqual({ ok: true, value: 5 });
  await expect(toResult(failing("x"))).resolves.toEqual({ ok: false, message: "x" });
  await expect(toResult(throwsText)).resolves.toEqual({ ok: false, message: "不明なエラー" });
  expectTypeOf(toResult).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(toResult).returns.toEqualTypeOf<Promise<Result>>();
});
