// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceOf } from "../src/q08-16-price-of";
test("問16 priceOf", () => {
  expect(priceOf({ りんご: 150 }, "りんご")).toBe(150);
  expect(() => priceOf({ りんご: 150 }, "メロン")).toThrow(Error);
  expectTypeOf(priceOf).parameters.toEqualTypeOf<[{ [item: string]: number }, string]>();
  expectTypeOf(priceOf).returns.toEqualTypeOf<number>();
});
