// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { getAge } from "../src/q02-01-get-age";
afterEach(() => {
  vi.useRealTimers();
});

test("問1 getAge", async () => {
  await expect(getAge(1)).resolves.toBe(34);
  await expect(getAge(9)).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(getAge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getAge).returns.toEqualTypeOf<Promise<number>>();
});
