import { describe, expect, expectTypeOf, test } from "vitest";
import { type Result, firstSuccessful, runAll, tryAsync, withRetry } from "../src/q04-async-errors";

// 呼ばれた回数を数え、失敗する回数を決められる関数を作る
const flaky = (failTimes: number, value: string) => {
  const counter = { calls: 0 };
  const fn = async () => {
    counter.calls += 1;
    await Promise.resolve();
    if (counter.calls <= failTimes) {
      throw new Error(`失敗 ${counter.calls}`);
    }
    return value;
  };
  return { counter, fn };
};

// Error でないものを投げる関数（テスト用）
const throwText = async (): Promise<string> => {
  await Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};

describe("tryAsync", () => {
  test("成功と失敗", async () => {
    await expect(tryAsync(flaky(0, "a").fn)).resolves.toEqual({ ok: true, value: "a" });
    const failed = await tryAsync(flaky(1, "a").fn);
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error).toBeInstanceOf(Error);
      expect(failed.error.message).toBe("失敗 1");
    }
  });

  test("Error でないものは Error にする", async () => {
    const result = await tryAsync(throwText);
    if (result.ok) {
      expect.unreachable();
    } else {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("文字列");
    }
  });

  test("型", () => {
    expectTypeOf(tryAsync(flaky(0, "a").fn)).toEqualTypeOf<Promise<Result<string>>>();
  });
});

describe("withRetry", () => {
  test("成功するまで呼ぶ", async () => {
    const { counter, fn } = flaky(2, "ok");
    await expect(withRetry(fn, 3)).resolves.toBe("ok");
    expect(counter.calls).toBe(3);
  });

  test("最初に成功したらそれ以上呼ばない", async () => {
    const { counter, fn } = flaky(0, "ok");
    await expect(withRetry(fn, 3)).resolves.toBe("ok");
    expect(counter.calls).toBe(1);
  });

  test("全部失敗したら最後の失敗を投げる", async () => {
    const { counter, fn } = flaky(5, "ok");
    await expect(withRetry(fn, 3)).rejects.toThrow("失敗 3");
    expect(counter.calls).toBe(3);
  });

  test("attempts が1未満なら Error", async () => {
    const { counter, fn } = flaky(0, "ok");
    await expect(withRetry(fn, 0)).rejects.toThrow(Error);
    expect(counter.calls).toBe(0);
  });

  test("型", () => {
    expectTypeOf(withRetry(flaky(0, "a").fn, 1)).toEqualTypeOf<Promise<string>>();
  });
});

describe("firstSuccessful", () => {
  test("最初に成功した値。後ろは呼ばない", async () => {
    const a = flaky(1, "a");
    const b = flaky(0, "b");
    const c = flaky(0, "c");
    await expect(firstSuccessful([a.fn, b.fn, c.fn])).resolves.toBe("b");
    expect([a.counter.calls, b.counter.calls, c.counter.calls]).toEqual([1, 1, 0]);
  });

  test("すべて失敗したら Error", async () => {
    await expect(firstSuccessful([flaky(1, "a").fn, flaky(1, "b").fn])).rejects.toThrow(
      "すべて失敗しました",
    );
    await expect(firstSuccessful([])).rejects.toThrow("すべて失敗しました");
  });

  test("型", () => {
    expectTypeOf(firstSuccessful([flaky(0, "a").fn])).toEqualTypeOf<Promise<string>>();
  });
});

describe("runAll", () => {
  test("失敗しても最後まで呼ぶ", async () => {
    const tasks = [flaky(0, "a").fn, flaky(1, "b").fn, throwText, flaky(0, "d").fn];
    await expect(runAll(tasks)).resolves.toEqual({
      values: ["a", "d"],
      errors: ["失敗 1", "不明なエラー"],
    });
  });

  test("型", () => {
    expectTypeOf(runAll([flaky(0, "a").fn])).toEqualTypeOf<
      Promise<{ values: string[]; errors: string[] }>
    >();
  });
});
