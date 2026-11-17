// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { calc } from "../src/q02-03-calc";
test("問3 calc", () => {
  expect(calc(6, "+", 3)).toBe(9);
  expect(calc(6, "-", 3)).toBe(3);
  expect(calc(6, "*", 3)).toBe(18);
  expect(calc(6, "/", 3)).toBe(2);
  expectTypeOf(calc).parameters.toEqualTypeOf<[number, "+" | "-" | "*" | "/", number]>();
  expectTypeOf(calc).returns.toEqualTypeOf<number>();
});
