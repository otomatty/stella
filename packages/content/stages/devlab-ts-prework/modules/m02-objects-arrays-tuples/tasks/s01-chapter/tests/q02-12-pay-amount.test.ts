// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { payAmount } from "../src/q02-12-pay-amount";
test("問12 payAmount", () => {
  expect(payAmount({ price: 1000, coupon: 200 })).toBe(800);
  expect(payAmount({ price: 1000 })).toBe(1000);
  expectTypeOf(payAmount).parameters.toEqualTypeOf<[{ price: number; coupon?: number }]>();
  expectTypeOf(payAmount).returns.toEqualTypeOf<number>();
});
