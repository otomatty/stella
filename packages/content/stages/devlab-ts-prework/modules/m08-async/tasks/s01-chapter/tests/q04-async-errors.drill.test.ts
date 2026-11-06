// このファイルは書き換えないでください
import { afterEach, vi, expect, expectTypeOf, test } from "vitest";
import {
  safeRun,
  type Task,
  type Result,
  type ApiResult,
  runOr,
  errorText,
  toResult,
  withContext,
  retryOnce,
  retry,
  attemptsNeeded,
  firstSuccess,
  countFailures,
  withCleanup,
  withTimeout,
  wait,
  parseAge,
  assertOk,
  logErrors,
  failedIndexes,
  retryWithDelay,
  retryIf,
  finallyLog,
  settleAll,
} from "../src/q04-async-errors.drill";

afterEach(() => {
  vi.useRealTimers();
});

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

test("問1 safeRun", async () => {
  await expect(safeRun(flaky(0, 5).task)).resolves.toBe(5);
  await expect(safeRun(failing("x"))).resolves.toBeUndefined();
  expectTypeOf(safeRun).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(safeRun).returns.toEqualTypeOf<Promise<number | undefined>>();
});

test("問2 runOr", async () => {
  await expect(runOr(flaky(0, 5).task, 0)).resolves.toBe(5);
  await expect(runOr(failing("x"), -1)).resolves.toBe(-1);
  expectTypeOf(runOr).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(runOr).returns.toEqualTypeOf<Promise<number>>();
});

test("問3 errorText", async () => {
  await expect(errorText(flaky(0, 1).task)).resolves.toBe("OK");
  await expect(errorText(failing("通信エラー"))).resolves.toBe("通信エラー");
  await expect(errorText(throwsText)).resolves.toBe("不明なエラー");
  expectTypeOf(errorText).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(errorText).returns.toEqualTypeOf<Promise<string>>();
});

