// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeOrder } from "../src/q02-11-size-order";
test("問11 sizeOrder", () => {
  expect(sizeOrder("S")).toBe(1);
  expect(sizeOrder("L")).toBe(3);
  expect(sizeOrder("XL")).toBe(4);
  expectTypeOf(sizeOrder).parameters.toEqualTypeOf<["S" | "M" | "L" | "XL"]>();
  expectTypeOf(sizeOrder).returns.toEqualTypeOf<number>();
});
