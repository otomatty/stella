// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { parseNumber } from "../src/q01-09-parse-number";
afterEach(() => {
  vi.useRealTimers();
});

test("問9 parseNumber", async () => {
  await expect(parseNumber(Promise.resolve("12"))).resolves.toBe(12);
  await expect(parseNumber(Promise.resolve("abc"))).rejects.toThrow(Error);
  expectTypeOf(parseNumber).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(parseNumber).returns.toEqualTypeOf<Promise<number>>();
});
