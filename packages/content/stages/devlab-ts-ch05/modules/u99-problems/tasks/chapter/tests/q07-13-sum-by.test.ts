// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumBy } from "../src/q07-13-sum-by";
test("問13 sumBy", () => {
  expect(sumBy(["a", "bcd"], (w) => w.length)).toBe(4);
  expectTypeOf(sumBy).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(sumBy).returns.toEqualTypeOf<number>();
});
