// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { oldestName } from "../src/q02-11-oldest-name";
afterEach(() => {
  vi.useRealTimers();
});

test("問11 oldestName", async () => {
  await expect(oldestName([1, 3, 4])).resolves.toBe("鈴木");
  await expect(oldestName([])).resolves.toBeUndefined();
  expectTypeOf(oldestName).returns.toEqualTypeOf<Promise<string | undefined>>();
});
