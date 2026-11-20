// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { firstAdult } from "../src/q02-16-first-adult";
afterEach(() => {
  vi.useRealTimers();
});

test("問16 firstAdult", async () => {
  await expect(firstAdult([2, 9, 4, 1])).resolves.toBe("田中");
  await expect(firstAdult([2])).resolves.toBeUndefined();
  expectTypeOf(firstAdult).returns.toEqualTypeOf<Promise<string | undefined>>();
});
