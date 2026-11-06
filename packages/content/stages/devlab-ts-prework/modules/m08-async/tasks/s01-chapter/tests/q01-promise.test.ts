import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { delay, orDefault, sumAll, timeout, withLoading } from "../src/q01-promise";

afterEach(() => {
  vi.useRealTimers();
});

const later = (value: number, ms: number) =>
  new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });

describe("delay", () => {
  test("ms ミリ秒たってから解決する", async () => {
    vi.useFakeTimers();
    let done = false;
    void delay(100).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  test("型", () => {
    expectTypeOf(delay).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(delay).returns.toEqualTypeOf<Promise<void>>();
  });
});

describe("timeout", () => {
  test("間に合えば、その値で解決する", async () => {
    vi.useFakeTimers();
    const result = timeout(later(1, 50), 100);
    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toBe(1);
  });

  test("間に合わなければ Error で失敗する", async () => {
    vi.useFakeTimers();
    const result = timeout(later(1, 200), 100);
    const check = expect(result).rejects.toThrow("タイムアウトしました");
    await vi.advanceTimersByTimeAsync(100);
    await check;
  });

  test("戻り値の型は元の Promise の中身に合わせて変わる", () => {
    expectTypeOf(timeout(later(1, 1), 10)).toEqualTypeOf<Promise<number>>();
    expectTypeOf(timeout(Promise.resolve("a"), 10)).toEqualTypeOf<Promise<string>>();
  });
});

describe("withLoading", () => {
  test("成功したとき", async () => {
    const log: boolean[] = [];
    const result = withLoading(Promise.resolve("ok"), (loading) => {
      log.push(loading);
    });
    expect(log).toEqual([true]);
    await expect(result).resolves.toBe("ok");
    expect(log).toEqual([true, false]);
  });

  test("失敗したときも false に戻し、失敗はそのまま返す", async () => {
    const log: boolean[] = [];
    const result = withLoading(Promise.reject(new Error("失敗")), (loading) => {
      log.push(loading);
    });
    await expect(result).rejects.toThrow("失敗");
    expect(log).toEqual([true, false]);
  });

  test("戻り値の型", () => {
    expectTypeOf(withLoading(later(1, 1), () => undefined)).toEqualTypeOf<Promise<number>>();
  });
});

describe("orDefault", () => {
  test("成功ならその値、失敗なら fallback", async () => {
    await expect(orDefault(Promise.resolve(5), 0)).resolves.toBe(5);
    await expect(orDefault(Promise.reject(new Error("x")), 0)).resolves.toBe(0);
  });

  test("戻り値の型", () => {
    expectTypeOf(orDefault(Promise.resolve("a"), "")).toEqualTypeOf<Promise<string>>();
  });
});

describe("sumAll", () => {
  test("すべて解決したら合計", async () => {
    await expect(sumAll([Promise.resolve(1), Promise.resolve(2), later(3, 1)])).resolves.toBe(6);
    await expect(sumAll([])).resolves.toBe(0);
  });

  test("1つでも失敗したら失敗", async () => {
    await expect(sumAll([Promise.resolve(1), Promise.reject(new Error("x"))])).rejects.toThrow("x");
  });

  test("型", () => {
    expectTypeOf(sumAll).returns.toEqualTypeOf<Promise<number>>();
  });
});
