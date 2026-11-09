// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toMinutes } from "../src/q01-04-to-minutes";
test("問4 toMinutes", () => {
  expect(toMinutes(9, 30)).toBe(570);
  expect(toMinutes(0, 0)).toBe(0);
  expectTypeOf(toMinutes).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(toMinutes).returns.toEqualTypeOf<number>();
});