test("問4 toResult", async () => {
  await expect(toResult(flaky(0, 5).task)).resolves.toEqual({ ok: true, value: 5 });
  await expect(toResult(failing("x"))).resolves.toEqual({ ok: false, message: "x" });
  await expect(toResult(throwsText)).resolves.toEqual({ ok: false, message: "不明なエラー" });
  expectTypeOf(toResult).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(toResult).returns.toEqualTypeOf<Promise<Result>>();
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

test("問6 retryOnce", async () => {
  const once = flaky(1, 5);
  await expect(retryOnce(once.task)).resolves.toBe(5);
  expect(once.counter.calls).toBe(2);
  const twice = flaky(2, 5);
  await expect(retryOnce(twice.task)).rejects.toThrow("失敗 2");
  expectTypeOf(retryOnce).parameters.toEqualTypeOf<[Task]>();
  expectTypeOf(retryOnce).returns.toEqualTypeOf<Promise<number>>();
});

test("問7 retry", async () => {
  const ok = flaky(2, 5);
  await expect(retry(ok.task, 3)).resolves.toBe(5);
  expect(ok.counter.calls).toBe(3);
  const ng = flaky(9, 5);
  await expect(retry(ng.task, 3)).rejects.toThrow("失敗 3");
  expect(ng.counter.calls).toBe(3);
  expectTypeOf(retry).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(retry).returns.toEqualTypeOf<Promise<number>>();
});

test("問8 attemptsNeeded", async () => {
  await expect(attemptsNeeded(flaky(2, 5).task, 5)).resolves.toBe(3);
  await expect(attemptsNeeded(flaky(0, 5).task, 5)).resolves.toBe(1);
  await expect(attemptsNeeded(flaky(9, 5).task, 2)).rejects.toThrow("失敗 2");
  expectTypeOf(attemptsNeeded).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(attemptsNeeded).returns.toEqualTypeOf<Promise<number>>();
});

test("問9 firstSuccess", async () => {
  const later = flaky(0, 8);
  await expect(firstSuccess([failing("x"), flaky(0, 7).task, later.task])).resolves.toBe(7);
  expect(later.counter.calls).toBe(0);
  await expect(firstSuccess([failing("x"), failing("y")])).rejects.toThrow("すべて失敗しました");
  await expect(firstSuccess([])).rejects.toThrow("すべて失敗しました");
  expectTypeOf(firstSuccess).returns.toEqualTypeOf<Promise<number>>();
});

test("問10 countFailures", async () => {
  await expect(countFailures([flaky(0, 1).task, failing("x"), failing("y")])).resolves.toBe(2);
  await expect(countFailures([])).resolves.toBe(0);
  expectTypeOf(countFailures).returns.toEqualTypeOf<Promise<number>>();
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

test("問12 withTimeout", async () => {
  vi.useFakeTimers();
  const slow = async () => {
    await wait(200);
    return 1;
  };
  const quick = async () => {
    await wait(50);
    return 2;
  };
  const ok = withTimeout(quick, 100);
  await vi.advanceTimersByTimeAsync(50);
  await expect(ok).resolves.toBe(2);
  const ng = withTimeout(slow, 100);
  const check = expect(ng).rejects.toThrow("タイムアウトしました");
  await vi.advanceTimersByTimeAsync(100);
  await check;
  expectTypeOf(withTimeout).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(withTimeout).returns.toEqualTypeOf<Promise<number>>();
});

test("問13 parseAge", async () => {
  await expect(parseAge(() => Promise.resolve("20"))).resolves.toBe(20);
  await expect(parseAge(() => Promise.resolve("-1"))).rejects.toThrow("年齢が正しくありません: -1");
  await expect(parseAge(() => Promise.resolve("abc"))).rejects.toThrow(
    "年齢が正しくありません: abc",
  );
  expectTypeOf(parseAge).parameters.toEqualTypeOf<[() => Promise<string>]>();
  expectTypeOf(parseAge).returns.toEqualTypeOf<Promise<number>>();
});

test("問14 assertOk", async () => {
  await expect(assertOk(() => Promise.resolve({ ok: true, status: 200 }))).resolves.toBe(200);
  await expect(assertOk(() => Promise.resolve({ ok: false, status: 500 }))).rejects.toThrow(
    "HTTP 500",
  );
  expectTypeOf(assertOk).parameters.toEqualTypeOf<[() => Promise<ApiResult>]>();
  expectTypeOf(assertOk).returns.toEqualTypeOf<Promise<number>>();
});

test("問15 logErrors", async () => {
  const log: string[] = [];
  await expect(
    logErrors([flaky(0, 1).task, failing("x"), flaky(0, 3).task, throwsText], log),
  ).resolves.toEqual([1, 3]);
  expect(log).toEqual(["x", "不明なエラー"]);
  expectTypeOf(logErrors).returns.toEqualTypeOf<Promise<number[]>>();
});

test("問16 failedIndexes", async () => {
  await expect(
    failedIndexes([flaky(0, 1).task, failing("x"), flaky(0, 3).task, failing("y")]),
  ).resolves.toEqual([1, 3]);
  expectTypeOf(failedIndexes).returns.toEqualTypeOf<Promise<number[]>>();
});

test("問17 retryWithDelay", async () => {
  vi.useFakeTimers();
  const { counter, task } = flaky(2, 5);
  const result = retryWithDelay(task, 3, 100);
  await vi.advanceTimersByTimeAsync(99);
  expect(counter.calls).toBe(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(counter.calls).toBe(2);
  await vi.advanceTimersByTimeAsync(100);
  await expect(result).resolves.toBe(5);
  expect(counter.calls).toBe(3);
  expectTypeOf(retryWithDelay).parameters.toEqualTypeOf<[Task, number, number]>();
  expectTypeOf(retryWithDelay).returns.toEqualTypeOf<Promise<number>>();
});

test("問18 retryIf", async () => {
  const ok = flaky(2, 5);
  await expect(retryIf(ok.task, 3, () => true)).resolves.toBe(5);
  const stop = flaky(2, 5);
  await expect(retryIf(stop.task, 3, () => false)).rejects.toThrow("失敗 1");
  expect(stop.counter.calls).toBe(1);
  const some = flaky(9, 5);
  const onlyFirst = (error: unknown) => error instanceof Error && error.message === "失敗 1";
  await expect(retryIf(some.task, 5, onlyFirst)).rejects.toThrow("失敗 2");
  expect(some.counter.calls).toBe(2);
  expectTypeOf(retryIf).parameters.toEqualTypeOf<[Task, number, (error: unknown) => boolean]>();
  expectTypeOf(retryIf).returns.toEqualTypeOf<Promise<number>>();
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

test("問20 settleAll", async () => {
  await expect(
    settleAll([flaky(0, 1).task, failing("x"), throwsText, flaky(0, 4).task]),
  ).resolves.toEqual({ values: [1, 4], errors: ["x", "不明なエラー"] });
  expectTypeOf(settleAll).returns.toEqualTypeOf<Promise<{ values: number[]; errors: string[] }>>();
});
