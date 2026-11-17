// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { nameLength } from "../src/q02-05-name-length";
afterEach(() => {
  vi.useRealTimers();
});

test("問5 nameLength", async () => {
  await expect(nameLength(1)).resolves.toBe(2);
  expectTypeOf(nameLength).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nameLength).returns.toEqualTypeOf<Promise<number>>();
});
