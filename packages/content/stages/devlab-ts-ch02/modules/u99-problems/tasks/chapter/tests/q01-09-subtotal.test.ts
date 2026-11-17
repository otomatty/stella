// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { subtotal } from "../src/q01-09-subtotal";
test("問9 subtotal", () => {
  expect(subtotal({ price: 150, quantity: 3 })).toBe(450);
  expectTypeOf(subtotal).parameters.toEqualTypeOf<[{ price: number; quantity: number }]>();
  expectTypeOf(subtotal).returns.toEqualTypeOf<number>();
});
