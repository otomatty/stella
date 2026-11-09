// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeItem, type Named, type Priced } from "../src/q06-07-make-item";
test("問7 makeItem", () => {
  expect(makeItem("りんご", 150)).toEqual({ name: "りんご", price: 150 });
  expectTypeOf(makeItem).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeItem).returns.toEqualTypeOf<Named & Priced>();
});
