// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { settleAll } from "../src/q04-20-settle-all";
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

test("問20 settleAll", async () => {
  await expect(
    settleAll([flaky(0, 1).task, failing("x"), throwsText, flaky(0, 4).task]),
  ).resolves.toEqual({ values: [1, 4], errors: ["x", "不明なエラー"] });
  expectTypeOf(settleAll).returns.toEqualTypeOf<Promise<{ values: number[]; errors: string[] }>>();
});
