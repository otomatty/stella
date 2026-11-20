// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { resolveWith } from "../src/q01-01-resolve-with";
afterEach(() => {
  vi.useRealTimers();
});

test("問1 resolveWith", async () => {
  await expect(resolveWith("a")).resolves.toBe("a");
  expectTypeOf(resolveWith).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(resolveWith).returns.toEqualTypeOf<Promise<string>>();
});
