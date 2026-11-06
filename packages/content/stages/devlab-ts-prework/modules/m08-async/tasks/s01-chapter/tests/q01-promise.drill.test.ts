// このファイルは書き換えないでください
import { afterEach, vi, expect, expectTypeOf, test } from "vitest";
import {
  resolveWith,
  rejectWith,
  wait,
  waitValue,
  double,
  lengthOf,
  trimmed,
  addBoth,
  parseNumber,
  recover,
  errorMessage,
  logDone,
  allNumbers,
  sumOfAll,
  pairOf,
  fastest,
  settledCount,
  fulfilledValues,
  rejectedMessages,
  chainSteps,
} from "../src/q01-promise.drill";

afterEach(() => {
  vi.useRealTimers();
});

// ms ミリ秒後に value で解決する Promise
const later = <T>(value: T, ms: number) =>
  new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });

test("問1 resolveWith", async () => {
  await expect(resolveWith("a")).resolves.toBe("a");
  expectTypeOf(resolveWith).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(resolveWith).returns.toEqualTypeOf<Promise<string>>();
});

test("問2 rejectWith", async () => {
  await expect(rejectWith("失敗")).rejects.toThrow("失敗");
  expectTypeOf(rejectWith).returns.toEqualTypeOf<Promise<never>>();
});

test("問3 wait", async () => {
  vi.useFakeTimers();
  let done = false;
  void wait(100).then(() => {
    done = true;
  });
  await vi.advanceTimersByTimeAsync(99);
  expect(done).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(done).toBe(true);
  expectTypeOf(wait).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(wait).returns.toEqualTypeOf<Promise<void>>();
});

test("問4 waitValue", async () => {
  vi.useFakeTimers();
  let result: string | undefined;
  void waitValue("a", 50).then((value) => {
    result = value;
  });
  await vi.advanceTimersByTimeAsync(49);
  expect(result).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(result).toBe("a");
  expectTypeOf(waitValue).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(waitValue).returns.toEqualTypeOf<Promise<string>>();
});

test("問5 double", async () => {
  await expect(double(Promise.resolve(3))).resolves.toBe(6);
  expectTypeOf(double).parameters.toEqualTypeOf<[Promise<number>]>();
  expectTypeOf(double).returns.toEqualTypeOf<Promise<number>>();
});

test("問6 lengthOf", async () => {
  await expect(lengthOf(Promise.resolve("abc"))).resolves.toBe(3);
  await expect(lengthOf(Promise.resolve(""))).resolves.toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<Promise<number>>();
});

test("問7 trimmed", async () => {
  await expect(trimmed(Promise.resolve("  a "))).resolves.toBe("a");
  expectTypeOf(trimmed).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(trimmed).returns.toEqualTypeOf<Promise<string>>();
});

test("問8 addBoth", async () => {
  await expect(addBoth(Promise.resolve(1), Promise.resolve(2))).resolves.toBe(3);
  expectTypeOf(addBoth).parameters.toEqualTypeOf<[Promise<number>, Promise<number>]>();
  expectTypeOf(addBoth).returns.toEqualTypeOf<Promise<number>>();
});

test("問9 parseNumber", async () => {
  await expect(parseNumber(Promise.resolve("12"))).resolves.toBe(12);
  await expect(parseNumber(Promise.resolve("abc"))).rejects.toThrow(Error);
  expectTypeOf(parseNumber).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(parseNumber).returns.toEqualTypeOf<Promise<number>>();
});

test("問10 recover", async () => {
  await expect(recover(Promise.resolve(5))).resolves.toBe(5);
  await expect(recover(Promise.reject(new Error("x")))).resolves.toBe(0);
  expectTypeOf(recover).parameters.toEqualTypeOf<[Promise<number>]>();
  expectTypeOf(recover).returns.toEqualTypeOf<Promise<number>>();
});

test("問11 errorMessage", async () => {
  await expect(errorMessage(Promise.resolve(1))).resolves.toBe("成功");
  await expect(errorMessage(Promise.reject(new Error("x")))).resolves.toBe("x");
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Error でない理由で失敗させる
  await expect(errorMessage(Promise.reject("x"))).resolves.toBe("不明なエラー");
  expectTypeOf(errorMessage).parameters.toEqualTypeOf<[Promise<unknown>]>();
  expectTypeOf(errorMessage).returns.toEqualTypeOf<Promise<string>>();
});

test("問12 logDone", async () => {
  const log: string[] = [];
  await expect(logDone(Promise.resolve(3), log)).resolves.toBe(3);
  await expect(logDone(Promise.reject(new Error("x")), log)).rejects.toThrow("x");
  expect(log).toEqual(["done", "done"]);
  expectTypeOf(logDone).returns.toEqualTypeOf<Promise<number>>();
});

test("問13 allNumbers", async () => {
  await expect(allNumbers([later(1, 10), Promise.resolve(2)])).resolves.toEqual([1, 2]);
  await expect(allNumbers([Promise.resolve(1), Promise.reject(new Error("x"))])).rejects.toThrow(
    "x",
  );
  expectTypeOf(allNumbers).returns.toEqualTypeOf<Promise<number[]>>();
});

test("問14 sumOfAll", async () => {
  await expect(sumOfAll([Promise.resolve(1), later(2, 5)])).resolves.toBe(3);
  await expect(sumOfAll([])).resolves.toBe(0);
  expectTypeOf(sumOfAll).returns.toEqualTypeOf<Promise<number>>();
});

test("問15 pairOf", async () => {
  await expect(pairOf(Promise.resolve("a"), Promise.resolve(1))).resolves.toEqual(["a", 1]);
  expectTypeOf(pairOf).parameters.toEqualTypeOf<[Promise<string>, Promise<number>]>();
  expectTypeOf(pairOf).returns.toEqualTypeOf<Promise<[string, number]>>();
});

test("問16 fastest", async () => {
  await expect(fastest([later("遅い", 50), later("速い", 5)])).resolves.toBe("速い");
  expectTypeOf(fastest).returns.toEqualTypeOf<Promise<string>>();
});

test("問17 settledCount", async () => {
  await expect(
    settledCount([Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3)]),
  ).resolves.toBe(2);
  expectTypeOf(settledCount).returns.toEqualTypeOf<Promise<number>>();
});

test("問18 fulfilledValues", async () => {
  await expect(
    fulfilledValues([Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3)]),
  ).resolves.toEqual([1, 3]);
  expectTypeOf(fulfilledValues).returns.toEqualTypeOf<Promise<number[]>>();
});

test("問19 rejectedMessages", async () => {
  await expect(
    rejectedMessages([
      Promise.resolve(1),
      Promise.reject(new Error("x")),
      Promise.reject(new Error("y")),
    ]),
  ).resolves.toEqual(["x", "y"]);
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Error でない理由で失敗させる
  await expect(rejectedMessages([Promise.reject(404)])).resolves.toEqual(["不明なエラー"]);
  expectTypeOf(rejectedMessages).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問20 chainSteps", async () => {
  const addOne = (n: number) => Promise.resolve(n + 1);
  const times2 = (n: number) => later(n * 2, 5);
  await expect(chainSteps(1, [addOne, times2])).resolves.toBe(4);
  await expect(chainSteps(1, [times2, addOne])).resolves.toBe(3);
  await expect(chainSteps(7, [])).resolves.toBe(7);
  expectTypeOf(chainSteps).returns.toEqualTypeOf<Promise<number>>();
});
