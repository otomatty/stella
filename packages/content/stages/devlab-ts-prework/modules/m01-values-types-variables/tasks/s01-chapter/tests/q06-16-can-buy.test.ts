// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canBuy } from "../src/q06-16-can-buy";
test("問16 canBuy", () => {
  expect(canBuy(1000, 800, true)).toBe(true);
  expect(canBuy(1000, 800, false)).toBe(false);
  expect(canBuy(500, 800, true)).toBe(false);
  expectTypeOf(canBuy).parameters.toEqualTypeOf<[number, number, boolean]>();
  expectTypeOf(canBuy).returns.toEqualTypeOf<boolean>();
});
