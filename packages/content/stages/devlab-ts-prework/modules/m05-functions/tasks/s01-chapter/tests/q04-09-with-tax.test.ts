// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withTax } from "../src/q04-09-with-tax";
test("問9 withTax", () => {
  expect(withTax(1000)).toBe(1100);
  expect(withTax(1000, 0.08)).toBe(1080);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<number>();
});
