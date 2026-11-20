// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { sumAgesAtOnce } from "../src/q02-08-sum-ages-at-once";
afterEach(() => {
  vi.useRealTimers();
});

test("問8 sumAgesAtOnce", async () => {
  await expect(sumAgesAtOnce(3, 4)).resolves.toBe(72);
  expectTypeOf(sumAgesAtOnce).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(sumAgesAtOnce).returns.toEqualTypeOf<Promise<number>>();
});
