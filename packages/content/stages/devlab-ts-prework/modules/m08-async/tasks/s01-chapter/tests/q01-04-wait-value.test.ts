// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { waitValue } from "../src/q01-04-wait-value";
afterEach(() => {
  vi.useRealTimers();
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
