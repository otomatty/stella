// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { namesAtOnce } from "../src/q02-10-names-at-once";
afterEach(() => {
  vi.useRealTimers();
});

test("問10 namesAtOnce", async () => {
  await expect(namesAtOnce([2, 4])).resolves.toEqual(["佐藤", "田中"]);
  expectTypeOf(namesAtOnce).returns.toEqualTypeOf<Promise<string[]>>();
});
