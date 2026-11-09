// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { errorText, type Task } from "../src/q04-03-error-text";
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

test("問3 errorText", async () => {
  await expect(errorText(flaky(0, 1).task)).resolves.toBe("OK");
  await expect(errorText(failing("通信エラー"))).resolves.toBe("通信エラー");
  await expect(errorText(throwsText)).resolves.toBe("不明なエラー");
  expectTypeOf(errorText).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(errorText).returns.toEqualTypeOf<Promise<string>>();
});
