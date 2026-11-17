// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { trimmed } from "../src/q01-07-trimmed";
afterEach(() => {
  vi.useRealTimers();
});

test("問7 trimmed", async () => {
  await expect(trimmed(Promise.resolve("  a "))).resolves.toBe("a");
  expectTypeOf(trimmed).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(trimmed).returns.toEqualTypeOf<Promise<string>>();
});
