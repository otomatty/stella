// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalOf, type Named, type Priced } from "../src/q06-12-total-of";
test("問12 totalOf", () => {
  expect(
    totalOf([
      { name: "りんご", price: 150 },
      { name: "みかん", price: 80 },
    ]),
  ).toBe(230);
  expect(totalOf([])).toBe(0);
  expectTypeOf(totalOf).parameters.toEqualTypeOf<[readonly (Named & Priced)[]]>();
  expectTypeOf(totalOf).returns.toEqualTypeOf<number>();
});
