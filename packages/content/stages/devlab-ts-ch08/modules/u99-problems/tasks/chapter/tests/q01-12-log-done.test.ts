// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { logDone } from "../src/q01-12-log-done";
afterEach(() => {
  vi.useRealTimers();
});

test("問12 logDone", async () => {
  const log: string[] = [];
  await expect(logDone(Promise.resolve(3), log)).resolves.toBe(3);
  await expect(logDone(Promise.reject(new Error("x")), log)).rejects.toThrow("x");
  expect(log).toEqual(["done", "done"]);
  expectTypeOf(logDone).returns.toEqualTypeOf<Promise<number>>();
});
