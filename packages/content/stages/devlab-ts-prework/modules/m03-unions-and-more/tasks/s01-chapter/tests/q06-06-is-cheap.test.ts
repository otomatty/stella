// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isCheap, type Named, type Priced } from "../src/q06-06-is-cheap";
test("問6 isCheap", () => {
  expect(isCheap({ name: "りんご", price: 150 }, 200)).toBe(true);
  expect(isCheap({ name: "メロン", price: 1000 }, 200)).toBe(false);
  expectTypeOf(isCheap).parameters.toEqualTypeOf<[Named & Priced, number]>();
  expectTypeOf(isCheap).returns.toEqualTypeOf<boolean>();
});
