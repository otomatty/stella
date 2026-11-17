// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { waitAndReturn } from "../src/q02-17-wait-and-return";
afterEach(() => {
  vi.useRealTimers();
});

test("問17 waitAndReturn", async () => {
  vi.useFakeTimers();
  let result: string | undefined;
  void waitAndReturn(100, "a").then((value) => {
    result = value;
  });
  await vi.advanceTimersByTimeAsync(99);
  expect(result).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(result).toBe("a");
  expectTypeOf(waitAndReturn).parameters.toEqualTypeOf<[number, string]>();
  expectTypeOf(waitAndReturn).returns.toEqualTypeOf<Promise<string>>();
});
