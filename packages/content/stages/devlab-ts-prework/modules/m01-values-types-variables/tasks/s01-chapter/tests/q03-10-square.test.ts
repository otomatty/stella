// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { square } from "../src/q03-10-square";
test("問10 square", () => {
  expect(square(5)).toBe(25);
  expect(square(-3)).toBe(9);
  expectTypeOf(square).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(square).returns.toEqualTypeOf<number>();
});
